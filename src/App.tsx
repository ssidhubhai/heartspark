/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { Analytics } from './components/Analytics';
import { Home } from './pages/Home';
import { CrushQuiz } from './pages/CrushQuiz';
import { SecretMessage } from './pages/SecretMessage';
import { FlirtingTest } from './pages/FlirtingTest';
import { MiniGames } from './pages/MiniGames';
import { Tools } from './pages/Tools';
import { AIAdvice } from './pages/AIAdvice';
import { AstrologyAI } from './pages/AstrologyAI';
import { LoveTitles } from './pages/LoveTitles';
import { CoupleStory } from './pages/CoupleStory';
import { DailyFortune } from './pages/DailyFortune';
import { CrushMessageAnalyzer } from './pages/CrushMessageAnalyzer';
import { Profile } from './pages/Profile';
import { CommunityStories } from './pages/CommunityStories';
import { CrushPrediction } from './pages/CrushPrediction';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <ScrollToTop />
          <Analytics />
          <Layout>
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
              <Route path="/analyzer" element={<CrushMessageAnalyzer />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/stories" element={<CommunityStories />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              {/* Add placeholders for other tools */}
              <Route path="/tools/*" element={<div className="text-center py-20 text-2xl font-bold text-pink-500">Coming Soon!</div>} />
            </Routes>
          </Layout>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}
