



import React, { useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppContext } from '../contexts/AppContext';
import { LeaderboardTable } from '../components/LeaderboardTable';
import { RefreshIcon, TrophyIcon } from '../components/icons';
import { Button } from '../components/shared/Button';

export const LeaderboardPage: React.FC = () => {
  const { leaderboard, refreshLeaderboard } = useAppContext();
  const { translate } = useLanguage();

  useEffect(() => {
    // This effect should only run once when the component mounts.
    // The empty dependency array `[]` ensures this, preventing re-render loops.
    refreshLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-textPrimary flex items-center">
          <TrophyIcon className="w-8 h-8 mr-3 text-primary" /> {/* Changed from text-amber-400 */}
          {translate('page.leaderboard.title')}
        </h1>
        <Button onClick={refreshLeaderboard} variant="outline" size="sm" title={translate('page.leaderboard.button.refresh')}>
          <RefreshIcon className="w-5 h-5" />
        </Button>
      </div>
      {leaderboard.length > 0 ? (
        <LeaderboardTable leaderboardData={leaderboard} />
      ) : (
        <p className="text-center text-textSecondary py-8">{translate('page.leaderboard.emptyMessage')}</p>
      )}
    </div>
  );
};
