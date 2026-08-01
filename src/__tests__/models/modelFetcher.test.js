import { describe, it, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { fetchModelsFromOpenCode } from "../../models/libraries/modelFetcher.js";
import { OPENCODE_MODELS_URL } from "../../shared/constants.js";

/**
 * Unit tests for src/models/libraries/modelFetcher.js
 *
 * The global fetch is mocked to avoid real API calls to
 * OpenCode.
 */
describe("modelFetcher.fetchModelsFromOpenCode", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns the array of models when the API responds with { data: [...] }", async () => {
    globalThis.fetch = mock.fn(async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({
        data: [{ id: "model-1" }, { id: "model-2" }],
      }),
    }));

    const models = await fetchModelsFromOpenCode();

    assert.deepEqual(models, [{ id: "model-1" }, { id: "model-2" }]);
    // The request should point to the OpenCode URL.
    assert.equal(globalThis.fetch.mock.calls.length, 1);
    assert.equal(
      globalThis.fetch.mock.calls[0].arguments[0],
      OPENCODE_MODELS_URL,
    );
  });

  it("throws an error when the API responds with a non-ok status", async () => {
    globalThis.fetch = mock.fn(async () => ({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({}),
    }));

    await assert.rejects(
      fetchModelsFromOpenCode(),
      /Request error: 500 Internal Server Error/,
    );
  });

  it("throws an error when the JSON does not contain the 'data' key", async () => {
    globalThis.fetch = mock.fn(async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ foo: "bar" }),
    }));

    await assert.rejects(fetchModelsFromOpenCode(), /Unexpected JSON format/);
  });

  it("throws an error when 'data' is not an array", async () => {
    globalThis.fetch = mock.fn(async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ data: "not-an-array" }),
    }));

    await assert.rejects(fetchModelsFromOpenCode(), /Unexpected JSON format/);
  });

  it("throws an error when fetch fails (network error)", async () => {
    globalThis.fetch = mock.fn(async () => {
      throw new Error("network down");
    });

    await assert.rejects(fetchModelsFromOpenCode(), /network down/);
  });
});
