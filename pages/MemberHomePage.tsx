import React, { useState, useEffect, useCallback } from 'react';
import { BettingRound, BetTeamSelection, BettingRoundStatus } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppContext } from '../contexts/AppContext';
import {
  getFirebaseOpenBettingRounds,
  getFirebaseClosedBettingRoundsForMember,
  placeFirebaseBet,
} from '../services/firebaseService';
import { MatchCard } from '../components/MatchCard';
import { BettingModal } from '../components/BettingModal';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { RefreshIcon, CurrencyDollarIcon, ListBulletIcon } from '../components/icons';
import { EmptyState, MatchCardSkeletonGrid } from '../components/shared/EmptyState';
import { Button } from '../components/shared/Button';

export const MemberHomePage: React.FC = () => {
  const { currentUser, addToast, refreshLeaderboard, isFirebaseReady } = useAppContext();
  const { translate } = useLanguage();
  const [openRounds, setOpenRounds] = useState<BettingRound[]>([]);
  const [closedRounds, setClosedRounds] = useState<BettingRound[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isBettingModalOpen, setIsBettingModalOpen] = useState(false);
  const [selectedRoundForBet, setSelectedRoundForBet] = useState<BettingRound | null>(null);

  const fetchMemberData = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setIsDataLoading(true);
      else setIsLoading(true);

      try {
        let openRoundsPromise: Promise<BettingRound[]> = Promise.resolve([]);
        let closedRoundsPromise: Promise<BettingRound[]> = Promise.resolve([]);

        if (isFirebaseReady) {
          // Always fetch open rounds for all users.
          openRoundsPromise = getFirebaseOpenBettingRounds();
          // Only fetch closed (user-specific) rounds if logged in.
          if (currentUser) {
            closedRoundsPromise = getFirebaseClosedBettingRoundsForMember(currentUser.id);
          }
        } else {
          addToast('info.bettingRoundsUnavailableFirebaseNotReady', 'info');
        }

        const [open, closed] = await Promise.all([openRoundsPromise, closedRoundsPromise]);

        setOpenRounds(
          open.sort(
            (a, b) => new Date(a.matchDetails.startTime).getTime() - new Date(b.matchDetails.startTime).getTime(),
          ),
        );
        setClosedRounds(
          closed.sort(
            (a, b) => new Date(b.matchDetails.startTime).getTime() - new Date(a.matchDetails.startTime).getTime(),
          ),
        );
      } catch (error) {
        console.error('Error fetching member data:', error);
        addToast('error.failedToLoadBettingRounds', 'error');
      } finally {
        if (isManualRefresh) setIsDataLoading(false);
        else setIsLoading(false);
      }
    },
    [currentUser, addToast, isFirebaseReady],
  );

  useEffect(() => {
    // Fetch data as soon as Firebase is ready. The dependency on currentUser
    // will trigger a re-fetch upon login/logout to get the user-specific `closedRounds`.
    if (isFirebaseReady) {
      fetchMemberData();
    } else {
      // If firebase isn't ready, don't show a loader forever.
      setIsLoading(false);
      setOpenRounds([]);
      setClosedRounds([]);
    }
  }, [currentUser, fetchMemberData, isFirebaseReady]);

  const handleOpenBettingModal = (round: BettingRound) => {
    if (!currentUser) {
      addToast('info.loginToPlaceBet', 'info');
      return;
    }
    if (currentUser.points <= 0) {
      addToast('info.noPointsToBet', 'info');
      return;
    }
    setSelectedRoundForBet(round);
    setIsBettingModalOpen(true);
  };

  const handlePlaceBet = async (roundId: string, team: BetTeamSelection, points: number) => {
    if (!currentUser) return;
    if (points > currentUser.points) {
      addToast('error.betExceedsPoints', 'error');
      return;
    }
    setIsDataLoading(true);
    try {
      if (isFirebaseReady) {
        await placeFirebaseBet(roundId, currentUser.id, currentUser.name, team, points);
      } else {
        addToast('error.cannotPlaceBetFirebaseNotReady', 'error');
        setIsDataLoading(false);
        return;
      }
      addToast('success.betPlaced', 'success', { points });

      fetchMemberData(true);
      refreshLeaderboard();
      setIsBettingModalOpen(false);
      setSelectedRoundForBet(null);
    } catch (error) {
      console.error('Error placing bet:', error);
      addToast('error.placingBet', 'error', { errorMessage: (error as Error).message });
    } finally {
      setIsDataLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div
          className="skeleton-shimmer h-9 w-72"
          aria-label={translate('memberHomePage.loadingRounds')}
          role="status"
        />
        <MatchCardSkeletonGrid count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground">{translate('memberHomePage.availableRoundsTitle')}</h1>
        <Button
          onClick={() => fetchMemberData(true)}
          variant="outline"
          size="sm"
          title={translate('memberHomePage.button.refreshData')}
          disabled={isDataLoading}
        >
          {isDataLoading ? <LoadingSpinner size="sm" className="w-5 h-5" /> : <RefreshIcon className="w-5 h-5" />}
        </Button>
      </div>

      {isBettingModalOpen && selectedRoundForBet && currentUser && (
        <BettingModal
          isOpen={isBettingModalOpen}
          onClose={() => {
            setIsBettingModalOpen(false);
            setSelectedRoundForBet(null);
          }}
          round={selectedRoundForBet}
          currentUserPoints={currentUser.points}
          onPlaceBet={handlePlaceBet}
        />
      )}

      <section>
        <h2 className="text-2xl font-semibold text-foreground mb-4">
          {translate('memberHomePage.openForBettingTitle', { count: openRounds.length })}
        </h2>
        {openRounds.length === 0 && !isDataLoading ? (
          <EmptyState
            icon={<CurrencyDollarIcon />}
            title={translate('memberHomePage.noOpenRounds')}
            description={translate('memberHomePage.emptyOpenHint')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {openRounds.map((round) => (
              <MatchCard
                key={round.id}
                round={round}
                onBet={() => handleOpenBettingModal(round)}
                currentUser={currentUser}
              />
            ))}
          </div>
        )}
      </section>

      {currentUser && (
        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            {translate('memberHomePage.pastBetsTitle', { count: closedRounds.length })}
          </h2>
          {closedRounds.length === 0 && !isDataLoading ? (
            <EmptyState
              icon={<ListBulletIcon />}
              title={translate('memberHomePage.noPastRounds')}
              description={translate('memberHomePage.emptyPastHint')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {closedRounds.map((round) => (
                <MatchCard key={round.id} round={round} currentUser={currentUser} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
