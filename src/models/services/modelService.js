import {
  AA_BASE_URL,
  DEFAULT_COMPARISON_PARAMS,
} from "../../shared/constants.js";
import { fetchModelsFromOpenCode } from "../libraries/modelFetcher.js";
import {
  validateAllModels,
  normalizeModelId,
} from "../libraries/modelValidator.js";

/**
 * Builds the ArtificialAnalysis comparison URL from the valid model IDs,
 * using the default comparison query parameters.
 *
 * @function buildComparisonUrl
 * @param {string[]} validIds - List of valid normalized model IDs (minimum 2).
 * @returns {string} Full comparison URL.
 * @throws {Error} If fewer than two valid IDs are provided.
 * @example
 * buildComparisonUrl(["gpt-4o-1", "claude-4"]);
 * // -> "https://artificialanalysis.ai/models/comparisons/gpt-4o-1-vs-claude-4?models=..."
 */
export function buildComparisonUrl(validIds) {
  if (!Array.isArray(validIds) || validIds.length < 2) {
    throw new Error(
      "At least two valid model IDs are required to build a comparison URL.",
    );
  }

  // The first two IDs form the URL slug; the full list goes in the query param.
  // Callers (e.g. CLI) should sort user-selected IDs first before calling this function.
  const basePath = `${validIds[0]}-vs-${validIds[1]}`;

  const queryParams = new URLSearchParams({
    ...DEFAULT_COMPARISON_PARAMS,
    models: validIds.join(","),
  });

  return `${AA_BASE_URL}/models/comparisons/${basePath}?${queryParams.toString()}`;
}

/**
 * Orchestrates the model pipeline: fetches the list from OpenCode, validates
 * each model against ArtificialAnalysis and builds the comparison URL.
 *
 * Dependency injection: `fetchModels` and `validateAll` can be overridden
 * in tests without changing the production behavior (both default to the
 * real implementations).
 *
 * @async
 * @function getValidModels
 * @param {object} [deps={}] - Optional dependency overrides.
 * @param {Function} [deps.fetchModels] - Function that fetches the OpenCode model list.
 * @param {Function} [deps.validateAll] - Function that validates a list of model IDs.
 * @returns {Promise<{models: Array<{id: string}>, validIds: string[], allResults: Array<{status: string, value?: object}>, comparisonUrl: string}>}
 * Promise that resolves with the original models, the valid IDs, the raw
 * validation results (useful for displaying per-model check URLs), and the
 * comparison URL.
 * @throws {Error} If the model list cannot be fetched/validated, or fewer than
 * two valid models are found (a comparison URL requires at least 2 models).
 * @example
 * const { validIds, comparisonUrl } = await getValidModels();
 */
export async function getValidModels(deps = {}) {
  const fetchModels = deps.fetchModels ?? fetchModelsFromOpenCode;
  const validateAll = deps.validateAll ?? validateAllModels;

  const models = await fetchModels();

  const results = await validateAll(models.map((model) => model.id));

  // Keep only fulfilled validations that were marked as valid.
  const validIds = results
    .filter((res) => res.status === "fulfilled" && res.value?.isValid)
    .map((res) => res.value.normalizedId);

  if (validIds.length < 2) {
    throw new Error(
      `Not enough valid models (minimum 2). Valid: ${validIds.length}`,
    );
  }

  return {
    models,
    validIds,
    /** Raw Promise.allSettled results (status, value with originalId/normalizedId/isValid/checkUrl). */
    allResults: results,
    comparisonUrl: buildComparisonUrl(validIds),
  };
}

/**
 * Convenience utility to normalize model IDs coming from external services.
 *
 * @function normalizeModel
 * @param {string} modelId - Model ID to normalize.
 * @returns {string} Normalized model ID.
 * @example
 * normalizeModel("gpt-4o.1");
 * // -> "gpt-4o-1"
 */
export function normalizeModel(modelId) {
  return normalizeModelId(modelId);
}
