import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

interface Notification {
  id: string;
  message: string;
  storyId: string;
  read: boolean;
  createdAt: any;
  type: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || !db) return;

    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: Notification[] = [];
      let unread = 0;
      
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (!data.read && 'Notification' in window && Notification.permission === 'granted') {
            // Show browser notification for new items
            // Only if it's actually new (created in the last minute)
            const now = Date.now();
            const created = data.createdAt?.toMillis() || now;
            if (now - created < 60000) {
              new Notification('HeartSpark', {
                body: data.message,
                icon: 'https://api.iconify.design/lucide:heart.svg?color=%23ef4444'
              });
            }
          }
        }
      });

      snapshot.docs.forEach(doc => {
        const data = doc.data() as Omit<Notification, 'id'>;
        notifs.push({ id: doc.id, ...data });
        if (!data.read) unread++;
      });

      // Sort in memory to avoid needing a composite index in Firestore
      notifs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });

      setNotifications(notifs);
      setUnreadCount(unread);
    });

    return () => unsubscribe();
  }, [user]);

  // Periodic discovery notification (every 10-12 hours)
  useEffect(() => {
    if (!user) return;

    const checkPeriodicNotification = () => {
      if (Notification.permission !== 'granted') return;

      const lastPeriodicNotif = localStorage.getItem('lastPeriodicNotif');
      const now = Date.now();
      
      // 10 hours in milliseconds
      const TEN_HOURS = 10 * 60 * 60 * 1000;

      if (!lastPeriodicNotif || now - parseInt(lastPeriodicNotif) > TEN_HOURS) {
        new Notification('HeartSpark', {
          body: 'Check out new interesting stories and updates in the community!',
          icon: 'https://api.iconify.design/lucide:heart.svg?color=%23ef4444'
        });
        localStorage.setItem('lastPeriodicNotif', now.toString());
      }
    };

    // Check immediately on mount
    checkPeriodicNotification();

    // Then check every hour
    const interval = setInterval(checkPeriodicNotification, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  const markAsRead = async (id: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      console.error("Error marking notification as read", err);
    }
  };

  const markAllAsRead = async () => {
    if (!db) return;
    const unreadNotifs = notifications.filter(n => !n.read);
    for (const n of unreadNotifs) {
      await markAsRead(n.id);
    }
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 dark:text-white">Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map(notif => (
                  <Link
                    key={notif.id}
                    to={`/stories?id=${notif.storyId}`}
                    onClick={() => {
                      markAsRead(notif.id);
                      setIsOpen(false);
                    }}
                    className={`block p-4 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${!notif.read ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
                  >
                    <p className={`text-sm ${!notif.read ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                      {notif.message}
                    </p>
                    <span className="text-xs text-slate-400 mt-1 block">
                      {notif.createdAt ? new Date(notif.createdAt.toMillis()).toLocaleString() : 'Just now'}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
