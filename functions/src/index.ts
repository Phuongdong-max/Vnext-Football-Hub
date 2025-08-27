
// functions/src/index.ts

import * as logger from "firebase-functions/logger";
// Use Request and Response from v2/https
import { onRequest, Request } from "firebase-functions/v2/https";
import { Response } from "express";
import axios, { isAxiosError, AxiosError } from "axios";
// CORS is now handled by Firebase onRequest option

const allowedOrigins = [
  "http://127.0.0.1:8000",
  "http://localhost:8000",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "https://vnext-football-hub.web.app",
];

// --- Football-Data.org API Proxy ---
const FOOTBALL_DATA_ORG_BASE_URL = "https://api.football-data.org/v4";
export const footballApiProxy = onRequest(
  { cors: allowedOrigins }, // Firebase handles CORS
  async (request: Request, response: Response): Promise<void> => {
    logger.info(`footballApiProxy invoked. Origin: ${request.headers["origin"]}, Method: ${request.method}`);

    const rawTargetPathQuery = request.query.targetPath;
    let targetPath: string | undefined;

    if (Array.isArray(rawTargetPathQuery)) {
      targetPath = rawTargetPathQuery[0] as string;
    } else if (typeof rawTargetPathQuery === 'string') {
      targetPath = rawTargetPathQuery;
    }

    if (typeof targetPath !== "string" || !targetPath) {
      response.status(400).send("Missing or invalid targetPath parameter.");
      return;
    }

    const footballDataApiKey = process.env.FOOTBALL_DATA_API_KEY;
    if (!footballDataApiKey) {
      logger.error("FOOTBALL_DATA_API_KEY not configured for footballApiProxy.");
      response.status(500).send("Proxy API key (FOOTBALL_DATA_API_KEY) is not configured.");
      return;
    }

    let externalApiUrl = `${FOOTBALL_DATA_ORG_BASE_URL}${
      targetPath.startsWith("/") ? targetPath : `/${targetPath}`
    }`;
    
    const queryParams = new URLSearchParams();
    const requestQuery = request.query; // request.query is NameValueRecord
    for (const key in requestQuery) {
      if (Object.prototype.hasOwnProperty.call(requestQuery, key) && key !== "targetPath") {
        const valueRaw = requestQuery[key];
        if (valueRaw !== undefined) {
          const value = Array.isArray(valueRaw) ? String(valueRaw[0]) : String(valueRaw);
          queryParams.append(key, value);
        }
      }
    }
    const queryString = queryParams.toString();
    if (queryString) {
      externalApiUrl += (externalApiUrl.includes("?") ? "&" : "?") + queryString;
    }

    logger.info(`Football-Data.org Proxy request to: ${externalApiUrl}`);
    try {
      const apiResponse = await axios.get(externalApiUrl, {
        headers: { "X-Auth-Token": footballDataApiKey, "Accept": "application/json" },
        timeout: 10000,
      });
      response.status(apiResponse.status).send(apiResponse.data);
    } catch (error: unknown) {
      handleAxiosError(error, externalApiUrl, response, "footballApiProxy");
    }
  }
);

