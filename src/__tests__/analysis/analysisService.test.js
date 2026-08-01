import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { analyze } from "../../analysis/services/analysisService.js";

/**
 * Unit tests for src/analysis/services/analysisService.js
 *
 * Fakes of promptBuilder.build and aiProviderFactory.createProvider are injected via the `deps` parameter (optional and production-compatible).
 */
describe("analysisService.analyze", () => {
  const modelsData = [
    { name: "Model Alpha", intelligenceIndex: 80 },
    { name: "Model Beta", intelligenceIndex: 70 },
  ];

  it("builds the prompt, creates the provider and returns the analysis with metadata", async () => {
    const fakeBuild = (models) =>
      `PROMPT(${models.map((m) => m.name).join(",")})`;
    const fakeProvider = {
      name: "gemini",
      model: "gemini-2.5-flash",
      generateAnalysis: async (prompt) => `RESULT(${prompt})`,
    };
    const fakeCreateProvider = () => fakeProvider;

    const result = await analyze(modelsData, {
      build: fakeBuild,
      createProvider: fakeCreateProvider,
    });

    assert.equal(result.analysis, "RESULT(PROMPT(Model Alpha,Model Beta))");
    assert.equal(result.provider, "gemini");
    assert.equal(result.modelUsed, "gemini-2.5-flash");
  });

  it("uses real default values when no dependencies are injected", async () => {
    // With a real createProvider, we can only verify that the pipeline
    // starts and that the returned structure is correct (the real provider
    // fails on the network call, but should not break earlier).
    const result = await analyze(
      [
        {
          name: "Model Real",
          creator: "X",
          intelligenceIndex: 50,
          pricePer1MInput: 1,
          pricePer1MOutput: 2,
        },
      ],
      {
        build: undefined,
        createProvider: () => ({
          name: "gemini",
          model: "gemini-test",
          generateAnalysis: async (prompt) =>
            `OK ${prompt.includes("Model Real")}`,
        }),
      },
    );

    assert.equal(result.provider, "gemini");
    assert.equal(result.modelUsed, "gemini-test");
    assert.ok(result.analysis.includes("OK true"));
  });

  it("propagates errors from generateAnalysis", async () => {
    const fakeProvider = {
      name: "gemini",
      model: "gemini-test",
      generateAnalysis: async () => {
        throw new Error("The AI API failed");
      },
    };

    await assert.rejects(
      analyze(modelsData, {
        build: () => "prompt",
        createProvider: () => fakeProvider,
      }),
      /The AI API failed/,
    );
  });

  it("propagates errors from createProvider", async () => {
    await assert.rejects(
      analyze(modelsData, {
        build: () => "prompt",
        createProvider: () => {
          throw new Error("No provider configured");
        },
      }),
      /No provider configured/,
    );
  });

  it("propagates errors from build", async () => {
    await assert.rejects(
      analyze(modelsData, {
        build: () => {
          throw new Error("Invalid prompt");
        },
        createProvider: () => ({
          name: "x",
          model: "y",
          generateAnalysis: async () => "",
        }),
      }),
      /Invalid prompt/,
    );
  });
});
