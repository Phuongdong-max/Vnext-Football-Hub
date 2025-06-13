
import React, { useEffect } from 'react';
import { useAppContext } from '../App';
import { LeaderboardTable } from '../components/LeaderboardTable';
import { RefreshIcon, TrophyIcon } from '../components/icons';
import { Button } from '../components/shared/Button';

export const LeaderboardPage: React.FC = () => {
  const { leaderboard, refreshLeaderboard } = useAppContext();

  useEffect(() => {
    refreshLeaderboard();
  }, [refreshLeaderboard]); // Refresh on mount and if refreshLeaderboard instance changes

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-textPrimary flex items-center">
          <TrophyIcon className="w-8 h-8 mr-3 text-primary" /> {/* Changed from text-amber-400 */}
          Leaderboard
        </h1>
        <Button onClick={refreshLeaderboard} variant="outline" size="sm" title="Refresh Leaderboard">
          <RefreshIcon className="w-5 h-5" />
        </Button>
      </div>
      {leaderboard.length > 0 ? (
        <LeaderboardTable leaderboardData={leaderboard} />
      ) : (
        <p className="text-center text-textSecondary py-8">The leaderboard is currently empty. Bets need to be settled for scores to appear.</p>
      )}
    </div>
  );
};
