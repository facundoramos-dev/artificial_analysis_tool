import { scrape } from "../libraries/pageScraper.js";

/**
 * Scraping service: delegates to pageScraper.scrape and returns the
 * structure expected by the controllers.
 *
 * @async
 * @function scrapeComparison
 * @param {string} url - ArtificialAnalysis comparison URL.
 * @returns {Promise<{models: Array<object>, sourceUrl: string}>} Normalized
 * models (ModelData) and the source URL.
 * @throws {Error} If the page cannot be downloaded or parsed.
 * @example
 * const { models } = await scrapeComparison("https://artificialanalysis.ai/models/comparisons/a-vs-b");
 */
export async function scrapeComparison(url) {
  const result = await scrape(url);
  return {
    models: result.models,
    sourceUrl: result.sourceUrl,
  };
}
