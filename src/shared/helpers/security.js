/**
 * Shared security utilities.
 *
 * These helpers prevent SSRF and payload abuse on the public endpoints.
 */

const ALLOWED_HOSTS = new Set([
  "artificialanalysis.ai",
  "www.artificialanalysis.ai",
]);
const ALLOWED_PATH_PREFIX = "/models/comparisons/";
const MAX_URL_LENGTH = 2048;
const MAX_MODELS_PER_REQUEST = 50;

/**
 * Validates that a URL is a legitimate ArtificialAnalysis comparison URL
 * (https + allowed host + /models/comparisons/ path).
 * This blocks SSRF towards cloud metadata (169.254.169.254), localhost,
 * internal services and arbitrary hosts.
 *
 * @function isValidComparisonUrl
 * @param {unknown} value - Value to validate.
 * @returns {boolean} true if the URL is safe.
 * @example
 * isValidComparisonUrl("https://artificialanalysis.ai/models/comparisons/a-vs-b");
 * // -> true
 * isValidComparisonUrl("http://localhost:3000/admin");
 * // -> false
 */
export function isValidComparisonUrl(value) {
  if (typeof value !== "string") return false;
  if (value.length === 0 || value.length > MAX_URL_LENGTH) return false;

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:") return false;
  if (!ALLOWED_HOSTS.has(parsed.hostname)) return false;
  if (!parsed.pathname.startsWith(ALLOWED_PATH_PREFIX)) return false;

  return true;
}

/**
 * Throws a 400 error if the URL is not an allowed comparison URL.
 *
 * @function assertComparisonUrl
 * @param {unknown} url - URL to validate.
 * @returns {string} The original URL if valid.
 * @throws {Error} With status 400 when the URL is not an allowed comparison.
 * @example
 * const url = assertComparisonUrl("https://artificialanalysis.ai/models/comparisons/a-vs-b");
 */
export function assertComparisonUrl(url) {
  if (!isValidComparisonUrl(url)) {
    const error = new Error(
      "Invalid URL: only https URLs on artificialanalysis.ai with the /models/comparisons/ path are allowed.",
    );
    error.status = 400;
    throw error;
  }
  return url;
}

/**
 * Validates the models array received in the request body.
 * - Must be a non-empty array of objects.
 * - Size is limited to prevent abuse of AI compute/cost.
 *
 * @function validateModelsArray
 * @param {unknown} models - Value received in the body.
 * @returns {boolean} true if the array is valid.
 * @throws {Error} With status 400 when the array exceeds the maximum size.
 * @example
 * const valid = validateModelsArray([{ name: "gpt-5" }]);
 * // -> true
 */
export function validateModelsArray(models) {
  if (!Array.isArray(models) || models.length === 0) return false;

  if (models.length > MAX_MODELS_PER_REQUEST) {
    const error = new Error(
      `The 'models' array cannot exceed ${MAX_MODELS_PER_REQUEST} elements.`,
    );
    error.status = 400;
    throw error;
  }

  return models.every(
    (model) =>
      model !== null && typeof model === "object" && !Array.isArray(model),
  );
}
