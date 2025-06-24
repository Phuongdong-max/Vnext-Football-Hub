
import { UserRole } from './types';

export const APP_TITLE = "Vnext FootballHub";

// REPLACE WITH YOUR ACTUAL DEPLOYED FUNCTION URL
// Example after deployment: https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/footballApiProxy
// Since your project ID appears to be 'vnext-football-hub', the URL below is likely correct.
// If not, ensure 'vnext-football-hub' is replaced with your Firebase project ID.
export const FOOTBALL_API_PROXY_URL = 'https://us-central1-vnext-football-hub.cloudfunctions.net/footballApiProxy'; 

export const INITIAL_USER_POINTS = 1000;

// This is no longer the direct API URL but the proxy's URL
export const FOOTBALL_API_BASE_URL = FOOTBALL_API_PROXY_URL; 

// Common Tier One league codes for Football-Data.org (free plan usually covers these)
export const TIER_ONE_LEAGUE_CODES = ['PL', 'BL1', 'SA', 'PD', 'FL1', 'CL', 'EC']; // Premier League, Bundesliga, Serie A, La Liga, Ligue 1, Champions League, European Championships
