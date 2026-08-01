import { describe, it, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import {
  validateModel,
  validateAllModels,
  normalizeModelId,
} from "../../models/libraries/modelValidator.js";
import { AA_BASE_URL } from "../../shared/constants.js";

/**
 * Unit tests for src/models/libraries/modelValidator.js
 *
 * The global fetch is mocked to control the HTTP status of ArtificialAnalysis.
 */
describe("modelValidator", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("normalizeModelId", () => {
    it("replaces dots with hyphens", () => {
      assert.equal(normalizeModelId("model.v1"), "model-v1");
      assert.equal(normalizeModelId("gpt-4o.1"), "gpt-4o-1");
      assert.equal(normalizeModelId("model"), "model");
    });
  });

  describe("validateModel", () => {
    it("normalizes the id and returns isValid true when the page responds with HTTP 200", async () => {
      globalThis.fetch = mock.fn(async () => ({ status: 200 }));

      const result = await validateModel("model.v1");

      assert.equal(result.isValid, true);
      assert.equal(result.originalId, "model.v1");
      assert.equal(result.normalizedId, "model-v1");
      assert.equal(result.checkUrl, `${AA_BASE_URL}/models/model-v1`);
      // Should verify the already normalized URL.
      assert.equal(
        globalThis.fetch.mock.calls[0].arguments[0],
        `${AA_BASE_URL}/models/model-v1`,
      );
    });

    it("returns isValid false when the page responds with HTTP 404", async () => {
      globalThis.fetch = mock.fn(async () => ({ status: 404 }));

      const result = await validateModel("model.v1");

      assert.equal(result.isValid, false);
      assert.equal(result.normalizedId, null);
      assert.equal(result.originalId, "model.v1");
      assert.equal(result.checkUrl, `${AA_BASE_URL}/models/model-v1`);
    });

    it("does not normalize the id when normalize is false", async () => {
      globalThis.fetch = mock.fn(async () => ({ status: 200 }));

      const result = await validateModel("model.v1", false);

      assert.equal(result.isValid, true);
      assert.equal(result.originalId, "model.v1");
      assert.equal(result.normalizedId, "model.v1");
      assert.equal(result.checkUrl, `${AA_BASE_URL}/models/model.v1`);
      assert.equal(
        globalThis.fetch.mock.calls[0].arguments[0],
        `${AA_BASE_URL}/models/model.v1`,
      );
    });

    it("returns isValid false in case of network error (catch)", async () => {
      globalThis.fetch = mock.fn(async () => {
        throw new Error("ECONNRESET");
      });

      const result = await validateModel("model.v1");

      assert.equal(result.isValid, false);
      assert.equal(result.normalizedId, null);
      assert.equal(result.originalId, "model.v1");
    });
  });

  describe("validateAllModels", () => {
    it("uses Promise.allSettled and returns a result per model", async () => {
      globalThis.fetch = mock.fn(async (url) => {
        if (url.endsWith("/model-a")) return { status: 200 };
        if (url.endsWith("/model-b")) return { status: 404 };
        return { status: 500 };
      });

      const results = await validateAllModels(["model-a", "model-b"]);

      assert.equal(results.length, 2);
      results.forEach((res) => assert.equal(res.status, "fulfilled"));
      assert.equal(results[0].value.isValid, true);
      assert.equal(results[1].value.isValid, false);
    });

    it("allows filtering only the valid models", async () => {
      globalThis.fetch = mock.fn(async (url) => {
        if (url.endsWith("/model-a")) return { status: 200 };
        if (url.endsWith("/model-b")) return { status: 200 };
        return { status: 404 };
      });

      const results = await validateAllModels([
        "model-a",
        "model-b",
        "model.c",
      ]);

      const validIds = results
        .filter((res) => res.status === "fulfilled" && res.value?.isValid)
        .map((res) => res.value.normalizedId);

      assert.deepEqual(validIds, ["model-a", "model-b"]);
    });

    it("tolerates individual network errors without breaking the validation of the rest", async () => {
      globalThis.fetch = mock.fn(async (url) => {
        if (url.endsWith("/ok")) return { status: 200 };
        throw new Error("timeout");
      });

      const results = await validateAllModels(["ok", "fail"]);

      assert.equal(results.length, 2);
      assert.equal(results[0].status, "fulfilled");
      assert.equal(results[0].value.isValid, true);
      // validateModel internally captures the error and resolves with isValid false.
      assert.equal(results[1].status, "fulfilled");
      assert.equal(results[1].value.isValid, false);
    });
  });
});
