
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
} from './services/firebaseService';
import { Header } from './components/Header';
import { AuthComponent } from './components/Auth';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { MemberHomePage } from './pages/MemberHomePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ToastContainer } from './components/shared/ToastContainer';
import { SoccerBallIcon } from './components/icons';
import { checkFirebaseEnvironment } from './utils/envChecker';
import { LandingPage } from './components/LandingPage';

// --- Theme Context ---
type Theme = 'light' | 'dark' | 'system';
interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  appliedTheme: 'light' | 'dark'; 
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

    applyCurrentTheme();
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

// --- Language Context ---
export type SupportedLanguage = 'en' | 'vi';
interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  translate: (key: string, replacements?: Record<string, string | number>) => string;
}

export const LanguageContext = createContext<LanguageContextType | null>(null);

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    const storedLang = localStorage.getItem('language') as SupportedLanguage | null;
    if (storedLang && ['en', 'vi'].includes(storedLang)) {
      return storedLang;
    }
    const browserLang = navigator.language.split('-')[0];
    if (browserLang === 'vi') return 'vi';
    return 'en';
  });
  const [translations, setTranslations] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const response = await fetch(`/locales/${language}.json`);
        if (!response.ok) {
          console.error(`Failed to load translations for ${language}. Status: ${response.status}`);
           // Attempt to load English translations as a fallback
          if (language !== 'en') {
            const fallbackResponse = await fetch(`/locales/en.json`);
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              setTranslations(fallbackData);
              console.warn(`Loaded English translations as fallback.`);
            } else {
              throw new Error(`Failed to load fallback English translations.`);
            }
          } else {
            throw new Error(`Failed to load translations for ${language}`);
          }
          return;
        }
        const data = await response.json();
        setTranslations(data);
        document.documentElement.lang = language;
      } catch (error) {
        console.error("Error loading translation file:", error);
        setTranslations({}); // Clear translations or set to default empty
      }
    };
    loadTranslations();
  }, [language]);

  const setLanguage = (lang: SupportedLanguage) => {
    localStorage.setItem('language', lang);
    setLanguageState(lang);
  };

  const translate = useCallback((key: string, replacements?: Record<string, string | number>): string => {
    let translatedString = translations[key] || key; // Return key if translation not found
    if (replacements) {
      Object.keys(replacements).forEach(placeholder => {
        translatedString = translatedString.replace(new RegExp(`{{${placeholder}}}`, 'g'), String(replacements[placeholder]));
      });
    }
    return translatedString;
  }, [translations]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translate }}>
      {children}
    </LanguageContext.Provider>
  );
};


