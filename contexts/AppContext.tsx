import { createContext, useContext } from 'react';
import { User, LeaderboardEntry, UserRole, AppSettings, TournamentSummary } from '../types';

export interface AppContextType {
  currentUser: User | null;
  signInWithGoogle: () => Promise<User | null>;
  logout: () => Promise<void>;
  leaderboard: LeaderboardEntry[];
  refreshLeaderboard: () => void;
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning', replacements?: Record<string, string | number>) => void;
  updateUserPoints: (userId: string, points: number) => Promise<void>;
  isFirebaseReady: boolean;
  allUsers: User[];
  refreshAllUsers: () => void;
  isBettingEnabled: boolean;
  updateAppSettings: (settings: Partial<AppSettings>) => Promise<void>;
  canEdit: boolean;
  // Whether the signed-in user owns the tournament lifecycle: creating a season,
  // renaming it, archiving it, and (from stage 2) its squad. Stricter than
  // canEdit, which still covers day-to-day score and goal entry.
  isAdmin: boolean;

  // --- Season selection, shared app-wide ---
  // Tournament, Player Info and Team Divider all render one season's data, so
  // the choice cannot live inside a single page any more.
  tournaments: TournamentSummary[];
  selectedTournamentId: string | null;
  selectedTournament: TournamentSummary | null;
  isTournamentListLoading: boolean;
  selectTournament: (tournamentId: string) => void;
  refreshTournaments: () => Promise<void>;
  // True when the selected season is archived: everything stays visible, but
  // editing controls are hidden.
  isSelectedTournamentArchived: boolean;
}

export const AppContext = createContext<AppContextType | null>(null);

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
