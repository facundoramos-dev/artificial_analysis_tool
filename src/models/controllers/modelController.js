import { getValidModels } from "../services/modelService.js";
import { errorResponse } from "../../shared/helpers/responses.js";

/**
 * Controller for GET /api/models.
 * Fetches the valid models from OpenCode/ArtificialAnalysis and responds
 * with them as JSON.
 *
 * @async
 * @function getModels
 * @param {import("express").Request} req - Express HTTP request.
 * @param {import("express").Response} res - Express HTTP response.
 * @returns {Promise<void>} Responds with the model pipeline result or an error.
 * @throws {Error} If the model pipeline fails (handled and sent as JSON).
 * @example
 * // GET /api/models
 * // -> { models: [...], validIds: [...], comparisonUrl: "https://..." }
 */
export async function getModels(req, res) {
  try {
    const result = await getValidModels();
    res.json(result);
  } catch (error) {
    errorResponse(res, error);
  }
}
