import { analyze } from "../services/analysisService.js";
import { scrapeComparison } from "../../scraper/services/scraperService.js";
import { errorResponse } from "../../shared/helpers/responses.js";
import {
  assertComparisonUrl,
  validateModelsArray,
} from "../../shared/helpers/security.js";

/**
 * Controller for POST /api/analyze.
 * Receives in the body either an array of `models` (ModelData) or a
 * comparison `url`. If a URL is provided, the page is scraped first and
 * then analyzed.
 *
 * @async
 * @function analyzeModels
 * @param {import("express").Request} req - Express HTTP request.
 * @param {import("express").Response} res - Express HTTP response.
 * @returns {Promise<void>} Responds with the AI analysis or an error.
 * @throws {Error} If scraping or the AI call fails (handled and sent as JSON).
 * @example
 * // POST /api/analyze
 * // Body: { "url": "https://artificialanalysis.ai/models/comparisons/a-vs-b" }
 * // -> { analysis: "...", provider: "gemini", modelUsed: "gemini-2.5-flash" }
 */
export async function analyzeModels(req, res) {
  try {
    const { models, url } = req.body || {};

    let modelsToAnalyze = models;

    // If a URL is provided, scrape it before analyzing.
    if (url) {
      // SSRF guard: only https comparison URLs on artificialanalysis.ai
      // are allowed. Blocks 169.254.169.254, localhost, etc.
      assertComparisonUrl(url);
      const scraped = await scrapeComparison(url);
      modelsToAnalyze = scraped.models;
    }

    if (!Array.isArray(modelsToAnalyze) || modelsToAnalyze.length === 0) {
      return res.status(400).json({
        error: "A 'models' array or a valid 'url' is required in the body.",
      });
    }

    // Validates the shape of the array and limits its size (max 50) to
    // prevent abuse of AI compute/cost.
    if (!validateModelsArray(modelsToAnalyze)) {
      return res.status(400).json({ error: "Invalid 'models' format." });
    }

    const result = await analyze(modelsToAnalyze);
    res.json(result);
  } catch (error) {
    errorResponse(res, error);
  }
}
