import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  emoji: string;
}

export function ParticleBackground() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const emojis = ['❤', '✨', '⭐', '💖', '💫'];
    const generateParticles = () => {
      const newParticles = Array.from({ length: 25 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100 + 100, // Start below screen
        size: Math.random() * 15 + 10,
        duration: Math.random() * 15 + 15, // Slower, more graceful
        delay: Math.random() * 10,
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
      }));
      setParticles(newParticles);
    };

    generateParticles();
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{ opacity: 0, y: `${particle.y}vh`, x: `${particle.x}vw` }}
          animate={{
            opacity: [0, 0.4, 0],
            y: `-20vh`,
            x: `${particle.x + (Math.random() * 15 - 7.5)}vw`,
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute text-pink-300/40 dark:text-pink-400/20"
          style={{ fontSize: particle.size }}
        >
          {particle.emoji}
        </motion.div>
      ))}
    </div>
  );
}
