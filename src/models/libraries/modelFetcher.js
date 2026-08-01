import { OPENCODE_MODELS_URL } from "../../shared/constants.js";

/**
 * Fetches the list of models from the OpenCode API.
 *
 * @async
 * @function fetchModelsFromOpenCode
 * @returns {Promise<Array<{id: string}>>} Promise that resolves to the array
 * of `{ id }` objects coming from `json.data`.
 * @throws {Error} If the request fails or the JSON does not have the expected format.
 * @example
 * const models = await fetchModelsFromOpenCode();
 * // -> [{ id: "openai/gpt-5" }, { id: "anthropic/claude-4" }, ...]
 */
export async function fetchModelsFromOpenCode() {
  const response = await fetch(OPENCODE_MODELS_URL, {
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    throw new Error(`Request error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  if (!json.data || !Array.isArray(json.data)) {
    throw new Error("Unexpected JSON format: missing 'data' array.");
  }

  return json.data;
}
