
import React, { useState, useEffect, useCallback } from 'react';
import { BettingRound, FootballMatch, BettingRoundStatus, MatchResultTeam, League, UserRole } from '../types';
import { useAppContext } from '../App';
import { 
  createBettingRound as createMockBettingRound, 
  getBettingRoundsByAdmin as getMockBettingRoundsByAdmin, 
  updateMatchResult as updateMockBettingRoundResult 
} from '../services/mockBettingService';
import {
  createFirebaseBettingRound,
  getFirebaseBettingRoundsByAdmin,
  updateFirebaseMatchResult
} from '../services/firebaseService';
import { fetchAvailableLeagues, fetchMatchesByDateAndLeague, checkIsFootballApiAvailable } from '../services/footballApiService';
import { getUpcomingMatches as getMockUpcomingMatches } from '../services/mockFootballApiService';
import { CreateBettingRoundModal } from '../components/Admin/CreateBettingRoundModal';
import { UpdateResultModal } from '../components/Admin/UpdateResultModal';
import { AdminMatchCard } from '../components/Admin/AdminMatchCard';
import { Button } from '../components/shared/Button';
import { PlusCircleIcon, RefreshIcon, ShieldExclamationIcon } from '../components/icons';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';

export const AdminDashboardPage: React.FC = () => {
  const { currentUser, addToast, refreshLeaderboard, isFirebaseReady } = useAppContext();
  const [bettingRounds, setBettingRounds] = useState<BettingRound[]>([]);
  
  const [apiAvailable, setApiAvailable] = useState(false);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [mockMatches, setMockMatches] = useState<FootballMatch[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedRoundForUpdate, setSelectedRoundForUpdate] = useState<BettingRound | null>(null);

  const fetchAdminPageData = useCallback(async (isManualRefresh = false) => {
    if (!currentUser || currentUser.role !== UserRole.ADMIN) {
        setIsLoading(false);
        return;
    }
    if(isManualRefresh) setIsDataLoading(true); else setIsLoading(true);

    const initialApiCheck = checkIsFootballApiAvailable();
    setApiAvailable(initialApiCheck);

    try {
      let rounds: BettingRound[];
      if (isFirebaseReady) {
        rounds = await getFirebaseBettingRoundsByAdmin(currentUser.id);
      } else {
        rounds = await getMockBettingRoundsByAdmin(currentUser.id);
      }
      setBettingRounds(rounds.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ));
      
      if (initialApiCheck) {
        try {
          const fetchedLeagues = await fetchAvailableLeagues();
          setLeagues(fetchedLeagues);
          if (fetchedLeagues.length === 0) {
            addToast("No leagues available from API. Either none match criteria or API service is limited.", "info");
          }
        } catch (apiError) {
          console.error("API error fetching leagues:", apiError);
          addToast(`Failed to fetch leagues: ${(apiError as Error).message}`, "error");
          setApiAvailable(false);
          const fallbackMatches = await getMockUpcomingMatches();
          setMockMatches(fallbackMatches);
        }
      } else {
        if (!isFirebaseReady) addToast("Firebase not ready. Using mock match data.", "info");
        else addToast("Football API key not configured. Using mock match data.", "info");
        const fallbackMatches = await getMockUpcomingMatches();
        setMockMatches(fallbackMatches);
      }
    } catch (error) {
      console.error("Error fetching admin data:", error);
      addToast("Failed to load admin data.", "error");
      if (initialApiCheck) {
         setApiAvailable(false);
      }
      const fallbackMatches = await getMockUpcomingMatches(); 
      setMockMatches(fallbackMatches);
    } finally {
      if(isManualRefresh) setIsDataLoading(false); else setIsLoading(false);
    }
  }, [currentUser, addToast, isFirebaseReady]);

  useEffect(() => {
    fetchAdminPageData();
  }, [fetchAdminPageData]);
  
  const handleLoadMatchesFromApi = useCallback(async (date: string, leagueCode: string): Promise<FootballMatch[]> => {
    if (!apiAvailable) {
      addToast("API is not available to fetch matches.", "info");
      return [];
    }
    try {
      const matches = await fetchMatchesByDateAndLeague(date, leagueCode);
      if (matches.length === 0) {
        addToast(`No matches found for ${leagueCode} on ${new Date(date).toLocaleDateString()}.`, "info");
      }
      return matches;
    } catch (error) {
      addToast(`Failed to fetch matches: ${(error as Error).message}`, "error");
      setApiAvailable(false);
      return [];
    }
  }, [apiAvailable, addToast]);


  const handleCreateRound = async (matchToCreate: FootballMatch) => {
    if (!currentUser) return;
    setIsDataLoading(true);
    try {
      if (isFirebaseReady) {
        await createFirebaseBettingRound(matchToCreate, currentUser.id);
      } else {
        await createMockBettingRound(matchToCreate, currentUser.id);
      }
      addToast("Betting round created successfully!", "success");
      fetchAdminPageData(true);
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error("Error creating betting round:", error);
      addToast(`Error: ${(error as Error).message}`, "error");
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
        // Mock service requires updateUserPoints callback, but AppContext.updateUserPoints
        // will be called by refreshLeaderboard. For mock, we pass a dummy or adapt mock service.
        // For simplicity, mock service updates points internally.
         updatedRound = await updateMockBettingRoundResult(roundId, winningTeam, () => {}); // Dummy callback for mock
      }
      addToast(`Result updated for round: ${updatedRound.matchDetails.homeTeam} vs ${updatedRound.matchDetails.awayTeam}`, "success");
      fetchAdminPageData(true); 
      refreshLeaderboard(); // This will refresh points for all users
      setIsUpdateModalOpen(false);
      setSelectedRoundForUpdate(null);
    } catch (error) {
      console.error("Error updating result:", error);
      addToast(`Error: ${(error as Error).message}`, "error");
    } finally {
      setIsDataLoading(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center py-10"><LoadingSpinner size="lg" /> <span className="ml-2">Loading Admin Dashboard...</span></div>;
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return <p className="text-center text-danger">Access Denied. You must be an admin.</p>;
  }
  
  const openRounds = bettingRounds.filter(r => r.status === BettingRoundStatus.OPEN);
  const closedRounds = bettingRounds.filter(r => r.status === BettingRoundStatus.RESULT_UPDATED || r.status === BettingRoundStatus.CLOSED);


  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-textPrimary">Admin Dashboard</h1>
        <div className="space-x-2">
           <Button onClick={() => fetchAdminPageData(true)} variant="outline" size="sm" title="Refresh Data" disabled={isDataLoading || isLoading}>
            {(isDataLoading || isLoading) ? <LoadingSpinner size="sm" className="w-5 h-5"/> : <RefreshIcon className="w-5 h-5"/>}
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)} disabled={isDataLoading || isLoading}>
            <PlusCircleIcon className="w-5 h-5 mr-2" />
            Create Betting Round
          </Button>
        </div>
      </div>
      
      {!apiAvailable && (
         <div className="p-3 bg-warning/10 border border-warning text-sm text-yellow-700 rounded-md flex items-center">
            <ShieldExclamationIcon className="w-5 h-5 mr-2"/>
            Live football match API is unavailable. Falling back to mock match data.
        </div>
      )}

      {isCreateModalOpen && (
        <CreateBettingRoundModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          apiAvailable={apiAvailable}
          leagues={leagues}
          mockMatches={mockMatches} 
          fetchMatchesFunction={handleLoadMatchesFromApi}
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
        <h2 className="text-2xl font-semibold text-textPrimary mb-4">Open Betting Rounds ({openRounds.length})</h2>
        {openRounds.length === 0 && !isLoading ? (
          <p className="text-textSecondary">No open betting rounds. Create one to get started!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {openRounds.map(round => (
              <AdminMatchCard key={round.id} round={round} onUpdateResult={() => handleOpenUpdateModal(round)} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-textPrimary mb-4">Closed/Result Updated Rounds ({closedRounds.length})</h2>
         {closedRounds.length === 0 && !isLoading ? (
          <p className="text-textSecondary">No closed rounds yet.</p>
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
