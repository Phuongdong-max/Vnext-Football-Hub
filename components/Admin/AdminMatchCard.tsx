import React from 'react';
import { BettingRound, BettingRoundStatus, MatchResultTeam } from '../../types';
import { Button } from '../shared/Button';
import { CalendarIcon, ClockIcon, PencilAltIcon, UsersIcon, CheckCircleIcon } from '../icons';

interface AdminMatchCardProps {
  round: BettingRound;
  onUpdateResult: (roundId: string) => void;
}

export const AdminMatchCard: React.FC<AdminMatchCardProps> = ({ round, onUpdateResult }) => {
  const { matchDetails, status, bets, winningTeam } = round;

  return (
    <div className="bg-surface rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col">
      <div className="p-5 flex-grow">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">{matchDetails.league}</span>
          {status === BettingRoundStatus.OPEN && <span className="text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-800/40 dark:text-green-300 px-2 py-1 rounded-full">Open</span>}
          {status === BettingRoundStatus.CLOSED && <span className="text-xs font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-800/40 dark:text-yellow-300 px-2 py-1 rounded-full">Awaiting Result</span>}
          {status === BettingRoundStatus.RESULT_UPDATED && <span className="text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-800/40 dark:text-blue-300 px-2 py-1 rounded-full">Finished</span>}
        </div>

        <div className="text-center my-4">
          <p className="text-lg font-bold text-textPrimary">{matchDetails.homeTeam}</p>
          <p className="text-sm text-textSecondary my-1">vs</p>
          <p className="text-lg font-bold text-textPrimary">{matchDetails.awayTeam}</p>
        </div>

        <div className="text-xs text-textSecondary space-y-1 mb-3">
          <p className="flex items-center"><CalendarIcon className="w-4 h-4 mr-2 text-primary" /> {new Date(matchDetails.startTime).toLocaleDateString()}</p>
          <p className="flex items-center"><ClockIcon className="w-4 h-4 mr-2 text-primary" /> {new Date(matchDetails.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          <p className="flex items-center"><UsersIcon className="w-4 h-4 mr-2 text-primary" /> {bets.length} Bet(s) Placed</p>
        </div>
        
        {status === BettingRoundStatus.RESULT_UPDATED && winningTeam && (
          <div className="my-3 p-2 bg-primary/10 dark:bg-primary/30 rounded-md text-center">
            <p className="text-sm font-semibold text-primary flex items-center justify-center">
              <CheckCircleIcon className="w-5 h-5 mr-2 text-green-500 dark:text-green-400" />
              Result: {winningTeam === MatchResultTeam.DRAW ? "Draw" : `${winningTeam === MatchResultTeam.HOME_WIN ? matchDetails.homeTeam : matchDetails.awayTeam} Won`}
            </p>
          </div>
        )}

      </div>
      
      {(status === BettingRoundStatus.OPEN || status === BettingRoundStatus.CLOSED) && ( 
        <div className="p-4 bg-gray-50 dark:bg-slate-800/60 border-t border-border">
          <Button onClick={() => onUpdateResult(round.id)} variant="warning" fullWidth>
            <PencilAltIcon className="w-5 h-5 mr-2"/> Update Result
          </Button>
        </div>
      )}
      {status === BettingRoundStatus.RESULT_UPDATED && (
         <div className="p-4 bg-green-50 dark:bg-green-700/30 text-center text-sm text-green-700 dark:text-green-300 font-medium border-t border-green-200 dark:border-green-600/50">
            Results have been recorded for this match.
        </div>
      )}
    </div>
  );
};