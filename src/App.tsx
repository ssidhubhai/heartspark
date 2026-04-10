/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { Layout } from './components/Layout';
import { Analytics } from './components/Analytics';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loader2 } from 'lucide-react';

// Lazy load pages for better performance
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const CrushQuiz = lazy(() => import('./pages/CrushQuiz').then(m => ({ default: m.CrushQuiz })));
const SecretMessage = lazy(() => import('./pages/SecretMessage').then(m => ({ default: m.SecretMessage })));
const FlirtingTest = lazy(() => import('./pages/FlirtingTest').then(m => ({ default: m.FlirtingTest })));
const MiniGames = lazy(() => import('./pages/MiniGames').then(m => ({ default: m.MiniGames })));
const Tools = lazy(() => import('./pages/Tools').then(m => ({ default: m.Tools })));
const AIAdvice = lazy(() => import('./pages/AIAdvice').then(m => ({ default: m.AIAdvice })));
const AstrologyAI = lazy(() => import('./pages/AstrologyAI').then(m => ({ default: m.AstrologyAI })));
const LoveTitles = lazy(() => import('./pages/LoveTitles').then(m => ({ default: m.LoveTitles })));
const CoupleStory = lazy(() => import('./pages/CoupleStory').then(m => ({ default: m.CoupleStory })));
const DailyFortune = lazy(() => import('./pages/DailyFortune').then(m => ({ default: m.DailyFortune })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const CommunityStories = lazy(() => import('./pages/CommunityStories').then(m => ({ default: m.CommunityStories })));
const Messages = lazy(() => import('./pages/Messages').then(m => ({ default: m.Messages })));
const CrushPrediction = lazy(() => import('./pages/CrushPrediction').then(m => ({ default: m.CrushPrediction })));
const SignalAnalyzer = lazy(() => import('./pages/SignalAnalyzer').then(m => ({ default: m.SignalAnalyzer })));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const TermsOfService = lazy(() => import('./pages/TermsOfService').then(m => ({ default: m.TermsOfService })));

function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-pink-100 dark:border-pink-900/30" />
        <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-pink-500 border-t-transparent animate-spin" />
      </div>
      <p className="text-sm font-black text-pink-500 uppercase tracking-[0.2em] animate-pulse">Loading Vibes...</p>
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <Router>
            <ScrollToTop />
            <Analytics />
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/quiz" element={<CrushQuiz />} />
                  <Route path="/secret-message" element={<SecretMessage />} />
                  <Route path="/flirting-test" element={<FlirtingTest />} />
                  <Route path="/games" element={<MiniGames />} />
                  <Route path="/tools" element={<Tools />} />
                  <Route path="/tools/ai-advice" element={<AIAdvice />} />
                  <Route path="/astrology" element={<AstrologyAI />} />
                  <Route path="/tools/titles" element={<LoveTitles />} />
                  <Route path="/tools/story" element={<CoupleStory />} />
                  <Route path="/tools/fortune" element={<DailyFortune />} />
                  <Route path="/tools/prediction" element={<CrushPrediction />} />
                  <Route path="/tools/signal-analyzer" element={<SignalAnalyzer />} />
                  <Route path="/analyzer" element={<SignalAnalyzer />} />
                  <Route path="/profile/:uid?" element={<Profile />} />
                  <Route path="/stories" element={<CommunityStories />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  {/* Add placeholders for other tools */}
                  <Route path="/tools/*" element={<div className="text-center py-20 text-2xl font-bold text-pink-500">Coming Soon!</div>} />
                </Routes>
              </Suspense>
            </Layout>
          </Router>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
