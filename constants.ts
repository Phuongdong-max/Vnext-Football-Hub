
import { UserRole } from './types';

export const APP_TITLE = "Vnext FootballHub";

// REPLACE WITH YOUR ACTUAL DEPLOYED FUNCTION URL
// Example after deployment: https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/footballApiProxy
// Since your project ID appears to be 'vnext-football-hub', the URL below is likely correct.
// If not, ensure 'vnext-football-hub' is replaced with your Firebase project ID.
export const FOOTBALL_API_PROXY_URL = 'https://us-central1-vnext-football-hub.cloudfunctions.net/footballApiProxy'; 

export const MOCK_ADMIN_ID = 'admin001';
export const MOCK_MEMBER_ID = 'member001';
export const MOCK_MEMBER_ID_2 = 'member002';

export const INITIAL_USER_POINTS = 1000;

export const MOCK_USERS_DATA = [
  { id: MOCK_ADMIN_ID, name: 'Admin User', email: 'admin@example.com', role: UserRole.ADMIN, points: INITIAL_USER_POINTS, avatarUrl: 'https://picsum.photos/seed/admin/100/100', betsMadeCount: 0, winsCount: 0 },
  { id: MOCK_MEMBER_ID, name: 'Member User', email: 'member@example.com', role: UserRole.MEMBER, points: INITIAL_USER_POINTS, avatarUrl: 'https://picsum.photos/seed/member1/100/100', betsMadeCount: 0, winsCount: 0 },
  { id: MOCK_MEMBER_ID_2, name: 'Jane Doe', email: 'jane@example.com', role: UserRole.MEMBER, points: INITIAL_USER_POINTS, avatarUrl: 'https://picsum.photos/seed/member2/100/100', betsMadeCount: 0, winsCount: 0 },
];

export const MOCK_FOOTBALL_MATCHES_DATA = [
  { id: 'match001', homeTeam: 'Manchester United', awayTeam: 'Liverpool FC', startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), league: 'Premier League', leagueCode: 'PL' },
  { id: 'match002', homeTeam: 'Real Madrid', awayTeam: 'FC Barcelona', startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), league: 'La Liga', leagueCode: 'PD' },
  { id: 'match003', homeTeam: 'Bayern Munich', awayTeam: 'Borussia Dortmund', startTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), league: 'Bundesliga', leagueCode: 'BL1' },
  { id: 'match004', homeTeam: 'Paris Saint-Germain', awayTeam: 'Olympique de Marseille', startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), league: 'Ligue 1', leagueCode: 'FL1' },
  { id: 'match005', homeTeam: 'Juventus FC', awayTeam: 'Inter Milan', startTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), league: 'Serie A', leagueCode: 'SA' },
];

// This is no longer the direct API URL but the proxy's URL
export const FOOTBALL_API_BASE_URL = FOOTBALL_API_PROXY_URL; 

// Common Tier One league codes for Football-Data.org (free plan usually covers these)
export const TIER_ONE_LEAGUE_CODES = ['PL', 'BL1', 'SA', 'PD', 'FL1', 'CL', 'EC']; // Premier League, Bundesliga, Serie A, La Liga, Ligue 1, Champions League, European Championships
