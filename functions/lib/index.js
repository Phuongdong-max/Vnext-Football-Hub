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
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyLockScreenAnswer = exports.theOddsApiProxy = exports.footballApiProxy = void 0;
const logger = __importStar(require("firebase-functions/logger"));
// Use onRequest from v2/https, and Request/Response types from express
const https_1 = require("firebase-functions/v2/https");
const axios_1 = __importStar(require("axios"));
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
exports.footballApiProxy = (0, https_1.onRequest)({ cors: allowedOrigins }, // Firebase handles CORS
async (request, response) => {
    logger.info(`footballApiProxy invoked. Origin: ${request.headers["origin"]}, Method: ${request.method}`);
    const rawTargetPathQuery = request.query.targetPath;
    let targetPath;
    if (Array.isArray(rawTargetPathQuery)) {
        targetPath = rawTargetPathQuery[0];
    }
    else if (typeof rawTargetPathQuery === "string") {
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
    let externalApiUrl = `${FOOTBALL_DATA_ORG_BASE_URL}${targetPath.startsWith("/") ? targetPath : `/${targetPath}`}`;
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
        const apiResponse = await axios_1.default.get(externalApiUrl, {
            headers: { "X-Auth-Token": footballDataApiKey, "Accept": "application/json" },
            timeout: 10000,
        });
        response.status(apiResponse.status).send(apiResponse.data);
    }
    catch (error) {
        handleAxiosError(error, externalApiUrl, response, "footballApiProxy");
    }
});
// --- The Odds API Proxy ---
const THE_ODDS_API_BASE_URL = "https://api.the-odds-api.com/v4";
exports.theOddsApiProxy = (0, https_1.onRequest)({ cors: allowedOrigins }, // Firebase handles CORS
async (request, response) => {
    logger.info(`theOddsApiProxy invoked. Origin: ${request.headers["origin"]}, Method: ${request.method}`);
    const rawTargetPathQuery = request.query.targetPath;
    let targetPath;
    if (Array.isArray(rawTargetPathQuery)) {
        targetPath = rawTargetPathQuery[0];
    }
    else if (typeof rawTargetPathQuery === "string") {
        targetPath = rawTargetPathQuery;
    }
    if (typeof targetPath !== "string" || !targetPath) {
        logger.warn("theOddsApiProxy: Missing or invalid targetPath parameter.", { query: request.query });
        response.status(400).send("Missing or invalid targetPath parameter for The Odds API.");
        return;
    }
    const theOddsApiKey = process.env.THE_ODDS_API_KEY;
    logger.info(`theOddsApiProxy: THE_ODDS_API_KEY presence: ${theOddsApiKey ? "Exists" : "MISSING!"}`);
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
        logger.info("theOddsApiProxy: Attempting axios.get to The Odds API.");
        const apiResponse = await axios_1.default.get(externalApiUrl, {
            headers: { "Accept": "application/json" },
            timeout: 15000,
        });
        logger.info(`theOddsApiProxy: The Odds API response status: ${apiResponse.status}`);
        response.status(apiResponse.status).send(apiResponse.data);
    }
    catch (error) {
        logger.error("theOddsApiProxy: Error during axios.get to The Odds API.");
        handleAxiosError(error, externalApiUrl.replace(theOddsApiKey, "THE_ODDS_API_KEY_REDACTED"), response, "theOddsApiProxy");
    }
});
// --- Lock Screen Verification Function ---
const LOCK_SCREEN_CORRECT_ANSWER = "VNEXT JAPAN - Football Club";
exports.verifyLockScreenAnswer = (0, https_1.onRequest)({ cors: allowedOrigins }, // Use the same CORS policy
(request, response) => {
    logger.info(`verifyLockScreenAnswer invoked. Origin: ${request.headers["origin"]}, Method: ${request.method}`);
    if (request.method !== "POST") {
        response.status(405).send({ success: false, message: "Method Not Allowed" });
        return;
    }
    const userAnswer = request.body?.answer;
    if (typeof userAnswer !== "string" || !userAnswer.trim()) {
        response.status(400).send({ success: false, message: "Answer must be provided." });
        return;
    }
    if (userAnswer.trim().toLowerCase() === LOCK_SCREEN_CORRECT_ANSWER.toLowerCase()) {
        response.status(200).send({ success: true });
    }
    else {
        response.status(401).send({ success: false, message: "Incorrect answer." });
    }
});
// Helper function to handle Axios errors consistently
function handleAxiosError(error, url, response, proxyName) {
    let errorMessage = `Error fetching data from external API via ${proxyName}.`;
    let httpStatus = 500;
    const errorLogDetails = { url, proxyName };
    if (error instanceof Error) {
        errorMessage = error.message;
        errorLogDetails.name = error.name;
        errorLogDetails.message = error.message;
        errorLogDetails.stack = error.stack;
    }
    else {
        errorLogDetails.errorObject = String(error);
    }
    if ((0, axios_1.isAxiosError)(error)) {
        const axiosErrorInstance = error;
        errorLogDetails.isAxiosError = true;
        if (axiosErrorInstance.code)
            errorLogDetails.axiosErrorCode = axiosErrorInstance.code;
        if (axiosErrorInstance.response) {
            httpStatus = axiosErrorInstance.response.status;
            errorLogDetails.axiosResponseStatus = axiosErrorInstance.response.status;
            errorLogDetails.axiosResponseHeaders = axiosErrorInstance.response.headers;
            errorLogDetails.axiosResponseData = axiosErrorInstance.response.data;
            if (axiosErrorInstance.response.data) {
                if (typeof axiosErrorInstance.response.data === "string") {
                    errorMessage = axiosErrorInstance.response.data;
                }
                else if (axiosErrorInstance.response.data.message && typeof axiosErrorInstance.response.data.message === "string") {
                    errorMessage = axiosErrorInstance.response.data.message;
                }
                else if (axiosErrorInstance.response.data.error && typeof axiosErrorInstance.response.data.error === "string") {
                    errorMessage = axiosErrorInstance.response.data.error;
                }
                else {
                    errorMessage = `External API Error: ${httpStatus} - ${JSON.stringify(axiosErrorInstance.response.data)}`;
                }
            }
            else {
                errorMessage = `External API Error: ${httpStatus}`;
            }
        }
        else if (axiosErrorInstance.request) {
            errorMessage = "No response received from external API.";
            errorLogDetails.axiosRequestInfo = "No response was received from the external API.";
            httpStatus = 504;
        }
    }
    logger.error(`Error in ${proxyName}: ${errorMessage}`, errorLogDetails);
    try {
        response.status(httpStatus).send(errorMessage);
    }
    catch (e) {
        logger.error("Failed to send error response using .status().send(). This might indicate that the Response object is not extended by Firebase as expected, or the response was already sent.", e);
        // As a fallback, one might need to construct and return a new Response if the function signature allows,
        // but onRequest typically expects void or Promise<void> and direct mutation of the response object.
    }
}
//# sourceMappingURL=index.js.map