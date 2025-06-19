
import React, { useState, useEffect, useCallback } from 'react';
import { BettingRound, FootballMatch, BettingRoundStatus, MatchResultTeam, League, UserRole } from '../types';
import { useAppContext } from '../App';
import { 
  createBettingRound as createMockBettingRound, 
  getBettingRoundsByAdmin as getMockBettingRoundsByAdmin, 
  updateMatchResult as updateMockBettingRoundResult 
} from '../services/mockBettingService';
import {
  // createFirebaseBettingRound, // No longer used directly for creation here
  getFirebaseBettingRoundsByAdmin,
  updateFirebaseMatchResult
} from '../services/firebaseService';
import { CREATE_BETTING_ROUND_PROXY_URL } from '../constants'; // Import new proxy URL
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
        } catch (apiError: any) {
          console.error("API error fetching leagues:", apiError);
          let leagueToastMessage = `Failed to fetch leagues.`;
          if (apiError.message && (apiError.message.toLowerCase().includes('network') || apiError.message.toLowerCase().includes('failed to fetch'))) {
            leagueToastMessage = "Could not fetch leagues due to a network issue. The API proxy might be down or an extension is blocking requests.";
          } else if (apiError.message) {
            leagueToastMessage = `Failed to fetch leagues: ${apiError.message}`;
          }
          addToast(leagueToastMessage, "error");
          setApiAvailable(false); // Assume API is not available if leagues fetch fails this way
          const fallbackMatches = await getMockUpcomingMatches();
          setMockMatches(fallbackMatches);
        }
      } else {
        if (!isFirebaseReady) addToast("Firebase not ready. Using mock match data.", "info");
        else addToast("Football API key not configured or proxy URL is invalid. Using mock match data.", "info");
        const fallbackMatches = await getMockUpcomingMatches();
        setMockMatches(fallbackMatches);
      }
    } catch (error: any) {
      console.error("Error fetching admin data:", error);
      let toastMessage = "Failed to load admin data.";
      if (error.code === 'unavailable' || (typeof error.message === 'string' && (error.message.toLowerCase().includes('network error') || error.message.toLowerCase().includes('failed to fetch') || error.code === 'resource-exhausted' /* e.g. quota */))) {
        toastMessage = "Failed to connect to data services. This might be due to a network issue, an ad blocker, or API limits. Please check your connection, extensions, and try again later.";
      } else if (error.message) {
        toastMessage = `Failed to load admin data: ${error.message}`;
      }
      addToast(toastMessage, "error");
      
      if (initialApiCheck) { // If API was thought to be available, but admin data (Firestore) failed
         setApiAvailable(false); // This might be too aggressive, but signals a general problem
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
    } catch (error: any) {
      let matchFetchError = `Failed to fetch matches.`;
      if (error.message && (error.message.toLowerCase().includes('network') || error.message.toLowerCase().includes('failed to fetch'))) {
         matchFetchError = "Could not fetch matches due to a network issue or an extension blocking requests.";
      } else if (error.message) {
         matchFetchError = `Failed to fetch matches: ${error.message}`;
      }
      addToast(matchFetchError, "error");
      setApiAvailable(false); // If fetching matches fails, assume API is problematic
      return [];
    }
  }, [apiAvailable, addToast]);


  const handleCreateRound = async (matchToCreate: FootballMatch) => {
    // Check context current user and Firebase physical current user
    if (!currentUser || currentUser.role !== UserRole.ADMIN) {
        addToast("Admin user not authenticated in context.", "error");
        return;
    }
    const firebaseAuthUser = window.firebase.auth().currentUser;
    if (!firebaseAuthUser) {
        addToast("Firebase authentication session not found.", "error");
        return;
    }

    setIsDataLoading(true);
    try {
      if (isFirebaseReady) {
        const idToken = await firebaseAuthUser.getIdToken(true); // Now safe to call
        const response = await fetch(CREATE_BETTING_ROUND_PROXY_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}` // Send ID token for verification
          },
          body: JSON.stringify({ matchData: matchToCreate }) // Send match data
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to create round via proxy: ${response.status}`);
        }
        // const newRound = await response.json(); // Assuming proxy returns the created round
        addToast("Betting round created successfully via proxy!", "success");

      } else { // Fallback to mock service if Firebase isn't ready
        await createMockBettingRound(matchToCreate, currentUser.id);
        addToast("Betting round created successfully (mock)!", "success");
      }
      
      fetchAdminPageData(true); // Refresh data on the page
      setIsCreateModalOpen(false); // Close modal

    } catch (error: any) {
      console.error("Error creating betting round:", error);
      let createErrorMsg = "Error creating betting round.";
       if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
        createErrorMsg = "Permission denied. Ensure you are an admin and rules/proxy are correctly set up.";
      } else if (error.message) {
        createErrorMsg = `Error: ${error.message}`;
      }
      addToast(createErrorMsg, "error");
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
         updatedRound = await updateMockBettingRoundResult(roundId, winningTeam, () => {}); // Dummy callback for mock
      }
      addToast(`Result updated for round: ${updatedRound.matchDetails.homeTeam} vs ${updatedRound.matchDetails.awayTeam}`, "success");
      fetchAdminPageData(true); 
      refreshLeaderboard(); 
      setIsUpdateModalOpen(false);
      setSelectedRoundForUpdate(null);
    } catch (error: any) {
      console.error("Error updating result:", error);
      addToast(`Error updating result: ${(error as Error).message}`, "error");
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
            Live football match API is unavailable or encountered an error. Falling back to mock match data for selection.
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
