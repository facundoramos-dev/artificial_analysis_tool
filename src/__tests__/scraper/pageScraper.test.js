import { describe, it, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { scrape } from "../../scraper/libraries/pageScraper.js";

/**
 * Unit tests for src/scraper/libraries/pageScraper.js
 *
 * The global fetch is mocked to serve simulated HTML with RSC chunks
 * (self.__next_f.push) and/or JSON-LD blocks.
 */

/** Realistic models that ArtificialAnalysis embeds in initialModels. */
const realisticModels = [
  {
    name: "Claude Opus 4.1",
    shortName: "Opus 4.1",
    creator: { name: "Anthropic" },
    releaseDate: "2025-11-01",
    intelligenceIndex: 82.4,
    codingIndex: 78.9,
    agenticIndex: 76.2,
    price1mInputTokens: 15.0,
    price1mOutputTokens: 75.0,
    cacheHitPrice: 1.5,
    contextWindowTokens: 200000,
    timescaleData: { medianOutputSpeed: 42.3 },
    timeToFirstAnswerToken: { total: 1.2 },
    endToEndResponseTime: { total: 4.5 },
    parameters: 500000000000,
    inferenceParametersActiveBillions: 20,
    isReasoning: true,
    inputModalityImage: true,
    gdpval: 0.82,
    gpqa: 0.81,
    hle: 0.45,
    scicode: 0.76,
    tauBanking: 0.88,
    terminalbenchV21: 0.72,
    critpt: 0.79,
    omniscience: 0.65,
    briefcaseBreakdown: { overall: { elo: 1250 } },
    intelligenceIndexCostPerTask: 0.04,
  },
  {
    name: "GPT-5.1",
    shortName: "GPT-5.1",
    creator: { name: "OpenAI" },
    releaseDate: "2025-10-15",
    intelligenceIndex: 80.1,
    codingIndex: 82.3,
    agenticIndex: 74.0,
    price1mInputTokens: 1.25,
    price1mOutputTokens: 10.0,
    cacheHitPrice: 0.125,
    contextWindowTokens: 128000,
    timescaleData: { medianOutputSpeed: 89.7 },
    timeToFirstAnswerToken: { total: 0.8 },
    endToEndResponseTime: { total: 2.9 },
    parameters: 1750000000000,
    inferenceParametersActiveBillions: 6,
    isReasoning: false,
    inputModalityImage: false,
    gdpval: 0.79,
    gpqa: 0.78,
    hle: 0.4,
    scicode: 0.8,
    tauBanking: 0.9,
    terminalbenchV21: 0.85,
    critpt: 0.75,
    omniscience: 0.68,
    briefcaseBreakdown: { overall: { elo: 1280 } },
    intelligenceIndexCostPerTask: 0.01,
  },
];

/**
 * Builds simulated HTML with self.__next_f.push chunks that transport
 * the RSC payload (JSON escaped as a JS string).
 */
function buildRscHtml(initialModels) {
  const payload = JSON.stringify({
    buildId: "abc123",
    initialModels,
    suffix: true,
  });
  // El payload viaja dentro de un string JS, por lo que hay que escaparlo.
  const escapedChunk = JSON.stringify(payload);
  const chunkBody = escapedChunk.slice(1, -1);
  return `<!DOCTYPE html><html><head></head><body>
<script>self.__next_f.push([1,"${chunkBody}"])</script>
<script>self.__next_f.push([1,"other-chunk"])</script>
</body></html>`;
}

/** Builds simulated HTML with JSON-LD blocks (fallback). */
function buildLdJsonHtml() {
  return `<html><head>
<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [{ "@type": "ItemList", itemListElement: [] }],
  })}</script>
<script type="application/ld+json">${JSON.stringify({
    "@type": "SoftwareApplication",
    name: "Modelo Ld",
    intelligenceIndex: 55.5,
    price1mInputTokens: 2.0,
    url: "https://artificialanalysis.ai/models/modelo-ld",
  })}</script>
</head><body></body></html>`;
}

/** Builds HTML with no model data. */
function buildEmptyHtml() {
  return `<!DOCTYPE html><html><body>
  <div id="app">Loading...</div>
  <script>window.__NEXT_DATA__ = { props: {} };</script>
  </body></html>`;
}

describe("pageScraper.scrape", () => {
  const originalFetch = globalThis.fetch;
  const COMPARISON_URL =
    "https://artificialanalysis.ai/models/comparisons/a-vs-b";

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("parses the self.__next_f.push chunks and extracts initialModels", async () => {
    globalThis.fetch = mock.fn(async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => buildRscHtml(realisticModels),
    }));

    const result = await scrape(COMPARISON_URL);

    assert.equal(result.sourceUrl, COMPARISON_URL);
    assert.equal(result.extractionSource, "rsc");
    assert.equal(result.models.length, 2);
    assert.equal(result.models[0].name, "Claude Opus 4.1");
    assert.equal(result.models[1].name, "GPT-5.1");
  });

  it("correctly maps the fields of initialModels to ModelData", async () => {
    globalThis.fetch = mock.fn(async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => buildRscHtml([realisticModels[0]]),
    }));

    const { models } = await scrape(COMPARISON_URL);
    const model = models[0];

    assert.equal(model.name, "Claude Opus 4.1");
    assert.equal(model.creator, "Anthropic");
    assert.equal(model.releaseDate, "2025-11-01");
    assert.equal(model.intelligenceIndex, 82.4);
    assert.equal(model.codingIndex, 78.9);
    assert.equal(model.agenticIndex, 76.2);
    assert.equal(model.pricePer1MInput, 15.0);
    assert.equal(model.pricePer1MOutput, 75.0);
    assert.equal(model.cacheHitPrice, 1.5);
    assert.equal(model.contextWindowTokens, 200000);
    assert.equal(model.outputSpeed, 42.3);
    assert.equal(model.timeToFirstToken, 1.2);
    assert.equal(model.endToEndResponseTime, 4.5);
    assert.equal(model.totalParams, 500000000000);
    assert.equal(model.activeParams, 20);
    assert.equal(model.isReasoning, true);
    assert.equal(model.supportsImages, true);
    assert.equal(model.costPerTask, 0.04);

    // Benchmarks
    assert.equal(model.benchmarks.gpqa, 0.81);
    assert.equal(model.benchmarks.hle, 0.45);
    assert.equal(model.benchmarks.scicode, 0.76);
    assert.equal(model.benchmarks.gdpval, 0.82);
    assert.equal(model.benchmarks.tauBanking, 0.88);
    assert.equal(model.benchmarks.terminalbenchV21, 0.72);
    assert.equal(model.benchmarks.critpt, 0.79);
    assert.equal(model.benchmarks.omniscience, 0.65);
    assert.equal(model.benchmarks.briefcaseElo, 1250);
  });

  it("uses JSON-LD as fallback when there are no initialModels in the RSC", async () => {
    globalThis.fetch = mock.fn(async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => buildLdJsonHtml(),
    }));

    const result = await scrape(COMPARISON_URL);

    assert.equal(result.extractionSource, "ldjson");
    assert.equal(result.models.length, 1);
    assert.equal(result.models[0].name, "Modelo Ld");
    assert.equal(result.models[0].intelligenceIndex, 55.5);
    assert.equal(result.models[0].pricePer1MInput, 2.0);
  });

  it("lanza error cuando el HTML no contiene datos de modelos", async () => {
    globalThis.fetch = mock.fn(async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => buildEmptyHtml(),
    }));

    await assert.rejects(scrape(COMPARISON_URL), /No model data found/);
  });

  it("maneja JSON escapado dentro del payload RSC (comillas dentro de strings)", async () => {
    const modelsWithEscapedQuotes = [
      {
        name: 'Model "Pro" X',
        creator: { name: "ACME" },
        intelligenceIndex: 66.6,
        price1mInputTokens: 3.0,
      },
    ];
    globalThis.fetch = mock.fn(async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => buildRscHtml(modelsWithEscapedQuotes),
    }));

    const result = await scrape(COMPARISON_URL);

    assert.equal(result.extractionSource, "rsc");
    assert.equal(result.models.length, 1);
    assert.equal(result.models[0].name, 'Model "Pro" X');
  });

  it("maneja valores doblemente escapados dentro del payload RSC (fallback unescape)", async () => {
    // El valor de initialModels llega escapado como si fuera un string JS,
    // es decir con secuencias \" literales dentro del payload ya decodificado.
    const innerModels = [{ name: "Modelo Escape", intelligenceIndex: 88.8 }];
    const escapedValue = JSON.stringify(innerModels).replace(/"/g, '\\"');
    const payload = `some-flight-data "initialModels":${escapedValue} end`;
    const escapedChunk = JSON.stringify(payload);
    const chunkBody = escapedChunk.slice(1, -1);
    const html = `<script>self.__next_f.push([1,"${chunkBody}"])</script>`;

    globalThis.fetch = mock.fn(async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => html,
    }));

    const result = await scrape(COMPARISON_URL);

    assert.equal(result.extractionSource, "rsc");
    assert.equal(result.models.length, 1);
    assert.equal(result.models[0].name, "Modelo Escape");
    assert.equal(result.models[0].intelligenceIndex, 88.8);
  });

  it("lanza error cuando la descarga responde con status no-ok", async () => {
    globalThis.fetch = mock.fn(async () => ({
      ok: false,
      status: 403,
      statusText: "Forbidden",
    }));

    await assert.rejects(
      scrape(COMPARISON_URL),
      /Scrape request error: 403 Forbidden/,
    );
  });

  it("lanza error cuando fetch falla (network error)", async () => {
    globalThis.fetch = mock.fn(async () => {
      throw new Error("socket hang up");
    });

    await assert.rejects(scrape(COMPARISON_URL), /socket hang up/);
  });
});
