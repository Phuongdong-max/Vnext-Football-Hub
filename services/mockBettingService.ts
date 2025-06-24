
// import { 
//   BettingRound, Bet, User, FootballMatch, LeaderboardEntry, 
//   UserRole, BettingRoundStatus, BetTeamSelection, MatchResultTeam 
// } from '../types';
// import { getAllMockUsers, getMockUserById, updateUserPointsInMock as updateUserAuthServicePoints } from './mockAuthService';
// import { INITIAL_USER_POINTS } from '../constants';

// let bettingRounds: BettingRound[] = [];

// const apiDelay = <T,>(data: T, delay: number = 200): Promise<T> => 
//   new Promise(resolve => setTimeout(() => resolve(data), delay));


// export const createBettingRound = async (match: FootballMatch, adminUserId: string): Promise<BettingRound> => {
//   const adminUser = await getMockUserById(adminUserId);
//   if (!adminUser || adminUser.role !== UserRole.ADMIN) {
//     throw new Error("Only admins can create betting rounds.");
//   }
//   if (bettingRounds.some(br => br.matchId === match.id)) {
//     throw new Error("A betting round for this match already exists.");
//   }

//   const newRound: BettingRound = {
//     id: `round_${Date.now()}_${Math.random().toString(16).slice(2)}`,
//     matchId: match.id,
//     matchDetails: { ...match },
//     status: BettingRoundStatus.OPEN,
//     bets: [],
//     createdBy: adminUserId,
//     createdAt: new Date(),
//   };
//   bettingRounds.push(newRound);
//   return apiDelay({ ...newRound });
// };

// export const getBettingRoundById = async (roundId: string): Promise<BettingRound | null> => {
//   const round = bettingRounds.find(r => r.id === roundId);
//   return round ? apiDelay({ ...round }) : apiDelay(null);
// };

// export const getOpenBettingRounds = async (): Promise<BettingRound[]> => {
//   const openRounds = bettingRounds.filter(r => r.status === BettingRoundStatus.OPEN);
//   return apiDelay(openRounds.map(r => ({ ...r })).sort((a, b) => new Date(a.matchDetails.startTime).getTime() - new Date(b.matchDetails.startTime).getTime()));
// };

// export const getBettingRoundsByAdmin = async (adminId: string): Promise<BettingRound[]> => {
//   const rounds = bettingRounds.filter(r => r.createdBy === adminId);
//   return apiDelay(rounds.map(r => ({ ...r })).sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
// }

// export const getClosedBettingRoundsForMember = async (userId: string): Promise<BettingRound[]> => {
//     const rounds = bettingRounds.filter(r => 
//         (r.status === BettingRoundStatus.CLOSED || r.status === BettingRoundStatus.RESULT_UPDATED) &&
//         r.bets.some(b => b.userId === userId)
//     );
//     return apiDelay(rounds.map(r => ({...r})).sort((a,b) => new Date(b.matchDetails.startTime).getTime() - new Date(a.matchDetails.startTime).getTime()));
// };


// export const placeBet = async (roundId: string, userId: string, userName: string, selectedTeam: BetTeamSelection, pointsBet: number): Promise<Bet> => {
//   const round = bettingRounds.find(r => r.id === roundId);
//   if (!round) throw new Error("Betting round not found.");
//   if (round.status !== BettingRoundStatus.OPEN) throw new Error("This round is not open for betting.");
  
//   if (pointsBet <=0) throw new Error("Points bet must be positive.");

//   if (round.bets.some(b => b.userId === userId)) {
//     throw new Error("You have already placed a bet on this round.");
//   }

//   const newBet: Bet = {
//     userId,
//     userName,
//     roundId,
//     selectedTeam,
//     pointsBet,
//     timestamp: new Date(),
//   };

//   round.bets.push(newBet);
  
//   const mockUser = await getMockUserById(userId);
//   if (mockUser) {
//     updateUserAuthServicePoints(userId, mockUser.points - pointsBet);
//   }

//   return apiDelay({ ...newBet });
// };

// export const updateMatchResult = async (
//   roundId: string, 
//   winningTeam: MatchResultTeam,
//   updateUserPointsCallback: (userId: string, points: number) => void
// ): Promise<BettingRound> => {
//   const roundIndex = bettingRounds.findIndex(r => r.id === roundId);
//   if (roundIndex === -1) throw new Error("Betting round not found.");
  
//   const round = bettingRounds[roundIndex];
//   if (round.status === BettingRoundStatus.RESULT_UPDATED) throw new Error("Result already updated for this round.");

//   round.winningTeam = winningTeam;
//   round.status = BettingRoundStatus.RESULT_UPDATED;

//   for (const bet of round.bets) {
//     const user = await getMockUserById(bet.userId); 
//     let userPointsToUpdate: number | null = null;

//     if (user) { 
//       userPointsToUpdate = user.points;
//     }
    
//     let finalPointsForUser;
//     const userCurrentPoints = user ? user.points : INITIAL_USER_POINTS; 

//     if (winningTeam === MatchResultTeam.DRAW) {
//         finalPointsForUser = userCurrentPoints + bet.pointsBet;
//     } else {
//         const betWon = (bet.selectedTeam === BetTeamSelection.HOME && winningTeam === MatchResultTeam.HOME_WIN) ||
//                        (bet.selectedTeam === BetTeamSelection.AWAY && winningTeam === MatchResultTeam.AWAY_WIN);
//         if (betWon) {
//             finalPointsForUser = userCurrentPoints + (bet.pointsBet * 2);
//         } else {
//             finalPointsForUser = userCurrentPoints;
//         }
//     }
//     updateUserPointsCallback(bet.userId, finalPointsForUser);
//     if (user) {
//         updateUserAuthServicePoints(user.id, finalPointsForUser);
//     }

//   }
  
//   bettingRounds[roundIndex] = { ...round };
//   return apiDelay({ ...round });
// };


// export const getLeaderboard = async (): Promise<LeaderboardEntry[]> => {
//   const users = await getAllMockUsers();
//   const allRounds = bettingRounds; 

//   const leaderboardEntries: LeaderboardEntry[] = users.map(user => {
//     const betsMadeCount = allRounds.reduce((count, round) => {
//         return count + round.bets.filter(bet => bet.userId === user.id).length;
//     }, 0);

//     return {
//       userId: user.id,
//       userName: user.name,
//       avatarUrl: user.avatarUrl,
//       points: user.points,
//       betsMade: betsMadeCount,
//       wins: 0, 
//     };
//   });

//   return apiDelay(leaderboardEntries.sort((a, b) => b.points - a.points));
// };

// export const resetMockBettingData = (): void => {
//   bettingRounds = [];
// };

// This file is now largely empty as mock betting is removed.
export {};
