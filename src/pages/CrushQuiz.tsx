import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Share2, RefreshCw, CheckCircle2, Wand2, Loader2, Sparkles, Download } from 'lucide-react';
import { generateContentWithFallback } from '../utils/ai';
import Markdown from 'react-markdown';
import { downloadAsImage } from '../utils/downloadImage';

const questions = [
  {
    id: 1,
    question: "How often do they text you first?",
    options: [
      { text: "Never, I always initiate.", score: 0 },
      { text: "Sometimes, but usually for a reason.", score: 1 },
      { text: "Pretty often, just to chat.", score: 2 },
      { text: "All the time! We talk constantly.", score: 3 },
    ],
  },
  {
    id: 2,
    question: "When you hang out in a group, do they...",
    options: [
      { text: "Treat me like everyone else.", score: 0 },
      { text: "Joke around with me occasionally.", score: 1 },
      { text: "Try to sit near me or make eye contact.", score: 2 },
      { text: "Focus mostly on me and ignore others.", score: 3 },
    ],
  },
  {
    id: 3,
    question: "Have they ever complimented your appearance?",
    options: [
      { text: "No, never.", score: 0 },
      { text: "Maybe once, like 'cool shirt'.", score: 1 },
      { text: "Yes, they notice when I change my hair/outfit.", score: 2 },
      { text: "Yes, they frequently tell me I look good.", score: 3 },
    ],
  },
  {
    id: 4,
    question: "Do they remember small details about you?",
    options: [
      { text: "Not really, they forget a lot.", score: 0 },
      { text: "They remember the big stuff.", score: 1 },
      { text: "Yes, they remember my favorite things.", score: 2 },
      { text: "They remember things I barely remember telling them!", score: 3 },
    ],
  },
  {
    id: 5,
    question: "How do they react when you talk about other people you might like?",
    options: [
      { text: "They give me advice or encourage me.", score: 0 },
      { text: "They don't seem to care much.", score: 1 },
      { text: "They get quiet or change the subject.", score: 2 },
      { text: "They seem visibly jealous or annoyed.", score: 3 },
    ],
  },
];

