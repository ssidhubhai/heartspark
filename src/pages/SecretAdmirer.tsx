import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Lock, Copy, Send, Mail, AlertCircle, Share2 } from 'lucide-react';

export function SecretAdmirer() {
  const { linkId } = useParams();
  const { user, login, isConfigured } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkOwner, setLinkOwner] = useState<string | null>(null);

  const isPublicView = !!linkId;
  const myLink = user ? `${window.location.origin}/secret/${user.uid}` : '';

  useEffect(() => {
    if (!db) return;

    if (isPublicView) {
      // Check if link exists/get owner info (for now just simple check)
      setLinkOwner("Someone");
    } else if (user) {
      // Fetch my messages
      const q = query(collection(db, 'secret_messages'), where('recipientId', '==', user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort client side since we don't have a composite index yet
        msgs.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        setMessages(msgs);
      });
      return () => unsubscribe();
    }
  }, [user, isPublicView, linkId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(myLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !db || !linkId) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'secret_messages'), {
        recipientId: linkId,
        text: newMessage,
        createdAt: serverTimestamp(),
      });
      setNewMessage('');
      alert("Secret message sent anonymously!");
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message.");
    } finally {
      setLoading(false);
    }
  };

  if (!isConfigured) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 space-y-4">
        <AlertCircle className="w-16 h-16 text-pink-500 mx-auto" />
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Firebase Required</h2>
        <p className="text-slate-600 dark:text-slate-400">
          The Secret Admirer feature requires a database to store messages. Please add your Firebase configuration to the .env file!
        </p>
      </div>
    );
  }

  // Public View: Sending a message
  if (isPublicView) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 mt-10">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-pink-500" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Send a Secret Message
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            They will never know who sent this. 100% anonymous.
          </p>
        </div>

        <Card className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-slate-800 dark:to-slate-800 border-pink-100 dark:border-slate-700">
          <form onSubmit={handleSend} className="space-y-4">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="I've had a crush on you since the first day of class..."
              className="w-full h-40 p-4 rounded-xl border-2 border-pink-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:border-pink-500 outline-none resize-none transition-all"
              required
            />
            <Button type="submit" disabled={loading || !newMessage.trim()} className="w-full h-14 text-lg bg-pink-500 hover:bg-pink-600 flex items-center justify-center gap-2">
              {loading ? 'Sending...' : 'Send Secretly'} <Send className="w-5 h-5" />
            </Button>
          </form>
        </Card>

        <div className="text-center pt-8 border-t border-slate-200 dark:border-slate-800">
          <p className="text-slate-600 dark:text-slate-400 mb-4">Want to get your own anonymous messages?</p>
          <Button onClick={() => window.location.href = '/secret'} className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white">
            Create Your Link Now
          </Button>
        </div>
      </div>
    );
  }

  // Owner View: Dashboard
  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-8">
        <div className="w-24 h-24 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center mx-auto">
          <Mail className="w-12 h-12 text-pink-500" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">Secret Inbox</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Create your custom link and start receiving anonymous messages from your secret admirers.
        </p>
        <Button onClick={login} className="w-full h-14 text-lg bg-pink-500 hover:bg-pink-600">
          Login with Google to Start
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white flex items-center justify-center gap-2">
          Your Secret Inbox <Mail className="w-8 h-8 text-pink-500" />
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Share your link on Instagram or WhatsApp to get anonymous messages!
        </p>
      </div>

      <Card className="bg-gradient-to-r from-pink-500 to-purple-600 text-white border-none shadow-xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 flex-1 w-full">
            <p className="text-pink-100 font-medium">Your Custom Link:</p>
            <div className="bg-white/10 p-3 rounded-lg font-mono text-sm break-all border border-white/20">
              {myLink}
            </div>
          </div>
          <Button 
            onClick={handleCopy} 
            className="w-full md:w-auto bg-white text-pink-600 hover:bg-pink-50 flex items-center gap-2 h-12 px-6"
          >
            {copied ? 'Copied!' : 'Copy Link'} <Copy className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      <div className="space-y-6 mt-12">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          Inbox <span className="bg-pink-100 dark:bg-pink-900/50 text-pink-600 dark:text-pink-400 text-sm py-1 px-3 rounded-full">{messages.length}</span>
        </h2>
        
        {messages.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <Mail className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">Your inbox is empty.</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">Share your link to get your first message!</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {messages.map((msg) => (
              <Card key={msg.id} className="hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-pink-500"></div>
                <p className="text-lg text-slate-800 dark:text-slate-200 whitespace-pre-wrap pl-4">
                  "{msg.text}"
                </p>
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 pl-4">
                  <span className="text-xs text-slate-400">
                    {msg.createdAt ? new Date(msg.createdAt.toMillis()).toLocaleString() : 'Just now'}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
