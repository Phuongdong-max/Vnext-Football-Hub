
import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { HashRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { User, UserRole, LeaderboardEntry, ToastMessage } from './types';
import { APP_TITLE, MOCK_USERS_DATA } from './constants'; 
import { mockLogin as performMockLogin, mockLogout as performMockLogout, getCurrentUser as getCurrentMockUser, updateUserPointsInMock, SESSION_STORAGE_KEY, resetMockUsers } from './services/mockAuthService';
import { 
  initializeFirebase, 
  onFirebaseAuthStateChanged, 
  signInWithGoogle as performSignInWithGoogle, 
  firebaseSignOut as performFirebaseSignOut,
  updateUserPointsInFirestore,
  getFirebaseLeaderboardEntries, 
  // findOrCreateUserProfile, // No longer directly called from here for auth state changes
  getAppUserProfile
} from './services/firebaseService';
import { getLeaderboard as getMockLeaderboard, resetMockBettingData } from './services/mockBettingService'; 
import { Header } from './components/Header';
import { AuthComponent } from './components/Auth';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { MemberHomePage } from './pages/MemberHomePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ToastContainer } from './components/shared/ToastContainer';
import { SoccerBallIcon } from './components/icons';
import { checkFirebaseEnvironment } from './utils/envChecker';

interface AppContextType {
  currentUser: User | null;
  loginWithMockUser: (userId: string) => Promise<User | null>;
  signInWithGoogle: () => Promise<User | null>;
  logout: () => Promise<void>;
  leaderboard: LeaderboardEntry[];
  refreshLeaderboard: () => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  updateUserPoints: (userId: string, points: number) => Promise<void>; 
  isFirebaseReady: boolean;
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
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const isLeaderboardLoadingRef = useRef(false);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isEnvironmentSupported, setIsEnvironmentSupported] = useState(true);


  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = new Date().toISOString() + Math.random(); 
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);
  }, []);

  const refreshLeaderboard = useCallback(async () => {
    if (isLeaderboardLoadingRef.current) return; 

    isLeaderboardLoadingRef.current = true;
    setIsLeaderboardLoading(true); 
    try {
      let data: LeaderboardEntry[];
      if (isFirebaseReady && isEnvironmentSupported) {
        data = await getFirebaseLeaderboardEntries(); 
      } else {
        data = await getMockLeaderboard();
      }
      setLeaderboard(data.sort((a,b) => b.points - a.points));
    } catch (error) {
      console.error("Failed to refresh leaderboard:", error);
      addToast("Failed to refresh leaderboard", "error");
    } finally {
      setIsLeaderboardLoading(false);
      isLeaderboardLoadingRef.current = false;
    }
  }, [addToast, isFirebaseReady, isEnvironmentSupported]);

  useEffect(() => {
    const envCheck = checkFirebaseEnvironment();
    if (!envCheck.isSupported) {
      setIsEnvironmentSupported(false);
      console.error("Firebase Environment Check Failed:", envCheck.message);
    }

    const firebaseInitialized = initializeFirebase();
    setIsFirebaseReady(firebaseInitialized);
    
    if (!envCheck.isSupported && envCheck.message) {
        addToast(envCheck.message, "error");
    }

    setIsLoading(true); 
    if (firebaseInitialized && envCheck.isSupported) {
      // onFirebaseAuthStateChanged's callback receives the fully processed User (or null)
      // from firebaseService.ts, which already calls findOrCreateUserProfile.
      const unsubscribe = onFirebaseAuthStateChanged(async (appUserFromService) => {
        try {
          if (appUserFromService) {
            setCurrentUser(appUserFromService); // Directly use the user object from the service
            sessionStorage.removeItem(SESSION_STORAGE_KEY); 
            if(appUserFromService.name) addToast(`Logged in as ${appUserFromService.name} via Google!`, 'success');
          } else {
            // If Firebase logs out, check for mock user session
            const mockUser = await getCurrentMockUser();
            setCurrentUser(mockUser); 
          }
          await refreshLeaderboard(); 
        } catch (error) {
            console.error("Error processing auth state change:", error);
            addToast("An error occurred during authentication processing.", "error");
        } finally {
            setIsLoading(false); 
        }
      });
      return () => unsubscribe();
    } else {
      const initMockUserAndLeaderboard = async () => {
        try {
            resetMockUsers(); 
            resetMockBettingData(); 
            const user = await getCurrentMockUser(); 
            setCurrentUser(user);
            await refreshLeaderboard(); 
        } catch (error) {
            console.error("Error initializing mock user and leaderboard:", error);
            addToast("An error occurred setting up mock data.", "error");
        } finally {
            setIsLoading(false);
        }
      };
      initMockUserAndLeaderboard();
      if (!firebaseInitialized && envCheck.isSupported) { 
        addToast("Firebase could not be initialized. Google Sign-In will be unavailable. Using mock data.", "error");
      }
    }
  }, [addToast, refreshLeaderboard]); 

  const handleMockLogin = useCallback(async (userId: string) => {
    setIsLoading(true);
    if (isFirebaseReady && currentUser && !MOCK_USERS_DATA.some(mock => mock.id === currentUser.id)) {
        await performFirebaseSignOut(); 
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
      addToast("Google Sign-In is not supported in this environment. Please use a local web server.", "error");
      return null;
    }
    if (!isFirebaseReady) {
      addToast("Firebase is not available. Cannot sign in with Google.", "error");
      return null;
    }
    setIsLoading(true); 
    try {
      await performSignInWithGoogle(); 
      // User state will be updated by onFirebaseAuthStateChanged
      // No need to set isLoading(false) here, onFirebaseAuthStateChanged's finally block will handle it.
      return null; 
    } catch (error: any) {
      let errorMessage = "Google Sign-In Error: Unknown error";
      if (error.message) {
        errorMessage = `Google Sign-In Error: ${error.message}`;
      }
      if (error.code === 'auth/operation-not-supported-in-this-environment'){
        errorMessage = "Google Sign-In is not supported in this environment. Please ensure you are not using 'file://' protocol and web storage is enabled.";
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = "Google Sign-In cancelled by user.";
      }
      addToast(errorMessage, "error");
      setIsLoading(false); // Set loading to false here on error if onFirebaseAuthStateChanged isn't triggered
      return null;
    }
  }, [addToast, isFirebaseReady, isEnvironmentSupported]);


  const handleLogout = useCallback(async () => {
    setIsLoading(true);
    const wasFirebaseUser = currentUser && !MOCK_USERS_DATA.some(mock => mock.id === currentUser.id);

    if (isFirebaseReady && wasFirebaseUser) {
        await performFirebaseSignOut(); 
        // onFirebaseAuthStateChanged will set currentUser to null and handle isLoading
    } else {
      await performMockLogout(); 
      setCurrentUser(null); 
      await refreshLeaderboard(); 
      setIsLoading(false); // Explicitly set for mock logout
    }
    // Common actions after logout, regardless of type
    addToast("Logged out successfully.", 'info');
  }, [refreshLeaderboard, addToast, isFirebaseReady, currentUser]);
  
  const updateUserPoints = useCallback(async (userId: string, newPoints: number) => {
    const isMockUser = MOCK_USERS_DATA.some(mockUser => mockUser.id === userId);
    try {
      if (isMockUser) {
        updateUserPointsInMock(userId, newPoints);
      } else if (isFirebaseReady && isEnvironmentSupported) { 
        await updateUserPointsInFirestore(userId, newPoints);
      } else {
        throw new Error("Cannot update points: No suitable persistence layer available.");
      }
      
      if (currentUser && currentUser.id === userId) {
        setCurrentUser(prevUser => prevUser ? { ...prevUser, points: newPoints } : null);
      }
      await refreshLeaderboard(); 
    } catch (error) {
        console.error("Error updating user points:", error);
        addToast("Failed to update user points.", "error");
    }
  }, [currentUser, refreshLeaderboard, isFirebaseReady, addToast, isEnvironmentSupported]);


  if (isLoading && !toasts.some(t => t.message.includes("Firebase Environment Check Failed"))) { 
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
