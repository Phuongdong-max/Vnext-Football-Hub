// functions/src/index.ts

import * as logger from "firebase-functions/logger";
// Import onRequest from v2/https
import { onRequest } from "firebase-functions/v2/https";
// Import Request and Response types from 'firebase-functions' (Express-like v1 types)
// and alias them to what the code currently expects (FirebaseFunctionsRequest, FirebaseResponse)
// These types are compatible with v2 onRequest and include properties like 'query'.
import type { Request as FirebaseFunctionsRequest, Response as FirebaseResponse } from "firebase-functions";
import axios, { isAxiosError, AxiosError } from "axios";
import cors from "cors";

const allowedOrigins = [
  "http://127.0.0.1:8000",
  "http://localhost:8000",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "https://vnext-football-hub.web.app",
];

const corsMiddleware = cors({
  origin: (requestOrigin, callback) => {
    logger.info("Request origin for CORS check:", requestOrigin);
    if (!requestOrigin || allowedOrigins.indexOf(requestOrigin) !== -1) {
      return callback(null, true);
    }
    const msg = "The CORS policy for this site does not allow access from the specified Origin.";
    logger.warn(msg, { origin: requestOrigin });
    return callback(new Error(msg), false);
  },
});

// --- Football-Data.org API Proxy ---
const FOOTBALL_DATA_ORG_BASE_URL = "https://api.football-data.org/v4";
export const footballApiProxy = onRequest(
  async (request: FirebaseFunctionsRequest, response: FirebaseResponse): Promise<void> => {
    logger.info(`footballApiProxy invoked. Origin: ${request.headers.origin}, Method: ${request.method}`);
    corsMiddleware(request as any, response, async (corsErr?: any) => {
      if (corsErr) {
        const errorMessage = corsErr instanceof Error ? corsErr.message : "Unknown CORS error";
        logger.error("CORS error in footballApiProxy:", errorMessage, corsErr);
        if (!response.headersSent) {
          response.status(500).send("CORS error: " + errorMessage);
        }
        return;
      }

      const rawTargetPathQuery = request.query.targetPath;
      let targetPath: string | undefined;

      if (Array.isArray(rawTargetPathQuery)) {
        targetPath = rawTargetPathQuery[0] as string;
      } else if (typeof rawTargetPathQuery === 'string') {
        targetPath = rawTargetPathQuery;
      }

      if (typeof targetPath !== "string" || !targetPath) {
        if (!response.headersSent) {
          response.status(400).send("Missing or invalid targetPath parameter.");
        }
        return;
      }

      // Key for football-data.org
      const footballDataApiKey = process.env.FOOTBALL_DATA_API_KEY;
      if (!footballDataApiKey) {
        logger.error("FOOTBALL_DATA_API_KEY not configured for footballApiProxy.");
        if (!response.headersSent) {
          response.status(500).send("Proxy API key (FOOTBALL_DATA_API_KEY) is not configured.");
        }
        return;
      }

      let externalApiUrl = `${FOOTBALL_DATA_ORG_BASE_URL}${
        targetPath.startsWith("/") ? targetPath : `/${targetPath}`
      }`;
      
      const queryParams = new URLSearchParams();
      const requestQuery = request.query;
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
        if (!response.headersSent) {
          response.status(apiResponse.status).send(apiResponse.data);
        }
      } catch (error: unknown) {
        handleAxiosError(error, externalApiUrl, response, "footballApiProxy");
      }
    });
  }
);

