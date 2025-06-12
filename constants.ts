
import { UserRole } from './types';

export const APP_TITLE = "Vnext FootballHub";

export const MOCK_ADMIN_ID = 'admin001';
export const MOCK_MEMBER_ID = 'member001';
export const MOCK_MEMBER_ID_2 = 'member002';

export const INITIAL_USER_POINTS = 1000;

export const MOCK_USERS_DATA = [
  { id: MOCK_ADMIN_ID, name: 'Admin User', email: 'admin@example.com', role: UserRole.ADMIN, points: INITIAL_USER_POINTS, avatarUrl: 'https://picsum.photos/seed/admin/100/100' },
  { id: MOCK_MEMBER_ID, name: 'Member User', email: 'member@example.com', role: UserRole.MEMBER, points: INITIAL_USER_POINTS, avatarUrl: 'https://picsum.photos/seed/member1/100/100' },
  { id: MOCK_MEMBER_ID_2, name: 'Jane Doe', email: 'jane@example.com', role: UserRole.MEMBER, points: INITIAL_USER_POINTS, avatarUrl: 'https://picsum.photos/seed/member2/100/100' },
];

export const MOCK_FOOTBALL_MATCHES_DATA = [
  { id: 'match001', homeTeam: 'Manchester United', awayTeam: 'Liverpool FC', startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), league: 'Premier League' },
  { id: 'match002', homeTeam: 'Real Madrid', awayTeam: 'FC Barcelona', startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), league: 'La Liga' },
  { id: 'match003', homeTeam: 'Bayern Munich', awayTeam: 'Borussia Dortmund', startTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), league: 'Bundesliga' },
  { id: 'match004', homeTeam: 'Paris Saint-Germain', awayTeam: 'Olympique de Marseille', startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), league: 'Ligue 1' },
  { id: 'match005', homeTeam: 'Juventus FC', awayTeam: 'Inter Milan', startTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), league: 'Serie A' },
];