import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { StarIcon } from '../icons';
import { TournamentTeam } from '../../types';

interface TopScorer {
    name: string;
    goals: number;
    teamName: string;
    teamId: string;
    isGuest: boolean;
    jerseyNumber?: number;
}

interface TopScorersListProps {
    scorers: TopScorer[];
    teams: TournamentTeam[];
}

export const TopScorersList: React.FC<TopScorersListProps> = ({ scorers, teams }) => {
    const { translate } = useLanguage();

    if (!scorers || scorers.length === 0) {
        return (
            <div className="p-6 text-center text-textSecondary italic">
                {translate('topScorersList.noScorers')}
            </div>
        );
    }
    
    return (
        <div className="p-4 sm:p-6">
            <ol className="space-y-3">
                {scorers.map((scorer, index) => {
                    const team = teams.find(t => t.id === scorer.teamId);
                    const teamColor = team?.color || '#a1a1aa'; // default slate-400
                    
                    return (
                        <li key={`${scorer.name}-${scorer.teamName}`} className="flex items-center p-3 bg-background dark:bg-slate-800/60 hover:bg-gray-100 dark:hover:bg-slate-700/80 rounded-lg transition-transform duration-200 hover:scale-[1.02] shadow-sm">
                            <div className="flex items-center font-bold text-lg w-10">
                               {index < 3 ? 
                                    <StarIcon className={`w-6 h-6 mr-1 ${
                                        index === 0 ? 'text-yellow-400' : 
                                        index === 1 ? 'text-slate-400' : 'text-amber-600 dark:text-amber-500'
                                    }`} /> :
                                    <span className="text-center w-6 text-textSecondary">{index + 1}</span>
                                }
                            </div>
                            <div className="flex-grow ml-2">
                                <p className="font-semibold text-textPrimary">
                                    {scorer.name}
                                    {!scorer.isGuest && scorer.jerseyNumber !== undefined && (
                                        <span className="text-textSecondary text-sm font-normal ml-1">
                                            (#{scorer.jerseyNumber})
                                        </span>
                                    )}
                                </p>
                                <p className="text-xs text-textSecondary flex items-center gap-2">
                                    <div style={{ backgroundColor: teamColor }} className="w-1 h-3 rounded-full inline-block"></div>
                                    <span>
                                        {scorer.teamName}
                                        {scorer.isGuest ? translate('topScorersList.guest') : ''}
                                    </span>
                                </p>
                            </div>
                            <div className="text-right">
                               <p className="font-bold text-xl text-primary">{scorer.goals}</p>
                               <p className="text-xs text-textSecondary">{translate('topScorersList.goals')}</p>
                            </div>
                        </li>
                    )
                })}
            </ol>
        </div>
    );
}