// --- The Odds API Proxy ---
const THE_ODDS_API_BASE_URL = "https://api.the-odds-api.com/v4";
export const theOddsApiProxy = onRequest(
  async (request: FirebaseFunctionsRequest, response: FirebaseResponse): Promise<void> => {
    logger.info(`theOddsApiProxy invoked. Origin: ${request.headers.origin}, Method: ${request.method}`); // Diagnostic log
    corsMiddleware(request as any, response, async (corsErr?: any) => {
      if (corsErr) {
        const errorMessage = corsErr instanceof Error ? corsErr.message : "Unknown CORS error";
        logger.error("CORS error in theOddsApiProxy:", errorMessage, corsErr);
        if (!response.headersSent) {
          // Attempt to set CORS headers on error response if middleware didn't
          const origin = request.headers.origin;
          if (origin && allowedOrigins.includes(origin)) {
              response.set('Access-Control-Allow-Origin', origin);
          } else if (allowedOrigins.length > 0 && !origin) { // For cases where origin might be undefined but expected
             // This might be risky, but for debugging. '*' is safer if truly stuck.
             // response.set('Access-Control-Allow-Origin', '*'); 
          }
          response.status(500).send("CORS error: " + errorMessage);
        }
        return;
      }

      const rawTargetPathQuery = request.query.targetPath;
      let targetPath: string | undefined;

      if (Array.isArray(rawTargetPathQuery)) {
        targetPath = rawTargetPathQuery[0] as string;
      } else if (typeof rawTargetPathQuery === 'string') {
        targetPath = rawTargetPathQuery;
      }
      
      if (typeof targetPath !== "string" || !targetPath) {
        if (!response.headersSent) {
          response.status(400).send("Missing or invalid targetPath parameter for The Odds API.");
        }
        return;
      }

      const theOddsApiKey = process.env.THE_ODDS_API_KEY;
      if (!theOddsApiKey) {
        logger.error("THE_ODDS_API_KEY not configured for theOddsApiProxy.");
        if (!response.headersSent) {
          response.status(500).send("Proxy API key (THE_ODDS_API_KEY) is not configured.");
        }
        return;
      }

      let externalApiUrl = `${THE_ODDS_API_BASE_URL}/${targetPath.startsWith("/") ? targetPath.substring(1) : targetPath}`;
      
      const queryParams = new URLSearchParams();
      queryParams.append("apiKey", theOddsApiKey); 

      const requestQuery = request.query;
      for (const key in requestQuery) {
        if (Object.prototype.hasOwnProperty.call(requestQuery, key) && key !== "targetPath") {
           const valueRaw = requestQuery[key];
          if (valueRaw !== undefined) {
            const value = Array.isArray(valueRaw) ? String(valueRaw[0]) : String(valueRaw);
            queryParams.append(key, value);
          }
        }
      }
      
      externalApiUrl += `?${queryParams.toString()}`;

      logger.info(`The Odds API Proxy to: ${externalApiUrl.replace(theOddsApiKey, "[REDACTED_API_KEY]")}`);
      try {
        const apiResponse = await axios.get(externalApiUrl, {
          headers: { "Accept": "application/json" },
          timeout: 15000, 
        });
        logger.info(`The Odds API response status: ${apiResponse.status}`);
        if (!response.headersSent) {
          response.status(apiResponse.status).send(apiResponse.data);
        }
      } catch (error: unknown) {
        logger.error(`Error during axios GET to The Odds API. URL: ${externalApiUrl.replace(theOddsApiKey, "[REDACTED_API_KEY]")}`);
        handleAxiosError(error, externalApiUrl, response, "theOddsApiProxy");
      }
    });
  }
);


// Helper function to handle Axios errors consistently
function handleAxiosError(error: unknown, url: string, response: FirebaseResponse, proxyName: string) {
  let errorMessage = `Error fetching data from external API via ${proxyName}.`;
  let httpStatus = 500;
  const errorLogDetails: Record<string, any> = { url, proxyName };

  if (error instanceof Error) {
    errorMessage = error.message;
    errorLogDetails.name = error.name;
    errorLogDetails.message = error.message;
  } else {
    errorLogDetails.errorObject = String(error);
  }

  if (isAxiosError(error)) {
    const axiosErrorInstance: AxiosError = error;
    errorLogDetails.isAxiosError = true;
    if (axiosErrorInstance.code) errorLogDetails.axiosErrorCode = axiosErrorInstance.code;

    if (axiosErrorInstance.response) {
      httpStatus = axiosErrorInstance.response.status;
      const responseData = axiosErrorInstance.response.data as any;
      logger.error(
        `Axios error in ${proxyName} with response from upstream:`,
        { url: url.includes("apiKey=") ? url.substring(0, url.indexOf("apiKey=")) + "apiKey=[REDACTED]" : url, status: httpStatus, data: responseData, axiosErrorMessage: axiosErrorInstance.message }
      );
      if (!response.headersSent) {
        response.status(httpStatus).send(responseData || { error: errorMessage, details: "Upstream API error" });
      }
    } else {
      logger.warn(
        `Axios error in ${proxyName} without upstream response (network issue/timeout):`,
        { url: url.includes("apiKey=") ? url.substring(0, url.indexOf("apiKey=")) + "apiKey=[REDACTED]" : url, message: axiosErrorInstance.message, code: axiosErrorInstance.code }
      );
      if (!response.headersSent) {
        httpStatus = axiosErrorInstance.code === 'ECONNABORTED' ? 504 : 503; // Gateway Timeout or Service Unavailable
        response.status(httpStatus).send({ error: errorMessage, details: "Network issue or timeout with upstream API" });
      }
    }
  } else {
    logger.error(`${proxyName} encountered a non-Axios error:`, errorLogDetails);
    if (!response.headersSent) {
      response.status(httpStatus).send({ error: errorMessage, details: "Non-Axios error in proxy" });
    }
  }
}