import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Share2, RefreshCw, Flame, Download } from 'lucide-react';
import { downloadAsImage } from '../utils/downloadImage';

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
    const text = `I just took the Flirting Skill Test and got: ${result.level}! Test your flirting skills at HeartSpark! ${window.location.href}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Flirting Skill Test',
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
    downloadAsImage('flirting-result', 'flirting-test-result');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white flex items-center justify-center gap-2">
          Flirting Skill Test <Flame className="w-8 h-8 text-orange-500" />
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
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
            <Card className="space-y-6">
              <div className="flex justify-between items-center text-sm font-medium text-slate-500 dark:text-slate-400">
                <span>Scenario {currentQuestion + 1} of {questions.length}</span>
                <span>{Math.round(((currentQuestion) / questions.length) * 100)}% Completed</span>
              </div>
              
              <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-orange-400 to-red-500"
                  initial={{ width: `${(currentQuestion / questions.length) * 100}%` }}
                  animate={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                />
              </div>

              <h2 className="text-2xl font-bold text-slate-800 dark:text-white py-4">
                {questions[currentQuestion].question}
              </h2>

              <div className="space-y-3">
                {questions[currentQuestion].options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(option.score)}
                    className="w-full text-left p-4 rounded-xl border-2 border-orange-100 dark:border-slate-700 hover:border-orange-500 dark:hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-slate-800 transition-all flex items-center justify-between group"
                  >
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{option.text}</span>
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
            <Card id="flirting-result" className="text-center space-y-6 bg-gradient-to-b from-white to-orange-50 dark:from-slate-800 dark:to-slate-800/50 border-orange-200 dark:border-orange-900/50">
              <div className="inline-block p-4 rounded-full bg-orange-100 dark:bg-orange-900/30 mb-4">
                <span className="text-6xl">{getResult().level.split(' ').pop()}</span>
              </div>
              
              <h2 className="text-3xl font-bold text-slate-800 dark:text-white">
                {getResult().level.replace(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')}
              </h2>
              
              <p className="text-xl text-slate-700 dark:text-slate-300 font-medium px-4">
                {getResult().desc}
              </p>

              <div className="flex flex-wrap justify-center gap-4 pt-8" data-html2canvas-ignore>
                <Button variant="outline" onClick={resetTest}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Retake Test
                </Button>
                <Button onClick={handleShare} className="bg-orange-500 hover:bg-orange-600 border-none">
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
