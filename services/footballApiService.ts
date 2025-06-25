
import { FootballMatch, League, OddsData } from '../types';
import { 
    FOOTBALL_API_BASE_URL, 
    TIER_ONE_LEAGUE_CODES,
    THE_ODDS_API_PROXY_URL,
    LEAGUE_CODE_TO_ODDS_API_SPORT_KEY, // This might be less used if fetching leagues directly from Odds API
    ODDS_API_DEFAULT_REGIONS,
    ODDS_API_DEFAULT_MARKETS
} from '../constants';

// --- Football-Data.org API Service ---

const IS_FOOTBALL_DATA_API_INTENDED = !!process.env.FOOTBALL_DATA_API_KEY && process.env.FOOTBALL_DATA_API_KEY !== "";

if (!IS_FOOTBALL_DATA_API_INTENDED) {
  console.warn(
    "Client-side FOOTBALL_DATA_API_KEY (from .env) not set. " +
    "This signals if football-data.org features are intended. " +
    "Proxy function needs its own key."
  );
}

interface FootballDataArea { id: number; name: string; code?: string; ensignUrl?: string; parentArea?: string; parentAreaId?: number; }
interface FootballDataCompetition { id: number; name: string; code: string; area: FootballDataArea; type?: string; emblem?: string; }
interface FootballDataTeam { id: number; name: string; shortName?: string; tla?: string; crest?: string; }
interface FootballDataMatch { id: number; utcDate: string; status: string; matchday?: number; stage?: string; group?: string | null; lastUpdated?: string; homeTeam: FootballDataTeam | null; awayTeam: FootballDataTeam | null; competition: FootballDataCompetition | null; }

export const checkIsFootballDataApiAvailable = (): boolean => {
  const proxyUrlConfigured = FOOTBALL_API_BASE_URL &&
                             (FOOTBALL_API_BASE_URL.startsWith('http://') || FOOTBALL_API_BASE_URL.startsWith('https://')) &&
                             !FOOTBALL_API_BASE_URL.includes("YOUR_PROJECT_ID"); 
  if (!proxyUrlConfigured) {
    console.warn("FOOTBALL_API_PROXY_URL (for football-data.org) in constants.ts is placeholder or invalid. Current URL:", FOOTBALL_API_BASE_URL);
  }
  return proxyUrlConfigured && IS_FOOTBALL_DATA_API_INTENDED;
};

export const fetchAvailableLeaguesFootballData = async (): Promise<League[]> => {
  if (!checkIsFootballDataApiAvailable()) {
    console.log("Football-data.org API proxy not configured; cannot fetch leagues.");
    return [];
  }
  const targetPath = "/competitions";
  try {
    const response = await fetch(`${FOOTBALL_API_BASE_URL}?targetPath=${encodeURIComponent(targetPath)}`);
    if (!response.ok) throw new Error(`Failed to fetch leagues (football-data.org): ${response.status}`);
    const data = await response.json();
    if (!data.competitions) return [];
    return (data.competitions as FootballDataCompetition[])
      .filter(comp => comp && comp.code && TIER_ONE_LEAGUE_CODES.includes(comp.code) && comp.name && comp.area?.name)
      .map(comp => ({
        id: comp.code, name: `${comp.name} (${comp.area.name})`, areaName: comp.area.name, apiSource: 'football-data.org'
      }));
  } catch (error) {
    console.error(`Error fetching leagues (football-data.org):`, error);
    throw error;
  }
};

