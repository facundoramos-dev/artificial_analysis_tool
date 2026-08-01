import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createProvider } from "../../analysis/libraries/aiProviderFactory.js";
import { config } from "../../shared/config.js";
import { AI_PROVIDERS } from "../../shared/constants.js";
import * as geminiClient from "../../analysis/libraries/geminiClient.js";
import * as openRouterClient from "../../analysis/libraries/openRouterClient.js";

/**
 * Unit tests for src/analysis/libraries/aiProviderFactory.js
 *
 * The factory reads the global configuration (config), so the `config`
 * object is mutated in each case and restored in afterEach.
 */
describe("aiProviderFactory.createProvider", () => {
  const originalConfig = {
    aiProvider: config.aiProvider,
    geminiApiKey: config.geminiApiKey,
    geminiModel: config.geminiModel,
    openRouterApiKey: config.openRouterApiKey,
    openRouterModel: config.openRouterModel,
  };

  beforeEach(() => {
    Object.assign(config, originalConfig);
  });

  afterEach(() => {
    Object.assign(config, originalConfig);
  });

  it("returns a Gemini provider when AI_PROVIDER=gemini and GEMINI_API_KEY is set", () => {
    config.aiProvider = AI_PROVIDERS.GEMINI;
    config.geminiApiKey = "test-gemini-key";
    config.geminiModel = "gemini-2.5-flash";

    const provider = createProvider();

    assert.equal(provider.name, AI_PROVIDERS.GEMINI);
    assert.equal(provider.model, "gemini-2.5-flash");
    assert.equal(typeof provider.generateAnalysis, "function");
    // The generation function should be the real Gemini client.
    assert.equal(provider.generateAnalysis, geminiClient.generateAnalysis);
  });

  it("returns an OpenRouter provider when AI_PROVIDER=openrouter and OPENROUTER_API_KEY is set", () => {
    config.aiProvider = AI_PROVIDERS.OPENROUTER;
    config.openRouterApiKey = "test-openrouter-key";
    config.openRouterModel = "google/gemini-2.5-flash";

    const provider = createProvider();

    assert.equal(provider.name, AI_PROVIDERS.OPENROUTER);
    assert.equal(provider.model, "google/gemini-2.5-flash");
    assert.equal(typeof provider.generateAnalysis, "function");
    assert.equal(provider.generateAnalysis, openRouterClient.generateAnalysis);
  });

  it("throws an error when the provider is unknown", () => {
    config.aiProvider = "aws-bedrock";
    config.geminiApiKey = "test-key";
    config.openRouterApiKey = "test-key";

    assert.throws(() => createProvider(), /Unknown AI provider/);
  });

  it("throws an error with AI_PROVIDER=gemini but without GEMINI_API_KEY", () => {
    config.aiProvider = AI_PROVIDERS.GEMINI;
    config.geminiApiKey = undefined;

    assert.throws(() => createProvider(), /GEMINI_API_KEY is not configured/);
  });

  it("throws an error with AI_PROVIDER=openrouter but without OPENROUTER_API_KEY", () => {
    config.aiProvider = AI_PROVIDERS.OPENROUTER;
    config.openRouterApiKey = undefined;

    assert.throws(
      () => createProvider(),
      /OPENROUTER_API_KEY is not configured/,
    );
  });

  it("throws an error with AI_PROVIDER=gemini and empty API key", () => {
    config.aiProvider = AI_PROVIDERS.GEMINI;
    config.geminiApiKey = "";

    assert.throws(() => createProvider(), /GEMINI_API_KEY is not configured/);
  });
});
