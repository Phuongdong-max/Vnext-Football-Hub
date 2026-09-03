import { UserRole } from './types';

export const APP_TITLE = "app.title"; 

// URL for football-data.org proxy
export const FOOTBALL_API_PROXY_URL = 'https://us-central1-vnext-football-hub.cloudfunctions.net/footballApiProxy'; 

// This will be the URL of the new Cloud Function we create for The Odds API.
export const THE_ODDS_API_PROXY_URL = 'https://us-central1-vnext-football-hub.cloudfunctions.net/theOddsApiProxy';

// FIX: Add missing VERIFY_LOCK_SCREEN_PROXY_URL constant.
export const VERIFY_LOCK_SCREEN_PROXY_URL = 'https://us-central1-vnext-football-hub.cloudfunctions.net/verifyLockScreen';

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
export const TOURNAMENT_DOC_ID = 'vnext_open_cup_s1';

// --- Centralized Team Styling ---
interface TeamStyle {
  imageSrc: string;
  borderColor: string;
  aliases?: string[];
}

type TeamStyleMap = { [key: string]: TeamStyle };

const TEAM_STYLES: TeamStyleMap = {
    'Fukuoka Kamikaze': { imageSrc: 'assets/phoenix.png', borderColor: '#CB3737', aliases: ['FKO Kamikaze'] },
    'Magical Feet': { imageSrc: 'assets/dragon.png', borderColor: '#4685A3', aliases: ['Magical feet'] },
    'V - All Star': { imageSrc: 'assets/tiger.png', borderColor: '#D9D9D9', aliases: [] },
    'Không thể cản phá': { imageSrc: 'assets/turtle.png', borderColor: '#6A8A6F', aliases: ['Không Thể Cản Phá'] },
};

const findTeamStyle = (teamName: string): TeamStyle | null => {
  const lowerCaseTeamName = teamName.toLowerCase().trim();

  // Direct match
  const directMatchKey = Object.keys(TEAM_STYLES).find(k => k.toLowerCase().trim() === lowerCaseTeamName);
  if (directMatchKey) return TEAM_STYLES[directMatchKey];

  // Alias match
  for (const key in TEAM_STYLES) {
    if (TEAM_STYLES[key].aliases?.some(alias => alias.toLowerCase().trim() === lowerCaseTeamName)) {
      return TEAM_STYLES[key];
    }
  }

  return null;
};

export const getTeamStyle = (teamName: string): TeamStyle =>
  // Fallback style if no match is found
  findTeamStyle(teamName) ?? { imageSrc: 'assets/VFLogo-fix.png', borderColor: '#cccccc' };

/**
 * The crest shipped for a team name, or null when there is none.
 *
 * Unlike getTeamStyle this does NOT fall back to the app logo. Where several
 * teams sit side by side - the draw, the Teams tab - an unrecognised name must
 * show no crest at all, because falling back would give every unrecognised team
 * the same picture and they would stop being telling apart.
 */
export const getTeamLogo = (teamName: string): string | null =>
  findTeamStyle(teamName)?.imageSrc ?? null;

/** Crests an admin can pick for a team, beyond the automatic match by name. */
export const TEAM_LOGO_CHOICES: { id: string; src: string }[] = [
  { id: 'dragon',  src: 'assets/dragon.png' },
  { id: 'phoenix', src: 'assets/phoenix.png' },
  { id: 'tiger',   src: 'assets/tiger.png' },
  { id: 'turtle',  src: 'assets/turtle.png' },
  { id: 'vnext',   src: 'assets/vnext.png' },
  { id: 'vf',      src: 'assets/VFLogo-fix.png' },
];

// This static list is used for immediate display on landing pages
// to prevent the UI from being empty while live data is fetched.
// Use the canonical names from TEAM_STYLES keys.
export const FALLBACK_TEAMS_FOR_DISPLAY = [
    { id: 'fallback_1', name: 'Fukuoka Kamikaze' },
    { id: 'fallback_2', name: 'Magical Feet' },
    { id: 'fallback_3', name: 'V - All Star' },
    { id: 'fallback_4', name: 'Không thể cản phá' },
];