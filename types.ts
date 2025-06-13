
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
  id: string; // Will be the API's match ID
  homeTeam: string;
  awayTeam: string;
  startTime: Date;
  league: string; // League Name
  leagueCode?: string; // Optional: API's code for the league
  status?: string; // Optional: Match status from API (e.g., SCHEDULED, TIMED, IN_PLAY, FINISHED)
}

export interface League {
  id: string; // API's ID or code for the league
  name: string;
  areaName?: string; // e.g., "England" for Premier League
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
  matchId: string; // Reference to FootballMatch (could be API's match ID)
  matchDetails: FootballMatch;
  status: BettingRoundStatus;
  bets: Bet[];
  winningTeam?: MatchResultTeam | null; // null if not yet decided, or 'draw'
  createdBy: string; // Admin User ID
  createdAt: Date;
}

export interface LeaderboardEntry {
  userId: string;
  userName:string;
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