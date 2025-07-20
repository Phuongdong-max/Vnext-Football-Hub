
import React, { useState, useEffect, useCallback } from 'react';
import { BettingRound, FootballMatch, BettingRoundStatus, MatchResultTeam, League, UserRole } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppContext } from '../contexts/AppContext';
import {
  createFirebaseBettingRound,
  getFirebaseBettingRoundsByAdmin,
  updateFirebaseMatchResult
} from '../services/firebaseService';
import { fetchAvailableLeaguesFootballData, fetchMatchesByDateAndLeague, checkIsFootballDataApiAvailable } from '../services/footballApiService';
import { CreateBettingRoundModal } from '../components/Admin/CreateBettingRoundModal';
import { UpdateResultModal } from '../components/Admin/UpdateResultModal';
import { AdminMatchCard } from '../components/Admin/AdminMatchCard';
import { Button } from '../components/shared/Button';
import { PlusCircleIcon, RefreshIcon, ShieldExclamationIcon } from '../components/icons';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';

export const AdminDashboardPage: React.FC = () => {
  const { currentUser, addToast, refreshLeaderboard, isFirebaseReady } = useAppContext();
  const { translate } = useLanguage();
  const [bettingRounds, setBettingRounds] = useState<BettingRound[]>([]);
  
  const [apiAvailable, setApiAvailable] = useState(false); // football-data.org API availability
  const [leagues, setLeagues] = useState<League[]>([]); // Primarily for football-data.org source in modal
  
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false); 
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedRoundForUpdate, setSelectedRoundForUpdate] = useState<BettingRound | null>(null);

  // This effect runs ONCE on mount to determine API availability, preventing re-render loops.
  useEffect(() => {
    setApiAvailable(checkIsFootballDataApiAvailable());
  }, []);

  const fetchAdminPageData = useCallback(async (isManualRefresh = false) => {
    if (!currentUser || currentUser.role !== UserRole.ADMIN) {
        setIsLoading(false);
        return;
    }
    if(isManualRefresh) setIsDataLoading(true); else setIsLoading(true);

    try {
      let rounds: BettingRound[];
      if (isFirebaseReady) {
        rounds = await getFirebaseBettingRoundsByAdmin(currentUser.id);
      } else {
        rounds = []; 
        addToast("error.adminRoundsUnavailableFirebaseNotReady", "error");
      }
      setBettingRounds(rounds.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ));
      
      // Fetch leagues only if the API is available.
      // This state is now stable and won't cause loops.
      if (apiAvailable) {
        try {
          const fetchedLeagues = await fetchAvailableLeaguesFootballData();
          setLeagues(fetchedLeagues);
        } catch (apiError) {
          console.error("API error fetching football-data.org leagues:", apiError);
          // Toasting on explicit error is fine, the loop was caused by success/info toasts.
          addToast("error.failedToFetchLeaguesManual", "error", {errorMessage: (apiError as Error).message});
        }
      }
    } catch (error) {
      console.error("Error fetching admin data:", error);
      addToast("error.failedToLoadAdminData", "error");
    } finally {
      if(isManualRefresh) setIsDataLoading(false); else setIsLoading(false);
    }
  }, [currentUser, addToast, isFirebaseReady, apiAvailable]);

  useEffect(() => {
    fetchAdminPageData();
  }, [fetchAdminPageData]);
  
  const handleLoadMatchesForFootballDataModal = useCallback(async (date: string, leagueCode: string): Promise<FootballMatch[]> => {
    if (!apiAvailable) { 
      addToast("error.liveApiUnavailable", "info");
      return []; 
    }
    try {
      const matches = await fetchMatchesByDateAndLeague(date, leagueCode);
      if (matches.length === 0) {
        addToast("info.noMatchesFound", "info", { leagueCode, date: new Date(date).toLocaleDateString() });
      }
      return matches; 
    } catch (error) {
      addToast("error.failedToFetchMatches", "error", { errorMessage: (error as Error).message });
      return []; 
    }
  }, [addToast, apiAvailable]);


  const handleCreateRound = async (matchToCreate: FootballMatch) => {
    if (!currentUser) return;
    setIsDataLoading(true);
    try {
      if (isFirebaseReady) {
        await createFirebaseBettingRound(matchToCreate, currentUser.id);
      } else {
        addToast("error.cannotCreateRoundFirebaseNotReady", "error");
        setIsDataLoading(false);
        return;
      }
      addToast("success.bettingRoundCreated", "success");
      fetchAdminPageData(true); 
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error("Error creating betting round:", error);
      addToast("error.creatingRound", "error", { errorMessage: (error as Error).message });
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleOpenUpdateModal = (round: BettingRound) => {
    setSelectedRoundForUpdate(round);
    setIsUpdateModalOpen(true);
  };

  const handleUpdateResult = async (roundId: string, winningTeam: MatchResultTeam) => {
    if(!currentUser) return;
    setIsDataLoading(true);
    try {
      let updatedRound;
      if (isFirebaseReady) {
         updatedRound = await updateFirebaseMatchResult(roundId, winningTeam);
      } else {
        addToast("error.cannotUpdateResultFirebaseNotReady", "error");
        setIsDataLoading(false);
        return;
      }
      addToast("success.resultUpdatedForRound", "success", { homeTeam: updatedRound.matchDetails.homeTeam, awayTeam: updatedRound.matchDetails.awayTeam });
      fetchAdminPageData(true); 
      refreshLeaderboard(); 
      setIsUpdateModalOpen(false);
      setSelectedRoundForUpdate(null);
    } catch (error) {
      console.error("Error updating result:", error);
      addToast("error.updatingResult", "error", { errorMessage: (error as Error).message });
    } finally {
      setIsDataLoading(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center py-10 text-textPrimary"><LoadingSpinner size="lg" /> <span className="ml-2">{translate('adminDashboard.loading')}</span></div>;
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return <p className="text-center text-danger">{translate('adminDashboard.accessDenied')}</p>;
  }
  
  const openRounds = bettingRounds.filter(r => r.status === BettingRoundStatus.OPEN);
  const closedRounds = bettingRounds.filter(r => r.status === BettingRoundStatus.RESULT_UPDATED || r.status === BettingRoundStatus.CLOSED);


  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-textPrimary">{translate('adminDashboard.title')}</h1>
        <div className="space-x-2">
           <Button onClick={() => fetchAdminPageData(true)} variant="outline" size="sm" title={translate('adminDashboard.button.refreshData')} disabled={isDataLoading || isLoading}>
            {(isDataLoading || isLoading) ? <LoadingSpinner size="sm" className="w-5 h-5"/> : <RefreshIcon className="w-5 h-5"/>}
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)} disabled={isDataLoading || isLoading}>
            <PlusCircleIcon className="w-5 h-5 mr-2" />
            {translate('adminDashboard.button.createRound')}
          </Button>
        </div>
      </div>
      
      {!apiAvailable && (
         <div className="p-3 bg-yellow-100 dark:bg-yellow-500/20 border border-yellow-300 dark:border-yellow-500/40 text-sm text-yellow-700 dark:text-yellow-200 rounded-md flex items-center">
            <ShieldExclamationIcon className="w-5 h-5 mr-2"/>
            {translate('adminDashboard.apiUnavailableWarning')}
        </div>
      )}

      {isCreateModalOpen && (
        <CreateBettingRoundModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          leagues={leagues} 
          fetchMatchesFunction={handleLoadMatchesForFootballDataModal}
          onCreateRound={handleCreateRound}
          isDataLoading={isDataLoading} 
        />
      )}

      {isUpdateModalOpen && selectedRoundForUpdate && (
        <UpdateResultModal
          isOpen={isUpdateModalOpen}
          onClose={() => { setIsUpdateModalOpen(false); setSelectedRoundForUpdate(null); }}
          round={selectedRoundForUpdate}
          onUpdateResult={handleUpdateResult}
        />
      )}
      
      <section>
        <h2 className="text-2xl font-semibold text-textPrimary mb-4">{translate('adminDashboard.openRoundsTitle', { count: openRounds.length })}</h2>
        {openRounds.length === 0 && !isLoading ? (
          <p className="text-textSecondary">{translate('adminDashboard.noOpenRounds')}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {openRounds.map(round => (
              <AdminMatchCard key={round.id} round={round} onUpdateResult={() => handleOpenUpdateModal(round)} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-textPrimary mb-4">{translate('adminDashboard.closedRoundsTitle', { count: closedRounds.length })}</h2>
         {closedRounds.length === 0 && !isLoading ? (
          <p className="text-textSecondary">{translate('adminDashboard.noClosedRounds')}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {closedRounds.map(round => (
              <AdminMatchCard key={round.id} round={round} onUpdateResult={() => handleOpenUpdateModal(round)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};