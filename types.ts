
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
  betsMadeCount: number; // New field
  winsCount: number;     // New field
}

export interface FootballMatch {
  id: string; // Will be the API's match ID
  homeTeam: string;
  awayTeam: string;
  startTime: Date; // Stored as Timestamp in Firestore
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
  timestamp: Date; // Stored as Timestamp in Firestore
}

export interface BettingRound {
  id: string;
  matchId: string; // Reference to FootballMatch (could be API's match ID)
  matchDetails: FootballMatch; // Consider if all details need to be duplicated or just key ones
  status: BettingRoundStatus;
  bets: Bet[]; // Array of Bet objects
  bettorIds?: string[]; // Array of user IDs who have bet on this round
  winningTeam?: MatchResultTeam | null; // null if not yet decided, or 'draw'
  createdBy: string; // Admin User ID
  createdAt: Date; // Stored as Timestamp in Firestore
}

export interface LeaderboardEntry {
  userId: string;
  userName:string;
  avatarUrl?: string;
  points: number;
  betsMade: number; // Will come from User.betsMadeCount
  wins: number;     // Will come from User.winsCount
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

// New Interface for AI Match Analysis
export interface MatchAnalysis {
  predictedWinner: 'home' | 'away' | 'draw' | 'uncertain';
  predictionReasoning?: string; // Brief explanation for the prediction
  homeTeamForm?: string; // e.g., "WWLDW" or "Recent form: Won 3, Lost 1, Drew 1"
  awayTeamForm?: string; // e.g., "LLWDL"
  keyFactors?: string[]; // List of key factors (e.g., "Player injuries", "Head-to-head record")
  confidence?: {
    homeWinPercentage?: number;
    awayWinPercentage?: number;
    drawPercentage?: number;
  };
  summary?: string; // A very concise summary of the analysis
}
