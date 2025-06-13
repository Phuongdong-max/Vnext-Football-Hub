
import { 
  BettingRound, Bet, User, FootballMatch, LeaderboardEntry, 
  UserRole, BettingRoundStatus, BetTeamSelection, MatchResultTeam 
} from '../types';
import { getAllMockUsers, getMockUserById, updateUserPointsInMock as updateUserAuthServicePoints } from './mockAuthService';
import { INITIAL_USER_POINTS } from '../constants';

// Simulate a database
let bettingRounds: BettingRound[] = [];
// Points are primarily managed through the user objects in mockAuthService now.

// Simulate API delay
const apiDelay = <T,>(data: T, delay: number = 200): Promise<T> => 
  new Promise(resolve => setTimeout(() => resolve(data), delay));


export const createBettingRound = async (match: FootballMatch, adminUserId: string): Promise<BettingRound> => {
  const adminUser = await getMockUserById(adminUserId);
  if (!adminUser || adminUser.role !== UserRole.ADMIN) {
    throw new Error("Only admins can create betting rounds.");
  }
  if (bettingRounds.some(br => br.matchId === match.id)) {
    throw new Error("A betting round for this match already exists.");
  }

  const newRound: BettingRound = {
    id: `round_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    matchId: match.id,
    matchDetails: { ...match },
    status: BettingRoundStatus.OPEN,
    bets: [],
    createdBy: adminUserId,
    createdAt: new Date(),
  };
  bettingRounds.push(newRound);
  return apiDelay({ ...newRound });
};

export const getBettingRoundById = async (roundId: string): Promise<BettingRound | null> => {
  const round = bettingRounds.find(r => r.id === roundId);
  return round ? apiDelay({ ...round }) : apiDelay(null);
};

export const getOpenBettingRounds = async (): Promise<BettingRound[]> => {
  const openRounds = bettingRounds.filter(r => r.status === BettingRoundStatus.OPEN);
  return apiDelay(openRounds.map(r => ({ ...r })).sort((a, b) => new Date(a.matchDetails.startTime).getTime() - new Date(b.matchDetails.startTime).getTime()));
};

export const getBettingRoundsByAdmin = async (adminId: string): Promise<BettingRound[]> => {
  const rounds = bettingRounds.filter(r => r.createdBy === adminId);
  return apiDelay(rounds.map(r => ({ ...r })).sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
}

export const getClosedBettingRoundsForMember = async (userId: string): Promise<BettingRound[]> => {
    const rounds = bettingRounds.filter(r => 
        (r.status === BettingRoundStatus.CLOSED || r.status === BettingRoundStatus.RESULT_UPDATED) &&
        r.bets.some(b => b.userId === userId)
    );
    return apiDelay(rounds.map(r => ({...r})).sort((a,b) => new Date(b.matchDetails.startTime).getTime() - new Date(a.matchDetails.startTime).getTime()));
};


export const placeBet = async (roundId: string, userId: string, userName: string, selectedTeam: BetTeamSelection, pointsBet: number): Promise<Bet> => {
  const round = bettingRounds.find(r => r.id === roundId);
  if (!round) throw new Error("Betting round not found.");
  if (round.status !== BettingRoundStatus.OPEN) throw new Error("This round is not open for betting.");
  
  // User existence and points validation is primarily handled in the UI layer (MemberHomePage)
  // using AppContext.currentUser before this function is called.
  // This service function now focuses on recording the bet in the mock system.

  if (pointsBet <=0) throw new Error("Points bet must be positive.");

  if (round.bets.some(b => b.userId === userId)) {
    throw new Error("You have already placed a bet on this round.");
  }

  const newBet: Bet = {
    userId,
    userName, // Denormalized for convenience
    roundId,
    selectedTeam,
    pointsBet,
    timestamp: new Date(),
  };

  round.bets.push(newBet);
  
  // If the user is a mock user, update their points directly in the mockAuthService
  // for internal consistency of the mock system.
  // The authoritative point update (for UI and persistence like Firestore)
  // is handled by updateUserPoints in AppContext, called from MemberHomePage.
  const mockUser = await getMockUserById(userId);
  if (mockUser) {
    updateUserAuthServicePoints(userId, mockUser.points - pointsBet);
  }

  return apiDelay({ ...newBet });
};

export const updateMatchResult = async (
  roundId: string, 
  winningTeam: MatchResultTeam,
  updateUserPointsCallback: (userId: string, points: number) => void // Callback from AppContext
): Promise<BettingRound> => {
  const roundIndex = bettingRounds.findIndex(r => r.id === roundId);
  if (roundIndex === -1) throw new Error("Betting round not found.");
  
  const round = bettingRounds[roundIndex];
  if (round.status === BettingRoundStatus.RESULT_UPDATED) throw new Error("Result already updated for this round.");

  round.winningTeam = winningTeam;
  round.status = BettingRoundStatus.RESULT_UPDATED;

  // Calculate points for bettors
  for (const bet of round.bets) {
    const user = await getMockUserById(bet.userId); // Check if bettor is a mock user
    let userPointsToUpdate: number | null = null;

    if (user) { // If it's a mock user, use their current points from mockAuthService
      userPointsToUpdate = user.points;
    }
    // For Firebase users, their points are managed by Firestore and updated via updateUserPointsCallback.
    // We don't fetch their current points here, but calculate the change.

    let pointsChange = 0; // This is the amount TO ADD to the user's current points.
                        // If they lose, pointsChange is 0 because points were already "deducted" at bet placement.
                        // If they win, pointsChange is bet.pointsBet * 2 (original bet + winnings).
                        // If draw, pointsChange is bet.pointsBet (original bet returned).

    if (winningTeam === MatchResultTeam.DRAW) {
      pointsChange = bet.pointsBet; // Return points on draw
    } else {
      const betWon = (bet.selectedTeam === BetTeamSelection.HOME && winningTeam === MatchResultTeam.HOME_WIN) ||
                     (bet.selectedTeam === BetTeamSelection.AWAY && winningTeam === MatchResultTeam.AWAY_WIN);
      if (betWon) {
        pointsChange = bet.pointsBet * 2; // User gets back their bet + winnings equal to bet
      } else {
        pointsChange = 0; // Points already deducted when bet was placed. No change here from this logic.
      }
    }
    
    // The updateUserPointsCallback will fetch the LATEST points for Firebase users before adding pointsChange,
    // or use the current points for mock users from AppContext.
    // For mock users, updateUserAuthServicePoints is called inside updateUserPointsCallback.
    // So, we just need to pass the *change* relative to the original bet.
    // For a win, they get 2 * bet.pointsBet. Their original bet.pointsBet was removed. So they effectively gain bet.pointsBet.
    // For a draw, they get bet.pointsBet back. Their original bet.pointsBet was removed. So they effectively gain 0 relative to pre-bet.
    // For a loss, they get 0 back. Their original bet.pointsBet was removed. So they effectively lose bet.pointsBet.
    // The `updateUserPointsCallback` in `App.tsx` expects the *new total points*.
    // So we need to calculate that.

    const userForCallback = await getMockUserById(bet.userId); // Get fresh user data if mock
                                                            // For Firebase users this will be null,
                                                            // `updateUserPointsCallback` handles fetching their points from Firestore.
    let currentPointsForCalc = 0;
    if (userForCallback) {
        currentPointsForCalc = userForCallback.points; // Points AFTER bet was placed and deducted by placeBet's internal mock update
    } else {
        // For a Firebase user, we need to consider their points are managed externally.
        // The `updateUserPointsCallback` (which is `updateUserPoints` from `AppContext`)
        // will handle getting their current points from Firestore.
        // We're essentially telling it to add `pointsChange` to their *current* Firestore points.
        // However, `updateUserPoints` expects the *final absolute points*.

        // Let's adjust pointsChange to be the *net gain/loss* relative to points *before* this round's win/loss.
        // And `updateUserPointsCallback` in `AdminDashboardPage` calls `updateUserPoints`.
        // `updateUserPoints` in App.tsx takes absolute points.
        // This is tricky. `updateMatchResult` should give back the new total.

        // Simpler: `updateUserPointsCallback` is `updateUserPoints` from AppContext.
        // It takes the *new total points*.
        // When the bet was placed, points were deducted. So `user.points` for a mock user
        // already reflects that.
        // For Firebase user, their points in Firestore also reflect the deduction.

        // If win: original_points - bet_amount + (bet_amount * 2) = original_points + bet_amount
        // If draw: original_points - bet_amount + bet_amount = original_points
        // If loss: original_points - bet_amount + 0 = original_points - bet_amount

        // The points used by `updateUserPointsCallback` should be the final state.
        // The `updateUserAuthServicePoints` inside `placeBet` (for mock users) already deducted.
        // The `updateUserPoints` in `MemberHomePage` after `placeBet` also already deducted.

        // So, `pointsChange` here is the amount to ADD BACK to the user's current balance.
        // (which is already `currentUser.points - pointsBet`).
        // If win, add `bet.pointsBet * 2`.
        // If draw, add `bet.pointsBet`.
        // If loss, add `0`.
        
        let finalPointsForUser;
        const targetUser = user; // user from the loop (could be mock or data for a firebase user IF we fetched it, but we only have ID)
        
        // This part needs the user's points *after* the bet was placed and points deducted.
        // For mock users, `user.points` is correct (it was updated by placeBet).
        // For Firebase users, this is harder, as `updateMatchResult` doesn't have their current Firestore points.
        // The `updateUserPointsCallback` MUST handle fetching current points if needed.

        // Let's assume `updateUserPointsCallback` handles fetching the CURRENT points of the user
        // and then adds the net change.
        // Net change:
        // Win: +bet.pointsBet
        // Draw: 0 (original bet returned means net 0 change from pre-bet state)
        // Loss: -bet.pointsBet
        
        // No, `updateUserPointsCallback` (which is `updateUserPoints` in `AppContext`) expects the *absolute new points*.
        // This means `updateMatchResult` needs to calculate this absolute new total.

        const userCurrentPoints = user ? user.points : INITIAL_USER_POINTS; // Fallback, but `updateUserPoints` in context will use actual for Firebase

        if (winningTeam === MatchResultTeam.DRAW) {
            // Points were deducted when bet was placed. Now add them back.
            finalPointsForUser = userCurrentPoints + bet.pointsBet;
        } else {
            const betWon = (bet.selectedTeam === BetTeamSelection.HOME && winningTeam === MatchResultTeam.HOME_WIN) ||
                           (bet.selectedTeam === BetTeamSelection.AWAY && winningTeam === MatchResultTeam.AWAY_WIN);
            if (betWon) {
                // Points deducted, now add back original bet + winnings (which is another bet.pointsBet)
                finalPointsForUser = userCurrentPoints + (bet.pointsBet * 2);
            } else {
                // Points deducted, nothing to add back.
                finalPointsForUser = userCurrentPoints;
            }
        }
        updateUserPointsCallback(bet.userId, finalPointsForUser);
        // Also update mock user points directly if it's a mock user, to keep internal state consistent
        if (user) {
            updateUserAuthServicePoints(user.id, finalPointsForUser);
        }

    }
  }
  
  bettingRounds[roundIndex] = { ...round }; // Ensure change is reflected in the array
  return apiDelay({ ...round });
};


export const getLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  const users = await getAllMockUsers();
  const allRounds = bettingRounds; // No need to map, use current state

  const leaderboardEntries: LeaderboardEntry[] = users.map(user => {
    const betsMadeCount = allRounds.reduce((count, round) => {
        return count + round.bets.filter(bet => bet.userId === user.id).length;
    }, 0);

    // Points are now directly from the user object via mockAuthService
    return {
      userId: user.id,
      userName: user.name,
      avatarUrl: user.avatarUrl,
      points: user.points,
      betsMade: betsMadeCount,
      wins: 0, // Wins calculation can be complex, simplified for now
    };
  });

  return apiDelay(leaderboardEntries.sort((a, b) => b.points - a.points));
};

// For demo/testing: reset betting data
export const resetMockBettingData = (): void => {
  bettingRounds = [];
  // User points are reset via resetMockUsers in mockAuthService
};
