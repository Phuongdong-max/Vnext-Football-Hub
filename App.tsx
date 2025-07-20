
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
import { TeamDividerPage } from './pages/TeamDividerPage';
import { TournamentPage } from './pages/TournamentPage';
import { ToastContainer } from './components/shared/ToastContainer';
import { SoccerBallIcon } from './components/icons';
import { checkFirebaseEnvironment } from './utils/envChecker';
import { LandingPage } from './components/LandingPage';
import { LockScreen } from './components/LockScreen';
import { AppContext, AppContextType } from './contexts/AppContext';

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
  translationsLoading: boolean; // Added
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
  const [translationsLoading, setTranslationsLoading] = useState(true); // Added

  useEffect(() => {
    let active = true; // Prevent state updates if component unmounts
    setTranslationsLoading(true); 

    const loadTranslationsAsync = async () => {
      try {
        const response = await fetch(`/locales/${language}.json`);
        if (!response.ok) {
          console.error(`Failed to load translations for ${language}. Status: ${response.status}`);
          if (language !== 'en') {
            console.warn(`Attempting to load English translations as fallback.`);
            const fallbackResponse = await fetch(`/locales/en.json`);
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              if (active) {
                setTranslations(fallbackData);
                document.documentElement.lang = 'en';
                console.warn(`Loaded English translations as fallback.`);
              }
            } else {
              console.error(`Failed to load fallback English translations. Status: ${fallbackResponse.status}`);
              if (active) {
                setTranslations({}); 
                document.documentElement.lang = 'en'; 
              }
            }
          } else { 
             if (active) {
                setTranslations({});
                document.documentElement.lang = 'en';
             }
          }
        } else { 
          const data = await response.json();
          if (active) {
            setTranslations(data);
            document.documentElement.lang = language;
          }
        }
      } catch (error) {
        console.error("Error loading translation file:", error);
        if (active) {
          setTranslations({});
          document.documentElement.lang = 'en';
        }
      } finally {
        if (active) {
          setTranslationsLoading(false);
        }
      }
    };

    loadTranslationsAsync();

    return () => {
      active = false; 
    };
  }, [language]);

  const setLanguage = (lang: SupportedLanguage) => {
    localStorage.setItem('language', lang);
    setLanguageState(lang);
  };

  const translate = useCallback((key: string, replacements?: Record<string, string | number>): string => {
    let translatedString = translations[key] || key; 
    if (replacements) {
      Object.keys(replacements).forEach(placeholder => {
        translatedString = translatedString.replace(new RegExp(`{{${placeholder}}}`, 'g'), String(replacements[placeholder]));
      });
    }
    return translatedString;
  }, [translations]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translate, translationsLoading }}>
      {children}
    </LanguageContext.Provider>
  );
};


// --- App Context Provider ---

