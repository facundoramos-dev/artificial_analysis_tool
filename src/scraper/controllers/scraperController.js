import { scrapeComparison } from "../services/scraperService.js";
import { errorResponse } from "../../shared/helpers/responses.js";
import { assertComparisonUrl } from "../../shared/helpers/security.js";

/**
 * Controller for POST /api/scrape.
 * Receives `{ url }` in the body, scrapes the comparison page and returns
 * the extracted models as JSON.
 *
 * @async
 * @function scrapeUrl
 * @param {import("express").Request} req - Express HTTP request.
 * @param {import("express").Response} res - Express HTTP response.
 * @returns {Promise<void>} Responds with the extracted models or an error.
 * @throws {Error} If the scrape fails (handled and sent as JSON).
 * @example
 * // POST /api/scrape
 * // Body: { "url": "https://artificialanalysis.ai/models/comparisons/a-vs-b" }
 * // -> { models: [...], sourceUrl: "https://..." }
 */
export async function scrapeUrl(req, res) {
  try {
    const { url } = req.body || {};

    if (!url) {
      return res.status(400).json({ error: "Missing required field: url" });
    }

    // SSRF guard: only https comparison URLs on artificialanalysis.ai
    // are allowed. Blocks 169.254.169.254, localhost, etc.
    assertComparisonUrl(url);

    const result = await scrapeComparison(url);
    res.json(result);
  } catch (error) {
    errorResponse(res, error);
  }
}
