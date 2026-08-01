import dotenv from "dotenv";
import {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_OPENROUTER_MODEL,
  OPENROUTER_BASE_URL,
} from "./constants.js";

dotenv.config();

/**
 * Global application configuration.
 *
 * All environment variables are centralized here to avoid scattered
 * accesses to `process.env` across the rest of the codebase. Each value
 * falls back to a sensible default when the corresponding variable is
 * not defined in the environment.
 */
export const config = {
  geminiApiKey: process.env.GEMINI_API_KEY || undefined,
  geminiModel: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
  openRouterApiKey: process.env.OPENROUTER_API_KEY || undefined,
  openRouterModel: process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL,
  openRouterBaseUrl: process.env.OPENROUTER_BASE_URL || OPENROUTER_BASE_URL,
  aiProvider: process.env.AI_PROVIDER || "gemini",
  port: parseInt(process.env.PORT || "3000", 10),
  // Optional API key to protect /api/* routes. When not set, the endpoints
  // remain open (useful on localhost, NOT in production).
  apiAccessKey: process.env.API_ACCESS_KEY || null,
};