const AppCore: React.FC = () => {
  const { translate, translationsLoading, language } = useLanguage(); 
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true); 
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const isLeaderboardLoadingRef = useRef(false);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isEnvironmentSupported, setIsEnvironmentSupported] = useState(true);
  const [criticalError, setCriticalError] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    try {
      const unlockedStatus = localStorage.getItem('isAppUnlocked');
      if (unlockedStatus === 'true') {
        setIsUnlocked(true);
      }
    } catch (e) {
      console.error("Could not access localStorage to check unlock status", e);
      setIsUnlocked(false);
    }
  }, []);


  const addToast = useCallback((messageOrKey: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', isTranslationKey: boolean = false, replacements?: Record<string, string | number>) => {
    const id = new Date().toISOString() + Math.random(); 
    const message = isTranslationKey && !translationsLoading ? translate(messageOrKey, replacements) : messageOrKey; // Only translate if not loading
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);
  }, [translate, translationsLoading]);

  const handleUnlock = () => {
    try {
      localStorage.setItem('isAppUnlocked', 'true');
      setIsUnlocked(true);
    } catch (e) {
      console.error("Could not set unlock status in localStorage", e);
      setIsUnlocked(true);
      addToast('Could not save unlock status for future visits.', 'warning');
    }
  };

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
      // Use key directly if translations might not be ready
      const msgKey = "error.failedToRefreshLeaderboard";
      addToast(translationsLoading ? msgKey : translate(msgKey), "error", translationsLoading);
    } finally {
      setIsLeaderboardLoading(false);
      isLeaderboardLoadingRef.current = false;
    }
  }, [addToast, isFirebaseReady, isEnvironmentSupported, translate, translationsLoading]);

  useEffect(() => {
    const envCheck = checkFirebaseEnvironment();
    if (!envCheck.isSupported) {
      setIsEnvironmentSupported(false);
      // Use key directly if translations might not be ready
      const messageKey = "error.firebaseEnvNotSupported";
      const message = translationsLoading ? messageKey : (envCheck.message || translate(messageKey));
      setCriticalError(message);
      addToast(message, "error", translationsLoading && !envCheck.message);
      setIsLoading(false);
      return;
    }

    const firebaseInitialized = initializeFirebase();
    setIsFirebaseReady(firebaseInitialized);
    
    if (!firebaseInitialized) {
        const messageKey = "error.firebaseInitFailed";
        const message = translationsLoading ? messageKey : translate(messageKey);
        setCriticalError(message);
        addToast(message, "error", translationsLoading);
        setCurrentUser(null);
        setIsLoading(false);
        return;
    }

    setIsLoading(true); 
    const unsubscribe = onFirebaseAuthStateChanged(async (appUserFromService) => {
      try {
        setCurrentUser(appUserFromService);
        // if (appUserFromService && appUserFromService.name) {
        //   addToast(translate("toast.loggedInAs", { name: appUserFromService.name }), 'success');
        // }
        await refreshLeaderboard(); 
      } catch (error) {
          console.error("Error processing auth state change:", error);
          const msgKey = "error.authProcessingError";
          addToast(translationsLoading ? msgKey : translate(msgKey), "error", translationsLoading);
      } finally {
          setIsLoading(false); 
      }
    });
    return () => unsubscribe();
  }, [addToast, refreshLeaderboard, translate, translationsLoading]); // Added translationsLoading dependency

  const handleSignInWithGoogle = useCallback(async (): Promise<User | null> => {
    if (!isEnvironmentSupported) {
      const msgKey = "error.googleSignInNotSupportedEnv";
      addToast(translationsLoading ? msgKey : translate(msgKey), "error", translationsLoading);
      return null;
    }
    if (!isFirebaseReady) {
      const msgKey = "error.firebaseNotAvailable";
      addToast(translationsLoading ? msgKey : translate(msgKey), "error", translationsLoading);
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
      addToast(translationsLoading ? errorMessageKey : translate(errorMessageKey), "error", translationsLoading, { message: error.message });
      setIsLoading(false); 
      return null;
    }
  }, [addToast, isFirebaseReady, isEnvironmentSupported, translate, translationsLoading]);


  const handleLogout = useCallback(async () => {
    setIsLoading(true);
    if (isFirebaseReady && currentUser) { 
        await performFirebaseSignOut(); 
    } else {
      setCurrentUser(null); 
      await refreshLeaderboard(); 
      setIsLoading(false); 
    }
    const msgKey = "toast.loggedOut";
    addToast(translationsLoading ? msgKey : translate(msgKey), 'info', translationsLoading);
  }, [refreshLeaderboard, addToast, isFirebaseReady, currentUser, translate, translationsLoading]);
  
  const updateUserPoints = useCallback(async (userId: string, newPoints: number) => {
    try {
      if (isFirebaseReady && isEnvironmentSupported) { 
        await updateUserPointsInFirestore(userId, newPoints);
      } else {
        const msgKey = "error.cannotUpdatePointsNoFirebase";
        throw new Error(translationsLoading ? msgKey : translate(msgKey));
      }
      
      if (currentUser && currentUser.id === userId) {
        setCurrentUser(prevUser => prevUser ? { ...prevUser, points: newPoints } : null);
      }
      await refreshLeaderboard(); 
    } catch (error) {
        console.error("Error updating user points:", error);
        const msgKey = "error.failedToUpdateUserPoints";
        addToast(translationsLoading ? msgKey : translate(msgKey), "error", translationsLoading);
    }
  }, [currentUser, refreshLeaderboard, isFirebaseReady, addToast, isEnvironmentSupported, translate, translationsLoading]);

  const appContextValue: AppContextType = {
    currentUser,
    signInWithGoogle: handleSignInWithGoogle,
    logout: handleLogout,
    leaderboard,
    refreshLeaderboard,
    addToast,
    updateUserPoints,
    isFirebaseReady,
    allUsers: [], // This will be filled by a provider-level fetch
    refreshAllUsers: () => {}, // Placeholder
  };

  if (!isUnlocked) {
    return <LockScreen onUnlock={handleUnlock} />;
  }

  // Combined loading state management
  if ((isLoading || translationsLoading) && !criticalError) {
    let loadingMessage = "Initializing..."; // Default message
    if (language === 'vi') loadingMessage = "Đang khởi tạo...";

    if (!isLoading && translationsLoading) { // Firebase loaded, but translations still loading
        loadingMessage = language === 'vi' ? "Đang tải ngôn ngữ..." : "Loading languages...";
    } else if (isLoading && !translationsLoading) { // Translations loaded, but Firebase still loading
        loadingMessage = translate("app.loadingTitle", { appTitle: translate(APP_TITLE) });
    }
    // If both isLoading and translationsLoading are true, "Initializing..." is fine.
    
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-textPrimary">
        <SoccerBallIcon className="w-16 h-16 text-primary animate-spin" />
        <p className="ml-4 text-xl font-semibold text-textPrimary">{loadingMessage}</p>
      </div>
    );
  }

  if (criticalError) {
    // Critical error message itself should not depend on translations if they might have failed.
    // However, if criticalError was set using translate and translationsLoading was false, it's already translated.
    // For simplicity, we assume criticalError message is self-contained or a key if translations failed.
    const errorTitleKey = "error.appErrorTitle";
    const errorGuidanceKey = "error.appErrorGuidance";
    return (
      <>
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-textPrimary p-4 text-center">
          <SoccerBallIcon className="w-16 h-16 text-danger mb-4" />
          <h1 className="text-2xl font-bold text-danger mb-2">{translationsLoading ? errorTitleKey : translate(errorTitleKey)}</h1>
          <p className="text-textSecondary">{criticalError}</p>
          <p className="mt-4 text-sm text-textSecondary">{translationsLoading ? errorGuidanceKey : translate(errorGuidanceKey)}</p>
        </div>
        <ToastContainer toasts={toasts} setToasts={setToasts} />
      </>
    );
  }
  
  const MainApp = () => (
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
          <Route path="/team-divider" element={<TeamDividerPage />} />
          <Route path="/tournament" element={<TournamentPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="py-4 bg-surface shadow-md">
        <div className="container mx-auto px-4 text-center text-textSecondary">
          {translate("footer.copyright", { year: new Date().getFullYear(), appTitle: translate(APP_TITLE) })}
        </div>
      </footer>
    </div>
  );

  const location = useLocation();
  
  // Show landing page only on root path when logged out.
  // Otherwise, show the main app layout for all other pages (including TeamDivider)
  // which will correctly show login prompts etc. for logged out users.
  if (!currentUser && location.pathname === '/') {
    return (
      <AppContext.Provider value={appContextValue}>
        <LandingPage onSignIn={handleSignInWithGoogle} isFirebaseReady={isFirebaseReady} />
        <ToastContainer toasts={toasts} setToasts={setToasts} />
      </AppContext.Provider>
    );
  }
  
  return (
    <AppContext.Provider value={appContextValue}>
        <MainApp />
        <ToastContainer toasts={toasts} setToasts={setToasts} />
    </AppContext.Provider>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <HashRouter> {/* HashRouter now wraps the AppCore to provide location context */}
          <AppCore />
        </HashRouter>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
