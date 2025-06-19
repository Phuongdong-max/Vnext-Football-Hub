
import React, { useState, useEffect, useCallback } from 'react';
import { BettingRound, BetTeamSelection, BettingRoundStatus } from '../types';
import { useAppContext } from '../App';
import { 
  getOpenBettingRounds as getMockOpenBettingRounds, 
  getClosedBettingRoundsForMember as getMockClosedBettingRoundsForMember, 
  placeBet as placeMockBet 
} from '../services/mockBettingService';
import {
  getFirebaseOpenBettingRounds,
  getFirebaseClosedBettingRoundsForMember,
  placeFirebaseBet
} from '../services/firebaseService';
import { MatchCard } from '../components/MatchCard';
import { BettingModal } from '../components/BettingModal';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { RefreshIcon } from '../components/icons';
import { Button } from '../components/shared/Button';

export const MemberHomePage: React.FC = () => {
  const { currentUser, addToast, refreshLeaderboard, updateUserPoints, isFirebaseReady } = useAppContext();
  const [openRounds, setOpenRounds] = useState<BettingRound[]>([]);
  const [closedRounds, setClosedRounds] = useState<BettingRound[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false); // For refresh button
  const [isBettingModalOpen, setIsBettingModalOpen] = useState(false);
  const [selectedRoundForBet, setSelectedRoundForBet] = useState<BettingRound | null>(null);

  const fetchMemberData = useCallback(async (isManualRefresh = false) => {
    if(isManualRefresh) setIsDataLoading(true); else setIsLoading(true);
    
    try {
      let open: BettingRound[], closed: BettingRound[];
      if (isFirebaseReady) {
        open = await getFirebaseOpenBettingRounds();
        closed = currentUser ? await getFirebaseClosedBettingRoundsForMember(currentUser.id) : [];
      } else {
        open = await getMockOpenBettingRounds();
        closed = currentUser ? await getMockClosedBettingRoundsForMember(currentUser.id) : [];
      }
      setOpenRounds(open.sort((a,b) => new Date(a.matchDetails.startTime).getTime() - new Date(b.matchDetails.startTime).getTime() ));
      setClosedRounds(closed.sort((a,b) => new Date(b.matchDetails.startTime).getTime() - new Date(a.matchDetails.startTime).getTime() ));
    } catch (error: any) {
      console.error("Error fetching member data:", error);
      let toastMessage = "Failed to load betting rounds.";
       if (error.code === 'unavailable' || (typeof error.message === 'string' && (error.message.toLowerCase().includes('network error') || error.message.toLowerCase().includes('failed to fetch') || error.code === 'resource-exhausted'))) {
        toastMessage = "Failed to connect to betting services. This might be due to a network issue, an ad blocker, or API limits. Please check your connection, extensions, and try again later.";
      } else if (error.message) {
        toastMessage = `Failed to load betting rounds: ${error.message}`;
      }
      addToast(toastMessage, "error");
    } finally {
      if(isManualRefresh) setIsDataLoading(false); else setIsLoading(false);
    }
  }, [currentUser, addToast, isFirebaseReady]);

  useEffect(() => {
    fetchMemberData();
  }, [fetchMemberData]);

  const handleOpenBettingModal = (round: BettingRound) => {
    if (!currentUser) {
      addToast("Please log in to place a bet.", "info");
      return;
    }
    if (currentUser.points <= 0) {
      addToast("You have no points to bet.", "info");
      return;
    }
    setSelectedRoundForBet(round);
    setIsBettingModalOpen(true);
  };

  const handlePlaceBet = async (roundId: string, team: BetTeamSelection, points: number) => {
    if (!currentUser) return;
    if (points > currentUser.points) {
        addToast("You cannot bet more points than you have.", "error");
        return;
    }
    setIsDataLoading(true); // Indicate loading for bet placement
    try {
      if (isFirebaseReady) {
        await placeFirebaseBet(roundId, currentUser.id, currentUser.name, team, points);
      } else {
        await placeMockBet(roundId, currentUser.id, currentUser.name, team, points);
      }
      addToast(`Successfully placed a bet of ${points} points!`, "success");
      
      updateUserPoints(currentUser.id, currentUser.points - points);
      
      fetchMemberData(true); 
      refreshLeaderboard();
      setIsBettingModalOpen(false);
      setSelectedRoundForBet(null);
    } catch (error: any) {
      console.error("Error placing bet:", error);
      let betErrorMsg = "Error placing bet.";
       if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
        betErrorMsg = "Permission denied to place bet. Firestore rules might be misconfigured.";
      } else if (error.code === 'unavailable' || (typeof error.message === 'string' && (error.message.toLowerCase().includes('network error') || error.message.toLowerCase().includes('failed to fetch')))) {
        betErrorMsg = "Network error placing bet. Check connection/extensions.";
      } else if (error.message) {
        betErrorMsg = `Error: ${error.message}`;
      }
      addToast(betErrorMsg, "error");
    } finally {
      setIsDataLoading(false);
    }
  };
  
  if (isLoading && !isDataLoading) { 
    return <div className="flex justify-center items-center py-10"><LoadingSpinner size="lg" /> <span className="ml-2">Loading Betting Rounds...</span></div>;
  }

  return (
    <div className="space-y-8">
       <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-textPrimary">Available Betting Rounds</h1>
         <Button onClick={() => fetchMemberData(true)} variant="outline" size="sm" title="Refresh Data" disabled={isDataLoading || isLoading}>
           {(isDataLoading || isLoading) ? <LoadingSpinner size="sm" className="w-5 h-5"/> : <RefreshIcon className="w-5 h-5"/>}
          </Button>
      </div>

      {isBettingModalOpen && selectedRoundForBet && currentUser && (
        <BettingModal
          isOpen={isBettingModalOpen}
          onClose={() => { setIsBettingModalOpen(false); setSelectedRoundForBet(null); }}
          round={selectedRoundForBet}
          currentUserPoints={currentUser.points}
          onPlaceBet={handlePlaceBet}
        />
      )}

      <section>
        <h2 className="text-2xl font-semibold text-textPrimary mb-4">Open for Betting ({openRounds.length})</h2>
        {openRounds.length === 0 && !isLoading ? (
          <p className="text-textSecondary">No betting rounds currently open. Check back later!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {openRounds.map(round => (
              <MatchCard 
                key={round.id} 
                round={round} 
                onBet={() => handleOpenBettingModal(round)}
                currentUser={currentUser} 
              />
            ))}
          </div>
        )}
      </section>

      {currentUser && (
        <section>
          <h2 className="text-2xl font-semibold text-textPrimary mb-4">Your Past Bets / Results ({closedRounds.length})</h2>
          {closedRounds.length === 0 && !isLoading ? (
            <p className="text-textSecondary">You haven't participated in any rounds that are now closed, or no rounds are closed yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {closedRounds.map(round => (
                <MatchCard key={round.id} round={round} currentUser={currentUser} />
              ))}
            </div>
          )}
        </section>
      )}
      {!currentUser && <p className="text-center text-textSecondary font-medium p-4 bg-primary/5 rounded-md">Please log in to see your past bets and participate in new ones.</p>}
    </div>
  );
};
