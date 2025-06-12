
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
          {status === BettingRoundStatus.OPEN && <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full">Open</span>}
          {status === BettingRoundStatus.CLOSED && <span className="text-xs font-semibold bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Awaiting Result</span>}
          {status === BettingRoundStatus.RESULT_UPDATED && <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Finished</span>}
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
          <div className="my-3 p-2 bg-primary/10 rounded-md text-center">
            <p className="text-sm font-semibold text-primary flex items-center justify-center">
              <CheckCircleIcon className="w-5 h-5 mr-2 text-green-500" />
              Result: {winningTeam === MatchResultTeam.DRAW ? "Draw" : `${winningTeam === MatchResultTeam.HOME_WIN ? matchDetails.homeTeam : matchDetails.awayTeam} Won`}
            </p>
          </div>
        )}

      </div>
      
      {status === BettingRoundStatus.OPEN && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <Button onClick={() => onUpdateResult(round.id)} variant="warning" fullWidth>
            <PencilAltIcon className="w-5 h-5 mr-2"/> Update Result
          </Button>
        </div>
      )}
      {status === BettingRoundStatus.RESULT_UPDATED && (
         <div className="p-4 bg-green-50 text-center text-sm text-green-700 font-medium border-t border-green-200">
            Results have been recorded for this match.
        </div>
      )}
       {status === BettingRoundStatus.CLOSED && ( // Technically admin should still be able to update if "closed" meant betting is closed but result not in
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <Button onClick={() => onUpdateResult(round.id)} variant="warning" fullWidth>
            <PencilAltIcon className="w-5 h-5 mr-2"/> Update Result
          </Button>
        </div>
      )}
    </div>
  );
};
    