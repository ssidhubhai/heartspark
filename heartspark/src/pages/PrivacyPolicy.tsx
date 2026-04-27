import React from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, Eye, Database, Heart } from 'lucide-react';

export function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.8 }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-pink-100 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 mb-6"
        >
          <Shield className="w-10 h-10" />
        </motion.div>
        <h1 className="text-5xl md:text-6xl font-bold text-zinc-900 dark:text-white mb-6 tracking-tight">
          Privacy <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400">Policy</span>
        </h1>
        <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
          Your privacy is our priority. Here's how we protect your data and keep your secrets safe.
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-4">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-3xl shadow-xl border border-pink-100/50 dark:border-pink-900/30 p-8 md:p-12 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-rose-500"></div>
        
        <div className="space-y-10 text-zinc-700 dark:text-zinc-300 leading-relaxed">
          <section className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400">
                <Eye className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">1. Information We Collect</h2>
            </div>
            <p className="mb-4 text-lg">
              When you use HeartSpark, we may collect the following types of information:
            </p>
            <ul className="list-disc pl-6 space-y-3 text-lg">
              <li><strong className="text-zinc-900 dark:text-white">Account Information:</strong> If you create an account via Google or Email, we collect your email address, name, and profile picture provided by the authentication service.</li>
              <li><strong className="text-zinc-900 dark:text-white">Messaging Data:</strong> Messages, reactions, and Time Capsules are securely stored to enable real-time communication between users.</li>
              <li><strong className="text-zinc-900 dark:text-white">AI Interactions:</strong> Conversations with the Heart Spark AI assistant are processed to provide helpful responses. We do not use these conversations for advertising.</li>
              <li><strong className="text-zinc-900 dark:text-white">Usage Data:</strong> We collect anonymous analytics data regarding how you interact with our tools to improve user experience.</li>
            </ul>
          </section>

          <section className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Database className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">2. How We Store Your Data</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div className="bg-pink-50/50 dark:bg-zinc-800/50 p-6 rounded-2xl border border-pink-100 dark:border-pink-900/30">
                <h3 className="font-bold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-pink-500" /> Local Storage
                </h3>
                <p>Your private conversations with LoveGPT, text analyzer inputs, and quiz results are stored locally on your device. We do not transmit or store these private inputs on our servers.</p>
              </div>
              <div className="bg-purple-50/50 dark:bg-zinc-800/50 p-6 rounded-2xl border border-purple-100 dark:border-purple-900/30">
                <h3 className="font-bold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                  <Database className="w-4 h-4 text-purple-500" /> Cloud Storage
                </h3>
                <p>Public features like Community Stories and user authentication are securely stored using Google Firebase with strict security rules.</p>
              </div>
            </div>
          </section>

          <section className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">3. Third-Party Services</h2>
            </div>
            <p className="mb-4 text-lg">
              We utilize third-party services that may collect information used to identify you:
            </p>
            <ul className="list-disc pl-6 space-y-3 text-lg">
              <li><strong className="text-zinc-900 dark:text-white">Google Analytics / Vercel Analytics:</strong> For tracking website traffic and usage patterns.</li>
              <li><strong className="text-zinc-900 dark:text-white">Google Firebase:</strong> For secure user authentication and database hosting.</li>
              <li><strong className="text-zinc-900 dark:text-white">Google Gemini API:</strong> For processing AI responses. Inputs sent to the AI are processed by Google's servers in accordance with their API terms of service.</li>
            </ul>
          </section>

          <section className="relative">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">4. Cookies</h2>
            <p className="text-lg">
              We use cookies and similar tracking technologies to track activity on our service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
            </p>
          </section>

          <section className="relative">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">5. Your Rights</h2>
            <p className="text-lg">
              You have the right to request access to, correction of, or deletion of your personal data. If you wish to delete your account and associated data from our community board, you can do so from your Profile settings or by contacting us.
            </p>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
