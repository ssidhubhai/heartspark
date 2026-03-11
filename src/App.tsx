/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { LoveCalculator } from './pages/LoveCalculator';
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
import { ConfessionWall } from './pages/ConfessionWall';
import { TextAnalyzer } from './pages/TextAnalyzer';
import { LoveGPT } from './pages/LoveGPT';
import { Profile } from './pages/Profile';
import { SecretAdmirer } from './pages/SecretAdmirer';
import { CommunityStories } from './pages/CommunityStories';
import { AuthProvider } from './contexts/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/calculator" element={<LoveCalculator />} />
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
            <Route path="/confessions" element={<ConfessionWall />} />
            <Route path="/analyzer" element={<TextAnalyzer />} />
            <Route path="/love-gpt" element={<LoveGPT />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/secret" element={<SecretAdmirer />} />
            <Route path="/secret/:linkId" element={<SecretAdmirer />} />
            <Route path="/stories" element={<CommunityStories />} />
            {/* Add placeholders for other tools */}
            <Route path="/tools/*" element={<div className="text-center py-20 text-2xl font-bold text-pink-500">Coming Soon!</div>} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}
