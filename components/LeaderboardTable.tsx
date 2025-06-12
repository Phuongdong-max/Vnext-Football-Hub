
import React from 'react';
import { LeaderboardEntry } from '../types';
import { UserCircleIcon, StarIcon } from './icons';

interface LeaderboardTableProps {
  leaderboardData: LeaderboardEntry[];
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({ leaderboardData }) => {
  const sortedLeaderboard = [...leaderboardData].sort((a, b) => b.points - a.points);

  return (
    <div className="bg-surface shadow-xl rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-primary uppercase tracking-wider w-16">Rank</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-primary uppercase tracking-wider">Player</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-primary uppercase tracking-wider">Bets Made</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-primary uppercase tracking-wider">Points</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedLeaderboard.map((entry, index) => (
              <tr key={entry.userId} className={`${index < 3 ? 'bg-yellow-50' : ''} hover:bg-gray-50 transition-colors`}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-textPrimary">
                  <div className="flex items-center">
                  {index === 0 && <StarIcon className="w-5 h-5 text-primary mr-1" />} {/* Changed from text-amber-400 */}
                  {index === 1 && <StarIcon className="w-5 h-5 text-gray-400 mr-1" />}
                  {index === 2 && <StarIcon className="w-5 h-5 text-primary mr-1" />} {/* Changed from text-orange-400 */}
                  {index + 1}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {entry.avatarUrl ? (
                      <img className="h-10 w-10 rounded-full mr-3 border-2 border-primary/50" src={entry.avatarUrl} alt={entry.userName} />
                    ) : (
                      <UserCircleIcon className="h-10 w-10 text-gray-400 mr-3"/>
                    )}
                    <div className="text-sm font-medium text-textPrimary">{entry.userName}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-textSecondary">{entry.betsMade}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-primary">{entry.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};