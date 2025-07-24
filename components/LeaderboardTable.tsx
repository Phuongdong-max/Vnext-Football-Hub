
import React from 'react';
import { LeaderboardEntry } from '../types';
import { UserCircleIcon, StarIcon } from './icons';
import { INITIAL_USER_POINTS } from '../constants'; 
import { useLanguage } from '../contexts/LanguageContext';

interface LeaderboardTableProps {
  leaderboardData: LeaderboardEntry[];
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({ leaderboardData }) => {
  const { translate } = useLanguage();
  const sortedLeaderboard = [...leaderboardData].sort((a, b) => b.points - a.points);

  return (
    <div className="bg-surface shadow-xl rounded-lg overflow-hidden">
      {/* Desktop Table View */}
      <div className="overflow-x-auto hidden md:block">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-gray-50 dark:bg-slate-700">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-primary uppercase tracking-wider w-16">{translate('leaderboardTable.header.rank')}</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-primary uppercase tracking-wider">{translate('leaderboardTable.header.player')}</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-primary uppercase tracking-wider">{translate('leaderboardTable.header.points')}</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-primary uppercase tracking-wider">{translate('leaderboardTable.header.netChange')}</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-primary uppercase tracking-wider">{translate('leaderboardTable.header.betsMade')}</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-primary uppercase tracking-wider">{translate('leaderboardTable.header.wins')}</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-primary uppercase tracking-wider">{translate('leaderboardTable.header.winRate')}</th>
            </tr>
          </thead>
          <tbody className="bg-surface divide-y divide-border">
            {sortedLeaderboard.map((entry, index) => {
              const netPointsChange = entry.points - INITIAL_USER_POINTS;
              const winRate = entry.betsMade > 0 ? (entry.wins / entry.betsMade * 100) : 0;

              let netChangeColor = 'text-textSecondary';
              if (netPointsChange > 0) netChangeColor = 'text-success';
              else if (netPointsChange < 0) netChangeColor = 'text-danger';

              return (
                <tr key={entry.userId} className={`${index < 3 ? 'bg-yellow-50 dark:bg-yellow-500/10' : ''} hover:bg-gray-100 dark:hover:bg-slate-700/70 transition-colors`}>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-textPrimary">
                    <div className="flex items-center">
                    {index === 0 && <StarIcon className="w-5 h-5 text-yellow-400 dark:text-yellow-300 mr-1" />}
                    {index === 1 && <StarIcon className="w-5 h-5 text-gray-400 dark:text-slate-400 mr-1" />}
                    {index === 2 && <StarIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mr-1" />}
                    {index + 1}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {entry.avatarUrl ? (
                        <img className="h-10 w-10 rounded-full mr-3 border-2 border-primary/50 dark:border-primary/70" src={entry.avatarUrl} alt={entry.userName} />
                      ) : (
                        <UserCircleIcon className="h-10 w-10 text-gray-400 dark:text-slate-500 mr-3"/>
                      )}
                      <div className="text-sm font-medium text-textPrimary">{entry.userName}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-primary">{entry.points}</td>
                  <td className={`px-4 py-4 whitespace-nowrap text-sm font-semibold ${netChangeColor}`}>
                    {netPointsChange > 0 ? '+' : ''}{netPointsChange}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-textSecondary">{entry.betsMade}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-textSecondary">{entry.wins}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-textSecondary">{winRate.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="block md:hidden">
        <ul className="divide-y divide-border">
          {sortedLeaderboard.map((entry, index) => {
              const netPointsChange = entry.points - INITIAL_USER_POINTS;
              const winRate = entry.betsMade > 0 ? (entry.wins / entry.betsMade * 100) : 0;
              let netChangeColor = 'text-textSecondary';
              if (netPointsChange > 0) netChangeColor = 'text-success';
              else if (netPointsChange < 0) netChangeColor = 'text-danger';

              return (
                 <li key={entry.userId} className={`p-4 ${index < 3 ? 'bg-yellow-50 dark:bg-yellow-500/10' : ''}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                             <div className="flex items-center font-bold text-lg text-textPrimary w-10">
                                {index === 0 && <StarIcon className="w-6 h-6 text-yellow-400 dark:text-yellow-300 mr-1" />}
                                {index === 1 && <StarIcon className="w-6 h-6 text-gray-400 dark:text-slate-400 mr-1" />}
                                {index === 2 && <StarIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-500 mr-1" />}
                                {index > 2 && <span className="w-6 text-center">{index + 1}</span>}
                            </div>
                            {entry.avatarUrl ? (
                                <img className="h-10 w-10 rounded-full mr-3 border-2 border-primary/50" src={entry.avatarUrl} alt={entry.userName} />
                            ) : (
                                <UserCircleIcon className="h-10 w-10 text-gray-400 dark:text-slate-500 mr-3"/>
                            )}
                            <span className="font-semibold text-textPrimary">{entry.userName}</span>
                        </div>
                        <div className="text-right">
                           <p className="font-bold text-lg text-primary">{entry.points}</p>
                           <p className={`text-xs font-semibold ${netChangeColor}`}>
                             {netPointsChange > 0 ? '+' : ''}{netPointsChange}
                           </p>
                        </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-gray-100 dark:bg-slate-700 p-2 rounded-md">
                            <p className="font-semibold text-textPrimary">{entry.betsMade}</p>
                            <p className="text-textSecondary">{translate('leaderboardTable.header.betsMade')}</p>
                        </div>
                        <div className="bg-gray-100 dark:bg-slate-700 p-2 rounded-md">
                            <p className="font-semibold text-textPrimary">{entry.wins}</p>
                            <p className="text-textSecondary">{translate('leaderboardTable.header.wins')}</p>
                        </div>
                        <div className="bg-gray-100 dark:bg-slate-700 p-2 rounded-md">
                            <p className="font-semibold text-textPrimary">{winRate.toFixed(1)}%</p>
                            <p className="text-textSecondary">{translate('leaderboardTable.header.winRate')}</p>
                        </div>
                    </div>
                 </li>
              )
          })}
        </ul>
      </div>
    </div>
  );
};