// --- App Context ---
interface AppContextType {
  currentUser: User | null;
  signInWithGoogle: () => Promise<User | null>;
  logout: () => Promise<void>;
  leaderboard: LeaderboardEntry[];
  refreshLeaderboard: () => void;
  addToast: (message: string, type: 'success' | 'error' | 'info', isTranslationKey?: boolean, replacements?: Record<string, string | number>) => void;
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

const AppCore: React.FC = () => { // Renamed App to AppCore
  const { translate } = useLanguage(); // Moved useLanguage here
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true); 
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const isLeaderboardLoadingRef = useRef(false);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isEnvironmentSupported, setIsEnvironmentSupported] = useState(true);
  const [criticalError, setCriticalError] = useState<string | null>(null);


  const addToast = useCallback((messageOrKey: string, type: 'success' | 'error' | 'info' = 'info', isTranslationKey: boolean = false, replacements?: Record<string, string | number>) => {
    const id = new Date().toISOString() + Math.random(); 
    const message = isTranslationKey ? translate(messageOrKey, replacements) : messageOrKey;
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);
  }, [translate]);

  const refreshLeaderboard = useCallback(async () => {
    if (isLeaderboardLoadingRef.current) return; 

    isLeaderboardLoadingRef.current = true;
    setIsLeaderboardLoading(true); 
    try {
      let data: LeaderboardEntry[] = [];
      if (isFirebaseReady && isEnvironmentSupported) {
        data = await getFirebaseLeaderboardEntries(); 
      }
      setLeaderboard(data.sort((a,b) => b.points - a.points));
    } catch (error) {
      console.error("Failed to refresh leaderboard:", error);
      addToast("error.failedToRefreshLeaderboard", "error", true);
    } finally {
      setIsLeaderboardLoading(false);
      isLeaderboardLoadingRef.current = false;
    }
  }, [addToast, isFirebaseReady, isEnvironmentSupported]);

  useEffect(() => {
    const envCheck = checkFirebaseEnvironment();
    if (!envCheck.isSupported) {
      setIsEnvironmentSupported(false);
      const message = envCheck.message || translate("error.firebaseEnvNotSupported");
      setCriticalError(message);
      addToast(message, "error");
      setIsLoading(false);
      return;
    }

    const firebaseInitialized = initializeFirebase();
    setIsFirebaseReady(firebaseInitialized);
    
    if (!firebaseInitialized) {
        const message = translate("error.firebaseInitFailed");
        setCriticalError(message);
        addToast(message, "error");
        setCurrentUser(null);
        setIsLoading(false);
        return;
    }

    setIsLoading(true); 
    const unsubscribe = onFirebaseAuthStateChanged(async (appUserFromService) => {
      try {
        setCurrentUser(appUserFromService);
        if (appUserFromService && appUserFromService.name) {
          // addToast(translate("toast.loggedInAs", { name: appUserFromService.name }), 'success');
        }
        await refreshLeaderboard(); 
      } catch (error) {
          console.error("Error processing auth state change:", error);
          addToast("error.authProcessingError", "error", true);
      } finally {
          setIsLoading(false); 
      }
    });
    return () => unsubscribe();
  }, [addToast, refreshLeaderboard, translate]);

  const handleSignInWithGoogle = useCallback(async (): Promise<User | null> => {
    if (!isEnvironmentSupported) {
      addToast("error.googleSignInNotSupportedEnv", "error", true);
      return null;
    }
    if (!isFirebaseReady) {
      addToast("error.firebaseNotAvailable", "error", true);
      return null;
    }
    setIsLoading(true); 
    try {
      await performSignInWithGoogle(); 
      return null; 
    } catch (error: any) {
      let errorMessageKey = "error.googleSignInErrorUnknown";
      if (error.code === 'auth/operation-not-supported-in-this-environment'){
        errorMessageKey = "error.googleSignInNotSupportedEnvDetailed";
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessageKey = "error.googleSignInCancelled";
      }
      addToast(errorMessageKey, "error", true, { message: error.message });
      setIsLoading(false); 
      return null;
    }
  }, [addToast, isFirebaseReady, isEnvironmentSupported, translate]);


  const handleLogout = useCallback(async () => {
    setIsLoading(true);
    if (isFirebaseReady && currentUser) { 
        await performFirebaseSignOut(); 
    } else {
      setCurrentUser(null); 
      await refreshLeaderboard(); 
      setIsLoading(false); 
    }
    addToast("toast.loggedOut", 'info', true);
  }, [refreshLeaderboard, addToast, isFirebaseReady, currentUser, translate]);
  
  const updateUserPoints = useCallback(async (userId: string, newPoints: number) => {
    try {
      if (isFirebaseReady && isEnvironmentSupported) { 
        await updateUserPointsInFirestore(userId, newPoints);
      } else {
        throw new Error(translate("error.cannotUpdatePointsNoFirebase"));
      }
      
      if (currentUser && currentUser.id === userId) {
        setCurrentUser(prevUser => prevUser ? { ...prevUser, points: newPoints } : null);
      }
      await refreshLeaderboard(); 
    } catch (error) {
        console.error("Error updating user points:", error);
        addToast("error.failedToUpdateUserPoints", "error", true);
    }
  }, [currentUser, refreshLeaderboard, isFirebaseReady, addToast, isEnvironmentSupported, translate]);

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

  if (isLoading && !criticalError) { 
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-textPrimary">
        <SoccerBallIcon className="w-16 h-16 text-primary animate-spin" />
        <p className="ml-4 text-xl font-semibold text-textPrimary">{translate("app.loadingTitle", { appTitle: translate(APP_TITLE) })}</p>
      </div>
    );
  }

  if (criticalError) {
    return (
      <>
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-textPrimary p-4 text-center">
          <SoccerBallIcon className="w-16 h-16 text-danger mb-4" />
          <h1 className="text-2xl font-bold text-danger mb-2">{translate("error.appErrorTitle")}</h1>
          <p className="text-textSecondary">{criticalError}</p>
          <p className="mt-4 text-sm text-textSecondary">{translate("error.appErrorGuidance")}</p>
        </div>
        <ToastContainer toasts={toasts} setToasts={setToasts} />
      </>
    );
  }

  if (!currentUser) {
    return (
      <AppContext.Provider value={appContextValue}>
        <LandingPage onSignIn={handleSignInWithGoogle} isFirebaseReady={isFirebaseReady} />
        <ToastContainer toasts={toasts} setToasts={setToasts} />
      </AppContext.Provider>
    );
  }
  
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
              {translate("footer.copyright", { year: new Date().getFullYear(), appTitle: translate(APP_TITLE) })}
            </div>
          </footer>
          <ToastContainer toasts={toasts} setToasts={setToasts} />
        </div>
      </HashRouter>
    </AppContext.Provider>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppCore />
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
