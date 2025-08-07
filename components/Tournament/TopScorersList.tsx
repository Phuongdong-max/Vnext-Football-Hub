
import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { StarIcon } from '../icons';

interface TopScorer {
    name: string;
    goals: number;
    teamName: string;
    isGuest: boolean;
}

interface TopScorersListProps {
    scorers: TopScorer[];
}

export const TopScorersList: React.FC<TopScorersListProps> = ({ scorers }) => {
    const { translate } = useLanguage();

    if (!scorers || scorers.length === 0) {
        return (
            <div className="bg-surface shadow-lg rounded-lg p-6 text-center text-textSecondary italic">
                {translate('topScorersList.noScorers')}
            </div>
        );
    }
    
    return (
        <div className="bg-surface shadow-lg rounded-lg p-4 sm:p-6">
            <ol className="space-y-3">
                {scorers.map((scorer, index) => (
                    <li key={`${scorer.name}-${scorer.teamName}`} className="flex items-center p-3 bg-background dark:bg-slate-800/60 rounded-lg transition-transform duration-200 hover:scale-[1.02] shadow-sm">
                        <div className="flex items-center font-bold text-lg text-textPrimary w-10">
                           {index < 3 ? 
                                <StarIcon className={`w-6 h-6 mr-1 ${
                                    index === 0 ? 'text-yellow-400' : 
                                    index === 1 ? 'text-slate-400' : 'text-amber-600 dark:text-amber-500'
                                }`} /> :
                                <span className="text-center w-6 text-textSecondary">{index + 1}</span>
                            }
                        </div>
                        <div className="flex-grow ml-2">
                            <p className="font-semibold text-textPrimary">{scorer.name}</p>
                            <p className="text-xs text-textSecondary">
                                {scorer.teamName}
                                {scorer.isGuest ? translate('topScorersList.guest') : ''}
                            </p>
                        </div>
                        <div className="text-right">
                           <p className="font-bold text-xl text-primary">{scorer.goals}</p>
                           <p className="text-xs text-textSecondary">{translate('topScorersList.goals')}</p>
                        </div>
                    </li>
                ))}
            </ol>
        </div>
    );
}
