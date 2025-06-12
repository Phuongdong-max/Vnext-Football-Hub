
import React, { useState, useEffect, useCallback } from 'react';
import { BettingRound, BetTeamSelection, BettingRoundStatus } from '../types';
import { useAppContext } from '../App';
import { getOpenBettingRounds, getClosedBettingRoundsForMember, placeBet } from '../services/mockBettingService';
import { MatchCard } from '../components/MatchCard';
import { BettingModal } from '../components/BettingModal';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { RefreshIcon } from '../components/icons';
import { Button } from '../components/shared/Button';

export const MemberHomePage: React.FC = () => {
  const { currentUser, addToast, refreshLeaderboard, updateUserPoints } = useAppContext();
  const [openRounds, setOpenRounds] = useState<BettingRound[]>([]);
  const [closedRounds, setClosedRounds] = useState<BettingRound[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBettingModalOpen, setIsBettingModalOpen] = useState(false);
  const [selectedRoundForBet, setSelectedRoundForBet] = useState<BettingRound | null>(null);

  const fetchMemberData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [open, closed] = await Promise.all([
        getOpenBettingRounds(),
        currentUser ? getClosedBettingRoundsForMember(currentUser.id) : Promise.resolve([])
      ]);
      setOpenRounds(open.sort((a,b) => new Date(a.matchDetails.startTime).getTime() - new Date(b.matchDetails.startTime).getTime() ));
      setClosedRounds(closed.sort((a,b) => new Date(b.matchDetails.startTime).getTime() - new Date(a.matchDetails.startTime).getTime() ));
    } catch (error) {
      console.error("Error fetching member data:", error);
      addToast("Failed to load betting rounds.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, addToast]);

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
    try {
      await placeBet(roundId, currentUser.id, currentUser.name, team, points);
      addToast(`Successfully placed a bet of ${points} points!`, "success");
      // Deduct points locally for immediate feedback before leaderboard refresh
      updateUserPoints(currentUser.id, currentUser.points - points);
      fetchMemberData(); // Refresh lists
      refreshLeaderboard();
      setIsBettingModalOpen(false);
      setSelectedRoundForBet(null);
    } catch (error) {
      console.error("Error placing bet:", error);
      addToast(`Error: ${(error as Error).message}`, "error");
    }
  };
  
  if (isLoading) {
    return <div className="flex justify-center items-center py-10"><LoadingSpinner size="lg" /> <span className="ml-2">Loading Betting Rounds...</span></div>;
  }

  return (
    <div className="space-y-8">
       <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-textPrimary">Available Betting Rounds</h1>
         <Button onClick={fetchMemberData} variant="outline" size="sm" title="Refresh Data">
            <RefreshIcon className="w-5 h-5"/>
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
        {openRounds.length === 0 ? (
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
          {closedRounds.length === 0 ? (
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
