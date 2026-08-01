import { AA_BASE_URL } from "../../shared/constants.js";

/**
 * Normalizes a model ID by replacing dots with hyphens.
 * Example: "gpt-4o.1" -> "gpt-4o-1".
 *
 * @function normalizeModelId
 * @param {string} modelId - Original model ID.
 * @returns {string} Normalized model ID.
 * @example
 * normalizeModelId("gpt-4o.1");
 * // -> "gpt-4o-1"
 */
export function normalizeModelId(modelId) {
  return modelId.replace(/\./g, "-");
}

/**
 * Validates that a model exists on ArtificialAnalysis by checking that its
 * page returns HTTP 200.
 *
 * @async
 * @function validateModel
 * @param {string} modelId - Original model ID.
 * @param {boolean} [normalize=true] - Whether to normalize the model ID (dots to hyphens).
 * @returns {Promise<{originalId: string, normalizedId: string|null, isValid: boolean, checkUrl: string}>}
 * Promise that resolves to the validation result.
 * @example
 * const result = await validateModel("gpt-4o.1");
 * // -> { originalId: "gpt-4o.1", normalizedId: "gpt-4o-1", isValid: true, checkUrl: "..." }
 */
export async function validateModel(modelId, normalize = true) {
  const normalizedId = normalize ? normalizeModelId(modelId) : modelId;
  const checkUrl = `${AA_BASE_URL}/models/${normalizedId}`;

  try {
    const checkResponse = await fetch(checkUrl, {
      signal: AbortSignal.timeout(10000),
    });
    return {
      originalId: modelId,
      normalizedId: checkResponse.status === 200 ? normalizedId : null,
      isValid: checkResponse.status === 200,
      checkUrl,
    };
  } catch {
    return {
      originalId: modelId,
      normalizedId: null,
      isValid: false,
      checkUrl,
    };
  }
}

/**
 * Validates multiple models in parallel using Promise.allSettled so that a
 * single failure does not stop the validation of the rest.
 *
 * @async
 * @function validateAllModels
 * @param {string[]} modelIds - List of original model IDs.
 * @param {boolean} [normalize=true] - Whether to normalize the model IDs.
 * @returns {Promise<Array<{status: string, value?: object, reason?: *}>>}
 * Promise that resolves to the Promise.allSettled results.
 * @example
 * const results = await validateAllModels(["gpt-4o.1", "claude-4"]);
 */
export async function validateAllModels(modelIds, normalize = true) {
  const validations = modelIds.map((modelId) =>
    validateModel(modelId, normalize),
  );
  return Promise.allSettled(validations);
}
