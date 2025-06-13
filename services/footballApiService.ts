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

interface FootballDataCompetition {
  id: number;
  name: string;
  code: string;
  area: {
    name: string;
  };
}

interface FootballDataMatch {
  id: number;
  utcDate: string;
  status: string;
  homeTeam: {
    id: number;
    name: string;
    shortName: string;
  };
  awayTeam: {
    id: number;
    name: string;
    shortName: string;
  };
  competition: {
    id: number;
    name: string;
    code: string;
  };
}

export const checkIsFootballApiAvailable = (): boolean => {
  // The primary check from the client's perspective is if the proxy URL is configured
  // and doesn't look like a generic placeholder.
  const proxyUrlConfigured = FOOTBALL_API_BASE_URL &&
                             (FOOTBALL_API_BASE_URL.startsWith('http://') || FOOTBALL_API_BASE_URL.startsWith('https://')) &&
                             !FOOTBALL_API_BASE_URL.includes("YOUR_PROJECT_ID"); // Ensures the generic placeholder from examples is replaced.

  if (!proxyUrlConfigured) {
    console.warn(
      "The FOOTBALL_API_PROXY_URL in constants.ts appears to be a placeholder (e.g., contains 'YOUR_PROJECT_ID') or is not a valid URL. " +
      "Live API features will likely fail. Current URL:", FOOTBALL_API_BASE_URL
    );
  }
  
  // If the proxy URL looks okay, but the client-side .env var was missing, it's a soft warning.
  // The app will still *try* to use the proxy.
  if (proxyUrlConfigured && !IS_INTENDED_TO_USE_API_FEATURES_VIA_ENV) {
      console.info(
          "FOOTBALL_API_PROXY_URL seems configured, but the client-side FOOTBALL_DATA_API_KEY environment variable was not detected. " +
          "Calls to the proxy will proceed. Ensure the proxy itself is configured with the necessary API key."
      );
  }
  
  // The function returns true if the proxy URL seems configured.
  // Actual success of API calls will determine further behavior (e.g., fallback to mock data).
  return proxyUrlConfigured;
};


export const fetchAvailableLeagues = async (): Promise<League[]> => {
  if (!checkIsFootballApiAvailable()) { // This check now primarily validates FOOTBALL_API_BASE_URL format
    console.log("Football API proxy URL not correctly configured or is a placeholder; cannot fetch leagues.");
    return [];
  }

  const targetPath = "/competitions"; // Path for the external Football-Data.org API
  try {
    const response = await fetch(`${FOOTBALL_API_BASE_URL}?targetPath=${encodeURIComponent(targetPath)}`);
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Proxy Error fetching leagues. Target: ${targetPath}, Status: ${response.status}, Body: ${errorBody}`);
      throw new Error(`Failed to fetch leagues via proxy: ${response.status} ${response.statusText}.`);
    }
    const data = await response.json();
    
    const leagues: League[] = (data.competitions as FootballDataCompetition[])
      .filter(comp => TIER_ONE_LEAGUE_CODES.includes(comp.code)) // Filter for Tier One leagues
      .map(comp => ({
        id: comp.code, // Using code as ID
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
    console.log("Football API proxy URL not correctly configured or is a placeholder; cannot fetch matches.");
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

    if (!data.matches) {
        console.warn(`No matches found in API response (via proxy) for league ${leagueCode} on ${date}. URL: ${fullProxyUrl}, Response:`, data);
        return [];
    }

    return (data.matches as FootballDataMatch[]).map(match => ({
      id: String(match.id),
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      startTime: new Date(match.utcDate),
      league: match.competition.name,
      leagueCode: match.competition.code,
      status: match.status,
    }));
  } catch (error) {
    console.error(`Network or parsing error fetching matches via proxy. URL: ${fullProxyUrl}:`, error);
    if (error instanceof Error && error.message.includes(`Failed to fetch matches for ${leagueCode} via proxy`)) throw error;
    throw new Error(`Failed to fetch matches for ${leagueCode} on ${date} via proxy. ${error instanceof Error ? error.message : String(error)}`);
  }
};