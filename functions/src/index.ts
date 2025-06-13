// functions/src/index.ts

import * as functions from "firebase-functions"; // For logger
// Use Request and Response types directly from firebase-functions/v1/https
import { onRequest, Request, Response } from "firebase-functions/v1/https";
import axios, {isAxiosError} from "axios";
import cors from "cors";


const allowedOrigins = [
  "http://127.0.0.1:8000",
  "http://localhost:8000",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "https://vnext-football-hub.web.app",
];

const corsHandler = cors({
  origin: (requestOrigin, callback) => {
    functions.logger.info("Request origin:", requestOrigin);
    if (!requestOrigin) {
      // Allow requests with no origin (like curl requests, server-to-server)
      return callback(null, true);
    }
    if (allowedOrigins.indexOf(requestOrigin) === -1) {
      const msg =
        "The CORS policy for this site does not allow access from " +
        "the specified Origin.";
      functions.logger.warn(msg, {origin: requestOrigin});
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
});

const FOOTBALL_DATA_ORG_BASE_URL = "https://api.football-data.org/v4";

export const footballApiProxy = onRequest(
  // Use the Request and Response types directly from firebase-functions/v1/https
  (request: Request, response: Response) => {
    corsHandler(request, response, (err?: unknown) => { // Now `request` is firebase-functions/v1/https.Request and `response` is firebase-functions/v1/https.Response
      if (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown CORS error";
        functions.logger.error("CORS error:", errorMessage, err);
        response.status(500).send("CORS error: " + errorMessage); // .status() should be available
        return;
      }

      const rawTargetPath = request.query.targetPath; // .query should be available
      const targetPath = Array.isArray(rawTargetPath)
        ? rawTargetPath[0] as string
        : rawTargetPath as string;

      if (typeof targetPath !== "string" || !targetPath) {
        response.status(400).send( // .status() should be available
          "Missing or invalid targetPath parameter."
        );
        return;
      }

      // Use process.env for environment variables in Cloud Functions v2 (and v1)
      const apiKey = process.env.FOOTBALL_DATA_API_KEY;

      if (!apiKey) {
        functions.logger.error(
          "Environment variable FOOTBALL_DATA_API_KEY not configured for the Cloud Function."
        );
        response.status(500).send( // .status() should be available
          "Proxy API key (environment variable) is not configured."
        );
        return;
      }

      let externalApiUrl = `${FOOTBALL_DATA_ORG_BASE_URL}${
        targetPath.startsWith("/") ? targetPath : `/${targetPath}`
      }`;

      const queryParams = new URLSearchParams();
      for (const key in request.query) { // .query should be available
        if (Object.prototype.hasOwnProperty.call(request.query, key) && key !== "targetPath") {
          const valueRaw = request.query[key];
          if (valueRaw !== undefined) {
            const value = Array.isArray(valueRaw) ? valueRaw[0] : valueRaw;
            // Ensure value is stringifiable for URLSearchParams
            if (value !== undefined && typeof value === 'string') {
                 queryParams.append(key, value);
            } else if (value !== undefined) {
                 queryParams.append(key, String(value));
            }
          }
        }
      }

      const queryString = queryParams.toString();
      if (queryString) {
        externalApiUrl += (externalApiUrl.includes("?") ? "&" : "?") +
          queryString;
      }

      functions.logger.info(`Proxying request to: ${externalApiUrl}`);

      axios.get(externalApiUrl, {
          headers: {
            "X-Auth-Token": apiKey,
            "Accept": "application/json",
          },
          timeout: 10000, // 10 seconds timeout
        })
        .then(apiResponse => {
          response.status(apiResponse.status).send(apiResponse.data); // .status() should be available
        })
        .catch((error: unknown) => {
          let errorMessage =
            "Error fetching data from external API via proxy.";
          let responseStatus = 500;
          let responseData: unknown = null;

          if (error instanceof Error) {
            errorMessage = error.message;
          }

          functions.logger.error(
            "Error calling Football-Data.org API via proxy:",
            {
              message: errorMessage,
              url: externalApiUrl,
              originalError: error, // Log the original error object
            }
          );

          if (isAxiosError(error) && error.response) {
            responseStatus = error.response.status;
            responseData = error.response.data;
            functions.logger.error("Axios error details from upstream API:", { // More specific log
              status: responseStatus,
              data: responseData,
            });
            // Send the actual response body from the external API if available
            response.status(responseStatus).send( // .status() should be available
              responseData || errorMessage // Fallback to generic message if data is null/undefined
            );
          } else {
            response.status(responseStatus).send(errorMessage); // .status() should be available
          }
        });
    });
  }
);