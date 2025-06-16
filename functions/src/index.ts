
// functions/src/index.ts

import * as functions from "firebase-functions"; // For logger
// Use HttpsRequest from firebase-functions/v2/https and Response from express for GCFv2
import { onRequest, HttpsRequest } from "firebase-functions/v2/https";
import { Response } from "express"; // Express Response type
import axios, {isAxiosError, AxiosError} from "axios"; // Added AxiosError for explicit typing
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
  // Use HttpsRequest from v2 and Response from Express
  (request: HttpsRequest, response: Response) => {
    corsHandler(request, response, (err?: unknown) => {
      if (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown CORS error";
        functions.logger.error("CORS error:", errorMessage, err);
        response.status(500).send("CORS error: " + errorMessage);
        return;
      }

      const rawTargetPath = request.query.targetPath;
      const targetPath = Array.isArray(rawTargetPath)
        ? rawTargetPath[0] as string
        : rawTargetPath as string;

      if (typeof targetPath !== "string" || !targetPath) {
        response.status(400).send(
          "Missing or invalid targetPath parameter."
        );
        return;
      }

      const apiKey = process.env.FOOTBALL_DATA_API_KEY;

      if (!apiKey) {
        functions.logger.error(
          "Environment variable FOOTBALL_DATA_API_KEY not configured for the Cloud Function."
        );
        response.status(500).send(
          "Proxy API key (environment variable) is not configured."
        );
        return;
      }

      let externalApiUrl = `${FOOTBALL_DATA_ORG_BASE_URL}${
        targetPath.startsWith("/") ? targetPath : `/${targetPath}`
      }`;

      const queryParams = new URLSearchParams();
      for (const key in request.query) {
        if (Object.prototype.hasOwnProperty.call(request.query, key) && key !== "targetPath") {
          const valueRaw = request.query[key];
          if (valueRaw !== undefined) {
            const value = Array.isArray(valueRaw) ? valueRaw[0] : valueRaw;
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
          response.status(apiResponse.status).send(apiResponse.data);
        })
        .catch((error: unknown) => {
          let errorMessage = "Error fetching data from external API via proxy.";
          let responseStatus = 500; // Default error status

          // Prepare details for logging
          let errorLogDetails: Record<string, any> = { url: externalApiUrl };

          if (error instanceof Error) {
            errorMessage = error.message; // Base error message
            errorLogDetails.name = error.name;
            errorLogDetails.message = error.message;
            // Avoid logging full stack in concise error object unless verbose logging is on
            // errorLogDetails.stack = error.stack;
          } else {
            errorLogDetails.errorObject = String(error);
          }

          functions.logger.error(
            "Proxy encountered an error:",
            errorLogDetails // Log refined error details
          );

          if (isAxiosError(error)) {
            // error is now of type AxiosError
            const axiosError = error as AxiosError; // Explicit cast for clarity if needed, though isAxiosError guards
            errorLogDetails.isAxiosError = true;
            if (axiosError.code) { // e.g. 'ECONNABORTED', 'ERR_BAD_REQUEST'
                errorLogDetails.axiosErrorCode = axiosError.code;
            }

            if (axiosError.response) {
              // Axios error with a response from the upstream API
              responseStatus = axiosError.response.status;
              const responseData = axiosError.response.data;
              functions.logger.error(
                "Axios error with response from upstream API:",
                {
                  url: externalApiUrl,
                  status: responseStatus,
                  data: responseData, // This can be large, consider logging selectively
                  axiosErrorMessage: axiosError.message,
                }
              );
              response.status(responseStatus).send(responseData || errorMessage);
            } else {
              // Axios error without a response (e.g., network error, timeout)
              functions.logger.warn(
                "Axios error without response from upstream API (network issue or timeout):",
                {
                  url: externalApiUrl,
                  message: axiosError.message, // This is the primary message for network errors
                  code: axiosError.code,
                }
              );
              // For network errors, errorMessage (from error.message) is usually informative
              // responseStatus remains 500 (or could be 502, 503, 504 depending on policy)
              response.status(responseStatus).send(errorMessage);
            }
          } else {
            // Non-Axios error (e.g., programming error before request, or other unexpected error type)
            // errorMessage is already set if 'error instanceof Error'
            response.status(responseStatus).send(errorMessage);
          }
        });
    });
  }
);
