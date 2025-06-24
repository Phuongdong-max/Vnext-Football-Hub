
import { FootballMatch, League } from '../types';
import { FOOTBALL_API_BASE_URL, TIER_ONE_LEAGUE_CODES } from '../constants';

// Client-side check for an API key in the .env (injected via process.env by esbuild)
// is primarily a developer signal that API features are intended.
// The actual API key is used by the server-side proxy function.
const IS_INTENDED_TO_USE_API_FEATURES_VIA_ENV = !!process.env.FOOTBALL_DATA_API_KEY && process.env.FOOTBALL_DATA_API_KEY !== "";

if (!IS_INTENDED_TO_USE_API_FEATURES_VIA_ENV) {
  console.warn(
    "Client-side environment variable FOOTBALL_DATA_API_KEY is not set (checked via process.env). " +
    "This variable is used as a signal that API features are intended to be active. " +
    "Ensure the footballApiProxy cloud function is correctly configured with the actual API key for live data."
  );
}

interface FootballDataArea {
  id: number;
  name: string;
  code?: string; // Optional, might not always be present
  ensignUrl?: string; // Older API version field, keep for potential compatibility or remove if not used
  parentArea?: string;
  parentAreaId?: number;
}

interface FootballDataCompetition {
  id: number;
  name: string;
  code: string;
  area: FootballDataArea; // Updated to use the detailed FootballDataArea
  type?: string; // Optional, e.g., "LEAGUE", "CUP"
  emblem?: string; // Optional URL to league emblem
}

interface FootballDataTeam {
  id: number;
  name: string;
  shortName?: string; // Optional
  tla?: string; // Optional (Three Letter Abbreviation)
  crest?: string; // Optional URL to team crest
}

interface FootballDataMatch {
  id: number;
  utcDate: string;
  status: string; // e.g., "SCHEDULED", "TIMED", "IN_PLAY", "PAUSED", "FINISHED", "SUSPENDED", "POSTPONED", "CANCELLED"
  matchday?: number; // Optional
  stage?: string; // Optional, e.g., "REGULAR_SEASON"
  group?: string | null; // Optional
  lastUpdated?: string; // Optional ISO date string
  homeTeam: FootballDataTeam | null; // Can be null if data is incomplete
  awayTeam: FootballDataTeam | null; // Can be null if data is incomplete
  competition: FootballDataCompetition | null; // Can be null
  // score, odds, referees etc. could also be here if needed
}

export const checkIsFootballApiAvailable = (): boolean => {
  const proxyUrlConfigured = FOOTBALL_API_BASE_URL &&
                             (FOOTBALL_API_BASE_URL.startsWith('http://') || FOOTBALL_API_BASE_URL.startsWith('https://')) &&
                             !FOOTBALL_API_BASE_URL.includes("YOUR_PROJECT_ID"); 

  if (!proxyUrlConfigured) {
    console.warn(
      "The FOOTBALL_API_PROXY_URL in constants.ts appears to be a placeholder or is not a valid URL. " +
      "Live API features will likely fail. Current URL:", FOOTBALL_API_BASE_URL
    );
  }
  
  if (proxyUrlConfigured && !IS_INTENDED_TO_USE_API_FEATURES_VIA_ENV) {
      console.info(
          "FOOTBALL_API_PROXY_URL seems configured, but the client-side FOOTBALL_DATA_API_KEY environment variable was not detected. " +
          "Calls to the proxy will proceed. Ensure the proxy itself is configured with the necessary API key."
      );
  }
  return proxyUrlConfigured;
};


export const fetchAvailableLeagues = async (): Promise<League[]> => {
  if (!checkIsFootballApiAvailable()) {
    console.log("Football API proxy URL not correctly configured; cannot fetch leagues.");
    return [];
  }

  const targetPath = "/competitions";
  try {
    const response = await fetch(`${FOOTBALL_API_BASE_URL}?targetPath=${encodeURIComponent(targetPath)}`);
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Proxy Error fetching leagues. Target: ${targetPath}, Status: ${response.status}, Body: ${errorBody}`);
      throw new Error(`Failed to fetch leagues via proxy: ${response.status} ${response.statusText}.`);
    }
    const data = await response.json();
    
    if (!data.competitions || !Array.isArray(data.competitions)) {
      console.warn("Fetched leagues data is not in the expected format (missing 'competitions' array):", data);
      return [];
    }
    
    const leagues: League[] = (data.competitions as FootballDataCompetition[])
      .filter(comp => comp && comp.code && TIER_ONE_LEAGUE_CODES.includes(comp.code) && comp.name && comp.area?.name)
      .map(comp => ({
        id: comp.code,
        name: comp.name,
        areaName: comp.area.name,
      }));
    return leagues;
  } catch (error) {
    console.error(`Network or parsing error fetching leagues via proxy (target: ${targetPath}):`, error);
    if (error instanceof Error && error.message.includes('Failed to fetch leagues via proxy')) throw error;
    throw new Error(`Failed to fetch available leagues via proxy. ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const fetchMatchesByDateAndLeague = async (date: string, leagueCode: string): Promise<FootballMatch[]> => {
  if (!checkIsFootballApiAvailable()) {
    console.log("Football API proxy URL not correctly configured; cannot fetch matches.");
    return [];
  }
  
  const targetPath = `/competitions/${leagueCode}/matches`;
  const fullProxyUrl = `${FOOTBALL_API_BASE_URL}?targetPath=${encodeURIComponent(targetPath)}&dateFrom=${date}&dateTo=${date}`;
  
  try {
    const response = await fetch(fullProxyUrl);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Proxy Error fetching matches. URL: ${fullProxyUrl}, Status: ${response.status}, Body: ${errorBody}`);
      throw new Error(`Failed to fetch matches for ${leagueCode} via proxy: ${response.status} ${response.statusText}.`);
    }
    const data = await response.json();

    if (!data.matches || !Array.isArray(data.matches)) {
        console.warn(`No matches array found in API response (via proxy) for league ${leagueCode} on ${date}. URL: ${fullProxyUrl}, Response:`, data);
        return [];
    }

    const validMatches = (data.matches as (FootballDataMatch | null | undefined)[])
      .filter((match): match is FootballDataMatch => 
        // Ensure match and its critical nested properties exist
        Boolean(
          match &&
          typeof match.id === 'number' &&
          match.homeTeam && typeof match.homeTeam.name === 'string' &&
          match.awayTeam && typeof match.awayTeam.name === 'string' &&
          match.competition && typeof match.competition.name === 'string' &&
          typeof match.utcDate === 'string'
        )
      );

    if (validMatches.length !== data.matches.length) {
        console.warn(`Filtered out ${data.matches.length - validMatches.length} incomplete match objects from API response for ${leagueCode} on ${date}.`);
    }
    
    return validMatches.map(match => ({
      id: String(match.id),
      homeTeam: match.homeTeam.name, // Safe to access due to filter
      awayTeam: match.awayTeam.name, // Safe to access
      startTime: new Date(match.utcDate),
      league: match.competition.name, // Safe to access
      leagueCode: match.competition.code || leagueCode, // Fallback to requested leagueCode
      status: match.status || 'SCHEDULED', // Fallback status
    }));

  } catch (error) {
    console.error(`Network or parsing error fetching matches via proxy. URL: ${fullProxyUrl}:`, error);
    if (error instanceof Error && error.message.includes(`Failed to fetch matches for ${leagueCode} via proxy`)) throw error;
    throw new Error(`Failed to fetch matches for ${leagueCode} on ${date} via proxy. ${error instanceof Error ? error.message : String(error)}`);
  }
};
