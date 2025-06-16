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
exports.footballApiProxy = void 0;
const functions = __importStar(require("firebase-functions")); // For logger
// Use onRequest and its specific Request types from firebase-functions/v2/https
const https_1 = require("firebase-functions/v2/https");
const axios_1 = __importStar(require("axios"));
const cors_1 = __importDefault(require("cors"));
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
exports.footballApiProxy = (0, https_1.onRequest)(
// Use FirebaseRequest and ExpressResponse types
async (request, response) => {
    // Cast request to 'any' for corsHandler to resolve potential type conflicts
    // FirebaseRequest should be compatible, but this is a common workaround.
    corsHandler(request, response, async (corsErr) => {
        if (corsErr) {
            const errorMessage = corsErr instanceof Error ? corsErr.message : "Unknown CORS error";
            functions.logger.error("CORS error:", errorMessage, corsErr);
            response.status(500).send("CORS error: " + errorMessage);
            return;
        }
        const rawTargetPath = request.query.targetPath;
        const targetPath = Array.isArray(rawTargetPath)
            ? rawTargetPath[0]
            : rawTargetPath;
        if (typeof targetPath !== "string" || !targetPath) {
            response.status(400).send("Missing or invalid targetPath parameter.");
            return;
        }
        const apiKey = process.env.FOOTBALL_DATA_API_KEY;
        if (!apiKey) {
            functions.logger.error("Environment variable FOOTBALL_DATA_API_KEY not configured for the Cloud Function.");
            response.status(500).send("Proxy API key (environment variable) is not configured.");
            return;
        }
        let externalApiUrl = `${FOOTBALL_DATA_ORG_BASE_URL}${targetPath.startsWith("/") ? targetPath : `/${targetPath}`}`;
        const queryParams = new URLSearchParams();
        // Access query parameters from request.query (Firebase Functions V2 style)
        for (const key in request.query) {
            if (Object.prototype.hasOwnProperty.call(request.query, key) && key !== "targetPath") {
                const valueRaw = request.query[key];
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
            response.status(apiResponse.status).send(apiResponse.data);
        }
        catch (error) {
            let errorMessage = "Error fetching data from external API via proxy.";
            let responseStatus = 500; // Default error status
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
                    response.status(responseStatus).send(responseData || errorMessage);
                }
                else {
                    functions.logger.warn("Axios error without response from upstream API (network issue or timeout):", {
                        url: externalApiUrl,
                        message: axiosError.message,
                        code: axiosError.code,
                    });
                    response.status(responseStatus).send(errorMessage);
                }
            }
            else {
                response.status(responseStatus).send(errorMessage);
            }
        }
    });
});
//# sourceMappingURL=index.js.map