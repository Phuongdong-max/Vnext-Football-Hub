
import React from 'react';
import { BettingRound, User, BetTeamSelection, MatchResultTeam, BettingRoundStatus, Bet } from '../types';
import { Button } from './shared/Button';
import { CalendarIcon, ClockIcon, CurrencyDollarIcon, CheckCircleIcon, XCircleIcon, MinusCircleIcon } from './icons';

interface MatchCardProps {
  round: BettingRound;
  onBet?: (roundId: string) => void;
  currentUser: User | null;
}

export const MatchCard: React.FC<MatchCardProps> = ({ round, onBet, currentUser }) => {
  const { matchDetails, status, winningTeam } = round;
  const userBet = currentUser ? round.bets.find(b => b.userId === currentUser.id) : null;

  const getBetStatusDisplay = (bet: Bet | null | undefined, roundStatus: BettingRoundStatus, result?: MatchResultTeam | null) => {
    if (!bet || roundStatus === BettingRoundStatus.OPEN) return null;

    if (roundStatus === BettingRoundStatus.RESULT_UPDATED && result) {
      const betWon = (bet.selectedTeam === BetTeamSelection.HOME && result === MatchResultTeam.HOME_WIN) ||
                     (bet.selectedTeam === BetTeamSelection.AWAY && result === MatchResultTeam.AWAY_WIN);
      
      if (result === MatchResultTeam.DRAW) {
         return <span className="text-sm font-medium text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full flex items-center"><MinusCircleIcon className="w-4 h-4 mr-1"/> Draw (Returned: {bet.pointsBet} pts)</span>;
      }
      if (betWon) {
        // Net gain is bet.pointsBet
        return <span className="text-sm font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full flex items-center"><CheckCircleIcon className="w-4 h-4 mr-1"/> Bet Won! (+{bet.pointsBet} pts)</span>;
      } else {
        // Net loss is bet.pointsBet
        return <span className="text-sm font-medium text-red-600 bg-red-100 px-2 py-1 rounded-full flex items-center"><XCircleIcon className="w-4 h-4 mr-1"/> Bet Lost (-{bet.pointsBet} pts)</span>;
      }
    }
    return null;
  };

  const betStatusDisplay = getBetStatusDisplay(userBet, status, winningTeam);

  const homeBets = round.bets.filter(b => b.selectedTeam === BetTeamSelection.HOME);
  const awayBets = round.bets.filter(b => b.selectedTeam === BetTeamSelection.AWAY);

  return (
    <div className="bg-surface rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col">
      <div className="p-5 flex-grow">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">{matchDetails.league}</span>
          {status === BettingRoundStatus.OPEN && <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full">Open</span>}
          {status === BettingRoundStatus.CLOSED && <span className="text-xs font-semibold bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Closed (Awaiting Result)</span>}
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
        </div>

        {status === BettingRoundStatus.RESULT_UPDATED && winningTeam && (
          <div className="my-3 p-2 bg-primary/10 rounded-md text-center">
            <p className="text-sm font-semibold text-primary">
              Result: {winningTeam === MatchResultTeam.DRAW ? "Draw" : `${winningTeam === MatchResultTeam.HOME_WIN ? matchDetails.homeTeam : matchDetails.awayTeam} Won`}
            </p>
          </div>
        )}
        
        {userBet && (
          <div className="my-3 p-2 bg-gray-100 rounded-md text-sm">
            <p>Your bet: <span className="font-semibold">{userBet.pointsBet} points</span> on <span className="font-semibold">{userBet.selectedTeam === BetTeamSelection.HOME ? matchDetails.homeTeam : matchDetails.awayTeam}</span></p>
            {betStatusDisplay && <div className="mt-1">{betStatusDisplay}</div>}
          </div>
        )}

        {/* Detailed Bets Display when results are updated */}
        {status === BettingRoundStatus.RESULT_UPDATED && winningTeam && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <h4 className="text-base font-semibold text-textPrimary mb-3 text-center">All Bet Outcomes</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="font-medium text-textSecondary mb-1 pb-1 border-b border-gray-200">{matchDetails.homeTeam} Bettors:</p>
                {homeBets.length > 0 ? (
                  <ul className="space-y-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar-thin">
                    {homeBets.map(bet => {
                        let outcomeClass = '';
                        let outcomeText = '';
                        if (winningTeam === MatchResultTeam.DRAW) {
                          outcomeClass = 'text-yellow-700'; // Using Tailwind's yellow for draw
                          outcomeText = `(Returned ${bet.pointsBet} pts)`;
                        } else if (winningTeam === MatchResultTeam.HOME_WIN) {
                          outcomeClass = 'text-green-600'; // Tailwind's green for win
                          outcomeText = `(+${bet.pointsBet} pts)`;
                        } else { 
                          outcomeClass = 'text-red-600'; // Tailwind's red for loss
                          outcomeText = `(-${bet.pointsBet} pts)`;
                        }
                        return (
                          <li key={`${bet.roundId}-${bet.userId}-home`} className="flex justify-between items-center p-1.5 bg-gray-50 hover:bg-gray-100 rounded text-textPrimary">
                            <span className="truncate mr-2" title={bet.userName}>{bet.userName}: {bet.pointsBet}</span>
                            <span className={`font-semibold ${outcomeClass} ml-1 whitespace-nowrap`}>{outcomeText}</span>
                          </li>
                        );
                      })}
                  </ul>
                ) : (
                  <p className="text-gray-400 italic text-center py-2">No bets placed.</p>
                )}
              </div>
              <div>
                <p className="font-medium text-textSecondary mb-1 pb-1 border-b border-gray-200">{matchDetails.awayTeam} Bettors:</p>
                {awayBets.length > 0 ? (
                  <ul className="space-y-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar-thin">
                    {awayBets.map(bet => {
                        let outcomeClass = '';
                        let outcomeText = '';
                        if (winningTeam === MatchResultTeam.DRAW) {
                          outcomeClass = 'text-yellow-700';
                          outcomeText = `(Returned ${bet.pointsBet} pts)`;
                        } else if (winningTeam === MatchResultTeam.AWAY_WIN) {
                          outcomeClass = 'text-green-600';
                          outcomeText = `(+${bet.pointsBet} pts)`;
                        } else { 
                          outcomeClass = 'text-red-600';
                          outcomeText = `(-${bet.pointsBet} pts)`;
                        }
                        return (
                          <li key={`${bet.roundId}-${bet.userId}-away`} className="flex justify-between items-center p-1.5 bg-gray-50 hover:bg-gray-100 rounded text-textPrimary">
                            <span className="truncate mr-2" title={bet.userName}>{bet.userName}: {bet.pointsBet}</span>
                            <span className={`font-semibold ${outcomeClass} ml-1 whitespace-nowrap`}>{outcomeText}</span>
                          </li>
                        );
                      })}
                  </ul>
                ) : (
                  <p className="text-gray-400 italic text-center py-2">No bets placed.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div> {/* End of p-5 flex-grow */}
      
      {status === BettingRoundStatus.OPEN && onBet && currentUser && !userBet && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <Button onClick={() => onBet(round.id)} fullWidth>
            <CurrencyDollarIcon className="w-5 h-5 mr-2"/> Place Bet
          </Button>
        </div>
      )}
      {status === BettingRoundStatus.OPEN && currentUser && userBet && (
         <div className="p-4 bg-green-50 text-center text-sm text-green-700 font-medium border-t border-green-200">
            You have already placed a bet on this match.
        </div>
      )}
       {!currentUser && status === BettingRoundStatus.OPEN && (
         <div className="p-4 bg-gray-50 text-center text-sm text-textSecondary font-medium border-t border-gray-200">
            Login to place a bet.
        </div>
      )}
      <style>{`
        .custom-scrollbar-thin::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-track {
          background-color: var(--color-background); 
          border-radius: 10px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb {
          background-color: var(--color-secondary); 
          border-radius: 10px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover {
          /* --color-secondary is #475569 (rgb(71, 85, 105)) */
          background-color: rgba(71, 85, 105, 0.8); /* var(--color-secondary) with 80% opacity */
        }
      `}</style>
    </div>
  );
};