import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Image as ImageIcon, MessageSquare, Sparkles, Upload, X, Play, Square, Loader2, AlertCircle } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { generateContentWithFallback } from '../utils/ai';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';

export function SignalAnalyzer() {
  const { showToast } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'text' | 'voice' | 'image'>('text');
  
  // Text State
  const [textInput, setTextInput] = useState('');
  
  // Voice State
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Image State
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (location.state?.chatTranscript) {
      setActiveTab('text');
      setTextInput(`Analyzing chat with ${location.state.otherUserName}:\n\n${location.state.chatTranscript}`);
      
      // Auto-trigger analysis if it hasn't been done yet
      if (!result && !isAnalyzing) {
        // We need to wait for the state to update before analyzing
        setTimeout(() => {
          const analyzeBtn = document.getElementById('analyze-btn');
          if (analyzeBtn) analyzeBtn.click();
        }, 500);
      }
    }
  }, [location.state]);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setAudioBase64(base64data.split(',')[1]);
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      showToast("Could not access microphone.", "error");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showToast("Audio must be less than 10MB", "error");
        return;
      }
      const url = URL.createObjectURL(file);
      setAudioUrl(url);

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        const base64data = reader.result as string;
        setAudioBase64(base64data.split(',')[1]);
      };
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast("Image must be less than 5MB", "error");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setImageBase64(result.split(',')[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearInput = () => {
    setTextInput('');
    setAudioUrl(null);
    setAudioBase64(null);
    setImagePreview(null);
    setImageBase64(null);
    setResult(null);
  };

  const handleAnalyze = async () => {
    if (activeTab === 'text' && !textInput.trim()) return;
    if (activeTab === 'voice' && !audioBase64) return;
    if (activeTab === 'image' && !imageBase64) return;

    setIsAnalyzing(true);
    try {
      let prompt = '';
      let inlineData = null;

      if (activeTab === 'text') {
        prompt = `Analyze this message from my crush: "${textInput}". 
        Return a JSON object with:
        - verdict: "Green Flag", "Red Flag", or "Neutral"
        - flirtScore: 1-10
        - meaning: What they actually mean
        - advice: How I should reply`;
      } else if (activeTab === 'voice') {
        prompt = `Analyze this voice note from my crush. Listen to the tone, pitch, and hesitation.
        Return a JSON object with:
        - verdict: "Green Flag", "Red Flag", or "Neutral"
        - flirtScore: 1-10
        - nervousnessScore: 1-10
        - meaning: What their tone indicates
        - advice: How I should reply`;
        inlineData = { data: audioBase64!, mimeType: 'audio/webm' };
      } else if (activeTab === 'image') {
        prompt = `Analyze this screenshot of a chat with my crush. Read the context and the latest messages.
        Return a JSON object with:
        - verdict: "Green Flag", "Red Flag", or "Neutral"
        - flirtScore: 1-10
        - meaning: What the conversation indicates
        - advice: How I should reply`;
        inlineData = { data: imageBase64!, mimeType: 'image/jpeg' };
      }

      const contents: any[] = [{ role: 'user', parts: [{ text: prompt }] }];
      if (inlineData) {
        contents[0].parts.push({ inlineData });
      }

      const response = await generateContentWithFallback({
        model: 'gemini-3-flash-preview',
        contents
      });
      
      const responseText = response.text;
      const jsonMatch = responseText?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        setResult(JSON.parse(jsonMatch[0]));
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Analysis error:", error);
      showToast("Failed to analyze. Please try again.", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 pb-24 min-h-screen">
      <div className="text-center mb-8 pt-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-500 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-pink-500/20"
        >
          <Sparkles className="w-8 h-8 text-white" />
        </motion.div>
        <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight mb-2">
          Signal Analyzer
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Decode mixed signals. Analyze texts, voice notes, or chat screenshots.
        </p>
      </div>

      <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-2xl mb-8">
        {[
          { id: 'text', icon: MessageSquare, label: 'Text' },
          { id: 'image', icon: ImageIcon, label: 'Screenshot' },
          { id: 'voice', icon: Mic, label: 'Voice Note' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as any); clearInput(); }}
            className={cn(
              "flex-1 py-3 px-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
              activeTab === tab.id 
                ? "bg-white dark:bg-zinc-800 text-pink-600 dark:text-pink-400 shadow-sm" 
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <Card className="p-6 border-0 shadow-xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl mb-8">
        <AnimatePresence mode="wait">
          {activeTab === 'text' && (
            <motion.div key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Paste their message here..."
                className="w-full p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all outline-none text-zinc-900 dark:text-white min-h-[120px] resize-none"
              />
            </motion.div>
          )}

          {activeTab === 'image' && (
            <motion.div key="image" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {!imagePreview ? (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 text-zinc-400 mb-3" />
                    <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
                      <span className="font-bold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">PNG, JPG up to 5MB</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
                  <img src={imagePreview} alt="Screenshot" className="w-full object-contain max-h-64 bg-zinc-100 dark:bg-zinc-900" />
                  <button onClick={() => { setImagePreview(null); setImageBase64(null); }} className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'voice' && (
            <motion.div key="voice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-8">
              {!audioUrl ? (
                <div className="flex flex-col items-center gap-6">
                  <button
                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                    className={cn(
                      "w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-xl",
                      isRecording 
                        ? "bg-red-500 text-white animate-pulse shadow-red-500/30" 
                        : "bg-gradient-to-br from-pink-500 to-purple-500 text-white shadow-pink-500/30 hover:scale-105"
                    )}
                  >
                    {isRecording ? <Square className="w-8 h-8" /> : <Mic className="w-10 h-10" />}
                  </button>
                  <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">
                    {isRecording ? "Recording..." : "Tap to record"}
                  </p>
                  
                  <div className="flex items-center gap-4 w-full">
                    <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1" />
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">OR</span>
                    <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1" />
                  </div>

                  <label className="flex items-center gap-2 px-6 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold cursor-pointer transition-colors">
                    <Upload className="w-4 h-4" />
                    Upload Audio File
                    <input type="file" className="hidden" accept="audio/*" onChange={handleAudioUpload} />
                  </label>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 w-full">
                  <div className="flex items-center gap-4 bg-zinc-100 dark:bg-zinc-800 p-4 rounded-2xl w-full max-w-sm">
                    <button onClick={togglePlayback} className="w-12 h-12 bg-pink-500 text-white rounded-full flex items-center justify-center shrink-0 hover:scale-105 transition-transform">
                      {isPlaying ? <Square className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                    </button>
                    <div className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div className="h-full bg-pink-500 w-full animate-pulse opacity-50" />
                    </div>
                    <button onClick={() => { setAudioUrl(null); setAudioBase64(null); }} className="p-2 text-zinc-400 hover:text-red-500 transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                    <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} className="hidden" />
                  </div>
                  <p className="text-sm font-bold text-emerald-500 uppercase tracking-widest">
                    Ready to analyze
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          id="analyze-btn"
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold text-lg shadow-lg shadow-pink-500/25 border-0 mt-6"
          onClick={handleAnalyze}
          disabled={isAnalyzing || (activeTab === 'text' && !textInput) || (activeTab === 'image' && !imageBase64) || (activeTab === 'voice' && !audioBase64)}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Decoding Signals...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Analyze Signal
            </>
          )}
        </Button>
      </Card>

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card className="p-6 border-0 shadow-xl bg-white dark:bg-[#0A0A0B]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-zinc-900 dark:text-white">Analysis Result</h3>
                <div className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-widest",
                  result.verdict === 'Green Flag' ? "bg-emerald-100 text-emerald-600" :
                  result.verdict === 'Red Flag' ? "bg-red-100 text-red-600" :
                  "bg-amber-100 text-amber-600"
                )}>
                  {result.verdict}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-2xl text-center">
                  <div className="text-3xl font-black text-pink-500 mb-1">{result.flirtScore}/10</div>
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Flirt Score</div>
                </div>
                {result.nervousnessScore && (
                  <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-2xl text-center">
                    <div className="text-3xl font-black text-purple-500 mb-1">{result.nervousnessScore}/10</div>
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Nervousness</div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-pink-500" />
                    What it means
                  </h4>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-2xl">
                    {result.meaning}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-purple-500" />
                    How to reply
                  </h4>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-2xl">
                    {result.advice}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
