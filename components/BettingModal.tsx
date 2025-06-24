
import React, { useState, useEffect } from 'react';
import { BettingRound, BetTeamSelection } from '../types'; // MatchAnalysis removed
import { Modal } from './shared/Modal';
import { Button } from './shared/Button';
import { CurrencyDollarIcon } from './icons'; // LightBulbIcon, ChartBarIcon removed
// LoadingSpinner removed if not used elsewhere, getMatchAnalysisFromAI removed

interface BettingModalProps {
  isOpen: boolean;
  onClose: () => void;
  round: BettingRound;
  currentUserPoints: number;
  onPlaceBet: (roundId: string, team: BetTeamSelection, points: number) => void;
}

export const BettingModal: React.FC<BettingModalProps> = ({ isOpen, onClose, round, currentUserPoints, onPlaceBet }) => {
  const [selectedTeam, setSelectedTeam] = useState<BetTeamSelection | null>(null);
  const [points, setPoints] = useState<number>(10);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Reset state when modal is closed or round changes
    if (!isOpen) {
      setSelectedTeam(null);
      setPoints(10);
      setError('');
    }
  }, [isOpen, round]);


  const handleSubmit = () => {
    setError('');
    if (!selectedTeam) {
      setError("Please select a team to bet on.");
      return;
    }
    if (points <= 0) {
      setError("Points bet must be greater than zero.");
      return;
    }
    if (points > currentUserPoints) {
      setError(`You cannot bet more than your available ${currentUserPoints} points.`);
      return;
    }
    onPlaceBet(round.id, selectedTeam, points);
  };
  
  const handlePointsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (isNaN(value)) {
        setPoints(0);
    } else {
        setPoints(Math.max(0, value));
    }
  };

  const inputBaseClasses = "w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-surface dark:bg-slate-700 text-textPrimary dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Place Bet on: ${round.matchDetails.homeTeam} vs ${round.matchDetails.awayTeam}`} size="lg">
      <div className="space-y-4">
        <p className="text-sm text-textSecondary">Your available points: <span className="font-semibold text-primary">{currentUserPoints}</span></p>
        
        <div>
          <label className="block text-sm font-medium text-textPrimary mb-1">Select Team:</label>
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={() => setSelectedTeam(BetTeamSelection.HOME)}
              variant={selectedTeam === BetTeamSelection.HOME ? 'primary' : 'outline'}
              fullWidth
            >
              {round.matchDetails.homeTeam} (Home)
            </Button>
            <Button
              onClick={() => setSelectedTeam(BetTeamSelection.AWAY)}
              variant={selectedTeam === BetTeamSelection.AWAY ? 'primary' : 'outline'}
              fullWidth
            >
              {round.matchDetails.awayTeam} (Away)
            </Button>
          </div>
        </div>

        <div>
          <label htmlFor="betPoints" className="block text-sm font-medium text-textPrimary mb-1">Points to Bet:</label>
          <input
            type="number"
            id="betPoints"
            value={points}
            onChange={handlePointsChange}
            min="1"
            max={currentUserPoints}
            className={inputBaseClasses}
          />
        </div>

        {error && <p className="text-sm text-danger text-center py-1">{error}</p>}

        {/* AI Analysis Section REMOVED */}

        <div className="flex justify-end space-x-3 pt-4 border-t border-border mt-4">
          <Button onClick={onClose} variant="secondary">Cancel</Button>
          <Button onClick={handleSubmit} disabled={!selectedTeam || points <= 0}>
            <CurrencyDollarIcon className="w-5 h-5 mr-2"/>
            Confirm Bet
          </Button>
        </div>
      </div>
    </Modal>
  );
};
    