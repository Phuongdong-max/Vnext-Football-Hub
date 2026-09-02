export enum UserRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string | null;
  points: number;
  betsMadeCount: number; 
  winsCount: number;     
}

// --- The Odds API Types ---
export interface OutcomeOdds {
  name: string; // e.g., Home team name, Away team name, "Draw"
  price: number;
  point?: number; // For spread/total markets
}

export interface MarketOdds {
  key: string; // e.g., "h2h", "spreads", "totals"
  last_update?: string; // ISO8601 string timestamp
  outcomes: OutcomeOdds[];
}

export interface BookmakerOdds {
  key: string; // e.g., "pinnacle", "betfair"
  title: string; // e.g., "Pinnacle", "Betfair"
  last_update: string; // ISO8601 string timestamp
  markets: MarketOdds[];
}

// This type represents an event from The Odds API, often including bookmaker odds
export interface OddsData {
  id: string; // Event ID from The Odds API
  sport_key: string;
  sport_title: string;
  commence_time: string; // ISO8601 string timestamp
  home_team?: string; 
  away_team?: string; 
  bookmakers: BookmakerOdds[];
}
// --- End The Odds API Types ---


export interface FootballMatch {
  id: string; 
  homeTeam: string;
  awayTeam: string;
  startTime: Date; 
  league: string; 
  leagueCode?: string; // Used by football-data.org (e.g., PL) or sport_key from The Odds API
  status?: string; 
  apiSource: 'football-data.org' | 'the-odds-api' | 'manual'; // Explicitly track origin
  oddsData?: OddsData | null; // Optional: To store fetched odds, especially if source is the-odds-api
}

export interface League {
  id: string; // For football-data.org, this is leagueCode (e.g., 'PL'). For The Odds API, this is sport_key (e.g., 'soccer_epl')
  name: string;
  areaName?: string; // Primarily from football-data.org
  apiSource: 'football-data.org' | 'the-odds-api';
  // sportKeyOddsApi?: string; // Redundant if id stores sport_key for odds-api source
}

export enum BettingRoundStatus {
  OPEN = 'open',
  CLOSED = 'closed', 
  CANCELLED = 'cancelled', 
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
  userName: string; 
  roundId: string;
  selectedTeam: BetTeamSelection;
  pointsBet: number;
  timestamp: Date; 
}

export interface BettingRound {
  id: string;
  matchId: string; 
  matchDetails: FootballMatch; 
  status: BettingRoundStatus;
  bets: Bet[]; 
  bettorIds?: string[]; 
  winningTeam?: MatchResultTeam | null; 
  createdBy: string; 
  createdAt: Date; 
}

