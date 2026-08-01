import { buildComparisonUrl } from "../../models/services/modelService.js";
import { scrapeComparison } from "../../scraper/services/scraperService.js";
import { analyze } from "../../analysis/services/analysisService.js";
import { config } from "../../shared/config.js";

/**
 * Controller for GET /.
 * Renders the main page where the user loads the available models and selects
 * two of them for comparison.
 *
 * @function showIndex
 * @param {import("express").Request} req - Express HTTP request.
 * @param {import("express").Response} res - Express HTTP response.
 * @returns {void} Renders the index view.
 * @example
 * // GET /
 */
export function showIndex(req, res) {
  res.render("index", {
    provider: config.aiProvider,
    model:
      config.aiProvider === "gemini"
        ? config.geminiModel
        : config.openRouterModel,
  });
}

/**
 * Controller for POST /analyze.
 * Receives the two user-selected model IDs and the full list of valid IDs,
 * builds the comparison URL, scrapes the comparison page and runs the AI
 * analysis, then renders the result view.
 *
 * @async
 * @function runAnalysis
 * @param {import("express").Request} req - Express HTTP request.
 * @param {import("express").Response} res - Express HTTP response.
 * @returns {Promise<void>} Renders the result view (with or without error).
 * @throws {Error} If fewer than two models are selected, no data can be
 * extracted, or the AI call fails (rendered in the result view).
 * @example
 * // POST /analyze
 * // Body (urlencoded): model1=deepseek-v4-pro&model2=grok-4-5&allValidIds=deepseek-v4-pro&allValidIds=grok-4-5&...
 */
export async function runAnalysis(req, res) {
  try {
    const { model1, model2, allValidIds } = req.body;

    if (
      !model1 ||
      !model2 ||
      !Array.isArray(allValidIds) ||
      allValidIds.length < 2
    ) {
      throw new Error("Select two models for comparison.");
    }

    // Place the user-selected pair first to form the URL slug; all valid IDs
    // go in the query so the comparison page shows every available model.
    const reorderedIds = [
      model1,
      model2,
      ...allValidIds.filter((id) => id !== model1 && id !== model2),
    ];
    const comparisonUrl = buildComparisonUrl(reorderedIds);

    const { models } = await scrapeComparison(comparisonUrl);

    if (models.length === 0) {
      throw new Error("No data could be extracted from the comparison page.");
    }

    const result = await analyze(models);

    res.render("result", {
      models,
      analysis: result.analysis,
      comparisonUrl,
      provider: result.provider,
      modelUsed: result.modelUsed,
      error: null,
    });
  } catch (error) {
    console.error("[web] Error in runAnalysis:", error.message);
    res.status(500).render("result", {
      models: [],
      analysis: null,
      comparisonUrl: null,
      provider: null,
      modelUsed: null,
      error: error.message,
    });
  }
}
