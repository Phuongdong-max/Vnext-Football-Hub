
export enum UserRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  points: number;
}

export interface FootballMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  startTime: Date;
  league: string;
}

export enum BettingRoundStatus {
  OPEN = 'open',
  CLOSED = 'closed', // Betting closed, results pending or final
  CANCELLED = 'cancelled', // If a match gets cancelled
  RESULT_UPDATED = 'result_updated',
}

export enum BetTeamSelection {
  HOME = 'home',
  AWAY = 'away',
}

export enum MatchResultTeam {
  HOME_WIN = 'home',
  AWAY_WIN = 'away',
  DRAW = 'draw',
}

export interface Bet {
  userId: string;
  userName: string; // denormalized for easier display
  roundId: string;
  selectedTeam: BetTeamSelection;
  pointsBet: number;
  timestamp: Date;
}

export interface BettingRound {
  id: string;
  matchId: string; // Reference to FootballMatch
  matchDetails: FootballMatch;
  status: BettingRoundStatus;
  bets: Bet[];
  winningTeam?: MatchResultTeam | null; // null if not yet decided, or 'draw'
  createdBy: string; // Admin User ID
  createdAt: Date;
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  avatarUrl?: string;
  points: number;
  betsMade: number;
  wins: number; // Could be enhanced later
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
    