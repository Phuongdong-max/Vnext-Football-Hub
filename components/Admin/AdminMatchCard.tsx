import React, { useState } from 'react';
import { BettingRound, BettingRoundStatus, MatchResultTeam } from '../../types';
import { Button } from '../shared/Button';
import { CalendarIcon, ClockIcon, PencilAltIcon, UsersIcon, CheckCircleIcon } from '../icons';
import { AiAnalysisModal } from '../AiAnalysisModal'; // Import the new modal
import { useLanguage } from '../../contexts/LanguageContext';
import { useAppContext } from '../../contexts/AppContext';

interface AdminMatchCardProps {
  round: BettingRound;
  onUpdateResult: (roundId: string) => void;
}

export const AdminMatchCard: React.FC<AdminMatchCardProps> = ({ round, onUpdateResult }) => {
  const { translate } = useLanguage();
  const { isBettingEnabled } = useAppContext();
  const { matchDetails, status, bets, winningTeam } = round;
  const [isAiAnalysisModalOpen, setIsAiAnalysisModalOpen] = useState(false);
  const isAiFeatureAvailable = !!process.env.API_KEY && process.env.API_KEY !== '';

  const getStatusBadge = () => {
    switch (status) {
      case BettingRoundStatus.OPEN:
        return (
          <span className="text-xs font-semibold bg-success/10 text-success dark:bg-success/40 dark:text-success px-2 py-1 rounded-full">
            {translate('bettingRoundStatus.open')}
          </span>
        );
      case BettingRoundStatus.CLOSED:
        return (
          <span className="text-xs font-semibold bg-warning/15 text-vnext-amber dark:bg-warning/40 dark:text-vnext-amber px-2 py-1 rounded-full">
            {translate('bettingRoundStatus.awaitingResult')}
          </span>
        );
      case BettingRoundStatus.RESULT_UPDATED:
        return (
          <span className="text-xs font-semibold bg-primary/10 text-vnext-deep dark:text-primary dark:bg-primary/40 dark:text-primary px-2 py-1 rounded-full">
            {translate('bettingRoundStatus.finished')}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="bg-card rounded-xl shadow-card hover:shadow-card-hover transition-shadow duration-300 overflow-hidden flex flex-col">
        <div className="p-5 flex-grow">
          <div className="flex tems-center justify-between items-start mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">{matchDetails.league}</span>
            <div className="flex items-center space-x-2">
              {isAiFeatureAvailable && (
                <button
                  onClick={() => setIsAiAnalysisModalOpen(true)}
                  className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-card/10 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
                  title={translate('button.viewAiAnalysis')}
                  aria-label={translate('button.viewAiAnalysis')}
                >
                  <span
                    className="font-bold text-sm bg-clip-text text-transparent 
 bg-gradient-to-r from-primary via-primary to-primary
 dark:from-primary dark:via-primary dark:to-primary"
                  >
                    AI
                  </span>
                </button>
              )}
              {getStatusBadge()}
            </div>
          </div>

          <div className="text-center my-4">
            <p className="text-lg font-bold text-foreground">{matchDetails.homeTeam}</p>
            <p className="text-sm text-muted-foreground my-1">{translate('matchCard.versus')}</p>
            <p className="text-lg font-bold text-foreground">{matchDetails.awayTeam}</p>
          </div>

          <div className="text-xs text-muted-foreground space-y-1 mb-3">
            <p className="flex items-center">
              <CalendarIcon className="w-4 h-4 mr-2 text-primary" />{' '}
              {new Date(matchDetails.startTime).toLocaleDateString()}
            </p>
            <p className="flex items-center">
              <ClockIcon className="w-4 h-4 mr-2 text-primary" />{' '}
              {new Date(matchDetails.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="flex items-center">
              <UsersIcon className="w-4 h-4 mr-2 text-primary" />{' '}
              {translate('adminMatchCard.betsPlaced', { count: bets.length })}
            </p>
          </div>

          {status === BettingRoundStatus.RESULT_UPDATED && winningTeam && (
            <div className="my-3 p-2 bg-primary/10 dark:bg-primary/30 rounded-md text-center">
              <p className="text-sm font-semibold text-primary flex items-center justify-center">
                <CheckCircleIcon className="w-5 h-5 mr-2 text-success" />
                {translate('matchCard.resultLabel')}{' '}
                {winningTeam === MatchResultTeam.DRAW
                  ? translate('matchResult.draw')
                  : `${winningTeam === MatchResultTeam.HOME_WIN ? matchDetails.homeTeam : matchDetails.awayTeam} ${translate('matchResult.won')}`}
              </p>
            </div>
          )}
        </div>

        {(status === BettingRoundStatus.OPEN || status === BettingRoundStatus.CLOSED) && (
          <div className="p-4 bg-muted/50 /60 border-t border-border">
            <Button onClick={() => onUpdateResult(round.id)} variant="warning" fullWidth disabled={!isBettingEnabled}>
              <PencilAltIcon className="w-5 h-5 mr-2" /> {translate('adminMatchCard.button.updateResult')}
            </Button>
          </div>
        )}
        {status === BettingRoundStatus.RESULT_UPDATED && (
          <div className="p-4 bg-success/10 dark:bg-success/30 text-center text-sm text-success font-medium border-t border-success/40 dark:border-success/40">
            {translate('adminMatchCard.resultsRecorded')}
          </div>
        )}
      </div>
      {isAiFeatureAvailable && (
        <AiAnalysisModal
          isOpen={isAiAnalysisModalOpen}
          onClose={() => setIsAiAnalysisModalOpen(false)}
          matchDetails={matchDetails}
        />
      )}
    </>
  );
};
