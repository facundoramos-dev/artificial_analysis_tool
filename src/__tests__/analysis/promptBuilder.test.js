import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { build as buildPrompt } from "../../analysis/libraries/promptBuilder.js";

/**
 * Unit tests for src/analysis/libraries/promptBuilder.js
 */

const sampleModels = [
  {
    name: "Modelo Alpha",
    creator: "Creador A",
    intelligenceIndex: 80.5,
    pricePer1MInput: 1.25,
    pricePer1MOutput: 5.0,
    contextWindowTokens: 200000,
    outputSpeed: 100.5,
    costPerTask: 0.02,
    isReasoning: true,
    benchmarks: { gpqa: 0.81, hle: 0.45, scicode: 0.76 },
  },
  {
    name: "Modelo Beta",
    creator: "Creador B",
    intelligenceIndex: 70.0,
    pricePer1MInput: 0.5,
    pricePer1MOutput: 1.5,
    contextWindowTokens: 128000,
    outputSpeed: 200.0,
    costPerTask: 0.005,
    isReasoning: false,
    benchmarks: { gpqa: 0.6, hle: 0.2, scicode: 0.5 },
  },
];

describe("promptBuilder.build", () => {
  it("retorna un string que contiene los nombres de los modelos", () => {
    const prompt = buildPrompt(sampleModels);

    assert.equal(typeof prompt, "string");
    assert.ok(prompt.includes("Modelo Alpha"));
    assert.ok(prompt.includes("Modelo Beta"));
  });

  it("incluye secciones de inteligencia, precio, casos de uso y benchmarks", () => {
    const prompt = buildPrompt(sampleModels);

    assert.match(prompt, /inteligencia/i);
    assert.match(prompt, /precios/i);
    assert.match(prompt, /casos de uso/i);
    assert.match(prompt, /benchmarks/i);
  });

  it("incluye la tabla comparativa Markdown con los datos de los modelos", () => {
    const prompt = buildPrompt(sampleModels);

    assert.match(prompt, /\| Modelo \| Creador \| Intelligence \|/);
    assert.match(prompt, /\| Modelo Alpha \|/);
    assert.match(prompt, /\| Modelo Beta \|/);
    assert.match(prompt, /\| 80\.50 \|/);
  });

  it("incluye el volcado JSON completo de los modelos", () => {
    const prompt = buildPrompt(sampleModels);

    assert.match(prompt, /```json/);
    assert.ok(prompt.includes('"name":"Modelo Alpha"'));
    assert.ok(prompt.includes('"benchmarks"'));
  });

  it("está en español", () => {
    const prompt = buildPrompt(sampleModels);

    assert.match(prompt, /Eres un analista experto/);
    assert.match(prompt, /EN ESPAÑOL/);
    assert.match(prompt, /Responde SIEMPRE en español/);
    assert.match(prompt, /Análisis de inteligencia/);
  });

  it("lanza error cuando no recibe modelos", () => {
    assert.throws(() => buildPrompt([]), /no models/i);
  });

  it("lanza error cuando recibe un valor no-array", () => {
    assert.throws(() => buildPrompt(null), /no models/i);
    assert.throws(() => buildPrompt(undefined), /no models/i);
  });
});
