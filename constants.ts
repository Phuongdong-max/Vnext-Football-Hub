import { UserRole } from './types';

export const APP_TITLE = "app.title"; 

// URL for football-data.org proxy
export const FOOTBALL_API_PROXY_URL = 'https://us-central1-vnext-football-hub.cloudfunctions.net/footballApiProxy'; 

// This will be the URL of the new Cloud Function we create for The Odds API.
export const THE_ODDS_API_PROXY_URL = 'https://us-central1-vnext-football-hub.cloudfunctions.net/theOddsApiProxy';

// URL for the new lock screen verification function
export const VERIFY_LOCK_SCREEN_PROXY_URL = 'https://us-central1-vnext-football-hub.cloudfunctions.net/verifyLockScreenAnswer';

export const INITIAL_USER_POINTS = 1000;

// This is no longer the direct API URL but the proxy's URL for football-data.org
export const FOOTBALL_API_BASE_URL = FOOTBALL_API_PROXY_URL; 

// Common Tier One league codes for Football-Data.org
export const TIER_ONE_LEAGUE_CODES = ['PL', 'BL1', 'SA', 'PD', 'FL1', 'CL', 'EC']; 

// Mapping from Football-Data.org league codes to The Odds API sport_key
// This map will need to be expanded based on the leagues you want to support.
// You can find sport_keys at: https://the-odds-api.com/sports-odds-data/sports-apis.html
export const LEAGUE_CODE_TO_ODDS_API_SPORT_KEY: Record<string, string> = {
  'PL': 'soccer_epl', // Premier League (England)
  'BL1': 'soccer_germany_bundesliga', // Bundesliga (Germany)
  'SA': 'soccer_italy_serie_a', // Serie A (Italy)
  'PD': 'soccer_spain_la_liga', // La Liga (Spain)
  'FL1': 'soccer_france_ligue_one', // Ligue 1 (France)
  'CL': 'soccer_uefa_champs_league', // UEFA Champions League
  'EC': 'soccer_uefa_european_championship', // UEFA European Championship
  // Add more mappings as needed
  // Example: 'BSA': 'soccer_brazil_campeonato' // Brazil Serie A
};

// Default regions and markets for The Odds API
export const ODDS_API_DEFAULT_REGIONS = 'eu'; // eu, us, uk, au
export const ODDS_API_DEFAULT_MARKETS = 'h2h'; // h2h (head-to-head/moneyline), spreads, totals

// Main tournament document ID - now used as a default/fallback
export const TOURNAMENT_DOC_ID = 'vleague_season_1';