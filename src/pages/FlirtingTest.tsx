import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Share2, RefreshCw, Flame, Download, Sparkles } from 'lucide-react';
import { downloadAsImage, shareAsImage } from '../utils/downloadImage';

const questions = [
  {
    question: "You make eye contact with your crush from across the room. What do you do?",
    options: [
      { text: "Look away immediately and pretend I didn't see them.", score: 0 },
      { text: "Hold it for a second, then look away.", score: 1 },
      { text: "Smile softly and hold their gaze.", score: 2 },
      { text: "Wink or give a playful smirk.", score: 3 },
    ],
  },
  {
    question: "They ask you for a pen. You say:",
    options: [
      { text: "'Here.' (hands pen silently)", score: 0 },
      { text: "'Sure, here you go.'", score: 1 },
      { text: "'Only if you promise to give it back.'", score: 2 },
      { text: "'I'll trade you for your number.'", score: 3 },
    ],
  },
  {
    question: "They post a cute selfie on their story. Your reaction:",
    options: [
      { text: "Just view it, don't interact.", score: 0 },
      { text: "Like the story.", score: 1 },
      { text: "Reply with a fire emoji 🔥", score: 2 },
      { text: "Reply: 'Stop distracting me, I have things to do today.'", score: 3 },
    ],
  },
  {
    question: "You're sitting next to them and your arms brush. You:",
    options: [
      { text: "Pull away quickly and apologize.", score: 0 },
      { text: "Shift slightly but don't say anything.", score: 1 },
      { text: "Leave your arm there and see what they do.", score: 2 },
      { text: "Lean in closer and whisper something.", score: 3 },
    ],
  },
  {
    question: "They say 'I'm so bored.' You reply:",
    options: [
      { text: "'Same.'", score: 0 },
      { text: "'You should watch a movie.'", score: 1 },
      { text: "'We should do something fun then.'", score: 2 },
      { text: "'Let's go on an adventure right now.'", score: 3 },
    ],
  },
];

export function FlirtingTest() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const handleAnswer = (points: number) => {
    setScore(score + points);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResult(true);
    }
  };

  const getResult = () => {
    const maxScore = questions.length * 3;
    const percentage = (score / maxScore) * 100;

    if (percentage < 25) return { level: "Shy Potato 🥔", desc: "You're adorable, but you need to come out of your shell! Don't be afraid to show a little confidence." };
    if (percentage < 50) return { level: "Beginner Flirter 🐣", desc: "You're getting there! You know the basics, but you're playing it safe. Try taking a few more risks." };
    if (percentage < 75) return { level: "Smooth Talker 😎", desc: "You've got game! You know how to drop hints and keep things interesting without being too aggressive." };
    return { level: "Heartbreaker Legend 💔", desc: "Wow. You are a master of flirtation. You exude confidence and charm. Just use your powers for good!" };
  };

  const resetTest = () => {
    setCurrentQuestion(0);
    setScore(0);
    setShowResult(false);
  };

  const handleShare = async () => {
    const result = getResult();
    const text = `I just took the Flirting Skill Test and got: ${result.level}! Test your flirting skills at Heart Spark!`;
    await shareAsImage('flirting-result', 'Flirting Skill Test', text);
  };

  const handleDownload = () => {
    downloadAsImage('flirting-result', 'flirting-test-result');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400 flex items-center justify-center gap-2">
          Flirting Skill Test <Flame className="w-8 h-8 text-pink-500" />
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Are you a smooth talker or a shy potato? Find out now.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!showResult ? (
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="space-y-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-pink-100 dark:border-pink-900/30 p-8">
              <div className="flex justify-between items-center text-sm font-medium text-zinc-500 dark:text-zinc-400">
                <span>Scenario {currentQuestion + 1} of {questions.length}</span>
                <span>{Math.round(((currentQuestion) / questions.length) * 100)}% Completed</span>
              </div>
              
              <div className="w-full bg-pink-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
                  initial={{ width: `${(currentQuestion / questions.length) * 100}%` }}
                  animate={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                />
              </div>

              <h2 className="text-2xl font-bold text-zinc-800 dark:text-white py-4 leading-tight">
                {questions[currentQuestion].question}
              </h2>

              <div className="space-y-3">
                {questions[currentQuestion].options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(option.score)}
                    className="w-full text-left p-5 rounded-xl border-2 border-pink-100 dark:border-zinc-800 hover:border-pink-500 dark:hover:border-pink-500 hover:bg-pink-50 dark:hover:bg-zinc-800 transition-all flex items-center justify-between group shadow-sm hover:shadow-md"
                  >
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium text-lg">{option.text}</span>
                  </button>
                ))}
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", damping: 15 }}
          >
            <Card id="flirting-result" className="text-center space-y-8 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-pink-100 dark:border-pink-900/30 p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500"></div>
              
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-pink-100 dark:bg-pink-900/30 mb-2 mt-4 shadow-inner">
                <Flame className="w-10 h-10 text-pink-500" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em]">
                  Your Flirting Level
                </h2>
                <h3 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
                  {getResult().level}
                </h3>
              </div>

              <div className="py-6 bg-pink-50/50 dark:bg-pink-900/10 rounded-2xl border border-pink-100 dark:border-pink-900/20 px-6">
                <p className="text-lg text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed">
                  {getResult().desc}
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-4 pt-4 border-t border-pink-100 dark:border-zinc-800" data-html2canvas-ignore>
                <Button variant="outline" onClick={resetTest} className="border-pink-200 text-pink-600 hover:bg-pink-50 dark:border-pink-800 dark:text-pink-400 dark:hover:bg-pink-900/30">
                  <RefreshCw className="w-4 h-4 mr-2" /> Retake Test
                </Button>
                <Button onClick={handleShare} className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-none">
                  <Share2 className="w-4 h-4 mr-2" /> Share Result
                </Button>
                <Button variant="outline" onClick={handleDownload} className="border-pink-200 text-pink-600 hover:bg-pink-50 dark:border-pink-800 dark:text-pink-400 dark:hover:bg-pink-900/30">
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
