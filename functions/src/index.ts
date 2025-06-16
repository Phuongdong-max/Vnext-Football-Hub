
// functions/src/index.ts

import * as functions from "firebase-functions"; // For logger
// Use onRequest and its specific Request types from firebase-functions/v2/https
import { onRequest, Request as FirebaseV2Request } from "firebase-functions/v2/https"; // Renamed to avoid confusion with global Request
import { Response as ExpressResponseType } from "express"; // Renamed to avoid confusion with global Response
import axios, {isAxiosError, AxiosError} from "axios";
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
  async (request: FirebaseV2Request, response: ExpressResponseType): Promise<void> => {
    // Cast request and response to 'any' for the corsHandler call to satisfy its type expectations,
    // as Firebase v2 types might not perfectly align with Express types expected by 'cors'.
    // The actual 'request' and 'response' objects used within the callback are the correctly typed
    // FirebaseV2Request and ExpressResponseType from this function's scope.
    corsHandler(request as any, response as any, async (corsErr?: Error | undefined) => {
      if (corsErr) {
        const errorMessage = corsErr instanceof Error ? corsErr.message : "Unknown CORS error";
        functions.logger.error("CORS error:", errorMessage, corsErr);
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

      try {
        const apiResponse = await axios.get(externalApiUrl, {
            headers: {
              "X-Auth-Token": apiKey,
              "Accept": "application/json",
            },
            timeout: 10000, // 10 seconds timeout
          });
        response.status(apiResponse.status).send(apiResponse.data);
      } catch (error: unknown) {
          let errorMessage = "Error fetching data from external API via proxy.";
          let responseStatus = 500; // Default error status

          let errorLogDetails: Record<string, any> = { url: externalApiUrl };

          if (error instanceof Error) {
            errorMessage = error.message;
            errorLogDetails.name = error.name;
            errorLogDetails.message = error.message;
          } else {
            errorLogDetails.errorObject = String(error);
          }

          functions.logger.error(
            "Proxy encountered an error:",
            errorLogDetails
          );

          if (isAxiosError(error)) {
            const axiosError = error as AxiosError;
            errorLogDetails.isAxiosError = true;
            if (axiosError.code) {
                errorLogDetails.axiosErrorCode = axiosError.code;
            }

            if (axiosError.response) {
              responseStatus = axiosError.response.status;
              const responseData = axiosError.response.data;
              functions.logger.error(
                "Axios error with response from upstream API:",
                {
                  url: externalApiUrl,
                  status: responseStatus,
                  data: responseData,
                  axiosErrorMessage: axiosError.message,
                }
              );
              response.status(responseStatus).send(responseData || errorMessage);
            } else {
              functions.logger.warn(
                "Axios error without response from upstream API (network issue or timeout):",
                {
                  url: externalApiUrl,
                  message: axiosError.message,
                  code: axiosError.code,
                }
              );
              response.status(responseStatus).send(errorMessage);
            }
          } else {
            response.status(responseStatus).send(errorMessage);
          }
        }
    });
  }
);
