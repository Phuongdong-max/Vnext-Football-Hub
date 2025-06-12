
import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { User, UserRole, LeaderboardEntry, BettingRound, ToastMessage } from './types';
import { APP_TITLE } from './constants';
import { mockLogin, mockLogout, getCurrentUser, getMockUserById, updateUserPointsInMock } from './services/mockAuthService';
import { getLeaderboard } from './services/mockBettingService';
import { Header } from './components/Header';
import { AuthComponent } from './components/Auth';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { MemberHomePage } from './pages/MemberHomePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ToastContainer } from './components/shared/ToastContainer';
import { SoccerBallIcon } from './components/icons';


interface AppContextType {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  login: (userId: string) => Promise<User | null>;
  logout: () => Promise<void>;
  leaderboard: LeaderboardEntry[];
  refreshLeaderboard: () => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  updateUserPoints: (userId: string, points: number) => void;
}

export const AppContext = createContext<AppContextType | null>(null);

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = new Date().toISOString();
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);
  };


  const refreshLeaderboard = useCallback(async () => {
    try {
      const data = await getLeaderboard();
      setLeaderboard(data);
    } catch (error) {
      console.error("Failed to refresh leaderboard:", error);
      addToast("Failed to refresh leaderboard", "error");
    }
  }, []);

  useEffect(() => {
    const initUser = async () => {
      setIsLoading(true);
      const user = await getCurrentUser();
      setCurrentUser(user);
      await refreshLeaderboard();
      setIsLoading(false);
    };
    initUser();
  }, [refreshLeaderboard]);

  const handleLogin = useCallback(async (userId: string) => {
    setIsLoading(true);
    const user = await mockLogin(userId);
    setCurrentUser(user);
    await refreshLeaderboard();
    setIsLoading(false);
    if (user) addToast(`Welcome ${user.name}!`, 'success');
    return user;
  }, [refreshLeaderboard]);

  const handleLogout = useCallback(async () => {
    setIsLoading(true);
    await mockLogout();
    setCurrentUser(null);
    await refreshLeaderboard(); // Leaderboard might change if points are tied to session
    setIsLoading(false);
    addToast("Logged out successfully.", 'info');
  }, [refreshLeaderboard]);
  
  const updateUserPoints = useCallback((userId: string, points: number) => {
    updateUserPointsInMock(userId, points);
    setCurrentUser(prevUser => prevUser && prevUser.id === userId ? { ...prevUser, points } : prevUser);
    refreshLeaderboard();
  }, [refreshLeaderboard]);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <SoccerBallIcon className="w-16 h-16 text-primary animate-spin" />
        <p className="ml-4 text-xl font-semibold text-textPrimary">Loading {APP_TITLE}...</p>
      </div>
    );
  }
  
  const appContextValue: AppContextType = {
    currentUser,
    setCurrentUser, // Allow direct setting if needed elsewhere, though login/logout are preferred
    login: handleLogin,
    logout: handleLogout,
    leaderboard,
    refreshLeaderboard,
    addToast,
    updateUserPoints,
  };

  return (
    <AppContext.Provider value={appContextValue}>
      <HashRouter>
        <div className="flex flex-col min-h-screen bg-background text-textPrimary">
          <Header />
          <AuthComponent />
          <main className="flex-grow container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<MemberHomePage />} />
              <Route path="/admin" element={
                currentUser?.role === UserRole.ADMIN 
                  ? <AdminDashboardPage /> 
                  : <Navigate to="/" replace />
              } />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <footer className="py-4 bg-surface shadow-md">
            <div className="container mx-auto px-4 text-center text-textSecondary">
              &copy; {new Date().getFullYear()} {APP_TITLE}. All rights reserved (for fun).
            </div>
          </footer>
          <ToastContainer toasts={toasts} setToasts={setToasts} />
        </div>
      </HashRouter>
    </AppContext.Provider>
  );
};

export default App;