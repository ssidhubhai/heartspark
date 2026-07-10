import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Lock } from 'lucide-react';
import { Button } from './Button';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, userData } = useAuth();
  const location = useLocation();

  React.useEffect(() => {
    // Intentionally removed auto-open of auth modal so user can read the message first
  }, [loading, user]);

  if (loading || (user && !userData)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-pink-100 dark:border-pink-900/30" />
          <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-pink-500 border-t-transparent animate-spin" />
        </div>
        <p className="text-sm font-black text-pink-500 uppercase tracking-[0.2em] animate-pulse">Authenticating...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="w-20 h-20 bg-pink-50 dark:bg-pink-500/10 rounded-full flex items-center justify-center mb-2">
          <Lock className="w-10 h-10 text-pink-500" />
        </div>
        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">
          Access Restricted
        </h2>
        <p className="text-zinc-500 max-w-md">
          You need an account to view this page. Join the lab to access your stories, messages, and profile!
        </p>
        <Button 
          variant="custom" 
          onClick={() => window.dispatchEvent(new CustomEvent('open-auth-modal'))}
          className="bg-pink-500 text-white hover:bg-pink-600 px-8 py-3 rounded-xl font-bold uppercase tracking-wider"
        >
          Sign In
        </Button>
      </div>
    );
  }

  return <>{children}</>;
};
