import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageSquare, Sparkles, X, ChevronRight, ChevronLeft, Bot } from 'lucide-react';
import { Button } from './Button';

interface Step {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const steps: Step[] = [
  {
    title: "Crush Compatibility",
    description: "Ever wondered if you and your crush are written in the stars? Our AI-powered Love Calculator uses advanced algorithms to find your perfect match score.",
    icon: <Heart className="w-12 h-12 text-pink-500" />,
    color: "from-pink-500 to-rose-500"
  },
  {
    title: "Anonymous Student Confessions",
    description: "Spill the tea or read the latest gossip! Share your stories anonymously in our community section. Ghosted? Toxic? Wholesome? We want to hear it all.",
    icon: <MessageSquare className="w-12 h-12 text-purple-500" />,
    color: "from-purple-500 to-indigo-500"
  },
  {
    title: "Astro Vibe",
    description: "Get a deep cosmic consultation. Our AI astrologer analyzes your birth charts to reveal your true destiny and relationship dynamics.",
    icon: <Bot className="w-12 h-12 text-indigo-500" />,
    color: "from-indigo-500 to-blue-500"
  }
];

export function OnboardingTour() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('has_seen_onboarding_v1');
    if (!hasSeenTour) {
      setIsVisible(true);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('has_seen_onboarding_v1', 'true');
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl relative"
        >
          {/* Close Button */}
          <button 
            onClick={handleClose}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors z-10"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>

          {/* Progress Bar */}
          <div className="absolute top-0 left-0 w-full h-1.5 flex gap-1 p-1">
            {steps.map((_, i) => (
              <div 
                key={i}
                className={`h-full flex-1 rounded-full transition-all duration-500 ${
                  i <= currentStep ? 'bg-gradient-to-r from-pink-500 to-purple-500' : 'bg-zinc-100 dark:bg-zinc-800'
                }`}
              />
            ))}
          </div>

          <div className="p-8 pt-12 text-center space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className={`w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br ${steps[currentStep].color} flex items-center justify-center shadow-xl shadow-pink-500/20`}>
                  <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
                    {steps[currentStep].icon}
                  </div>
                </div>

                <div className="space-y-3">
                  <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                    {steps[currentStep].title}
                  </h2>
                  <p className="text-lg text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {steps[currentStep].description}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
                className={`rounded-2xl h-12 px-6 border-zinc-200 dark:border-zinc-800 ${currentStep === 0 ? 'opacity-0 pointer-events-none' : ''}`}
              >
                <ChevronLeft className="w-5 h-5 mr-1" /> Back
              </Button>

              <div className="flex gap-1.5">
                {steps.map((_, i) => (
                  <div 
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === currentStep ? 'w-6 bg-pink-500' : 'bg-zinc-200 dark:bg-zinc-800'
                    }`}
                  />
                ))}
              </div>

              <Button
                onClick={nextStep}
                className="rounded-2xl h-12 px-8 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 border-none shadow-lg"
              >
                {currentStep === steps.length - 1 ? "Get Started" : "Next"} <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
