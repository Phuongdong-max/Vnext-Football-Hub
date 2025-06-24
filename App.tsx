
import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { HashRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { User, UserRole, LeaderboardEntry, ToastMessage } from './types';
import { APP_TITLE } from './constants'; 
import { 
  initializeFirebase, 
  onFirebaseAuthStateChanged, 
  signInWithGoogle as performSignInWithGoogle, 
  firebaseSignOut as performFirebaseSignOut,
  updateUserPointsInFirestore,
  getFirebaseLeaderboardEntries, 
  // findOrCreateUserProfile is handled by firebaseService now.
} from './services/firebaseService';
import { Header } from './components/Header';
import { AuthComponent } from './components/Auth';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { MemberHomePage } from './pages/MemberHomePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ToastContainer } from './components/shared/ToastContainer';
import { SoccerBallIcon } from './components/icons';
import { checkFirebaseEnvironment } from './utils/envChecker';
import { LandingPage } from './components/LandingPage'; // Import LandingPage

// --- Theme Context ---
type Theme = 'light' | 'dark' | 'system';
interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  appliedTheme: 'light' | 'dark'; // Actual theme being applied (light or dark)
}

export const ThemeContext = createContext<ThemeContextType | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    return storedTheme || 'system';
  });
  const [appliedTheme, setAppliedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const root = window.document.documentElement;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)');

    const applyCurrentTheme = () => {
      let currentAppliedTheme: 'light' | 'dark';
      if (theme === 'system') {
        currentAppliedTheme = systemPrefersDark.matches ? 'dark' : 'light';
      } else {
        currentAppliedTheme = theme;
      }
      
      root.classList.remove(currentAppliedTheme === 'dark' ? 'light' : 'dark');
      root.classList.add(currentAppliedTheme);
      setAppliedTheme(currentAppliedTheme);
    };

    applyCurrentTheme(); // Initial application
    localStorage.setItem('theme', theme);

    const handleChange = () => applyCurrentTheme();
    systemPrefersDark.addEventListener('change', handleChange);
    return () => {
      systemPrefersDark.removeEventListener('change', handleChange);
    };
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, appliedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};


// --- App Context ---
interface AppContextType {
  currentUser: User | null;
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
  const [criticalError, setCriticalError] = useState<string | null>(null);


  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = new Date().toISOString() + Math.random(); 
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);
  }, []);

  const refreshLeaderboard = useCallback(async () => {
    if (isLeaderboardLoadingRef.current) return; 

    isLeaderboardLoadingRef.current = true;
    setIsLeaderboardLoading(true); 
    try {
      let data: LeaderboardEntry[] = [];
      if (isFirebaseReady && isEnvironmentSupported) {
        data = await getFirebaseLeaderboardEntries(); 
      } else {
        // No toast here, handled by main loading/error display
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
      const message = envCheck.message || "Firebase environment not supported.";
      setCriticalError(message);
      addToast(message, "error");
      setIsLoading(false); // Stop loading if environment is bad
      return;
    }

    const firebaseInitialized = initializeFirebase();
    setIsFirebaseReady(firebaseInitialized);
    
    if (!firebaseInitialized) {
        const message = "Firebase could not be initialized. App functionality will be limited.";
        setCriticalError(message);
        addToast(message, "error");
        setCurrentUser(null);
        setIsLoading(false);
        return;
    }

    setIsLoading(true); 
    // appUserFromService is the User object (or null) ALREADY processed by firebaseService.ts
    const unsubscribe = onFirebaseAuthStateChanged(async (appUserFromService) => {
      try {
        setCurrentUser(appUserFromService); // Directly use the processed user
        if (appUserFromService && appUserFromService.name) {
          // Toast for login can be here or removed if LandingPage handles it
          // addToast(`Logged in as ${appUserFromService.name}!`, 'success'); 
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
  }, [addToast, refreshLeaderboard]); // Removed isFirebaseReady and isEnvironmentSupported as they are handled at the start

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
      // The onFirebaseAuthStateChanged listener will handle setting the user and setIsLoading(false).
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
      setIsLoading(false); 
      return null;
    }
  }, [addToast, isFirebaseReady, isEnvironmentSupported]);


  const handleLogout = useCallback(async () => {
    setIsLoading(true);
    if (isFirebaseReady && currentUser) { 
        await performFirebaseSignOut(); 
    } else {
      setCurrentUser(null); 
      await refreshLeaderboard(); 
      setIsLoading(false); 
    }
    addToast("Logged out successfully.", 'info');
  }, [refreshLeaderboard, addToast, isFirebaseReady, currentUser]);
  
  const updateUserPoints = useCallback(async (userId: string, newPoints: number) => {
    try {
      if (isFirebaseReady && isEnvironmentSupported) { 
        await updateUserPointsInFirestore(userId, newPoints);
      } else {
        throw new Error("Cannot update points: Firebase not available.");
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

  const appContextValue: AppContextType = {
    currentUser,
    signInWithGoogle: handleSignInWithGoogle,
    logout: handleLogout,
    leaderboard,
    refreshLeaderboard,
    addToast,
    updateUserPoints,
    isFirebaseReady,
  };

  // Global loading/error state before deciding to show LandingPage or App
  if (isLoading && !criticalError) { 
    return (
      <ThemeProvider> {/* ThemeProvider needed for potential theme on loading screen */}
        <div className="flex items-center justify-center min-h-screen bg-background text-textPrimary">
          <SoccerBallIcon className="w-16 h-16 text-primary animate-spin" />
          <p className="ml-4 text-xl font-semibold text-textPrimary">Loading {APP_TITLE}...</p>
        </div>
      </ThemeProvider>
    );
  }

  if (criticalError) {
    return (
      <ThemeProvider>
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-textPrimary p-4 text-center">
          <SoccerBallIcon className="w-16 h-16 text-danger mb-4" />
          <h1 className="text-2xl font-bold text-danger mb-2">Application Error</h1>
          <p className="text-textSecondary">{criticalError}</p>
          <p className="mt-4 text-sm text-textSecondary">Please try refreshing the page or ensure you are using a supported browser environment.</p>
        </div>
        <ToastContainer toasts={toasts} setToasts={setToasts} />
      </ThemeProvider>
    );
  }

  // After initial loading and no critical errors:
  // If not logged in, show full-screen LandingPage
  if (!currentUser) {
    return (
      <ThemeProvider>
        <AppContext.Provider value={appContextValue}> {/* Landing page might need context for isFirebaseReady */}
          <LandingPage onSignIn={handleSignInWithGoogle} isFirebaseReady={isFirebaseReady} />
          <ToastContainer toasts={toasts} setToasts={setToasts} />
        </AppContext.Provider>
      </ThemeProvider>
    );
  }
  
  // Logged-in user view
  return (
    <ThemeProvider>
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
    </ThemeProvider>
  );
};

export default App;