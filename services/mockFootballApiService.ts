
// import { FootballMatch } from '../types';
// import { MOCK_FOOTBALL_MATCHES_DATA } from '../constants';

// const apiDelay = <T,>(data: T, delay: number = 300): Promise<T> => 
//   new Promise(resolve => setTimeout(() => resolve(data), delay));


// let upcomingMatchesData: FootballMatch[] = MOCK_FOOTBALL_MATCHES_DATA.map(match => ({
//     ...match,
//     startTime: new Date(match.startTime) 
// }));

// export const getUpcomingMatches = async (): Promise<FootballMatch[]> => {
//   const now = new Date();
//   const filtered = upcomingMatchesData.filter(match => match.startTime > now);
//   return apiDelay([...filtered]); 
// };

// export const getMatchById = async (matchId: string): Promise<FootballMatch | null> => {
//   const match = upcomingMatchesData.find(m => m.id === matchId);
//   return match ? apiDelay({ ...match }) : apiDelay(null);
// };

// export const addMockMatch = async (match: Omit<FootballMatch, 'id'>): Promise<FootballMatch> => {
//     const newMatch: FootballMatch = {
//         ...match,
//         id: `match_${Date.now()}_${Math.random().toString(16).slice(2)}`,
//         startTime: new Date(match.startTime)
//     };
//     upcomingMatchesData.push(newMatch);
//     return apiDelay({...newMatch});
// }

// This file is now largely empty as mock football data is removed.
// The actual footballApiService.ts will be used for API calls.
export {};
