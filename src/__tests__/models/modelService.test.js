import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getValidModels,
  buildComparisonUrl,
  normalizeModel,
} from "../../models/services/modelService.js";
import {
  AA_BASE_URL,
  DEFAULT_COMPARISON_PARAMS,
} from "../../shared/constants.js";

/**
 * Unit tests for src/models/services/modelService.js
 *
 * Fakes of modelFetcher.fetchModelsFromOpenCode and modelValidator.validateAllModels are injected via the `deps` parameter (optional and production-compatible).
 */

/** Fake validateAllModels with predetermined valid models. */
function fakeValidate(validIds, totalIds) {
  return totalIds.map((id) => {
    const isValid = validIds.includes(id);
    return {
      status: "fulfilled",
      value: {
        originalId: id,
        normalizedId: isValid ? id : null,
        isValid,
      },
    };
  });
}

describe("modelService", () => {
  describe("getValidModels", () => {
    it("returns { validIds, comparisonUrl } when there are at least 2 valid models", async () => {
      const result = await getValidModels({
        fetchModels: async () => [
          { id: "model-1", name: "Model Real" },
          { id: "model-2" },
          { id: "model.x" },
        ],
        validateAll: async (ids) => fakeValidate(["model-1", "model-2"], ids),
      });

      assert.deepEqual(result.validIds, ["model-1", "model-2"]);
      assert.ok(
        result.comparisonUrl.startsWith(
          `${AA_BASE_URL}/models/comparisons/model-1-vs-model-2?`,
        ),
      );
      assert.equal(
        new URL(result.comparisonUrl).searchParams.get("models"),
        "model-1,model-2",
      );
    });

    it("throws error when there are fewer than 2 valid models", async () => {
      await assert.rejects(
        getValidModels({
          fetchModels: async () => [{ id: "solo" }, { id: "invalido.x" }],
          validateAll: async (ids) => fakeValidate(["solo"], ids),
        }),
        /Not enough valid models \(minimum 2\)/,
      );
    });

    it("ignores rejected validations when counting valid models", async () => {
      await assert.rejects(
        getValidModels({
          fetchModels: async () => [{ id: "a" }, { id: "b" }],
          validateAll: async () => [
            {
              status: "fulfilled",
              value: { originalId: "a", normalizedId: "a", isValid: true },
            },
            { status: "rejected", reason: new Error("boom") },
          ],
        }),
        /Not enough valid models/,
      );
    });

    it("uses normalized IDs for the comparison URL", async () => {
      const result = await getValidModels({
        fetchModels: async () => [{ id: "gpt.4o" }, { id: "claude.opus" }],
        validateAll: async (ids) =>
          ids.map((id) => ({
            status: "fulfilled",
            value: {
              originalId: id,
              normalizedId: id.replace(/\./g, "-"),
              isValid: true,
            },
          })),
      });

      assert.deepEqual(result.validIds, ["gpt-4o", "claude-opus"]);
      assert.ok(result.comparisonUrl.includes("gpt-4o-vs-claude-opus"));
      assert.equal(
        new URL(result.comparisonUrl).searchParams.get("models"),
        "gpt-4o,claude-opus",
      );
    });
  });

  describe("buildComparisonUrl", () => {
    it("builds the comparison URL with default query params", () => {
      const url = buildComparisonUrl(["model-1", "model-2"]);
      const parsed = new URL(url);

      assert.equal(
        parsed.origin + parsed.pathname,
        `${AA_BASE_URL}/models/comparisons/model-1-vs-model-2`,
      );
      // URLSearchParams codifica la coma como %2C; URL() la decodifica.
      assert.equal(parsed.searchParams.get("models"), "model-1,model-2");

      for (const [key, value] of Object.entries(DEFAULT_COMPARISON_PARAMS)) {
        assert.equal(
          parsed.searchParams.get(key),
          value,
          `Missing or mismatched query param "${key}" in the URL: ${url}`,
        );
      }
    });

    it("preserves the order of models in the path and in the query", () => {
      const url = buildComparisonUrl(["beta", "alpha"]);
      assert.ok(url.includes("/beta-vs-alpha"));
      const parsed = new URL(url);
      assert.equal(parsed.searchParams.get("models"), "beta,alpha");
    });

    it("throws error when receiving fewer than 2 IDs", () => {
      assert.throws(
        () => buildComparisonUrl(["solo"]),
        /At least two valid model IDs/,
      );
    });
  });

  describe("normalizeModel", () => {
    it("normalizes an external id by replacing dots with hyphens", () => {
      assert.equal(normalizeModel("gpt-4o.1"), "gpt-4o-1");
    });
  });
});
