import { build } from "../libraries/promptBuilder.js";
import { createProvider } from "../libraries/aiProviderFactory.js";

/**
 * Orchestrates the analysis: builds the prompt with the model data, creates
 * the configured AI provider and generates the analysis.
 *
 * Dependency injection: `build` and `createProvider` can be overridden
 * in tests without changing the production behavior (both default to the
 * real implementations).
 *
 * @async
 * @function analyze
 * @param {Array<object>} modelsData - List of normalized ModelData.
 * @param {object} [deps={}] - Optional dependency overrides.
 * @param {Function} [deps.build] - Function that builds the analysis prompt.
 * @param {Function} [deps.createProvider] - Function that creates the AI provider.
 * @returns {Promise<{analysis: string, provider: string, modelUsed: string}>}
 * Promise that resolves with the analysis text and provider metadata.
 * @throws {Error} If the provider is not configured or the AI call fails.
 * @example
 * const { analysis, provider, modelUsed } = await analyze(models);
 */
export async function analyze(modelsData, deps = {}) {
  const buildPrompt = deps.build ?? build;
  const providerFactory = deps.createProvider ?? createProvider;

  const prompt = buildPrompt(modelsData);
  const provider = providerFactory();

  const analysis = await provider.generateAnalysis(prompt);

  return {
    analysis,
    provider: provider.name,
    modelUsed: provider.model,
  };
}
