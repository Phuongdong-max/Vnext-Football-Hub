
import React, { useState, useEffect, useCallback } from 'react';
import { BettingRound, FootballMatch, BettingRoundStatus, MatchResultTeam } from '../types';
import { useAppContext } from '../App';
import { createBettingRound, getBettingRoundsByAdmin, updateMatchResult as updateBettingRoundResult } from '../services/mockBettingService';
import { getUpcomingMatches } from '../services/mockFootballApiService';
import { CreateBettingRoundModal } from '../components/Admin/CreateBettingRoundModal';
import { UpdateResultModal } from '../components/Admin/UpdateResultModal';
import { AdminMatchCard } from '../components/Admin/AdminMatchCard';
import { Button } from '../components/shared/Button';
import { PlusCircleIcon, RefreshIcon } from '../components/icons';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';

export const AdminDashboardPage: React.FC = () => {
  const { currentUser, addToast, refreshLeaderboard, updateUserPoints } = useAppContext();
  const [bettingRounds, setBettingRounds] = useState<BettingRound[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<FootballMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedRoundForUpdate, setSelectedRoundForUpdate] = useState<BettingRound | null>(null);

  const fetchAdminData = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'admin') return;
    setIsLoading(true);
    try {
      const [rounds, matches] = await Promise.all([
        getBettingRoundsByAdmin(currentUser.id),
        getUpcomingMatches()
      ]);
      setBettingRounds(rounds.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ));
      setUpcomingMatches(matches);
    } catch (error) {
      console.error("Error fetching admin data:", error);
      addToast("Failed to load admin data.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, addToast]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const handleCreateRound = async (matchId: string) => {
    if (!currentUser) return;
    const selectedMatch = upcomingMatches.find(m => m.id === matchId);
    if (!selectedMatch) {
      addToast("Selected match not found.", "error");
      return;
    }
    try {
      await createBettingRound(selectedMatch, currentUser.id);
      addToast("Betting round created successfully!", "success");
      fetchAdminData(); // Refresh list
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error("Error creating betting round:", error);
      addToast(`Error: ${(error as Error).message}`, "error");
    }
  };

  const handleOpenUpdateModal = (round: BettingRound) => {
    setSelectedRoundForUpdate(round);
    setIsUpdateModalOpen(true);
  };

  const handleUpdateResult = async (roundId: string, winningTeam: MatchResultTeam) => {
    if(!currentUser) return;
    try {
      const updatedRound = await updateBettingRoundResult(roundId, winningTeam, updateUserPoints);
      addToast(`Result updated for round: ${updatedRound.matchDetails.homeTeam} vs ${updatedRound.matchDetails.awayTeam}`, "success");
      fetchAdminData(); // Refresh list
      refreshLeaderboard();
      setIsUpdateModalOpen(false);
      setSelectedRoundForUpdate(null);
    } catch (error) {
      console.error("Error updating result:", error);
      addToast(`Error: ${(error as Error).message}`, "error");
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
           <Button onClick={fetchAdminData} variant="outline" size="sm" title="Refresh Data">
            <RefreshIcon className="w-5 h-5"/>
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)} >
            <PlusCircleIcon className="w-5 h-5 mr-2" />
            Create Betting Round
          </Button>
        </div>
      </div>

      {isCreateModalOpen && (
        <CreateBettingRoundModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          upcomingMatches={upcomingMatches}
          onCreate={handleCreateRound}
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
        {openRounds.length === 0 ? (
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
         {closedRounds.length === 0 ? (
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
