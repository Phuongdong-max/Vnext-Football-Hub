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
export interface TournamentMember {
  userId: string;
  name: string;
  avatarUrl?: string;
}

export interface TournamentTeam {
  id: string;
  name:string;
  logoUrl?: string;
  captainId?: string;
  members: TournamentMember[];
}

export interface TournamentMatch {
  id: string;
  round: number;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamScore?: number;
  awayTeamScore?: number;
  date?: Date; // Firestore timestamp will be converted to Date
  status: 'scheduled' | 'finished' | 'postponed';
}

export interface TeamStanding {
  teamId: string;
  teamName: string;
  logoUrl?: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface Tournament {
  id: string; // Document ID in Firestore
  name: string;
  teams: TournamentTeam[];
  schedule: TournamentMatch[];
  standings: TeamStanding[]; // This will be calculated and stored
  lastUpdated?: any; // Firestore Timestamp
  updatedBy?: {
    id: string;
    name: string;
  };
}