export const fetchMatchesByDateAndLeague = async (date: string, leagueCode: string): Promise<FootballMatch[]> => {
  if (!checkIsFootballDataApiAvailable()) return [];
  const targetPath = `/competitions/${leagueCode}/matches`;
  const fullProxyUrl = `${FOOTBALL_API_BASE_URL}?targetPath=${encodeURIComponent(targetPath)}&dateFrom=${date}&dateTo=${date}`;
  try {
    const response = await fetch(fullProxyUrl);
    if (!response.ok) throw new Error(`Failed to fetch matches for ${leagueCode} (football-data.org): ${response.status}`);
    const data = await response.json();
    if (!data.matches) return [];
    
    return (data.matches as (FootballDataMatch | null | undefined)[])
      .filter((match): match is FootballDataMatch => 
        Boolean(match && typeof match.id === 'number' && match.homeTeam?.name && match.awayTeam?.name && match.competition?.name && match.utcDate)
      )
      .map(match => ({
        id: String(match.id), homeTeam: match.homeTeam!.name, awayTeam: match.awayTeam!.name, 
        startTime: new Date(match.utcDate), league: match.competition!.name, leagueCode: match.competition!.code || leagueCode,
        status: match.status || 'SCHEDULED', apiSource: 'football-data.org',
      }));
  } catch (error) {
    console.error(`Error fetching matches for ${leagueCode} (football-data.org):`, error);
    throw error;
  }
};


// --- The Odds API Service ---

interface OddsApiSport {
  key: string;
  group: string;
  title: string;
  description: string;
  active: boolean;
  has_outrights?: boolean;
}

export const checkIsTheOddsApiAvailable = (): boolean => {
  const proxyUrlConfigured = THE_ODDS_API_PROXY_URL &&
                             (THE_ODDS_API_PROXY_URL.startsWith('http://') || THE_ODDS_API_PROXY_URL.startsWith('https://')) &&
                             !THE_ODDS_API_PROXY_URL.includes("YOUR_PROJECT_ID");
  if (!proxyUrlConfigured) {
    console.warn("THE_ODDS_API_PROXY_URL in constants.ts is placeholder or invalid. Odds features may fail. Current URL:", THE_ODDS_API_PROXY_URL);
  }
  return proxyUrlConfigured;
};

export const fetchLeaguesFromOddsApi = async (): Promise<League[]> => {
  if (!checkIsTheOddsApiAvailable()) {
    console.log("The Odds API proxy not configured; cannot fetch leagues.");
    return [];
  }
  const targetPath = "sports"; // Fetches all sports, then we filter for soccer
  const queryParams = new URLSearchParams({ active: 'true' }); // Fetch only active sports/leagues

  try {
    const response = await fetch(`${THE_ODDS_API_PROXY_URL}?targetPath=${encodeURIComponent(targetPath)}&${queryParams.toString()}`);
    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`Failed to fetch sports from The Odds API: ${response.status} ${errorBody.message || response.statusText}`);
    }
    const sportsData: OddsApiSport[] = await response.json();
    
    return sportsData
      .filter(sport => sport.group === 'Soccer' && sport.active) // Filter for active soccer leagues
      .map(sport => ({
        id: sport.key, // This is the sport_key, e.g., soccer_epl
        name: sport.title, // This is the display name, e.g., English Premier League
        apiSource: 'the-odds-api',
      }));
  } catch (error) {
    console.error(`Error fetching leagues (The Odds API):`, error);
    throw error;
  }
};

