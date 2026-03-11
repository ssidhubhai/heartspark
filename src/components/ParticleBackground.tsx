import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface Heart {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

export function ParticleBackground() {
  const [hearts, setHearts] = useState<Heart[]>([]);

  useEffect(() => {
    const generateHearts = () => {
      const newHearts = Array.from({ length: 20 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100 + 100, // Start below screen
        size: Math.random() * 20 + 10,
        duration: Math.random() * 10 + 10,
        delay: Math.random() * 5,
      }));
      setHearts(newHearts);
    };

    generateHearts();
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
      {hearts.map((heart) => (
        <motion.div
          key={heart.id}
          initial={{ opacity: 0, y: `${heart.y}vh`, x: `${heart.x}vw` }}
          animate={{
            opacity: [0, 0.5, 0],
            y: `-20vh`,
            x: `${heart.x + (Math.random() * 10 - 5)}vw`,
          }}
          transition={{
            duration: heart.duration,
            delay: heart.delay,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute text-pink-300/30"
          style={{ fontSize: heart.size }}
        >
          ❤
        </motion.div>
      ))}
    </div>
  );
}
