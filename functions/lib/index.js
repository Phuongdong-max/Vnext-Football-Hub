"use strict";
// functions/src/index.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBettingRoundProxy = exports.footballApiProxy = void 0;
const functions = __importStar(require("firebase-functions")); // For logger
const https_1 = require("firebase-functions/v2/https");
const axios_1 = __importStar(require("axios"));
const cors_1 = __importDefault(require("cors"));
const admin = __importStar(require("firebase-admin"));
const types_1 = require("./types");
// Initialize Firebase Admin SDK
try {
    admin.initializeApp();
}
catch (e) {
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
const corsHandler = (0, cors_1.default)({
    origin: (requestOrigin, callback) => {
        functions.logger.info("Request origin:", requestOrigin);
        if (!requestOrigin) {
            // Allow requests with no origin (like curl requests, server-to-server)
            return callback(null, true);
        }
        if (allowedOrigins.indexOf(requestOrigin) === -1) {
            const msg = "The CORS policy for this site does not allow access from " +
                "the specified Origin.";
            functions.logger.warn(msg, { origin: requestOrigin });
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
});
const FOOTBALL_DATA_ORG_BASE_URL = "https://api.football-data.org/v4";
exports.footballApiProxy = (0, https_1.onRequest)({ secrets: ["FOOTBALL_DATA_API_KEY"] }, // Declare secret for football API key
async (req, res) => {
    corsHandler(req, res, async (corsErr) => {
        if (corsErr) {
            const errorMessage = corsErr instanceof Error ? corsErr.message : "Unknown CORS error";
            functions.logger.error("CORS error:", errorMessage, corsErr);
            res.status(500).send("CORS error: " + errorMessage);
            return;
        }
        const rawTargetPath = req.query.targetPath;
        const targetPath = Array.isArray(rawTargetPath)
            ? rawTargetPath[0]
            : rawTargetPath;
        if (typeof targetPath !== "string" || !targetPath) {
            res.status(400).send("Missing or invalid targetPath parameter.");
            return;
        }
        const apiKey = process.env.FOOTBALL_DATA_API_KEY;
        if (!apiKey) {
            functions.logger.error("Environment variable FOOTBALL_DATA_API_KEY not configured for the Cloud Function.");
            res.status(500).send("Proxy API key (environment variable) is not configured.");
            return;
        }
        let externalApiUrl = `${FOOTBALL_DATA_ORG_BASE_URL}${targetPath.startsWith("/") ? targetPath : `/${targetPath}`}`;
        const queryParams = new URLSearchParams();
        for (const key in req.query) {
            if (Object.prototype.hasOwnProperty.call(req.query, key) && key !== "targetPath") {
                const valueRaw = req.query[key];
                if (valueRaw !== undefined) {
                    const value = Array.isArray(valueRaw) ? valueRaw[0] : valueRaw;
                    if (value !== undefined && typeof value === 'string') {
                        queryParams.append(key, value);
                    }
                    else if (value !== undefined) {
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
            const apiResponse = await axios_1.default.get(externalApiUrl, {
                headers: {
                    "X-Auth-Token": apiKey,
                    "Accept": "application/json",
                },
                timeout: 10000, // 10 seconds timeout
            });
            res.status(apiResponse.status).send(apiResponse.data);
        }
        catch (error) {
            let errorMessage = "Error fetching data from external API via proxy.";
            let responseStatus = 500;
            let errorLogDetails = { url: externalApiUrl };
            if (error instanceof Error) {
                errorMessage = error.message;
                errorLogDetails.name = error.name;
                errorLogDetails.message = error.message;
            }
            else {
                errorLogDetails.errorObject = String(error);
            }
            functions.logger.error("Proxy encountered an error:", errorLogDetails);
            if ((0, axios_1.isAxiosError)(error)) {
                const axiosError = error;
                errorLogDetails.isAxiosError = true;
                if (axiosError.code) {
                    errorLogDetails.axiosErrorCode = axiosError.code;
                }
                if (axiosError.response) {
                    responseStatus = axiosError.response.status;
                    const responseData = axiosError.response.data;
                    functions.logger.error("Axios error with response from upstream API:", {
                        url: externalApiUrl,
                        status: responseStatus,
                        data: responseData,
                        axiosErrorMessage: axiosError.message,
                    });
                    res.status(responseStatus).send(responseData || errorMessage);
                }
                else {
                    functions.logger.warn("Axios error without response from upstream API (network issue or timeout):", {
                        url: externalApiUrl,
                        message: axiosError.message,
                        code: axiosError.code,
                    });
                    res.status(responseStatus).send(errorMessage);
                }
            }
            else {
                res.status(responseStatus).send(errorMessage);
            }
        }
    });
});
exports.createBettingRoundProxy = (0, https_1.onRequest)(async (req, res) => {
    corsHandler(req, res, async (corsErr) => {
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
        const { matchData } = req.body;
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
                status: types_1.BettingRoundStatus.OPEN,
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
                    startTime: createdRoundData?.matchDetails.startTime?.toDate().toISOString(),
                },
                createdAt: createdRoundData?.createdAt?.toDate().toISOString(),
            };
            functions.logger.info(`Betting round ${newRoundRef.id} created successfully by admin ${adminUid}`);
            res.status(201).json(responseData);
        }
        catch (error) {
            functions.logger.error("Error creating betting round via proxy:", error);
            if (error.code === "auth/id-token-expired" || error.code === "auth/argument-error") {
                res.status(401).json({ message: `Unauthorized: ID token is invalid or expired. ${error.message}` });
            }
            else {
                res.status(500).json({ message: `Internal Server Error: ${error.message || "Could not create betting round."}` });
            }
        }
    });
});
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
//# sourceMappingURL=index.js.map