export const fetchMatchesFromOddsApi = async (sportKey: string, commenceTimeToDate?: string): Promise<FootballMatch[]> => {
  if (!checkIsTheOddsApiAvailable()) return [];

  const targetPath = `sports/${sportKey}/odds`;
  
  let dateObjTo: Date;
  if (commenceTimeToDate) {
    // If a specific date is provided, use it. Assume it's a YYYY-MM-DD string.
    // Set time to end of day to include all matches on that day.
    dateObjTo = new Date(commenceTimeToDate);
    dateObjTo.setUTCHours(23, 59, 59, 999);
  } else {
    // Default to 7 days from now
    dateObjTo = new Date();
    dateObjTo.setDate(dateObjTo.getDate() + 7);
  }

  // Format commenceTimeTo to YYYY-MM-DDTHH:MM:SSZ (no milliseconds)
  const yearTo = dateObjTo.getUTCFullYear();
  const monthTo = String(dateObjTo.getUTCMonth() + 1).padStart(2, '0');
  const dayTo = String(dateObjTo.getUTCDate()).padStart(2, '0');
  const hoursTo = String(dateObjTo.getUTCHours()).padStart(2, '0');
  const minutesTo = String(dateObjTo.getUTCMinutes()).padStart(2, '0');
  const secondsTo = String(dateObjTo.getUTCSeconds()).padStart(2, '0');
  const formattedCommenceTimeTo = `${yearTo}-${monthTo}-${dayTo}T${hoursTo}:${minutesTo}:${secondsTo}Z`;

  const queryParams = new URLSearchParams({
    regions: ODDS_API_DEFAULT_REGIONS,
    markets: ODDS_API_DEFAULT_MARKETS, 
    dateFormat: 'iso',
    oddsFormat: 'decimal',
    commenceTimeTo: formattedCommenceTimeTo
  });
  
  try {
    const response = await fetch(`${THE_ODDS_API_PROXY_URL}?targetPath=${encodeURIComponent(targetPath)}&${queryParams.toString()}`);
    if (!response.ok) {
        const errorBodyText = await response.text();
        let errorMessage = `Failed to fetch matches from The Odds API for ${sportKey}: ${response.status} ${response.statusText}`;
         try {
            const errorBodyJson = JSON.parse(errorBodyText);
            if (errorBodyJson && errorBodyJson.message) {
                errorMessage = `Failed to fetch matches from The Odds API for ${sportKey}: ${response.status} ${errorBodyJson.message}`;
            }
        } catch(e) { /* ignore parse error, use text */ }
        throw new Error(errorMessage);
    }
    const oddsApiEvents: OddsData[] = await response.json();
    
    return oddsApiEvents.map((event): FootballMatch => ({
      id: event.id, 
      homeTeam: event.home_team || 'Unknown Home',
      awayTeam: event.away_team || 'Unknown Away',
      startTime: new Date(event.commence_time),
      league: event.sport_title, 
      leagueCode: event.sport_key, 
      status: 'SCHEDULED', 
      apiSource: 'the-odds-api', 
      oddsData: event, 
    })).sort((a,b) => a.startTime.getTime() - b.startTime.getTime());
  } catch (error) {
    console.error(`Error fetching matches for ${sportKey} (The Odds API):`, error);
    throw error;
  }
};


// --- Combined/Utility Functions from original file ---
export const mapLeagueCodeToOddsApiSportKey = (leagueCode?: string): string | undefined => {
  if (!leagueCode) return undefined;
  return LEAGUE_CODE_TO_ODDS_API_SPORT_KEY[leagueCode];
};

async function findEventOnOddsApi(
  sportKey: string, 
  homeTeam: string, 
  awayTeam: string, 
  matchStartTime: Date
): Promise<string | null> {
  if (!checkIsTheOddsApiAvailable()) return null;

  const searchWindowHours = 3; 
  const dateObj = new Date(matchStartTime.getTime() - searchWindowHours * 60 * 60 * 1000);
  
  const year = dateObj.getUTCFullYear();
  const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getUTCDate()).padStart(2, '0');
  const hours = String(dateObj.getUTCHours()).padStart(2, '0');
  const minutes = String(dateObj.getUTCMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getUTCSeconds()).padStart(2, '0');
  const commenceTimeFrom = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;

  const targetPath = `sports/${sportKey}/events`;
  const queryParams = new URLSearchParams({
    dateFormat: 'iso',
    commenceTimeFrom: commenceTimeFrom,
  });

  try {
    const response = await fetch(`${THE_ODDS_API_PROXY_URL}?targetPath=${encodeURIComponent(targetPath)}&${queryParams.toString()}`);
    if (!response.ok) {
      const errorBody = await response.json(); 
      console.error(`Failed to fetch events from The Odds API for ${sportKey}: ${response.status} ${response.statusText}`, errorBody);
      throw new Error(`The Odds API returned ${response.status}: ${errorBody.message || response.statusText}`);
    }
    const events: OddsData[] = await response.json(); 

    const normalize = (name: string) => name.toLowerCase().replace(/fc|afc|cf|sc/g, '').trim();
    const normalizedHome = normalize(homeTeam);
    const normalizedAway = normalize(awayTeam);

    for (const event of events) {
      if (event.home_team && event.away_team) { 
        const eventHome = normalize(event.home_team);
        const eventAway = normalize(event.away_team);
        const timeDiffMinutes = Math.abs(new Date(event.commence_time).getTime() - matchStartTime.getTime()) / (1000 * 60);

        if (timeDiffMinutes < 120 && 
            (eventHome.includes(normalizedHome) || normalizedHome.includes(eventHome)) &&
            (eventAway.includes(normalizedAway) || normalizedAway.includes(eventAway))) {
          return event.id;
        }
      }
    }
    console.warn(`No matching event found on The Odds API for ${homeTeam} vs ${awayTeam} around ${matchStartTime.toISOString()} using /events endpoint.`);
    return null;
  } catch (error) {
    console.error(`Error finding event on The Odds API (/events): ${error instanceof Error ? error.message : String(error)}`);
    throw error; 
  }
}

