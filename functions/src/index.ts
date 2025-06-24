// functions/src/index.ts

// Import necessary modules and types from Firebase and other libraries
import * as logger from "firebase-functions/logger";
// Import Request type from firebase-functions v2 and alias it
// Import Response type directly from express
import { onRequest, Request as FirebaseV2Request } from "firebase-functions/v2/https";
import type { Response as ExpressResponse } from "express"; // Import Express Response type
import axios, { isAxiosError, AxiosError } from "axios";
import cors from "cors"; // This will use express types for its handler signature

// --- Configuration for CORS (Cross-Origin Resource Sharing) ---
// Define the list of allowed origins. Requests from these URLs will be permitted.
const allowedOrigins = [
  "http://127.0.0.1:8000",
  "http://localhost:8000",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "https://vnext-football-hub.web.app",
];

// Create a CORS handler. The types for req/res in its callback will be from Express.
const corsHandler = cors({
  origin: (requestOrigin, callback) => {
    logger.info("Request origin:", requestOrigin);
    // Allow requests that don't have an origin (e.g., from server-to-server, curl).
    if (!requestOrigin) {
      return callback(null, true);
    }
    // If the origin is not in our allowed list, reject the request.
    if (allowedOrigins.indexOf(requestOrigin) === -1) {
      const msg = "The CORS policy for this site does not allow access from the specified Origin.";
      logger.warn(msg, { origin: requestOrigin });
      return callback(new Error(msg), false);
    }
    // Otherwise, allow the request.
    return callback(null, true);
  },
});

// The base URL for the external football data API.
const FOOTBALL_DATA_ORG_BASE_URL = "https://api.football-data.org/v4";

/**
 * An HTTP Cloud Function that acts as a proxy to the football-data.org API.
 * It forwards requests from the frontend, attaching the necessary API key on the server-side
 * to keep the key secure. It also handles CORS.
 */
export const footballApiProxy = onRequest(
  // Use FirebaseV2Request and ExpressResponse types here
  async (request: FirebaseV2Request, response: ExpressResponse): Promise<void> => {
    // When corsHandler is invoked, it treats request and response as Express types.
    // Cast to 'any' to resolve type conflicts with cors library's specific internal types.
    // The 'request' and 'response' objects themselves retain their richer types within this scope.
    corsHandler(request as any, response as any, async (corsErr?: Error | undefined) => {
      if (corsErr) {
        const errorMessage = corsErr instanceof Error ? corsErr.message : "Unknown CORS error";
        logger.error("CORS error:", errorMessage, corsErr);
        if (!response.headersSent) {
          response.status(500).send("CORS error: " + errorMessage);
        }
        return;
      }

      // request.query is a property of express.Request, which FirebaseV2Request extends
      const rawTargetPath = request.query.targetPath;
      const targetPath = Array.isArray(rawTargetPath) ?
        (rawTargetPath[0] as string) :
        (rawTargetPath as string);

      if (typeof targetPath !== "string" || !targetPath) {
        if (!response.headersSent) {
          response.status(400).send("Missing or invalid targetPath parameter.");
        }
        return;
      }

      const apiKey = process.env.FOOTBALL_DATA_API_KEY;

      if (!apiKey) {
        logger.error(
          "Environment variable FOOTBALL_DATA_API_KEY not configured for the Cloud Function."
        );
        if (!response.headersSent) {
          response.status(500).send(
            "Proxy API key (environment variable) is not configured."
          );
        }
        return;
      }

      let externalApiUrl = `${FOOTBALL_DATA_ORG_BASE_URL}${
        targetPath.startsWith("/") ? targetPath : `/${targetPath}`
      }`;

      const queryParams = new URLSearchParams();
      // request.query is used again
      const requestQuery = request.query;
      for (const key in requestQuery) {
        if (Object.prototype.hasOwnProperty.call(requestQuery, key) && key !== "targetPath") {
          const valueRaw = requestQuery[key];
          if (valueRaw !== undefined) {
            // Ensure value is properly cast to string for URLSearchParams
            const value = Array.isArray(valueRaw) ? (valueRaw[0] as string) : String(valueRaw);
            if (value !== undefined) { // Check again after potential String() conversion
              queryParams.append(key, value);
            }
          }
        }
      }

      const queryString = queryParams.toString();
      if (queryString) {
        externalApiUrl += (externalApiUrl.includes("?") ? "&" : "?") + queryString;
      }

      logger.info(`Proxying request to: ${externalApiUrl}`);

      try {
        const apiResponse = await axios.get(externalApiUrl, {
          headers: {
            "X-Auth-Token": apiKey,
            "Accept": "application/json",
          },
          timeout: 10000, // 10 seconds timeout
        });
        // Forward the status and data from the external API back to the client.
        if (!response.headersSent) {
          response.status(apiResponse.status).send(apiResponse.data);
        }
      } catch (error: unknown) {
        // --- Comprehensive Error Handling ---
        let errorMessage = "Error fetching data from external API via proxy.";
        let httpStatus = 500; // Use httpStatus to avoid conflict with axiosErrorInstance.response.status

        const errorLogDetails: Record<string, any> = { url: externalApiUrl };

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
          if (axiosErrorInstance.code) {
            errorLogDetails.axiosErrorCode = axiosErrorInstance.code;
          }

          if (axiosErrorInstance.response) {
            httpStatus = axiosErrorInstance.response.status;
            const responseData = axiosErrorInstance.response.data as any;
            logger.error(
              "Axios error with response from upstream API:",
              {
                url: externalApiUrl,
                status: httpStatus,
                data: responseData,
                axiosErrorMessage: axiosErrorInstance.message,
              }
            );
            if (!response.headersSent) {
              response.status(httpStatus).send(responseData || errorMessage);
            }
          } else { // Network error or timeout, no response from upstream
            logger.warn(
              "Axios error without response from upstream API (network issue or timeout):",
              {
                url: externalApiUrl,
                message: axiosErrorInstance.message,
                code: axiosErrorInstance.code,
              }
            );
            if (!response.headersSent) {
              // For timeout or network errors, use a gateway timeout or service unavailable status
              httpStatus = axiosErrorInstance.code === 'ECONNABORTED' ? 504 : 503;
              response.status(httpStatus).send(errorMessage);
            }
          }
        } else { // Non-Axios error
          logger.error("Proxy encountered a non-Axios error:", errorLogDetails);
          if (!response.headersSent) {
            response.status(httpStatus).send(errorMessage);
          }
        }
      }
    });
  }
);
