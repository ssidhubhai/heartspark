import React from 'react';
import { Heart, LayoutGrid, MessageCircle, Users, Sparkles, Search, BookOpen, Gamepad2, User } from 'lucide-react';

export interface NavLink {
  name: string;
  path: string;
  icon: React.ReactNode;
  mobileOnly?: boolean;
  desktopOnly?: boolean;
}

export const MAIN_NAV_LINKS: NavLink[] = [
  { name: 'Home', path: '/', icon: <Heart className="w-full h-full" /> },
  { name: 'Explore', path: '/tools', icon: <LayoutGrid className="w-full h-full" /> },
  { name: 'Messages', path: '/messages', icon: <MessageCircle className="w-full h-full" /> },
  { name: 'Stories', path: '/stories', icon: <Users className="w-full h-full" /> },
  { name: 'Games', path: '/games', icon: <Gamepad2 className="w-full h-full" /> },
];

export const MORE_LINKS: NavLink[] = [
  { name: 'Message Analyzer', path: '/analyzer', icon: <Search className="w-full h-full" /> },
  { name: 'Story Maker', path: '/tools/story', icon: <BookOpen className="w-full h-full" /> },
  { name: 'Profile', path: '/profile', icon: <User className="w-full h-full" />, mobileOnly: true },
];
