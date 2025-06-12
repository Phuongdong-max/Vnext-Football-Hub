
import React, { useState } from 'react';
import { BettingRound, MatchResultTeam } from '../../types';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { PencilAltIcon } from '../icons';

interface UpdateResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  round: BettingRound;
  onUpdateResult: (roundId: string, winningTeam: MatchResultTeam) => void;
}

export const UpdateResultModal: React.FC<UpdateResultModalProps> = ({ isOpen, onClose, round, onUpdateResult }) => {
  const [selectedWinner, setSelectedWinner] = useState<MatchResultTeam | ''>('');

  const handleSubmit = () => {
    if (!selectedWinner) return;
    onUpdateResult(round.id, selectedWinner);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Update Result: ${round.matchDetails.homeTeam} vs ${round.matchDetails.awayTeam}`}>
      <div className="space-y-4">
        <p className="text-sm text-textSecondary">Select the winner or if the match was a draw.</p>
        
        <div className="space-y-2">
          <Button
            onClick={() => setSelectedWinner(MatchResultTeam.HOME_WIN)}
            variant={selectedWinner === MatchResultTeam.HOME_WIN ? 'primary' : 'outline'}
            fullWidth
          >
            {round.matchDetails.homeTeam} (Home) Won
          </Button>
          <Button
            onClick={() => setSelectedWinner(MatchResultTeam.AWAY_WIN)}
            variant={selectedWinner === MatchResultTeam.AWAY_WIN ? 'primary' : 'outline'}
            fullWidth
          >
            {round.matchDetails.awayTeam} (Away) Won
          </Button>
          <Button
            onClick={() => setSelectedWinner(MatchResultTeam.DRAW)}
            variant={selectedWinner === MatchResultTeam.DRAW ? 'primary' : 'outline'}
            fullWidth
          >
            Match was a Draw
          </Button>
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <Button onClick={onClose} variant="secondary">Cancel</Button>
          <Button onClick={handleSubmit} disabled={!selectedWinner}>
            <PencilAltIcon className="w-5 h-5 mr-2"/>
            Confirm Result
          </Button>
        </div>
      </div>
    </Modal>
  );
};
    