export interface LeaderboardEntry {
  userId: string;
  userName:string;
  avatarUrl?: string;
  points: number;
  betsMade: number; 
  wins: number;     
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export interface MatchAnalysis {
  predictedWinner: 'home' | 'away' | 'draw' | 'uncertain';
  predictionReasoning?: string; 
  homeTeamForm?: string; 
  awayTeamForm?: string; 
  keyFactors?: string[]; 
  confidence?: {
    homeWinPercentage?: number;
    awayWinPercentage?: number;
    drawPercentage?: number;
  };
  summary?: string; 
}

export interface TeamAnalysis {
  strengths: string[];
  weaknesses: string[];
  keyPlayers: { name: string; reason: string; }[];
  tacticalStyle: string;
  funnyPrediction: string;
  summary: string;
}

// --- Team Divider Types ---
export type PlayerSeed = 'GK' | 'A' | 'B' | 'C' | 'D' | 'E';

export interface Player {
  name: string;
  seed: PlayerSeed;
}

export interface DividedTeam {
  id: number;
  players: Player[];
  totalSeedValue: number;
  playerCount: number;
}

export interface TeamDivisionData {
  id: 'latest';
  seedPlayers: {
    GK: string;
    A: string;
    B: string;
    C: string;
    D: string;
    E: string;
  };
  dividedTeams: DividedTeam[];
  lastUpdated?: any; // Firestore Timestamp
  updatedBy?: {
    id: string;
    name: string;
  };
}


// --- Tournament Types ---
export interface Goal {
  goalId: string; // To uniquely identify each goal instance
  scorerName: string;
  scorerId?: string | null; // Optional link to a TournamentMember
}

export interface PlayerSkills {
  speed: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
}

export interface TournamentPlayer {
  id: string;
  name: string;
  jerseyNumber: number;
  avatarUrl?: string | null;
  bio?: string;
  skills?: PlayerSkills;
}


// This is used by the ManageTournamentModal, but the actual data in Firestore might be different
export interface TournamentMember {
  id: string; // Unique ID for the member entry
  name: string;
  userId?: string | null; // Optional: for linking to a registered user
  avatarUrl?: string | null; // Optional
}

export interface TournamentTeam {
  id: string;
  name:string;
  logoUrl?: string | null;
  captainId?: string | null;
  members: { playerId: string }[];
  jersey?: string | null;
  color?: string | null;
}

export interface TournamentMatch {
  id: string;
  round: number;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamScore: number | null;
  awayTeamScore: number | null;
  date: Date | null;
  status: 'scheduled' | 'finished' | 'postponed';
  homeTeamGoals?: Goal[];
  awayTeamGoals?: Goal[];
  matchLabel?: string;
}

export interface TeamStanding {
  teamId: string;
  teamName: string;
  logoUrl?: string | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  teamColor?: string | null;
}

// Stored status is only what an admin sets by hand. Whether a season is
// upcoming, running or over is derived from its dates, not typed in - see
// utils/seasonPhase.ts.
export type TournamentStatus = 'active' | 'archived';

export type SeasonPhase = 'upcoming' | 'ongoing' | 'finished' | 'archived';

export interface Tournament {
  id: string; // Document ID in Firestore
  name: string;
  // Season year, e.g. 2026. Drives ordering and the "current season" default.
  // Optional because tournaments created before seasons existed have no value;
  // treat a missing season as "oldest".
  season?: number;
  // Archived tournaments stay fully readable but are locked against edits, so
  // past seasons cannot be changed by accident. Missing means 'active'.
  status?: TournamentStatus;
  // When the season opens and closes. A season is only shown as "ongoing" once
  // startDate has actually passed - before that it is upcoming, even though the
  // document already exists and is being filled in.
  startDate?: any; // Firestore Timestamp | Date
  endDate?: any;   // Firestore Timestamp | Date
  createdAt?: any; // Firestore Timestamp
  teams: TournamentTeam[];
  schedule: TournamentMatch[];
  standings: TeamStanding[]; // This will be calculated and stored
  players?: TournamentPlayer[]; // For backward compatibility with old data structure
  lastUpdated?: any; // Firestore Timestamp
  updatedBy?: {
    id: string;
    name: string;
  };
}

// Lightweight row for the tournament picker - avoids pulling every season's
// full schedule and standings just to render a dropdown.
export interface TournamentSummary {
  id: string;
  name: string;
  season?: number;
  status: TournamentStatus;
  startDate?: Date | null;
  endDate?: Date | null;
}

export interface TournamentMatchAnalysis {
  predictedWinner: string; // 'home', 'away', or 'draw'
  predictedScore: string; // e.g., "2-1"
  winProbability: {
    home: number;
    away: number;
    draw: number;
  };
  matchSummary: string;
  keyMatchups: {
    player1: string;
    player2: string;
    description: string;
  }[];
  homeTeamAnalysis: {
    strengths: string[];
    weaknesses: string[];
    suggestedTactics: string;
  };
  awayTeamAnalysis: {
    strengths: string[];
    weaknesses: string[];
    suggestedTactics: string;
  };
  funnyCommentary: string;
}

export interface AppSettings {
  isBettingEnabled: boolean;
}