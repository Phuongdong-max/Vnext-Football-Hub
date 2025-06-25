import React, { useState } from 'react';
import { BettingRound, MatchResultTeam } from '../../types';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { PencilAltIcon } from '../icons';
import { useLanguage } from '../../App';

interface UpdateResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  round: BettingRound;
  onUpdateResult: (roundId: string, winningTeam: MatchResultTeam) => void;
}

export const UpdateResultModal: React.FC<UpdateResultModalProps> = ({ isOpen, onClose, round, onUpdateResult }) => {
  const { translate } = useLanguage();
  const [selectedWinner, setSelectedWinner] = useState<MatchResultTeam | ''>('');

  const handleSubmit = () => {
    if (!selectedWinner) return;
    onUpdateResult(round.id, selectedWinner);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={translate('updateResultModal.title', { homeTeam: round.matchDetails.homeTeam, awayTeam: round.matchDetails.awayTeam })}
    >
      <div className="space-y-4">
        <p className="text-sm text-textSecondary">{translate('updateResultModal.instruction')}</p>
        
        <div className="space-y-2">
          <Button
            onClick={() => setSelectedWinner(MatchResultTeam.HOME_WIN)}
            variant={selectedWinner === MatchResultTeam.HOME_WIN ? 'primary' : 'outline'}
            fullWidth
          >
            {translate('updateResultModal.button.homeWin', { teamName: round.matchDetails.homeTeam })}
          </Button>
          <Button
            onClick={() => setSelectedWinner(MatchResultTeam.AWAY_WIN)}
            variant={selectedWinner === MatchResultTeam.AWAY_WIN ? 'primary' : 'outline'}
            fullWidth
          >
            {translate('updateResultModal.button.awayWin', { teamName: round.matchDetails.awayTeam })}
          </Button>
          <Button
            onClick={() => setSelectedWinner(MatchResultTeam.DRAW)}
            variant={selectedWinner === MatchResultTeam.DRAW ? 'primary' : 'outline'}
            fullWidth
          >
            {translate('updateResultModal.button.draw')}
          </Button>
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <Button onClick={onClose} variant="secondary">{translate('common.button.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={!selectedWinner}>
            <PencilAltIcon className="w-5 h-5 mr-2"/>
            {translate('updateResultModal.button.confirmResult')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
