
import React, { useState, useEffect, useCallback } from 'react';
import { BettingRound, BetTeamSelection, BettingRoundStatus } from '../types';
import { useAppContext } from '../App';
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
// LandingPage import is no longer needed here as App.tsx handles it.
// import { LandingPage } from '../components/LandingPage'; 

export const MemberHomePage: React.FC = () => {
  // signInWithGoogle and isFirebaseReady are not needed here anymore for LandingPage
  const { currentUser, addToast, refreshLeaderboard, isFirebaseReady } = useAppContext(); 
  const [openRounds, setOpenRounds] = useState<BettingRound[]>([]);
  const [closedRounds, setClosedRounds] = useState<BettingRound[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false); 
  const [isBettingModalOpen, setIsBettingModalOpen] = useState(false);
  const [selectedRoundForBet, setSelectedRoundForBet] = useState<BettingRound | null>(null);

  const fetchMemberData = useCallback(async (isManualRefresh = false) => {
    if (!currentUser) { // Should not happen if this component is rendered due to App.tsx logic
        setIsLoading(false);
        return;
    }
    if(isManualRefresh) setIsDataLoading(true); else setIsLoading(true);
    
    try {
      let open: BettingRound[] = [], closed: BettingRound[] = [];
      if (isFirebaseReady) {
        open = await getFirebaseOpenBettingRounds();
        closed = await getFirebaseClosedBettingRoundsForMember(currentUser.id); // currentUser is guaranteed here
      } else {
        addToast("Betting rounds unavailable: Firebase not ready.", "info");
      }
      setOpenRounds(open.sort((a,b) => new Date(a.matchDetails.startTime).getTime() - new Date(b.matchDetails.startTime).getTime() ));
      setClosedRounds(closed.sort((a,b) => new Date(b.matchDetails.startTime).getTime() - new Date(a.matchDetails.startTime).getTime() ));
    } catch (error) {
      console.error("Error fetching member data:", error);
      addToast("Failed to load betting rounds.", "error");
    } finally {
      if(isManualRefresh) setIsDataLoading(false); else setIsLoading(false);
    }
  }, [currentUser, addToast, isFirebaseReady]);

  useEffect(() => {
    // This component now only renders if currentUser exists,
    // so we can directly fetch data.
    if (currentUser && isFirebaseReady) { // Ensure Firebase is ready too
      fetchMemberData();
    } else if (!currentUser) {
      // This case should ideally not be hit if App.tsx handles LandingPage correctly
      setIsLoading(false); 
      setOpenRounds([]);
      setClosedRounds([]);
    }
  }, [currentUser, fetchMemberData, isFirebaseReady]); 

  const handleOpenBettingModal = (round: BettingRound) => {
    if (!currentUser) {
      addToast("Please log in to place a bet.", "info"); // Should not happen
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
    setIsDataLoading(true);
    try {
      if (isFirebaseReady) {
        await placeFirebaseBet(roundId, currentUser.id, currentUser.name, team, points);
      } else {
        addToast("Cannot place bet: Firebase not ready.", "error");
        setIsDataLoading(false);
        return;
      }
      addToast(`Successfully placed a bet of ${points} points!`, "success");
      
      fetchMemberData(true); 
      refreshLeaderboard();
      setIsBettingModalOpen(false);
      setSelectedRoundForBet(null);
    } catch (error) {
      console.error("Error placing bet:", error);
      addToast(`Error placing bet: ${(error as Error).message}`, "error");
    } finally {
      setIsDataLoading(false);
    }
  };
  
  // currentUser is guaranteed here because App.tsx would show LandingPage otherwise.
  if (isLoading) { 
    return <div className="flex justify-center items-center py-10"><LoadingSpinner size="lg" /> <span className="ml-2">Loading Betting Rounds...</span></div>;
  }

  // Logged-in user view - LandingPage logic is removed from here.
  return (
    <div className="space-y-8">
       <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-textPrimary">Available Betting Rounds</h1>
         <Button onClick={() => fetchMemberData(true)} variant="outline" size="sm" title="Refresh Data" disabled={isDataLoading}> {/* isLoading removed from disabled */}
           {isDataLoading ? <LoadingSpinner size="sm" className="w-5 h-5"/> : <RefreshIcon className="w-5 h-5"/>}
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
        {openRounds.length === 0 && !isDataLoading ? (
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
          {closedRounds.length === 0 && !isDataLoading ? ( 
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
    </div>
  );
};