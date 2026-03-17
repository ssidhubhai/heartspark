import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Gamepad2, Heart, Trophy, RefreshCw, MessageCircleQuestion, Sparkles, Flame } from 'lucide-react';

export function MiniGames() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const gameParam = searchParams.get('game');
  const [activeGame, setActiveGame] = useState<'menu' | 'tap' | 'memory' | 'truth_dare'>('menu');

  useEffect(() => {
    if (gameParam === 'tap' || gameParam === 'memory' || gameParam === 'truth_dare') {
      setActiveGame(gameParam);
    } else {
      setActiveGame('menu');
    }
  }, [gameParam]);

  const handleGameChange = (game: 'menu' | 'tap' | 'memory' | 'truth_dare') => {
    setActiveGame(game);
    if (game === 'menu') {
      setSearchParams({});
    } else {
      setSearchParams({ game });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400 flex items-center justify-center gap-2">
          Couple Mini Games <Gamepad2 className="w-8 h-8 text-pink-500" />
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Play fun games together and test your bond.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {activeGame === 'menu' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <Card className="flex flex-col items-center text-center space-y-4 hover:border-pink-300 dark:hover:border-pink-700 transition-colors cursor-pointer bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-pink-100 dark:border-pink-900/30" onClick={() => handleGameChange('tap')}>
              <div className="w-16 h-16 rounded-2xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                <Heart className="w-8 h-8 text-pink-500" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-800 dark:text-white">Tap the Heart</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                How many hearts can you tap in 10 seconds? Test your speed!
              </p>
              <Button className="mt-4 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-none">Play Now</Button>
            </Card>

            <Card className="flex flex-col items-center text-center space-y-4 hover:border-pink-300 dark:hover:border-pink-700 transition-colors cursor-pointer bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-pink-100 dark:border-pink-900/30" onClick={() => handleGameChange('memory')}>
              <div className="w-16 h-16 rounded-2xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                <Gamepad2 className="w-8 h-8 text-pink-500" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-800 dark:text-white">Memory Match</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                Match the romantic pairs as fast as you can!
              </p>
              <Button className="mt-4 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-none">Play Now</Button>
            </Card>

            <Card className="flex flex-col items-center text-center space-y-4 hover:border-pink-300 dark:hover:border-pink-700 transition-colors cursor-pointer bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-pink-100 dark:border-pink-900/30" onClick={() => handleGameChange('truth_dare')}>
              <div className="w-16 h-16 rounded-2xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                <MessageCircleQuestion className="w-8 h-8 text-pink-500" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-800 dark:text-white">Truth or Dare</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                Spicy and fun questions to get to know each other better!
              </p>
              <Button className="mt-4 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-none">Play Now</Button>
            </Card>

            <Card className="flex flex-col items-center text-center space-y-4 hover:border-pink-300 dark:hover:border-pink-700 transition-colors cursor-pointer bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-pink-100 dark:border-pink-900/30" onClick={() => navigate('/quiz')}>
              <div className="w-16 h-16 rounded-2xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-pink-500" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-800 dark:text-white">Relationship Quiz</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                Assess your relationship status through structured psychological quizzes.
              </p>
              <Button className="mt-4 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-none">Take Quiz</Button>
            </Card>

            <Card className="flex flex-col items-center text-center space-y-4 hover:border-pink-300 dark:hover:border-pink-700 transition-colors cursor-pointer bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-pink-100 dark:border-pink-900/30" onClick={() => navigate('/flirting-test')}>
              <div className="w-16 h-16 rounded-2xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                <Flame className="w-8 h-8 text-pink-500" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-800 dark:text-white">Communication Test</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                Evaluate your interpersonal communication and flirting skills.
              </p>
              <Button className="mt-4 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-none">Start Test</Button>
            </Card>
          </motion.div>
        )}

        {activeGame === 'tap' && (
          <motion.div
            key="tap"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <TapGame onBack={() => handleGameChange('menu')} />
          </motion.div>
        )}
        {activeGame === 'memory' && (
          <motion.div
            key="memory"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <MemoryGame onBack={() => handleGameChange('menu')} />
          </motion.div>
        )}
        {activeGame === 'truth_dare' && (
          <motion.div
            key="truth_dare"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <TruthOrDareGame onBack={() => handleGameChange('menu')} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TapGame({ onBack }: { onBack: () => void }) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [heartPos, setHeartPos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && isPlaying) {
      setIsPlaying(false);
      setGameOver(true);
    }
    return () => clearTimeout(timer);
  }, [timeLeft, isPlaying]);

  const startGame = () => {
    setScore(0);
    setTimeLeft(10);
    setIsPlaying(true);
    setGameOver(false);
    moveHeart();
  };

  const moveHeart = () => {
    setHeartPos({
      x: Math.random() * 80 + 10, // 10% to 90%
      y: Math.random() * 80 + 10,
    });
  };

  const handleTap = () => {
    if (!isPlaying) return;
    setScore(score + 1);
    moveHeart();
  };

  return (
    <Card className="text-center space-y-6 min-h-[400px] flex flex-col relative overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-pink-100 dark:border-pink-900/30">
      <div className="flex justify-between items-center z-10">
        <Button variant="ghost" onClick={onBack} size="sm" className="text-pink-600 hover:bg-pink-50 dark:text-pink-400 dark:hover:bg-pink-900/30">
          ← Back
        </Button>
        <div className="text-xl font-bold text-pink-600 dark:text-pink-400">
          Time: {timeLeft}s
        </div>
        <div className="text-xl font-bold text-pink-600 dark:text-pink-400">
          Score: {score}
        </div>
      </div>

      {!isPlaying && !gameOver && (
        <div className="flex-grow flex flex-col items-center justify-center space-y-4 z-10">
          <Heart className="w-16 h-16 text-pink-500 fill-pink-500 animate-pulse" />
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-white">Tap the Heart!</h2>
          <p className="text-zinc-600 dark:text-zinc-400">Tap as many hearts as you can in 10 seconds.</p>
          <Button onClick={startGame} size="lg" className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-none">Start Game</Button>
        </div>
      )}

      {isPlaying && (
        <div className="flex-grow relative w-full h-full min-h-[300px]">
          <motion.button
            className="absolute p-4 rounded-full focus:outline-none"
            style={{ left: `${heartPos.x}%`, top: `${heartPos.y}%`, transform: 'translate(-50%, -50%)' }}
            whileTap={{ scale: 0.8 }}
            onClick={handleTap}
          >
            <Heart className="w-12 h-12 text-pink-500 fill-pink-500 drop-shadow-lg" />
          </motion.button>
        </div>
      )}

      {gameOver && (
        <div className="flex-grow flex flex-col items-center justify-center space-y-4 z-10">
          <Trophy className="w-16 h-16 text-pink-500" />
          <h2 className="text-3xl font-bold text-zinc-800 dark:text-white">Game Over!</h2>
          <p className="text-xl text-zinc-600 dark:text-zinc-400">You tapped <span className="font-bold text-pink-500">{score}</span> hearts!</p>
          <div className="flex gap-4 mt-4">
            <Button onClick={startGame} className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-none">
              <RefreshCw className="w-4 h-4 mr-2" /> Play Again
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

const EMOJIS = ['💖', '🌹', '💌', '💍', '🥂', '🍫', '🧸', '💋'];

function MemoryGame({ onBack }: { onBack: () => void }) {
  const [cards, setCards] = useState<{ id: number; emoji: string; isFlipped: boolean; isMatched: boolean }[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  const initializeGame = () => {
    const shuffledEmojis = [...EMOJIS, ...EMOJIS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({
        id: index,
        emoji,
        isFlipped: false,
        isMatched: false,
      }));
    setCards(shuffledEmojis);
    setFlippedIndices([]);
    setMoves(0);
    setIsGameOver(false);
  };

  useEffect(() => {
    initializeGame();
  }, []);

  const handleCardClick = (index: number) => {
    if (flippedIndices.length === 2 || cards[index].isFlipped || cards[index].isMatched) return;

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlippedIndices = [...flippedIndices, index];
    setFlippedIndices(newFlippedIndices);

    if (newFlippedIndices.length === 2) {
      setMoves(moves + 1);
      const [firstIndex, secondIndex] = newFlippedIndices;

      if (newCards[firstIndex].emoji === newCards[secondIndex].emoji) {
        setTimeout(() => {
          const matchedCards = [...newCards];
          matchedCards[firstIndex].isMatched = true;
          matchedCards[secondIndex].isMatched = true;
          setCards(matchedCards);
          setFlippedIndices([]);

          if (matchedCards.every((card) => card.isMatched)) {
            setIsGameOver(true);
          }
        }, 500);
      } else {
        setTimeout(() => {
          const resetCards = [...newCards];
          resetCards[firstIndex].isFlipped = false;
          resetCards[secondIndex].isFlipped = false;
          setCards(resetCards);
          setFlippedIndices([]);
        }, 1000);
      }
    }
  };

  return (
    <Card className="text-center space-y-6 min-h-[400px] flex flex-col relative overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-pink-100 dark:border-pink-900/30">
      <div className="flex justify-between items-center z-10 w-full">
        <Button variant="ghost" onClick={onBack} size="sm" className="text-pink-600 hover:bg-pink-50 dark:text-pink-400 dark:hover:bg-pink-900/30">
          ← Back
        </Button>
        <div className="text-xl font-bold text-pink-600 dark:text-pink-400">
          Moves: {moves}
        </div>
      </div>

      {isGameOver ? (
        <div className="flex-grow flex flex-col items-center justify-center space-y-4 z-10">
          <Trophy className="w-16 h-16 text-pink-500" />
          <h2 className="text-3xl font-bold text-zinc-800 dark:text-white">You Won!</h2>
          <p className="text-xl text-zinc-600 dark:text-zinc-400">Completed in <span className="font-bold text-pink-500">{moves}</span> moves!</p>
          <div className="flex gap-4 mt-4">
            <Button onClick={initializeGame} className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-none">
              <RefreshCw className="w-4 h-4 mr-2" /> Play Again
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-md mx-auto w-full flex-grow">
          {cards.map((card, index) => (
            <motion.button
              key={card.id}
              className={`aspect-square text-3xl sm:text-4xl flex items-center justify-center rounded-xl transition-all duration-300 transform preserve-3d cursor-pointer ${
                card.isFlipped || card.isMatched
                  ? 'bg-white dark:bg-zinc-800 shadow-md border-2 border-pink-200 dark:border-zinc-700'
                  : 'bg-gradient-to-br from-pink-400 to-purple-500 shadow-sm hover:from-pink-500 hover:to-purple-600'
              }`}
              onClick={() => handleCardClick(index)}
              whileHover={{ scale: card.isFlipped || card.isMatched ? 1 : 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                initial={false}
                animate={{ rotateY: card.isFlipped || card.isMatched ? 0 : 180 }}
                transition={{ duration: 0.3 }}
                style={{ backfaceVisibility: 'hidden' }}
              >
                {card.isFlipped || card.isMatched ? card.emoji : <Heart className="w-8 h-8 text-white/50" />}
              </motion.div>
            </motion.button>
          ))}
        </div>
      )}
    </Card>
  );
}

const TRUTHS = [
  "What's your biggest dealbreaker in a relationship?",
  "What's the most embarrassing thing you've done for a crush?",
  "What is your favorite physical feature of yourself?",
  "If you could date any celebrity, who would it be?",
  "What's a secret you've never told anyone?",
  "What's your idea of a perfect date?",
  "Have you ever practiced kissing in a mirror?",
  "What's the most romantic thing someone has done for you?",
  "What's your biggest fear when it comes to love?",
  "Do you believe in love at first sight?"
];

const DARES = [
  "Send a risky text to your crush right now.",
  "Let the other person look through your phone for 1 minute.",
  "Do your best impression of someone flirting.",
  "Post a selfie on your story right now with no context.",
  "Show the last photo you took on your phone.",
  "Call a friend and tell them you're getting married.",
  "Do 10 pushups or sit-ups right now.",
  "Let the other person draw something on your arm with a pen.",
  "Sing the chorus of your favorite love song out loud.",
  "Stare into the other person's eyes for 30 seconds without blinking."
];

function TruthOrDareGame({ onBack }: { onBack: () => void }) {
  const [currentPrompt, setCurrentPrompt] = useState<{ type: 'Truth' | 'Dare', text: string } | null>(null);

  const handleChoice = (type: 'Truth' | 'Dare') => {
    const actualList = type === 'Truth' ? TRUTHS : DARES;
    const randomPrompt = actualList[Math.floor(Math.random() * actualList.length)];
    setCurrentPrompt({ type, text: randomPrompt });
  };

  return (
    <Card className="text-center space-y-6 min-h-[400px] flex flex-col relative overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-pink-100 dark:border-pink-900/30">
      <div className="flex justify-between items-center z-10 w-full">
        <Button variant="ghost" onClick={onBack} size="sm" className="text-pink-600 hover:bg-pink-50 dark:text-pink-400 dark:hover:bg-pink-900/30">
          ← Back
        </Button>
      </div>

      <div className="flex-grow flex flex-col items-center justify-center space-y-8 z-10 w-full max-w-md mx-auto">
        {!currentPrompt ? (
          <>
            <MessageCircleQuestion className="w-16 h-16 text-pink-500" />
            <h2 className="text-3xl font-bold text-zinc-800 dark:text-white">Truth or Dare?</h2>
            <p className="text-zinc-600 dark:text-zinc-400">Choose your fate!</p>
            <div className="flex gap-4 w-full">
              <Button onClick={() => handleChoice('Truth')} className="flex-1 h-16 text-xl bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-none">
                Truth
              </Button>
              <Button onClick={() => handleChoice('Dare')} className="flex-1 h-16 text-xl bg-zinc-800 hover:bg-zinc-700 text-white border-none">
                Dare
              </Button>
            </div>
          </>
        ) : (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full space-y-8"
          >
            <h2 className={`text-4xl font-bold ${currentPrompt.type === 'Truth' ? 'text-pink-500' : 'text-purple-500'}`}>
              {currentPrompt.type}
            </h2>
            <div className="bg-white/50 dark:bg-zinc-800/50 p-8 rounded-2xl shadow-inner min-h-[150px] flex items-center justify-center border border-pink-100 dark:border-pink-900/30">
              <p className="text-2xl font-medium text-zinc-800 dark:text-white leading-relaxed">
                "{currentPrompt.text}"
              </p>
            </div>
            <Button onClick={() => setCurrentPrompt(null)} variant="outline" className="w-full h-12 border-pink-200 text-pink-600 hover:bg-pink-50 dark:border-pink-800 dark:text-pink-400 dark:hover:bg-pink-900/30">
              Next Turn
            </Button>
          </motion.div>
        )}
      </div>
    </Card>
  );
}

