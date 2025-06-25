import React, { useState } from 'react';
import { BettingRound, User, BetTeamSelection, MatchResultTeam, BettingRoundStatus, Bet } from '../types';
import { Button } from './shared/Button';
import { 
    CalendarIcon, ClockIcon, CurrencyDollarIcon, CheckCircleIcon, 
    XCircleIcon, MinusCircleIcon
} from './icons';
import { AiAnalysisModal } from './AiAnalysisModal'; // Import the new modal
import { useLanguage } from '../App';

interface MatchCardProps {
  round: BettingRound;
  onBet?: (roundId: string) => void;
  currentUser: User | null;
}

export const MatchCard: React.FC<MatchCardProps> = ({ round, onBet, currentUser }) => {
  const { translate } = useLanguage();
  const { matchDetails, status, winningTeam } = round;
  const userBet = currentUser ? round.bets.find(b => b.userId === currentUser.id) : null;

  const [isAiAnalysisModalOpen, setIsAiAnalysisModalOpen] = useState(false);
  const isAiFeatureAvailable = !!process.env.API_KEY && process.env.API_KEY !== "";

  const getBetStatusDisplay = (bet: Bet | null | undefined, roundStatus: BettingRoundStatus, result?: MatchResultTeam | null) => {
    if (!bet || roundStatus === BettingRoundStatus.OPEN) return null;

    if (roundStatus === BettingRoundStatus.RESULT_UPDATED && result) {
      const betWon = (bet.selectedTeam === BetTeamSelection.HOME && result === MatchResultTeam.HOME_WIN) ||
                     (bet.selectedTeam === BetTeamSelection.AWAY && result === MatchResultTeam.AWAY_WIN);
      
      if (result === MatchResultTeam.DRAW) {
         return <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-700/30 px-2 py-1 rounded-full flex items-center"><MinusCircleIcon className="w-4 h-4 mr-1"/> {translate('matchCard.betStatus.draw', { points: bet.pointsBet })}</span>;
      }
      if (betWon) {
        return <span className="text-sm font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-700/30 px-2 py-1 rounded-full flex items-center"><CheckCircleIcon className="w-4 h-4 mr-1"/> {translate('matchCard.betStatus.won', { points: bet.pointsBet * 2 })}</span>;
      } else {
        return <span className="text-sm font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-700/30 px-2 py-1 rounded-full flex items-center"><XCircleIcon className="w-4 h-4 mr-1"/> {translate('matchCard.betStatus.lost', { points: bet.pointsBet })}</span>;
      }
    }
    return null;
  };

  const betStatusDisplay = getBetStatusDisplay(userBet, status, winningTeam);

  const homeBets = round.bets.filter(b => b.selectedTeam === BetTeamSelection.HOME);
  const awayBets = round.bets.filter(b => b.selectedTeam === BetTeamSelection.AWAY);

  const getStatusBadge = () => {
    switch (status) {
      case BettingRoundStatus.OPEN:
        return <span className="text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-800/40 dark:text-green-300 px-2 py-1 rounded-full">{translate('bettingRoundStatus.open')}</span>;
      case BettingRoundStatus.CLOSED:
        return <span className="text-xs font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-800/40 dark:text-yellow-300 px-2 py-1 rounded-full">{translate('bettingRoundStatus.closedAwaitingResult')}</span>;
      case BettingRoundStatus.RESULT_UPDATED:
        return <span className="text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-800/40 dark:text-blue-300 px-2 py-1 rounded-full">{translate('bettingRoundStatus.finished')}</span>;
      default:
        return null;
    }
  };

  return (
    <>
      <div className="bg-surface rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col">
        <div className="p-5 flex-grow">
          <div className="flex items-center justify-between items-start mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">{matchDetails.league}</span>
            <div className="flex items-center space-x-2">
              {isAiFeatureAvailable && (
                <button
                  onClick={() => setIsAiAnalysisModalOpen(true)}
                  className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
                  title={translate('button.viewAiAnalysis')}
                  aria-label={translate('button.viewAiAnalysis')}
                >
                  <span className="font-bold text-sm bg-clip-text text-transparent 
                                   bg-gradient-to-r from-fuchsia-600 via-pink-500 to-orange-500
                                   dark:from-fuchsia-400 dark:via-pink-400 dark:to-orange-400">
                    AI
                  </span>
                </button>
              )}
              {getStatusBadge()}
            </div>
          </div>

          <div className="text-center my-4">
            <p className="text-lg font-bold text-textPrimary">{matchDetails.homeTeam}</p>
            <p className="text-sm text-textSecondary my-1">{translate('matchCard.versus')}</p>
            <p className="text-lg font-bold text-textPrimary">{matchDetails.awayTeam}</p>
          </div>

          <div className="text-xs text-textSecondary space-y-1 mb-3">
            <p className="flex items-center"><CalendarIcon className="w-4 h-4 mr-2 text-primary" /> {new Date(matchDetails.startTime).toLocaleDateString()}</p>
            <p className="flex items-center"><ClockIcon className="w-4 h-4 mr-2 text-primary" /> {new Date(matchDetails.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>

          {status === BettingRoundStatus.RESULT_UPDATED && winningTeam && (
            <div className="my-3 p-2 bg-primary/10 dark:bg-primary/30 rounded-md text-center">
              <p className="text-sm font-semibold text-primary">
                {translate('matchCard.resultLabel')} {winningTeam === MatchResultTeam.DRAW ? translate('matchResult.draw') : `${winningTeam === MatchResultTeam.HOME_WIN ? matchDetails.homeTeam : matchDetails.awayTeam} ${translate('matchResult.won')}`}
              </p>
            </div>
          )}
          
          {userBet && (
            <div className="my-3 p-2 bg-gray-100 dark:bg-slate-700 rounded-md text-sm text-textPrimary">
              <p>{translate('matchCard.yourBet')} <span className="font-semibold">{translate('matchCard.pointsBetValue', { points: userBet.pointsBet })}</span> {translate('matchCard.onTeam')} <span className="font-semibold">{userBet.selectedTeam === BetTeamSelection.HOME ? matchDetails.homeTeam : matchDetails.awayTeam}</span></p>
              {betStatusDisplay && <div className="mt-1">{betStatusDisplay}</div>}
            </div>
          )}

          {status === BettingRoundStatus.OPEN && round.bets.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border">
              <h4 className="text-base font-semibold text-textPrimary mb-3 text-center">{translate('matchCard.currentBets', { count: round.bets.length })}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="font-medium text-textSecondary mb-1 pb-1 border-b border-border">{translate('matchCard.teamBettors', { teamName: matchDetails.homeTeam })}</p>
                  {homeBets.length > 0 ? (
                    <ul className="space-y-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar-thin">
                      {homeBets.map(bet => (
                        <li key={`${bet.roundId}-${bet.userId}-home-open`} className="flex justify-between items-center p-1.5 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 rounded text-textPrimary">
                          <span className="truncate mr-2" title={bet.userName}>{bet.userName}</span>
                          <span className="font-semibold text-primary whitespace-nowrap">{translate('matchCard.pointsBetValue', { points: bet.pointsBet })}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400 dark:text-slate-500 italic text-center py-2">{translate('matchCard.noBetsYet')}</p>
                  )}
                </div>
                <div>
                  <p className="font-medium text-textSecondary mb-1 pb-1 border-b border-border">{translate('matchCard.teamBettors', { teamName: matchDetails.awayTeam })}</p>
                  {awayBets.length > 0 ? (
                    <ul className="space-y-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar-thin">
                      {awayBets.map(bet => (
                        <li key={`${bet.roundId}-${bet.userId}-away-open`} className="flex justify-between items-center p-1.5 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 rounded text-textPrimary">
                          <span className="truncate mr-2" title={bet.userName}>{bet.userName}</span>
                          <span className="font-semibold text-primary whitespace-nowrap">{translate('matchCard.pointsBetValue', { points: bet.pointsBet })}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400 dark:text-slate-500 italic text-center py-2">{translate('matchCard.noBetsYet')}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {status === BettingRoundStatus.RESULT_UPDATED && winningTeam && (
            <div className="mt-4 pt-3 border-t border-border">
              <h4 className="text-base font-semibold text-textPrimary mb-3 text-center">{translate('matchCard.allBetOutcomes')}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="font-medium text-textSecondary mb-1 pb-1 border-b border-border">{translate('matchCard.teamBettors', { teamName: matchDetails.homeTeam })}</p>
                  {homeBets.length > 0 ? (
                    <ul className="space-y-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar-thin">
                      {homeBets.map(bet => {
                          let outcomeClass = ''; let outcomeText = '';
                          if (winningTeam === MatchResultTeam.DRAW) { outcomeClass = 'text-yellow-700 dark:text-yellow-400'; outcomeText = translate('matchCard.outcome.returned', { points: bet.pointsBet });
                          } else if (winningTeam === MatchResultTeam.HOME_WIN) { outcomeClass = 'text-green-600 dark:text-green-400'; outcomeText = translate('matchCard.outcome.won', { points: bet.pointsBet * 2 });
                          } else { outcomeClass = 'text-red-600 dark:text-red-400'; outcomeText = translate('matchCard.outcome.lost', { points: bet.pointsBet }); }
                          return ( <li key={`${bet.roundId}-${bet.userId}-home`} className="flex justify-between items-center p-1.5 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 rounded text-textPrimary"> <span className="truncate mr-2" title={bet.userName}>{bet.userName}: {bet.pointsBet}</span> <span className={`font-semibold ${outcomeClass} ml-1 whitespace-nowrap`}>{outcomeText}</span> </li> );
                        })}
                    </ul>
                  ) : (<p className="text-gray-400 dark:text-slate-500 italic text-center py-2">{translate('matchCard.noBetsPlaced')}</p>)}
                </div>
                <div>
                  <p className="font-medium text-textSecondary mb-1 pb-1 border-b border-border">{translate('matchCard.teamBettors', { teamName: matchDetails.awayTeam })}</p>
                  {awayBets.length > 0 ? (
                    <ul className="space-y-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar-thin">
                      {awayBets.map(bet => {
                          let outcomeClass = ''; let outcomeText = '';
                          if (winningTeam === MatchResultTeam.DRAW) { outcomeClass = 'text-yellow-700 dark:text-yellow-400'; outcomeText = translate('matchCard.outcome.returned', { points: bet.pointsBet });
                          } else if (winningTeam === MatchResultTeam.AWAY_WIN) { outcomeClass = 'text-green-600 dark:text-green-400'; outcomeText = translate('matchCard.outcome.won', { points: bet.pointsBet * 2 });
                          } else { outcomeClass = 'text-red-600 dark:text-red-400'; outcomeText = translate('matchCard.outcome.lost', { points: bet.pointsBet });}
                          return (<li key={`${bet.roundId}-${bet.userId}-away`} className="flex justify-between items-center p-1.5 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 rounded text-textPrimary"> <span className="truncate mr-2" title={bet.userName}>{bet.userName}: {bet.pointsBet}</span> <span className={`font-semibold ${outcomeClass} ml-1 whitespace-nowrap`}>{outcomeText}</span> </li>);
                        })}
                    </ul>
                  ) : (<p className="text-gray-400 dark:text-slate-500 italic text-center py-2">{translate('matchCard.noBetsPlaced')}</p>)}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {status === BettingRoundStatus.OPEN && onBet && currentUser && !userBet && (
          <div className="p-4 bg-gray-50 dark:bg-slate-800/60 border-t border-border">
            <Button onClick={() => onBet(round.id)} fullWidth>
              <CurrencyDollarIcon className="w-5 h-5 mr-2"/> {translate('matchCard.button.placeBet')}
            </Button>
          </div>
        )}
        {status === BettingRoundStatus.OPEN && currentUser && userBet && (
           <div className="p-4 bg-green-50 dark:bg-green-700/30 text-center text-sm text-green-700 dark:text-green-300 font-medium border-t border-green-200 dark:border-green-600/50">
              {translate('matchCard.alreadyBet')}
          </div>
        )}
         {!currentUser && status === BettingRoundStatus.OPEN && (
           <div className="p-4 bg-gray-50 dark:bg-slate-800/60 text-center text-sm text-textSecondary font-medium border-t border-border">
              {translate('matchCard.loginToBet')}
          </div>
        )}
        <style>{`
          .custom-scrollbar-thin::-webkit-scrollbar { width: 4px; height: 4px; }
          .custom-scrollbar-thin::-webkit-scrollbar-track { background-color: var(--color-surface); border-radius: 10px; }
          html.dark .custom-scrollbar-thin::-webkit-scrollbar-track { background-color: var(--color-background); }
          .custom-scrollbar-thin::-webkit-scrollbar-thumb { background-color: var(--color-secondary); border-radius: 10px; }
          .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover { background-color: var(--color-secondary); opacity: 0.8; }
        `}</style>
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