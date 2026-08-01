import { config } from "../../shared/config.js";
import { AI_PROVIDERS } from "../../shared/constants.js";
import { generateAnalysis as geminiGenerateAnalysis } from "./geminiClient.js";
import { generateAnalysis as openRouterGenerateAnalysis } from "./openRouterClient.js";

/**
 * Creates the configured AI provider (gemini or openrouter), validating
 * that the corresponding API key exists.
 *
 * @function createProvider
 * @returns {{name: string, model: string, generateAnalysis: Function}}
 * Provider object with name, model and generation function.
 * @throws {Error} If the provider is unknown or its API key is missing.
 * @example
 * const provider = createProvider();
 * const analysis = await provider.generateAnalysis(prompt);
 */
export function createProvider() {
  switch (config.aiProvider) {
    case AI_PROVIDERS.GEMINI:
      if (!config.geminiApiKey) {
        throw new Error(
          "GEMINI_API_KEY is not configured. Check your .env file.",
        );
      }
      return {
        name: AI_PROVIDERS.GEMINI,
        model: config.geminiModel,
        generateAnalysis: geminiGenerateAnalysis,
      };

    case AI_PROVIDERS.OPENROUTER:
      if (!config.openRouterApiKey) {
        throw new Error(
          "OPENROUTER_API_KEY is not configured. Check your .env file.",
        );
      }
      return {
        name: AI_PROVIDERS.OPENROUTER,
        model: config.openRouterModel,
        generateAnalysis: openRouterGenerateAnalysis,
      };

    default:
      throw new Error(
        `Unknown AI provider: "${config.aiProvider}". Use "gemini" or "openrouter".`,
      );
  }
}