export function CrushQuiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [quizMode, setQuizMode] = useState<'standard' | 'custom_setup' | 'custom_playing'>('standard');
  const [customSituation, setCustomSituation] = useState('');
  const [customQuestions, setCustomQuestions] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customResult, setCustomResult] = useState<{title: string, desc: string} | null>(null);

  const activeQuestions = quizMode === 'custom_playing' ? customQuestions : questions;

  const handleAnswer = (score: number) => {
    const newAnswers = [...answers, score];
    setAnswers(newAnswers);

    if (currentQuestion < activeQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResult(true);
      if (quizMode === 'custom_playing') {
        generateCustomResult(newAnswers);
      }
    }
  };

  const calculateResult = () => {
    if (quizMode === 'custom_playing' && customResult) {
      return customResult;
    }

    const totalScore = answers.reduce((a, b) => a + b, 0);
    const maxScore = activeQuestions.length * 3;
    const percentage = (totalScore / maxScore) * 100;

    if (percentage < 25) return { title: "Friend Zone 🧊", desc: "They probably just see you as a good friend right now. Don't force it, but keep being awesome!" };
    if (percentage < 50) return { title: "Suspicious Signals 🤔", desc: "There are some mixed signals here. They might be interested, but they're playing it cool or aren't sure yet." };
    if (percentage < 75) return { title: "High Crush Probability 📈", desc: "Things are looking good! They definitely enjoy your company and might be waiting for a sign from you." };
    return { title: "Secret Admirer Alert 🚨", desc: "They are totally into you! The signs are all there. It's time to make a move!" };
  };

  const generateCustomResult = async (finalAnswers: number[]) => {
    setIsGenerating(true);
    try {
      const prompt = `
        Based on this specific situation: "${customSituation}"
        The user answered a 5-question quiz about their crush.
        Their total score was ${finalAnswers.reduce((a, b) => a + b, 0)} out of 15 (higher means more positive signs).
        
        Provide a fun, insightful, and personalized result for their situation.
        Return ONLY a JSON object with this exact structure:
        {
          "title": "A catchy title with an emoji",
          "desc": "A 2-3 sentence personalized analysis and advice based on their situation and score."
        }
      `;

      const response = await generateContentWithFallback({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const result = JSON.parse(response.text || '{}');
      setCustomResult(result);
    } catch (error) {
      console.error('Error generating result:', error);
      setCustomResult({ title: "The Stars Are Confused 🌟", desc: "We couldn't generate a custom result right now, but based on your score, follow your heart!" });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCustomQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSituation.trim()) return;

    setIsGenerating(true);
    try {
      const prompt = `
        Create a 5-question multiple choice quiz to determine if someone's crush likes them back, tailored specifically to this situation:
        "${customSituation}"
        
        Return ONLY a JSON array of 5 objects with this exact structure:
        [
          {
            "id": 1,
            "question": "Question text here",
            "options": [
              { "text": "Most negative/friendzone answer", "score": 0 },
              { "text": "Slightly positive answer", "score": 1 },
              { "text": "Good sign answer", "score": 2 },
              { "text": "Very obvious romantic sign answer", "score": 3 }
            ]
          }
        ]
      `;

      const response = await generateContentWithFallback({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const generatedQuestions = JSON.parse(response.text || '[]');
      if (generatedQuestions.length > 0) {
        setCustomQuestions(generatedQuestions);
        setQuizMode('custom_playing');
        setCurrentQuestion(0);
        setAnswers([]);
        setShowResult(false);
        setCustomResult(null);
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
      alert('Failed to generate custom quiz. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setAnswers([]);
    setShowResult(false);
    setCustomResult(null);
  };

  const handleShare = async () => {
    const result = calculateResult();
    const text = `I just took the Crush Likelihood Quiz and got: ${result.title}! Take the quiz at HeartSpark to find out if your crush likes you back! ${window.location.href}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Crush Quiz Result',
          text,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(text);
      alert('Result copied to clipboard!');
    }
  };

  const handleDownload = () => {
    downloadAsImage('quiz-result', 'crush-quiz-result');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">
          Crush Likelihood Quiz
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Answer honestly to find out if they like you back!
        </p>
        
        {!showResult && quizMode === 'standard' && (
          <Button 
            variant="outline" 
            onClick={() => setQuizMode('custom_setup')}
            className="mt-4 border-purple-200 text-purple-600 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-900/30"
          >
            <Wand2 className="w-4 h-4 mr-2" /> Make a Custom AI Quiz for My Situation
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {quizMode === 'custom_setup' ? (
          <motion.div
            key="custom_setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">AI Custom Quiz</h2>
              </div>
              
              <form onSubmit={generateCustomQuiz} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Describe your situation with your crush:
                  </label>
                  <textarea
                    value={customSituation}
                    onChange={(e) => setCustomSituation(e.target.value)}
                    placeholder="e.g., We work together in the same office and always get coffee at 10am, but they recently started acting distant..."
                    className="w-full h-32 p-4 rounded-xl border-2 border-purple-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:border-purple-500 outline-none resize-none transition-all"
                    required
                  />
                </div>
                
                <div className="flex gap-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setQuizMode('standard')}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isGenerating || !customSituation.trim()} 
                    className="flex-1 bg-purple-500 hover:bg-purple-600"
                  >
                    {isGenerating ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                    ) : (
                      <><Wand2 className="w-4 h-4 mr-2" /> Generate Quiz</>
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        ) : !showResult ? (
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="space-y-6">
              <div className="flex justify-between items-center text-sm font-medium text-slate-500 dark:text-slate-400">
                <span>Question {currentQuestion + 1} of {activeQuestions.length}</span>
                <span>{Math.round(((currentQuestion) / activeQuestions.length) * 100)}% Completed</span>
              </div>
              
              <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
                  initial={{ width: `${(currentQuestion / activeQuestions.length) * 100}%` }}
                  animate={{ width: `${((currentQuestion + 1) / activeQuestions.length) * 100}%` }}
                />
              </div>

              <h2 className="text-2xl font-bold text-slate-800 dark:text-white py-4">
                {activeQuestions[currentQuestion].question}
              </h2>

              <div className="space-y-3">
                {activeQuestions[currentQuestion].options.map((option: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(option.score)}
                    className="w-full text-left p-4 rounded-xl border-2 border-pink-100 dark:border-slate-700 hover:border-pink-500 dark:hover:border-pink-500 hover:bg-pink-50 dark:hover:bg-slate-800 transition-all flex items-center justify-between group"
                  >
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{option.text}</span>
                    <CheckCircle2 className="w-5 h-5 text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
          >
            <Card id="quiz-result" className="text-center space-y-6 bg-gradient-to-b from-white to-purple-50 dark:from-slate-800 dark:to-slate-800/50 border-purple-200 dark:border-purple-900/50">
              <div className="inline-block p-4 rounded-full bg-purple-100 dark:bg-purple-900/30 mb-4">
                <span className="text-6xl">{calculateResult().title.split(' ').pop()}</span>
              </div>
              
              <h2 className="text-3xl font-bold text-slate-800 dark:text-white">
                {calculateResult().title.replace(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')}
              </h2>
              
              <p className="text-xl text-slate-700 dark:text-slate-300 font-medium px-4">
                {calculateResult().desc}
              </p>

              <div className="flex flex-wrap justify-center gap-4 pt-8" data-html2canvas-ignore>
                <Button variant="outline" onClick={resetQuiz}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Retake Quiz
                </Button>
                {quizMode === 'custom_playing' && (
                  <Button variant="outline" onClick={() => setQuizMode('standard')}>
                    Back to Standard
                  </Button>
                )}
                <Button onClick={handleShare}>
                  <Share2 className="w-4 h-4 mr-2" /> Share Result
                </Button>
                <Button variant="outline" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" /> Download
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
