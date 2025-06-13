
// functions/src/index.ts

import * as functions from "firebase-functions";
import axios, {isAxiosError} from "axios";
import cors from "cors";
// Removed: import {Request as ExpressRequest, Response as ExpressResponse} from "express";

const allowedOrigins = [
  "http://127.0.0.1:8000",
  "http://localhost:8000",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "https://vnext-football-hub.web.app",
];

const corsHandler = cors({
  origin: (requestOrigin, callback) => { // Renamed 'origin' to 'requestOrigin' to avoid conflict with 'Origin' header
    functions.logger.info("Request origin:", requestOrigin);
    if (!requestOrigin) { // Allow requests with no origin (like server-to-server or mobile apps)
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

export const footballApiProxy = functions.https.onRequest(
  (request: functions.https.Request, response: functions.Response) => { // Use Firebase's Request and Response types
    corsHandler(request, response, (err?: Error | any) => { // err can be Error or any other type from middleware
      if (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown CORS error";
        functions.logger.error("CORS error:", errorMessage, err);
        response.status(500).send("CORS error: " + errorMessage);
        return;
      }

      // If CORS passed, proceed with the proxy logic
      const rawTargetPath = request.query.targetPath;
      const targetPath = Array.isArray(rawTargetPath)
        ? rawTargetPath[0]
        : rawTargetPath;

      if (typeof targetPath !== "string" || !targetPath) {
        response.status(400).send(
          "Missing or invalid targetPath parameter."
        );
        return;
      }

      const apiKey = functions.config().football?.apikey;

      if (!apiKey) {
        functions.logger.error(
          "Football API key not configured in Firebase Functions environment."
        );
        response.status(500).send(
          "Proxy API key is not configured."
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
              originalError: error,
            }
          );

          if (isAxiosError(error) && error.response) {
            responseStatus = error.response.status;
            responseData = error.response.data;
            functions.logger.error("Axios error details:", {
              status: responseStatus,
              data: responseData,
            });
            response.status(responseStatus).send(
              responseData || errorMessage
            );
          } else {
            response.status(responseStatus).send(errorMessage);
          }
        });
    });
  }
);
