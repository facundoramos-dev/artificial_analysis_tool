/**
 * Scraper for ArtificialAnalysis pages.
 *
 * The comparison page uses Next.js App Router. The data travels inside
 * `self.__next_f.push([1,"...escaped JSON..."])` chunks. Within them,
 * `initialModels` holds ~80 fields per model. As a fallback, the
 * `<script type="application/ld+json">` blocks are parsed.
 */

import { isValidComparisonUrl } from "../../shared/helpers/security.js";

const NEXT_PUSH_REGEX = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
const LD_JSON_REGEX =
  /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

/**
 * @constant {number} Download timeout in milliseconds to prevent hanging
 * requests (DoS mitigation).
 */
const SCRAPE_TIMEOUT_MS = 15000;

/**
 * Safely navigates an object using a dotted path.
 *
 * @function deepGet
 * @param {object} obj - Object to traverse.
 * @param {string} path - Dot-separated path, e.g. "a.b.c".
 * @returns {*} Value at the path or undefined if it does not exist.
 * @example
 * deepGet({ a: { b: 1 } }, "a.b");
 * // -> 1
 */
function deepGet(obj, path) {
  return path
    .split(".")
    .reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

/**
 * Normalizes a value to a number, or null when it is not a finite number.
 *
 * @function toNumberOrNull
 * @param {*} value - Candidate value.
 * @returns {number|null} Finite number or null.
 * @example
 * toNumberOrNull(42);   // -> 42
 * toNumberOrNull("42"); // -> null
 */
function toNumberOrNull(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Converts a value to a boolean, handling "true"/"false" strings.
 *
 * @function toBoolean
 * @param {*} value - Candidate value.
 * @returns {boolean} Resulting boolean.
 * @example
 * toBoolean("true");  // -> true
 * toBoolean(0);       // -> false
 */
function toBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return Boolean(value);
}

/**
 * Finds the index of the closing bracket that matches the opening bracket at
 * `startIndex`, respecting strings and escape sequences within the text.
 *
 * @function findMatchingBracket
 * @param {string} text - Full text to search in.
 * @param {number} startIndex - Index of the opening character.
 * @param {string} openChar - Opening character ("[" or "{").
 * @param {string} closeChar - Closing character ("]" or "}").
 * @returns {number} Index of the closing bracket or -1 if not found.
 * @example
 * findMatchingBracket('{"a": {"b": 1}}', 1, "{", "}");
 * // -> 15
 */
function findMatchingBracket(text, startIndex, openChar, closeChar) {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === "\\") {
      // Outside a string, a backslash escapes the next character
      // (e.g. \" in doubly-escaped RSC payloads). Skip it.
      i++;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === openChar) {
      depth++;
    } else if (char === closeChar) {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}

/**
 * Decodes a chunk captured by the next_f.push regex. The chunk is the
 * escaped content of a JSON string, so JSON.parse('"' + chunk + '"')
 * returns the real RSC payload text.
 *
 * @function unescapeChunk
 * @param {string} chunk - Raw escaped content.
 * @returns {string} Decoded text.
 * @example
 * unescapeChunk("line\\nbreak");
 * // -> "line\nbreak"
 */
function unescapeChunk(chunk) {
  try {
    return JSON.parse(`"${chunk}"`);
  } catch {
    // Manual fallback if the chunk is not valid JSON.
    return chunk
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\")
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t");
  }
}

/**
 * Extracts and concatenates all `self.__next_f.push` RSC chunks present in
 * the HTML.
 *
 * @function extractNextPayload
 * @param {string} html - Full page HTML.
 * @returns {string} Concatenated and decoded RSC payload.
 * @example
 * const payload = extractNextPayload(html);
 */
function extractNextPayload(html) {
  const chunks = [];
  let match;

  NEXT_PUSH_REGEX.lastIndex = 0;
  while ((match = NEXT_PUSH_REGEX.exec(html)) !== null) {
    chunks.push(unescapeChunk(match[1]));
  }

  return chunks.join("");
}

/**
 * Searches the RSC payload for the given key and extracts the associated
 * balanced JSON value (array or object). Handles doubly-escaped content
 * as a fallback.
 *
 * @function extractJsonValueByKey
 * @param {string} payload - Concatenated RSC payload.
 * @param {string} key - Key to search for, e.g. "initialModels".
 * @returns {*} Parsed JSON value (array/object) or null if not found.
 * @example
 * const models = extractJsonValueByKey(payload, "initialModels");
 */
function extractJsonValueByKey(payload, key) {
  const searchKey = `"${key}"`;
  let searchIndex = 0;
  let lastParsed = null;

  while (searchIndex < payload.length) {
    const keyIndex = payload.indexOf(searchKey, searchIndex);
    if (keyIndex === -1) break;

    const colonIndex = payload.indexOf(":", keyIndex + searchKey.length);
    if (colonIndex === -1) break;

    const valueStart = payload.indexOf("[", colonIndex);
    const objectStart = payload.indexOf("{", colonIndex);
    const startIndex =
      objectStart !== -1 && (valueStart === -1 || objectStart < valueStart)
        ? objectStart
        : valueStart;
    if (startIndex === -1) break;

    const openChar = payload[startIndex];
    const closeChar = openChar === "[" ? "]" : "}";
    const valueEnd = findMatchingBracket(
      payload,
      startIndex,
      openChar,
      closeChar,
    );
    if (valueEnd === -1) break;

    const rawJson = payload.slice(startIndex, valueEnd + 1);

    try {
      lastParsed = JSON.parse(rawJson);
    } catch {
      // Fallbacks for doubly-escaped data inside the payload.
      try {
        const unescaped = unescapeChunk(rawJson);
        lastParsed = JSON.parse(unescaped);
      } catch {
        lastParsed = null;
      }
    }

    if (lastParsed != null) {
      return lastParsed;
    }

    searchIndex = startIndex + 1;
  }

  return lastParsed;
}

/**
 * Extracts the model array from the RSC payload. Tries "initialModels"
 * (array) first, then "initialModelsBySlug" (keyed object converted to an
 * array with Object.values).
 *
 * @function extractInitialModels
 * @param {string} payload - Concatenated RSC payload.
 * @returns {Array<object>} Raw models found.
 * @example
 * const rawModels = extractInitialModels(payload);
 */
function extractInitialModels(payload) {
  const initialModels = extractJsonValueByKey(payload, "initialModels");
  if (Array.isArray(initialModels)) return initialModels;

  const bySlug = extractJsonValueByKey(payload, "initialModelsBySlug");
  if (Array.isArray(bySlug)) return bySlug;
  if (bySlug && typeof bySlug === "object") {
    return Object.values(bySlug);
  }

  return [];
}

/**
 * Traverses a JSON-LD node and collects objects that look like model entries.
 *
 * @function findModelCandidates
 * @param {*} node - Node to traverse.
 * @param {Array<object>} out - Accumulator of candidates.
 * @returns {Array<object>} Candidates found.
 * @example
 * const candidates = findModelCandidates(parsedLdJson);
 */
function findModelCandidates(node, out = []) {
  if (node == null) return out;

  if (Array.isArray(node)) {
    node.forEach((item) => findModelCandidates(item, out));
    return out;
  }

  if (typeof node === "object") {
    const looksLikeModel =
      typeof node.name === "string" &&
      (node.intelligenceIndex != null ||
        node.price1mInputTokens != null ||
        node.contextWindowTokens != null ||
        (typeof node.url === "string" && node.url.includes("/models/")));

    if (looksLikeModel) {
      out.push(node);
    }

    for (const value of Object.values(node)) {
      findModelCandidates(value, out);
    }
  }

  return out;
}

/**
 * FALLBACK: extracts models from the `<script type="application/ld+json">`
 * blocks.
 *
 * @function extractFromLdJson
 * @param {string} html - Full page HTML.
 * @returns {Array<object>} Raw models found.
 * @example
 * const rawModels = extractFromLdJson(html);
 */
function extractFromLdJson(html) {
  const models = [];
  let match;

  LD_JSON_REGEX.lastIndex = 0;
  while ((match = LD_JSON_REGEX.exec(html)) !== null) {
    let parsed;
    try {
      parsed = JSON.parse(match[1]);
    } catch {
      continue;
    }

    const candidates = findModelCandidates(parsed);
    for (const candidate of candidates) {
      // Keep the raw candidate objects; the caller maps them to ModelData
      // exactly once, together with the RSC candidates.
      if (candidate && typeof candidate.name === "string") {
        models.push(candidate);
      }
    }
  }

  return models;
}

/**
 * Maps a raw ArtificialAnalysis object to the normalized ModelData structure
 * consumed by the rest of the application.
 *
 * @function extractModelData
 * @param {object} raw - Raw model object (RSC or JSON-LD).
 * @returns {object} ModelData with all normalized fields.
 * @example
 * const model = extractModelData(rawModel);
 */
function extractModelData(raw) {
  return {
    name: raw.name || raw.shortName || null,
    creator: raw.creator?.name || raw.creator || null,
    releaseDate: raw.releaseDate || null,
    intelligenceIndex: toNumberOrNull(deepGet(raw, "intelligenceIndex")),
    codingIndex: toNumberOrNull(deepGet(raw, "codingIndex")),
    agenticIndex: toNumberOrNull(deepGet(raw, "agenticIndex")),
    pricePer1MInput: toNumberOrNull(deepGet(raw, "price1mInputTokens")),
    pricePer1MOutput: toNumberOrNull(deepGet(raw, "price1mOutputTokens")),
    cacheHitPrice: toNumberOrNull(deepGet(raw, "cacheHitPrice")),
    contextWindowTokens: toNumberOrNull(deepGet(raw, "contextWindowTokens")),
    outputSpeed: toNumberOrNull(
      deepGet(raw, "timescaleData.medianOutputSpeed"),
    ),
    timeToFirstToken: toNumberOrNull(
      deepGet(raw, "timeToFirstAnswerToken.total"),
    ),
    endToEndResponseTime: toNumberOrNull(
      deepGet(raw, "endToEndResponseTime.total"),
    ),
    totalParams: toNumberOrNull(deepGet(raw, "parameters")),
    activeParams: toNumberOrNull(
      deepGet(raw, "inferenceParametersActiveBillions"),
    ),
    isReasoning: toBoolean(deepGet(raw, "isReasoning")),
    supportsImages:
      toBoolean(deepGet(raw, "inputModalityImage")) ||
      toBoolean(deepGet(raw, "supportsImages")),
    benchmarks: {
      gdpval: toNumberOrNull(deepGet(raw, "gdpval")),
      gpqa: toNumberOrNull(deepGet(raw, "gpqa")),
      hle: toNumberOrNull(deepGet(raw, "hle")),
      scicode: toNumberOrNull(deepGet(raw, "scicode")),
      tauBanking: toNumberOrNull(deepGet(raw, "tauBanking")),
      terminalbenchV21: toNumberOrNull(deepGet(raw, "terminalbenchV21")),
      critpt: toNumberOrNull(deepGet(raw, "critpt")),
      omniscience: toNumberOrNull(deepGet(raw, "omniscience")),
      briefcaseElo: toNumberOrNull(
        deepGet(raw, "briefcaseBreakdown.overall.elo"),
      ),
    },
    costPerTask: toNumberOrNull(deepGet(raw, "intelligenceIndexCostPerTask")),
  };
}

/**
 * Entry point of the scraper: downloads the page, extracts the models from
 * the Next.js RSC payload and, if none are found, uses the JSON-LD blocks
 * as a fallback.
 *
 * @async
 * @function scrape
 * @param {string} url - ArtificialAnalysis comparison URL to scrape.
 * @returns {Promise<{models: Array<object>, sourceUrl: string, extractionSource: string}>}
 * Promise that resolves with the normalized models and extraction metadata.
 * @throws {Error} If the download fails, the response is not HTTP 200, or no
 * model data can be extracted from the page.
 * @example
 * const { models, extractionSource } = await scrape("https://artificialanalysis.ai/models/comparisons/a-vs-b");
 */
export async function scrape(url) {
  // Defense in depth against SSRF: never fetch from non-allowed hosts,
  // even if a future controller forgets to validate the URL.
  if (!isValidComparisonUrl(url)) {
    throw new Error(
      "Invalid URL: only https comparison URLs on artificialanalysis.ai are allowed.",
    );
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(SCRAPE_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(
      `Scrape request error: ${response.status} ${response.statusText}`,
    );
  }

  const html = await response.text();
  const payload = extractNextPayload(html);

  let rawModels = [];
  let extractionSource = "ldjson";

  if (payload) {
    rawModels = extractInitialModels(payload);
    if (rawModels.length > 0) {
      extractionSource = "rsc";
    }
  }

  if (rawModels.length === 0) {
    rawModels = extractFromLdJson(html);
  }

  const models = rawModels.map(extractModelData).filter((model) => model.name);

  if (models.length === 0) {
    throw new Error(`No model data found on the page: ${url}`);
  }

  return { models, sourceUrl: url, extractionSource };
}
