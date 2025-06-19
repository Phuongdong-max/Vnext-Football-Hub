// functions/src/index.ts

import * as functions from "firebase-functions"; // For logger
import { onRequest, Request as FunctionsRequest } from "firebase-functions/v2/https";
import { Request as ExpressRequestType, Response as ExpressResponse } from "express"; // Import Response from express
import axios, {isAxiosError, AxiosError} from "axios";
import cors from "cors";
import * as admin from "firebase-admin";
import { FootballMatch, BettingRoundStatus } from "./types";


// Initialize Firebase Admin SDK
try {
  admin.initializeApp();
} catch (e) {
  functions.logger.warn("Admin SDK already initialized or error during init:", e);
}
const db = admin.firestore();


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
  { secrets: ["FOOTBALL_DATA_API_KEY"] }, // Declare secret for football API key
  async (req: FunctionsRequest, res: ExpressResponse): Promise<void> => { // Use ExpressResponse
    corsHandler(req as ExpressRequestType, res, async (corsErr?: any) => {
      if (corsErr) {
        const errorMessage = corsErr instanceof Error ? corsErr.message : "Unknown CORS error";
        functions.logger.error("CORS error:", errorMessage, corsErr);
        res.status(500).send("CORS error: " + errorMessage);
        return;
      }

      const rawTargetPath = req.query.targetPath;
      const targetPath = Array.isArray(rawTargetPath)
        ? rawTargetPath[0] as string
        : rawTargetPath as string;

      if (typeof targetPath !== "string" || !targetPath) {
        res.status(400).send(
          "Missing or invalid targetPath parameter."
        );
        return;
      }

      const apiKey = process.env.FOOTBALL_DATA_API_KEY;

      if (!apiKey) {
        functions.logger.error(
          "Environment variable FOOTBALL_DATA_API_KEY not configured for the Cloud Function."
        );
        res.status(500).send(
          "Proxy API key (environment variable) is not configured."
        );
        return;
      }

      let externalApiUrl = `${FOOTBALL_DATA_ORG_BASE_URL}${
        targetPath.startsWith("/") ? targetPath : `/${targetPath}`
      }`;

      const queryParams = new URLSearchParams();
      for (const key in req.query) {
        if (Object.prototype.hasOwnProperty.call(req.query, key) && key !== "targetPath") {
          const valueRaw = req.query[key];
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
        res.status(apiResponse.status).send(apiResponse.data);
      } catch (error: unknown) {
          let errorMessage = "Error fetching data from external API via proxy.";
          let responseStatus = 500;

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
              res.status(responseStatus).send(responseData || errorMessage);
            } else {
              functions.logger.warn(
                "Axios error without response from upstream API (network issue or timeout):",
                {
                  url: externalApiUrl,
                  message: axiosError.message,
                  code: axiosError.code,
                }
              );
              res.status(responseStatus).send(errorMessage);
            }
          } else {
            res.status(responseStatus).send(errorMessage);
          }
        }
    });
  }
);


export const createBettingRoundProxy = onRequest(
  async (req: FunctionsRequest, res: ExpressResponse): Promise<void> => { // Use ExpressResponse
    corsHandler(req as ExpressRequestType, res, async (corsErr?: any) => {
      if (corsErr) {
        functions.logger.error("CORS error in createBettingRoundProxy:", corsErr);
        res.status(500).json({ message: "CORS error: " + (corsErr instanceof Error ? corsErr.message : "Unknown CORS error") });
        return;
      }

      if (req.method !== "POST") {
        res.status(405).json({ message: "Method Not Allowed. Only POST is accepted." });
        return;
      }

      const authorizationHeader = req.headers.authorization;
      if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
        res.status(401).json({ message: "Unauthorized: Missing or invalid ID token." });
        return;
      }
      const idToken = authorizationHeader.split("Bearer ")[1];

      const { matchData } = req.body as { matchData: FootballMatch };

      if (!matchData || !matchData.id || !matchData.homeTeam || !matchData.awayTeam || !matchData.startTime || !matchData.league) {
        res.status(400).json({ message: "Bad Request: Missing or invalid matchData." });
        return;
      }

      try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const adminUid = decodedToken.uid;

        const userDoc = await db.collection("users").doc(adminUid).get();
        if (!userDoc.exists || userDoc.data()?.role !== "admin") {
          functions.logger.warn(`User ${adminUid} attempted to create round but is not an admin or does not exist.`);
          res.status(403).json({ message: "Forbidden: User is not authorized to create betting rounds." });
          return;
        }

        const bettingRoundsCol = db.collection("bettingRounds");
        
        const existingRoundQuery = await bettingRoundsCol.where("matchId", "==", matchData.id).limit(1).get();
        if (!existingRoundQuery.empty) {
          res.status(409).json({ message: "Conflict: A betting round for this match already exists." });
          return;
        }
        
        const newRoundRef = bettingRoundsCol.doc();
        const newRoundData = {
          id: newRoundRef.id,
          matchId: matchData.id,
          matchDetails: {
            id: matchData.id,
            homeTeam: matchData.homeTeam,
            awayTeam: matchData.awayTeam,
            startTime: admin.firestore.Timestamp.fromDate(new Date(matchData.startTime)),
            league: matchData.league,
            ...(matchData.leagueCode && { leagueCode: matchData.leagueCode }),
            ...(matchData.status && { status: matchData.status }),
          },
          status: BettingRoundStatus.OPEN,
          bets: [],
          bettorIds: [],
          createdBy: adminUid,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await newRoundRef.set(newRoundData);

        const createdDoc = await newRoundRef.get();
        const createdRoundData = createdDoc.data();
        
        const responseData = {
          ...createdRoundData,
          matchDetails: {
            ...createdRoundData?.matchDetails,
            startTime: (createdRoundData?.matchDetails.startTime as admin.firestore.Timestamp)?.toDate().toISOString(),
          },
          createdAt: (createdRoundData?.createdAt as admin.firestore.Timestamp)?.toDate().toISOString(),
        };

        functions.logger.info(`Betting round ${newRoundRef.id} created successfully by admin ${adminUid}`);
        res.status(201).json(responseData);

      } catch (error: any) {
        functions.logger.error("Error creating betting round via proxy:", error);
        if (error.code === "auth/id-token-expired" || error.code === "auth/argument-error") {
          res.status(401).json({ message: `Unauthorized: ID token is invalid or expired. ${error.message}` });
        } else {
          res.status(500).json({ message: `Internal Server Error: ${error.message || "Could not create betting round."}` });
        }
      }
    });
  }
);
// Make sure you have a types.ts file in your functions/src directory with the necessary type definitions
// for FootballMatch and BettingRoundStatus, or adjust the import path if it's shared differently.
// For example:
/*
// functions/src/types.ts
export enum BettingRoundStatus {
  OPEN = 'open',
  // ... other statuses
}
export interface FootballMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string | Date; // Date for internal use, string from client for matchData
  league: string;
  leagueCode?: string;
  status?: string; // API status of the match
}
*/
// The import { FootballMatch, BettingRoundStatus } from "./types"; assumes a types.ts exists in functions/src folder.
// The code correctly handles new Date(matchData.startTime) for conversion.