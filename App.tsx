import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { User, UserRole, LeaderboardEntry, ToastMessage, AppSettings, TournamentSummary } from './types';
import { APP_TITLE } from './constants';
import {
  initializeFirebase,
  onFirebaseAuthStateChanged,
  signInWithGoogle as performSignInWithGoogle,
  firebaseSignOut as performFirebaseSignOut,
  updateUserPointsInFirestore,
  getFirebaseLeaderboardEntries,
  onAppSettingsUpdate,
  updateAppSettings as performUpdateAppSettings,
  getAllTournaments
} from './services/firebaseService';
import { Header } from './components/Header';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { MemberHomePage } from './pages/MemberHomePage';
import { SeasonPage } from './pages/SeasonPage';
import { CountdownPage } from './pages/CountdownPage'; 
import { LandingPage } from './pages/LandingPage'; // Import the new landing page
import { ToastContainer } from './components/shared/ToastContainer';
import { VnfcLogoStatic, VnfcLogoAnimated } from './components/icons';
import { checkFirebaseEnvironment } from './utils/envChecker';
import { AppContext, AppContextType, useAppContext } from './contexts/AppContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';


// --- App Core Logic (Handles State) ---
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

  // --- Season selection, shared by Tournament / Player Info / Team Divider ---
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [isTournamentListLoading, setIsTournamentListLoading] = useState(true);

  // Off until the setting is actually read. Defaulting to on made betting UI
  // flash for everyone, and stick permanently when the read failed.
  const [isBettingEnabled, setIsBettingEnabled] = useState(false);

  // Get location to conditionally apply layout styles
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  const isHomePage = location.pathname === '/home';

  const addToast = useCallback((messageOrKey: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', replacements?: Record<string, string | number>) => {
    const id = new Date().toISOString() + Math.random(); 
    const message = translate(messageOrKey, replacements);
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);
  }, [translate]);
  
  const refreshTournaments = useCallback(async () => {
    if (!isFirebaseReady) return;
    setIsTournamentListLoading(true);
    try {
      const list = await getAllTournaments();
      setTournaments(list);
      setSelectedTournamentId(prev => {
        // Keep the current pick if it still exists, otherwise fall back to the
        // remembered one, otherwise open on the newest season that is still
        // running - a first-time visitor should land on the live season, not on
        // whichever name happens to sort first.
        if (prev && list.some(t => t.id === prev)) return prev;
        const stored = localStorage.getItem('selectedTournamentId');
        if (stored && list.some(t => t.id === stored)) return stored;
        const newestActive = list.find(t => t.status === 'active');
        return (newestActive ?? list[0])?.id ?? null;
      });
    } catch (error) {
      console.error('Failed to fetch tournaments list', error);
      addToast('tournament.toast.fetchListError', 'error');
    } finally {
      setIsTournamentListLoading(false);
    }
  }, [isFirebaseReady, addToast]);

  useEffect(() => {
    refreshTournaments();
  }, [refreshTournaments]);

  const selectTournament = useCallback((tournamentId: string) => {
    setSelectedTournamentId(tournamentId);
    localStorage.setItem('selectedTournamentId', tournamentId);
  }, []);

  const selectedTournament = tournaments.find(t => t.id === selectedTournamentId) ?? null;

  const handleUpdateAppSettings = useCallback(async (settings: Partial<AppSettings>) => {
      if (!currentUser || currentUser.role !== UserRole.ADMIN) {
          addToast('error.unauthorized', 'error');
          return;
      }
      try {
          await performUpdateAppSettings(settings);
          addToast('success.appSettingsUpdated', 'success');
      } catch (error) {
          addToast('error.appSettingsUpdateFailed', 'error', { errorMessage: (error as Error).message });
      }
  }, [addToast, currentUser]);


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
      addToast("error.failedToRefreshLeaderboard", "error");
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

    const unsubscribeAuth = onFirebaseAuthStateChanged(async (appUserFromService) => {
      try {
        setCurrentUser(appUserFromService);
        await refreshLeaderboard(); 
      } catch (error) {
          console.error("Error processing auth state change:", error);
          addToast("error.authProcessingError", "error");
      } finally {
          setIsLoading(false); 
      }
    });
    return () => {
        unsubscribeAuth();
    };
  }, [addToast, refreshLeaderboard, translate]);

  // ...and re-run it whenever the signed-in user changes. appSettings requires
  // auth, so subscribing once at start-up hit permission-denied before sign-in,
  // and onSnapshot does not retry after such an error - the value then stayed
  // wrong for the whole session.
  useEffect(() => {
    if (!isFirebaseReady || !currentUser) {
      setIsBettingEnabled(false);
      return;
    }
    const unsubscribe = onAppSettingsUpdate((settings) => {
      setIsBettingEnabled(settings.isBettingEnabled);
    });
    return () => unsubscribe();
  }, [isFirebaseReady, currentUser?.id]);

  const handleSignInWithGoogle = useCallback(async (): Promise<User | null> => {
    if (!isEnvironmentSupported) {
      addToast("error.googleSignInNotSupportedEnv", "error");
      return null;
    }
    if (!isFirebaseReady) {
      addToast("error.firebaseNotAvailable", "error");
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
      addToast(errorMessageKey, "error", { message: error.message });
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
    addToast("toast.loggedOut", 'info');
  }, [refreshLeaderboard, addToast, isFirebaseReady, currentUser]);
  
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
        addToast("error.failedToUpdateUserPoints", "error");
    }
  }, [currentUser, refreshLeaderboard, isFirebaseReady, addToast, isEnvironmentSupported, translate]);
  
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const canEdit = isAdmin || (currentUser?.email?.endsWith('@vnext.vn') ?? false);

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
    isBettingEnabled,
    updateAppSettings: handleUpdateAppSettings,
    canEdit,
    isAdmin,
    tournaments,
    selectedTournamentId,
    selectedTournament,
    isTournamentListLoading,
    selectTournament,
    refreshTournaments,
    isSelectedTournamentArchived: selectedTournament?.status === 'archived',
  };

  // Combined loading state management
  if ((isLoading || translationsLoading) && !criticalError) {
    let loadingMessage = "Initializing..."; // Default message
    if (language === 'vi') loadingMessage = "Đang khởi tạo...";

    if (!isLoading && translationsLoading) { // This case is less likely now
        loadingMessage = language === 'vi' ? "Đang tải ngôn ngữ..." : "Loading languages...";
    } else if (isLoading && !translationsLoading) {
        loadingMessage = translate("app.loadingTitle", { appTitle: translate(APP_TITLE) });
    }
    
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-textPrimary">
        <VnfcLogoAnimated className="w-20 h-20" />
        <p className="ml-4 text-xl font-semibold text-textPrimary">{loadingMessage}</p>
      </div>
    );
  }

  if (criticalError) {
    const errorTitle = translate("error.appErrorTitle");
    const errorGuidance = translate("error.appErrorGuidance");
    return (
      <>
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-textPrimary p-4 text-center">
          <VnfcLogoStatic className="w-16 h-16 mb-4" />
          <h1 className="text-2xl font-bold text-danger mb-2">{errorTitle}</h1>
          <p className="text-textSecondary">{criticalError}</p>
          <p className="mt-4 text-sm text-textSecondary">{errorGuidance}</p>
        </div>
        <ToastContainer toasts={toasts} setToasts={setToasts} />
      </>
    );
  }
  
  return (
    <AppContext.Provider value={appContextValue}>
      <div className="flex flex-col min-h-screen text-textPrimary bg-background">
        {!isLandingPage && <Header />}
        <main className={`flex-grow flex flex-col ${!isHomePage && !isLandingPage ? 'container mx-auto px-4 py-8' : ''}`}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            {/* The season is now the only place a viewer needs: table, fixtures,
                teams, scorers, squad and the draw are tabs inside it. */}
            <Route path="/season" element={<SeasonPage />} />
            <Route path="/home" element={<CountdownPage />} />
            <Route path="/betting" element={isBettingEnabled ? <MemberHomePage /> : <Navigate to="/season" replace />} />
            <Route path="/admin" element={
              currentUser?.role === UserRole.ADMIN
                ? <AdminDashboardPage />
                : <Navigate to="/season" replace />
            } />
            {/* The leaderboard screen was removed upstream; the points data
                model behind it is still maintained. */}
            {/* Old top-level pages folded into the season shell. Kept as
                redirects so existing links and bookmarks still land somewhere. */}
            <Route path="/tournament" element={<Navigate to="/season" replace />} />
            <Route path="/player-info" element={<Navigate to="/season" replace />} />
            <Route path="/team-divider" element={<Navigate to="/season" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        {!isLandingPage && (
          <footer className="py-4 bg-surface shadow-md">
            <div className="container mx-auto px-4 text-center text-textSecondary">
              {translate("footer.copyright", { year: new Date().getFullYear(), appTitle: translate(APP_TITLE) })}
            </div>
          </footer>
        )}
      </div>
      <ToastContainer toasts={toasts} setToasts={setToasts} />
    </AppContext.Provider>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <BrowserRouter> {/* HashRouter now wraps the AppCore to provide location context */}
          <AppCore />
        </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
