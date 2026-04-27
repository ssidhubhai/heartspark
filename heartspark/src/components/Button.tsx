import { ReactNode, ButtonHTMLAttributes } from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { cn } from '../utils/cn';

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "whileHover" | "whileTap"> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'custom';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  isLoading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  isLoading,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-black disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)] hover:shadow-[0_0_25px_rgba(236,72,153,0.6)] hover:brightness-110 animate-gradient-x",
    secondary: "bg-pink-50 dark:bg-white/10 text-pink-600 dark:text-white backdrop-blur-md border border-pink-100 dark:border-white/20 hover:bg-pink-100 dark:hover:bg-white/20",
    outline: "border border-pink-500/50 text-pink-500 dark:text-pink-400 hover:bg-pink-500/10 hover:border-pink-500 shadow-[0_0_10px_rgba(236,72_153,0.1)] dark:shadow-[0_0_10px_rgba(236,72_153,0.2)]",
    ghost: "text-zinc-500 dark:text-zinc-400 hover:text-pink-500 dark:hover:text-pink-400 hover:bg-pink-50 dark:hover:bg-white/5",
    custom: "", // Allows full override via className
  };

  const sizes = {
    sm: "h-9 px-4 text-sm",
    md: "h-11 px-6 text-base",
    lg: "h-14 px-8 text-lg font-display tracking-wide",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading...
        </span>
      ) : (
        children
      )}
    </motion.button>
  );
}
