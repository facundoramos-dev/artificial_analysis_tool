import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";
import {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_OPENROUTER_MODEL,
  OPENROUTER_BASE_URL,
} from "../../shared/constants.js";

dotenv.config();

/**
 * Unit tests for src/shared/config.js
 *
 * Since `config` is a singleton that reads process.env on import, a fresh instance is loaded per case using a dynamic import with cache-busting.
 * dotenv does not overwrite existing variables, so the order in which test files run does not affect these cases.
 */
describe("config", () => {
  const envKeys = [
    "GEMINI_API_KEY",
    "GEMINI_MODEL",
    "OPENROUTER_API_KEY",
    "OPENROUTER_MODEL",
    "OPENROUTER_BASE_URL",
    "AI_PROVIDER",
    "API_ACCESS_KEY",
    "PORT",
  ];

  function loadFreshConfig() {
    return import(
      `../../shared/config.js?cache=${Date.now()}-${Math.random()}`
    );
  }

  afterEach(() => {
    for (const key of envKeys) {
      delete process.env[key];
    }
  });

  it("applies default values when no environment variables are set", async () => {
    for (const key of envKeys) {
      process.env[key] = "";
    }

    const { config } = await loadFreshConfig();

    assert.equal(config.aiProvider, "gemini");
    assert.equal(config.geminiModel, DEFAULT_GEMINI_MODEL);
    assert.equal(config.openRouterModel, DEFAULT_OPENROUTER_MODEL);
    assert.equal(config.openRouterBaseUrl, OPENROUTER_BASE_URL);
    assert.equal(config.port, 3000);
    assert.equal(config.geminiApiKey, undefined);
    assert.equal(config.openRouterApiKey, undefined);
  });

  it("reads configured environment variables", async () => {
    process.env.GEMINI_API_KEY = "env-gemini-key";
    process.env.GEMINI_MODEL = "gemini-2.5-pro";
    process.env.OPENROUTER_API_KEY = "env-openrouter-key";
    process.env.OPENROUTER_MODEL = "anthropic/claude-sonnet-4";
    process.env.OPENROUTER_BASE_URL = "https://proxy.example.com/v1";
    process.env.AI_PROVIDER = "openrouter";
    process.env.PORT = "4321";

    const { config } = await loadFreshConfig();

    assert.equal(config.geminiApiKey, "env-gemini-key");
    assert.equal(config.geminiModel, "gemini-2.5-pro");
    assert.equal(config.openRouterApiKey, "env-openrouter-key");
    assert.equal(config.openRouterModel, "anthropic/claude-sonnet-4");
    assert.equal(config.openRouterBaseUrl, "https://proxy.example.com/v1");
    assert.equal(config.aiProvider, "openrouter");
    assert.equal(config.port, 4321);
  });

  it("parses PORT as a number", async () => {
    process.env.PORT = "8080";
    const { config } = await loadFreshConfig();
    assert.equal(config.port, 8080);
    assert.equal(typeof config.port, "number");
  });
});
