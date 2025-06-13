
import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { User, UserRole, LeaderboardEntry, ToastMessage } from './types';
import { APP_TITLE, MOCK_USERS_DATA } from './constants'; 
import { mockLogin as performMockLogin, mockLogout as performMockLogout, getCurrentUser as getCurrentMockUser, updateUserPointsInMock, SESSION_STORAGE_KEY } from './services/mockAuthService';
import { 
  initializeFirebase, 
  onFirebaseAuthStateChanged, 
  signInWithGoogle as performSignInWithGoogle, 
  firebaseSignOut as performFirebaseSignOut,
  updateUserPointsInFirestore
} from './services/firebaseService';
import { getLeaderboard } from './services/mockBettingService';
import { Header } from './components/Header';
import { AuthComponent } from './components/Auth';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { MemberHomePage } from './pages/MemberHomePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ToastContainer } from './components/shared/ToastContainer';
import { SoccerBallIcon } from './components/icons';
import { checkFirebaseEnvironment } from './utils/envChecker'; // New import

interface AppContextType {
  currentUser: User | null;
  loginWithMockUser: (userId: string) => Promise<User | null>;
  signInWithGoogle: () => Promise<User | null>;
  logout: () => Promise<void>;
  leaderboard: LeaderboardEntry[];
  refreshLeaderboard: () => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  updateUserPoints: (userId: string, points: number) => void;
  isFirebaseReady: boolean;
  // isEnvironmentSupported: boolean; // Optionally expose if needed by more components
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
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isEnvironmentSupported, setIsEnvironmentSupported] = useState(true);


  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = new Date().toISOString() + Math.random(); // Ensure unique ID for toasts
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);
  }, []);

  const refreshLeaderboard = useCallback(async () => {
    try {
      const data = await getLeaderboard();
      setLeaderboard(data);
    } catch (error) {
      console.error("Failed to refresh leaderboard:", error);
      addToast("Failed to refresh leaderboard", "error");
    }
  }, [addToast]);

  useEffect(() => {
    const envCheck = checkFirebaseEnvironment();
    if (!envCheck.isSupported) {
      setIsEnvironmentSupported(false);
      console.error("Firebase Environment Check Failed:", envCheck.message);
      if (envCheck.message) {
        // alert(envCheck.message); // Use alert for critical initial errors if toasts might not show
        // For now, relying on the toast that will be added below.
      }
    }

    const firebaseInitialized = initializeFirebase();
    setIsFirebaseReady(firebaseInitialized);
    
    // Display environment check toast after firebase init attempt and addToast is definitely ready.
    if (!envCheck.isSupported && envCheck.message) {
        addToast(envCheck.message, "error");
    }

    if (firebaseInitialized && envCheck.isSupported) {
      const unsubscribe = onFirebaseAuthStateChanged(async (userFromFirebase) => {
        if (userFromFirebase) {
          setCurrentUser(userFromFirebase);
          sessionStorage.removeItem(SESSION_STORAGE_KEY); // Clear mock session
          addToast(`Logged in as ${userFromFirebase.name} via Google!`, 'success');
          await refreshLeaderboard();
        } else {
          const mockUser = await getCurrentMockUser();
          if (mockUser) {
            setCurrentUser(mockUser);
          } else {
            setCurrentUser(null);
          }
        }
        setIsLoading(false); 
      });
      return () => unsubscribe();
    } else {
      // Firebase not available or environment not supported for Firebase Auth
      // Fallback to mock user initialization
      const initMockUser = async () => {
        const user = await getCurrentMockUser();
        setCurrentUser(user);
        if(user) await refreshLeaderboard(); // Only refresh if there's a user
        setIsLoading(false);
      };
      initMockUser();
       if (!firebaseInitialized && envCheck.isSupported) { // Only show this if env was ok but firebase itself failed
        addToast("Firebase could not be initialized. Google Sign-In will be unavailable.", "error");
      }
    }
  }, [addToast, refreshLeaderboard]); // refreshLeaderboard added back as it's called in effect. addToast is stable.

  const handleMockLogin = useCallback(async (userId: string) => {
    setIsLoading(true);
    if (isFirebaseReady && currentUser?.id !== userId) { 
      // Log out Firebase user only if different from mock user being logged in
      const firebaseUserViaAuth = window.firebase?.auth?.().currentUser;
      if (firebaseUserViaAuth) {
          await performFirebaseSignOut();
      }
    }
    const user = await performMockLogin(userId);
    setCurrentUser(user);
    await refreshLeaderboard();
    setIsLoading(false);
    if (user) addToast(`Welcome ${user.name}! (Mock User)`, 'success');
    return user;
  }, [refreshLeaderboard, addToast, isFirebaseReady, currentUser]);

  const handleSignInWithGoogle = useCallback(async (): Promise<User | null> => {
    if (!isEnvironmentSupported) {
      addToast("Google Sign-In is not supported in this environment (e.g. 'file://' protocol or web storage disabled). Please use a local web server.", "error");
      return null;
    }
    if (!isFirebaseReady) {
      addToast("Firebase is not available. Cannot sign in with Google.", "error");
      return null;
    }
    setIsLoading(true);
    try {
      await performSignInWithGoogle(); 
      // User state will be set by onFirebaseAuthStateChanged listener.
      // The listener will also call setIsLoading(false) after processing auth state.
      // We can return the currentUser, but it might be slightly stale if the listener hasn't fired yet for this exact change.
      // The listener is the source of truth for UI updates.
      // No need to setIsLoading(false) here, as listener handles it.
      return currentUser; 
    } catch (error: any) {
      // The error might have already been caught and logged by firebaseService, 
      // but an additional toast here provides UI feedback.
      let errorMessage = "Google Sign-In Error: Unknown error";
      if (error.message) {
        errorMessage = `Google Sign-In Error: ${error.message}`;
      }
      if (error.code === 'auth/operation-not-supported-in-this-environment'){
        errorMessage = "Google Sign-In is not supported in this environment. Please ensure you are not using 'file://' protocol and web storage is enabled.";
      }
      addToast(errorMessage, "error");
      setIsLoading(false);
      return null;
    }
  }, [addToast, isFirebaseReady, currentUser, isEnvironmentSupported, refreshLeaderboard]);


  const handleLogout = useCallback(async () => {
    setIsLoading(true);
    if (isFirebaseReady) {
      const firebaseUserViaAuth = window.firebase?.auth?.().currentUser;
      if (firebaseUserViaAuth) {
        await performFirebaseSignOut(); // This will trigger onFirebaseAuthStateChanged
      }
    }
    await performMockLogout(); 
    // onFirebaseAuthStateChanged will set currentUser to null if Firebase user logs out
    // or to mock user if one exists. If both are out, it will be null.
    // Explicitly setting to null here might be redundant if Firebase was the one logged in,
    // but ensures mock user is also cleared from local state.
    setCurrentUser(null); 
    await refreshLeaderboard(); // Refresh to reflect logged-out state for leaderboard if necessary
    setIsLoading(false);
    addToast("Logged out successfully.", 'info');
  }, [refreshLeaderboard, addToast, isFirebaseReady]);
  
  const updateUserPoints = useCallback(async (userId: string, points: number) => {
    const isMockUser = MOCK_USERS_DATA.some(mockUser => mockUser.id === userId);
    try {
      if (isMockUser) {
        updateUserPointsInMock(userId, points);
      } else if (isFirebaseReady && isEnvironmentSupported) { // Check env support for Firestore ops too
        await updateUserPointsInFirestore(userId, points);
      } else {
        throw new Error("Cannot update points: No suitable persistence layer available.");
      }
      setCurrentUser(prevUser => prevUser && prevUser.id === userId ? { ...prevUser, points } : prevUser);
      refreshLeaderboard(); 
    } catch (error) {
        console.error("Error updating user points:", error);
        addToast("Failed to update user points.", "error");
    }
  }, [refreshLeaderboard, isFirebaseReady, addToast, isEnvironmentSupported]);


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
    loginWithMockUser: handleMockLogin,
    signInWithGoogle: handleSignInWithGoogle,
    logout: handleLogout,
    leaderboard,
    refreshLeaderboard,
    addToast,
    updateUserPoints,
    isFirebaseReady,
    // isEnvironmentSupported, // Expose if needed
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
