/**
 * @constant {string} OpenCode API URL used to fetch the list of available models.
 */
export const OPENCODE_MODELS_URL = "https://opencode.ai/zen/go/v1/models";

/**
 * @constant {string} Base URL of ArtificialAnalysis.
 */
export const AA_BASE_URL = "https://artificialanalysis.ai";

/**
 * @constant {Object} Default query parameters appended to the comparison URL.
 */
export const DEFAULT_COMPARISON_PARAMS = {
  intelligence: "artificial-analysis-intelligence-index",
  "intelligence-comparison": "intelligence-vs-end-to-end-response-time",
  "intelligence-index-token-use": "intelligence-vs-token-use",
  pricing: "input-output-pricing",
  "context-window": "intelligence-vs-context-window",
  speed: "latency-vs-output-speed",
  "agentic-speed": "cost-vs-time-per-task",
  latency: "latency-over-time",
  "model-size": "intelligence-vs-total-parameters",
};

/**
 * @constant {Object} Supported AI provider identifiers.
 */
export const AI_PROVIDERS = {
  GEMINI: "gemini",
  OPENROUTER: "openrouter",
};

/**
 * @constant {string} Default Gemini model identifier.
 */
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

/**
 * @constant {string} Default OpenRouter model identifier.
 */
export const DEFAULT_OPENROUTER_MODEL = "google/gemini-2.5-flash";

/**
 * @constant {string} OpenRouter API base URL.
 */
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
