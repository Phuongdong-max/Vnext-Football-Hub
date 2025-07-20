
import { createContext, useContext } from 'react';
import { User, LeaderboardEntry, UserRole } from '../types';

export interface AppContextType {
  currentUser: User | null;
  signInWithGoogle: () => Promise<User | null>;
  logout: () => Promise<void>;
  leaderboard: LeaderboardEntry[];
  refreshLeaderboard: () => void;
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning', isTranslationKey?: boolean, replacements?: Record<string, string | number>) => void;
  updateUserPoints: (userId: string, points: number) => Promise<void>; 
  isFirebaseReady: boolean;
  allUsers: User[]; 
  refreshAllUsers: () => void;
}

export const AppContext = createContext<AppContextType | null>(null);

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
