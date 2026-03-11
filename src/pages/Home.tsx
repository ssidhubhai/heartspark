import { motion } from 'motion/react';
import { Heart, Sparkles, MessageCircleHeart, Gamepad2, Star, Flame, MessageCircle, Brain, Mail, Users, Bot } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Link, useNavigate } from 'react-router-dom';
import React, { useState } from 'react';

export function Home() {
  const navigate = useNavigate();
  const [crushName, setCrushName] = useState('');

  const handleQuickCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (crushName.trim()) {
      navigate(`/calculator?crush=${encodeURIComponent(crushName)}`);
    }
  };

  const features = [
    {
      title: "Community Stories",
      description: "Read and react to dramatic crush stories from around the world.",
      icon: <Users className="w-6 h-6 text-emerald-500" />,
      path: "/stories",
      color: "bg-emerald-100 dark:bg-emerald-900/30",
    },
    {
      title: "Secret Link",
      description: "Get anonymous messages from your secret admirers.",
      icon: <Mail className="w-6 h-6 text-rose-500" />,
      path: "/secret",
      color: "bg-rose-100 dark:bg-rose-900/30",
    },
    {
      title: "LoveGPT",
      description: "Talk to your personal AI relationship coach. Ask advice and get help.",
      icon: <Bot className="w-6 h-6 text-pink-500" />,
      path: "/love-gpt",
      color: "bg-pink-100 dark:bg-pink-900/30",
    },
    {
      title: "Text Analyzer",
      description: "Confused by their text? Let AI decode what they really mean.",
      icon: <Brain className="w-6 h-6 text-indigo-500" />,
      path: "/analyzer",
      color: "bg-indigo-100 dark:bg-indigo-900/30",
    },
    {
      title: "Confession Wall",
      description: "Drop a secret message for your crush anonymously.",
      icon: <MessageCircle className="w-6 h-6 text-pink-500" />,
      path: "/confessions",
      color: "bg-pink-100 dark:bg-pink-900/30",
    },
    {
      title: "Love Calculator",
      description: "Find out your true compatibility score with advanced algorithms.",
      icon: <Heart className="w-6 h-6 text-red-500" />,
      path: "/calculator",
      color: "bg-red-100 dark:bg-red-900/30",
    },
    {
      title: "Crush Quiz",
      description: "Are you in the friend zone or is it true love? Take the test!",
      icon: <Sparkles className="w-6 h-6 text-purple-500" />,
      path: "/quiz",
      color: "bg-purple-100 dark:bg-purple-900/30",
    },
    {
      title: "Couple Games",
      description: "Play fun mini-games together and test your bond.",
      icon: <Gamepad2 className="w-6 h-6 text-blue-500" />,
      path: "/games",
      color: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: "Flirting Test",
      description: "Are you a smooth talker or a shy potato? Find out now.",
      icon: <Flame className="w-6 h-6 text-orange-500" />,
      path: "/flirting-test",
      color: "bg-orange-100 dark:bg-orange-900/30",
    },
    {
      title: "Astrology AI",
      description: "Get an advanced astrological reading based on your birth details.",
      icon: <Star className="w-6 h-6 text-yellow-500" />,
      path: "/astrology",
      color: "bg-yellow-100 dark:bg-yellow-900/30",
    },
  ];

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="text-center space-y-8 max-w-3xl mx-auto">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="inline-block p-4 rounded-full bg-pink-100 dark:bg-pink-900/30 mb-4"
        >
          <Heart className="w-12 h-12 text-pink-500 fill-pink-500" />
        </motion.div>
        
        <motion.h1 
          className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          Discover Your <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
            True Love Destiny
          </span>
        </motion.h1>
        
        <motion.p 
          className="text-lg md:text-xl text-slate-600 dark:text-slate-300"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Explore fun crush games, test your compatibility, and find out if they're the one.
        </motion.p>

        <motion.form 
          onSubmit={handleQuickCheck}
          className="max-w-md mx-auto relative mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Enter your crush's name..."
              value={crushName}
              onChange={(e) => setCrushName(e.target.value)}
              className="w-full h-14 pl-6 pr-32 rounded-full border-2 border-pink-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-200 dark:focus:ring-pink-900 outline-none transition-all text-lg shadow-sm"
              required
            />
            <Button 
              type="submit" 
              className="absolute right-1 h-12 px-6"
            >
              Check
            </Button>
          </div>
        </motion.form>
      </section>

      {/* Features Grid */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Popular Games</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <Link to={feature.path} className="block h-full">
                <Card className="h-full flex flex-col hover:border-pink-300 dark:hover:border-pink-700 transition-colors">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${feature.color}`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 flex-grow">
                    {feature.description}
                  </p>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Daily Fortune Teaser */}
      <section>
        <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white border-none">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 text-center md:text-left">
              <h2 className="text-3xl font-bold">Daily Love Fortune</h2>
              <p className="text-pink-100 max-w-lg text-lg">
                What do the stars say about your love life today? Get your personalized daily fortune and romantic advice.
              </p>
            </div>
            <Button 
              variant="secondary" 
              size="lg" 
              className="bg-white text-pink-600 hover:bg-pink-50 w-full md:w-auto"
              onClick={() => navigate('/tools/fortune')}
            >
              Reveal Fortune
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