// --- The Odds API Proxy ---
const THE_ODDS_API_BASE_URL = "https://api.the-odds-api.com/v4";
export const theOddsApiProxy = onRequest(
  { cors: allowedOrigins }, // Firebase handles CORS
  async (request: Request, response: Response): Promise<void> => {
    logger.info(`theOddsApiProxy invoked. Origin: ${request.headers["origin"]}, Method: ${request.method}`);

    const rawTargetPathQuery = request.query.targetPath;
    let targetPath: string | undefined;

    if (Array.isArray(rawTargetPathQuery)) {
      targetPath = rawTargetPathQuery[0] as string;
    } else if (typeof rawTargetPathQuery === 'string') {
      targetPath = rawTargetPathQuery;
    }
    
    if (typeof targetPath !== "string" || !targetPath) {
      logger.warn("theOddsApiProxy: Missing or invalid targetPath parameter.", { query: request.query });
      response.status(400).send("Missing or invalid targetPath parameter for The Odds API.");
      return;
    }

    const theOddsApiKey = process.env.THE_ODDS_API_KEY;
    logger.info(`theOddsApiProxy: THE_ODDS_API_KEY presence: ${theOddsApiKey ? 'Exists' : 'MISSING!'}`);

    if (!theOddsApiKey) {
      logger.error("theOddsApiProxy: THE_ODDS_API_KEY not configured.");
      response.status(500).send("Proxy API key (THE_ODDS_API_KEY) is not configured.");
      return;
    }

    let externalApiUrl = `${THE_ODDS_API_BASE_URL}/${targetPath.startsWith("/") ? targetPath.substring(1) : targetPath}`;
    
    const queryParams = new URLSearchParams();
    queryParams.append("apiKey", theOddsApiKey); 

    const requestQuery = request.query;
    for (const key in requestQuery) {
      if (Object.prototype.hasOwnProperty.call(requestQuery, key) && key !== "targetPath" && key !== "apiKey") {
         const valueRaw = requestQuery[key];
        if (valueRaw !== undefined) {
          const value = Array.isArray(valueRaw) ? String(valueRaw[0]) : String(valueRaw);
          queryParams.append(key, value);
        }
      }
    }
    
    externalApiUrl += `?${queryParams.toString()}`;

    logger.info(`theOddsApiProxy: Requesting URL: ${externalApiUrl.replace(theOddsApiKey, "THE_ODDS_API_KEY_REDACTED")}`);
    
    try {
      logger.info(`theOddsApiProxy: Attempting axios.get to The Odds API.`);
      const apiResponse = await axios.get(externalApiUrl, {
        headers: { "Accept": "application/json" },
        timeout: 15000, 
      });
      logger.info(`theOddsApiProxy: The Odds API response status: ${apiResponse.status}`);
      response.status(apiResponse.status).send(apiResponse.data);
    } catch (error: unknown) {
      logger.error(`theOddsApiProxy: Error during axios.get to The Odds API.`);
      handleAxiosError(error, externalApiUrl.replace(theOddsApiKey, "THE_ODDS_API_KEY_REDACTED"), response, "theOddsApiProxy");
    }
  }
);

// Helper function to handle Axios errors consistently
function handleAxiosError(error: unknown, url: string, response: Response, proxyName: string) {
  let errorMessage = `Error fetching data from external API via ${proxyName}.`;
  let httpStatus = 500;
  const errorLogDetails: Record<string, any> = { url, proxyName };

  if (error instanceof Error) {
    errorMessage = error.message;
    errorLogDetails.name = error.name;
    errorLogDetails.message = error.message;
    errorLogDetails.stack = error.stack;
  } else {
    errorLogDetails.errorObject = String(error);
  }

  if (isAxiosError(error)) {
    const axiosErrorInstance: AxiosError<any> = error;
    errorLogDetails.isAxiosError = true;
    if (axiosErrorInstance.code) errorLogDetails.axiosErrorCode = axiosErrorInstance.code;

    if (axiosErrorInstance.response) {
      httpStatus = axiosErrorInstance.response.status;
      errorLogDetails.axiosResponseStatus = axiosErrorInstance.response.status;
      errorLogDetails.axiosResponseHeaders = axiosErrorInstance.response.headers;
      errorLogDetails.axiosResponseData = axiosErrorInstance.response.data;
      
      if (axiosErrorInstance.response.data) {
        if (typeof axiosErrorInstance.response.data === "string") {
          errorMessage = axiosErrorInstance.response.data;
        } else if (axiosErrorInstance.response.data.message && typeof axiosErrorInstance.response.data.message === "string") {
          errorMessage = axiosErrorInstance.response.data.message;
        } else if (axiosErrorInstance.response.data.error && typeof axiosErrorInstance.response.data.error === "string") {
          errorMessage = axiosErrorInstance.response.data.error;
        } else {
           errorMessage = `External API Error: ${httpStatus} - ${JSON.stringify(axiosErrorInstance.response.data)}`;
        }
      } else {
         errorMessage = `External API Error: ${httpStatus}`;
      }

    } else if (axiosErrorInstance.request) {
      errorMessage = "No response received from external API.";
      errorLogDetails.axiosRequestInfo = "No response was received from the external API.";
      httpStatus = 504;
    }
  }

  logger.error(`Error in ${proxyName}: ${errorMessage}`, errorLogDetails);

  try {
    response.status(httpStatus).send(errorMessage);
  } catch (e) {
    logger.error("Failed to send error response using .status().send(). This might indicate that the Response object is not extended by Firebase as expected, or the response was already sent.", e);
    // As a fallback, one might need to construct and return a new Response if the function signature allows,
    // but onRequest typically expects void or Promise<void> and direct mutation of the response object.
  }
}