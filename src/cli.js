import readline from "node:readline/promises";
import {
  getValidModels,
  buildComparisonUrl,
  normalizeModel,
} from "./models/services/modelService.js";
import { scrapeComparison } from "./scraper/services/scraperService.js";
import { analyze } from "./analysis/services/analysisService.js";

/**
 * CLI entry point. Runs the full pipeline:
 * 1. Fetches and validates models from OpenCode.
 * 2. Displays a table of valid models and lets the user choose two.
 * 3. Scrapes the generated comparison page.
 * 4. Generates the AI analysis and prints it to the console.
 *
 * @async
 * @function main
 * @returns {Promise<void>} Resolves when the pipeline finishes successfully.
 * @throws {Error} If there are not enough valid models, no data can be
 * extracted, the user input is invalid, or the AI call fails.
 * @example
 * // node src/cli.js
 */
async function main() {
  console.log("🔍 Fetching models from OpenCode...");
  const { validIds, allResults } = await getValidModels();

  // ── Build and display the per-model table ─────────────────────────────
  const tableData = allResults
    .filter((r) => r.status === "fulfilled" && r.value?.isValid)
    .map((r, i) => ({
      "#": i + 1,
      Model: r.value.originalId,
      URL: r.value.checkUrl,
    }));

  console.log(`✅ ${validIds.length} valid models found.\n`);
  console.table(tableData);

  // ── Interactive model selection ───────────────────────────────────────
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer1 = await rl.question(
    `\nSelect the first model for comparison (1-${tableData.length}): `,
  );
  const firstIdx = parseInt(answer1.trim(), 10) - 1;

  if (Number.isNaN(firstIdx) || firstIdx < 0 || firstIdx >= tableData.length) {
    rl.close();
    throw new Error(
      `Invalid selection for first model. Enter a number between 1 and ${tableData.length}.`,
    );
  }

  const answer2 = await rl.question(
    `Select the second model for comparison (1-${tableData.length}): `,
  );
  rl.close();

  const secondIdx = parseInt(answer2.trim(), 10) - 1;

  if (
    Number.isNaN(secondIdx) ||
    secondIdx < 0 ||
    secondIdx >= tableData.length ||
    secondIdx === firstIdx
  ) {
    throw new Error(
      `Invalid selection for second model. Enter a number between 1 and ${tableData.length} different from the first model.`,
    );
  }

  const firstModel = normalizeModel(tableData[firstIdx].Model);
  const secondModel = normalizeModel(tableData[secondIdx].Model);

  // Place the user-selected pair first in the slug; all valid IDs go in the query.
  const reorderedIds = [
    firstModel,
    secondModel,
    ...validIds.filter((id) => id !== firstModel && id !== secondModel),
  ];
  const comparisonUrl = buildComparisonUrl(reorderedIds);

  console.log(`\n🔗 Comparison URL: ${comparisonUrl}\n`);

  // ── Scraping & AI analysis ────────────────────────────────────────────
  console.log("📊 Scraping comparison page...");
  const { models } = await scrapeComparison(comparisonUrl);
  console.log(`✅ Extracted data for ${models.length} models.\n`);

  if (models.length === 0) {
    throw new Error("No data could be extracted from the comparison page.");
  }

  console.log("🤖 Analyzing with AI...");
  const result = await analyze(models);
  console.log(`\n${result.analysis}\n`);
  console.log(`---\nProvider: ${result.provider} | Model: ${result.modelUsed}`);
}

main().catch((error) => {
  console.error("\n❌ Error during execution:", error.message);
  process.exit(1);
});
