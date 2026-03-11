import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, updateDoc, doc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Heart, MessageCircle, Send, AlertCircle } from 'lucide-react';

interface Confession {
  id: string;
  text: string;
  author: string;
  likes: number;
  createdAt: any;
  likedBy?: string[];
}

export function ConfessionWall() {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [newConfession, setNewConfession] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, isConfigured } = useAuth();

  useEffect(() => {
    if (!db) return;

    const q = query(collection(db, 'confessions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const confessionData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Confession[];
      setConfessions(confessionData);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Please login to post a confession!");
      return;
    }
    if (!newConfession.trim() || !db) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'confessions'), {
        text: newConfession,
        author: authorName.trim() || 'Anonymous',
        likes: 0,
        createdAt: serverTimestamp(),
        userId: user.uid,
        likedBy: []
      });
      setNewConfession('');
      setAuthorName('');
    } catch (error) {
      console.error("Error adding confession: ", error);
      alert("Failed to post confession.");
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (confession: Confession) => {
    if (!db) return;
    if (!user) {
      alert("Please login to like confessions!");
      return;
    }

    try {
      const confessionRef = doc(db, 'confessions', confession.id);
      const hasLiked = confession.likedBy?.includes(user.uid);

      if (hasLiked) {
        await updateDoc(confessionRef, {
          likes: increment(-1),
          likedBy: arrayRemove(user.uid)
        });
      } else {
        await updateDoc(confessionRef, {
          likes: increment(1),
          likedBy: arrayUnion(user.uid)
        });
      }
    } catch (error) {
      console.error("Error liking confession: ", error);
    }
  };

  if (!isConfigured) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 space-y-4">
        <AlertCircle className="w-16 h-16 text-pink-500 mx-auto" />
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Firebase Required</h2>
        <p className="text-slate-600 dark:text-slate-400">
          The Confession Wall requires a database to store messages. Please add your Firebase configuration to the .env file to unlock this feature!
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white flex items-center justify-center gap-2">
          Anonymous Confession Wall <MessageCircle className="w-8 h-8 text-pink-500" />
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Drop a secret message for your crush. They might just read it.
        </p>
      </div>

      {user ? (
        <Card className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-slate-800 dark:to-slate-800 border-pink-100 dark:border-slate-700">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <textarea
                value={newConfession}
                onChange={(e) => setNewConfession(e.target.value)}
                placeholder="I saw you in the library today..."
                className="w-full h-32 p-4 rounded-xl border-2 border-pink-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:border-pink-500 outline-none resize-none transition-all"
                required
                maxLength={500}
              />
              <div className="text-right text-xs text-slate-500 mt-1">
                {newConfession.length}/500
              </div>
            </div>
            <div className="flex gap-4">
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Your Name (Optional)"
                className="flex-1 h-12 px-4 rounded-xl border-2 border-pink-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:border-pink-500 outline-none transition-all"
              />
              <Button type="submit" disabled={loading || !newConfession.trim()} className="h-12 px-8 flex items-center gap-2">
                {loading ? 'Posting...' : 'Post Secret'} <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Card className="bg-pink-50 dark:bg-slate-800 border-pink-100 dark:border-slate-700 text-center py-8">
          <p className="text-slate-600 dark:text-slate-300 mb-4">Login to post your own secret confession!</p>
        </Card>
      )}

      <div className="space-y-4">
        {confessions.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            No confessions yet. Be the first to drop a secret!
          </div>
        ) : (
          confessions.map((confession) => (
            <Card key={confession.id} className="hover:shadow-md transition-shadow">
              <p className="text-lg text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                "{confession.text}"
              </p>
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <span className="text-sm font-medium text-pink-500">
                  - {confession.author}
                </span>
                <button 
                  onClick={() => handleLike(confession)}
                  className={`flex items-center gap-1 transition-colors ${user && confession.likedBy?.includes(user.uid) ? 'text-pink-500' : 'text-slate-500 hover:text-pink-500'}`}
                >
                  <Heart className={`w-5 h-5 ${user && confession.likedBy?.includes(user.uid) ? 'fill-pink-500' : ''}`} />
                  <span className="text-sm font-medium">{confession.likes || 0}</span>
                </button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