export async function fetchOddsByEventIdFromOddsApi(
  sportKey: string, 
  eventId: string,
  regions: string = ODDS_API_DEFAULT_REGIONS,
  markets: string = ODDS_API_DEFAULT_MARKETS
): Promise<OddsData | null> {
  if (!checkIsTheOddsApiAvailable()) return null;

  const targetPath = `sports/${sportKey}/odds`;
  const queryParams = new URLSearchParams({
    eventIds: eventId,
    regions,
    markets,
    dateFormat: 'iso',
    oddsFormat: 'decimal',
  });
  
  try {
    const response = await fetch(`${THE_ODDS_API_PROXY_URL}?targetPath=${encodeURIComponent(targetPath)}&${queryParams.toString()}`);
    if (!response.ok) {
      const errorBodyText = await response.text(); 
      let errorMessage = `Failed to fetch odds from The Odds API for event ${eventId}: ${response.status} ${response.statusText}`;
      try {
        const errorBodyJson = JSON.parse(errorBodyText);
        if (errorBodyJson && errorBodyJson.message) {
          errorMessage += `. API Message: ${errorBodyJson.message}`;
        }
      } catch (e) {
        errorMessage += `. Raw API response: ${errorBodyText}`;
      }
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
    const oddsResults: OddsData[] = await response.json();
    if (oddsResults && oddsResults.length > 0) {
      return oddsResults[0];
    }
    console.warn(`No odds data returned from The Odds API for event ${eventId}`);
    return null;
  } catch (error) {
    console.error(`Error fetching odds by event ID from The Odds API: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

export async function fetchCombinedOddsForFootballMatch(
  match: FootballMatch,
  regions: string = ODDS_API_DEFAULT_REGIONS,
  markets: string = ODDS_API_DEFAULT_MARKETS
): Promise<OddsData | null> {
  const sportKey = match.apiSource === 'the-odds-api' 
    ? match.leagueCode 
    : mapLeagueCodeToOddsApiSportKey(match.leagueCode);

  if (!sportKey) {
    console.warn(`No Odds API sport_key for match: ${match.league} (leagueCode: ${match.leagueCode})`);
    return null;
  }

  try {
    const isOddsApiMatchId = match.apiSource === 'the-odds-api' || (match.id && isNaN(Number(match.id)));

    let eventIdToFetch = isOddsApiMatchId ? match.id : null;
    
    if (!eventIdToFetch) {
      eventIdToFetch = await findEventOnOddsApi(sportKey, match.homeTeam, match.awayTeam, match.startTime);
    }
    
    if (!eventIdToFetch) {
      return null; 
    }
    return await fetchOddsByEventIdFromOddsApi(sportKey, eventIdToFetch, regions, markets);
  } catch (error) {
    throw error; 
  }
}
