# AGENTS.md

## Overview

**Artificial Analysis Tool v1.0** is a modular Node.js application that fetches AI models from the OpenCode API, validates them against ArtificialAnalysis.ai, lets the user pick two models, scrapes the comparison page and generates an AI-powered analysis (Google Gemini or OpenRouter). It exposes an interactive CLI and an Express web server with a REST API.

## Running

- **Prerequisites**: Node.js v26 (recommended via `nvm`). Use `nvm use 26` before running any command.
- **Dependencies**: npm dependencies are required. Run `npm install` after cloning (do not skip it; the project uses `express`, `ejs`, `@google/generative-ai`, `openai`, `dotenv`, `express-rate-limit`).
- **Environment**: copy `.env.example` to `.env` and configure at least one AI provider key (`GEMINI_API_KEY` or `OPENROUTER_API_KEY`).

### Commands

```bash
npm install         # install dependencies
npm run cli         # run the full pipeline in CLI mode
npm start           # start the Express web server (default port 3000)
npm test            # run the test suite (node --test, 50 unit tests)
```

Equivalent direct execution:

```bash
nvm use 26 && node src/cli.js
nvm use 26 && node src/server.js
```

## Project Structure

```
src/
├── cli.js                     # CLI entry point (full pipeline)
├── server.js                  # Express entry point (web UI + REST API, security hardening)
├── shared/                    # Cross-cutting concerns
│   ├── config.js              # Centralized environment configuration
│   ├── constants.js           # URLs, defaults and provider identifiers
│   ├── routes.js              # Main router (web routes + /api/* endpoints)
│   ├── helpers/responses.js   # Central JSON error response utility
│   ├── helpers/security.js    # SSRF guards and payload validation
│   └── middlewares/auth.js    # Optional API key middleware for /api/*
├── models/                    # Model pipeline
│   ├── libraries/modelFetcher.js    # Fetches model list from OpenCode
│   ├── libraries/modelValidator.js  # Normalizes and validates model IDs
│   ├── services/modelService.js     # Orchestrates fetch + validate + comparison URL
│   └── controllers/modelController.js # GET /api/models handler
├── scraper/                   # Comparison page scraping
│   ├── libraries/pageScraper.js     # Extracts ModelData from RSC/JSON-LD payloads
│   ├── services/scraperService.js   # Delegates scraping and shapes the result
│   └── controllers/scraperController.js # POST /api/scrape handler
├── analysis/                  # AI analysis
│   ├── libraries/promptBuilder.js   # Builds the Spanish analysis prompt
│   ├── libraries/geminiClient.js    # Google Gemini provider
│   ├── libraries/openRouterClient.js # OpenRouter provider (OpenAI-compatible SDK)
│   ├── libraries/aiProviderFactory.js # Provider selection by config
│   ├── services/analysisService.js  # Orchestrates prompt -> provider -> analysis
│   └── controllers/analysisController.js # POST /api/analyze handler
└── web/                       # Browser UI
    ├── controllers/webController.js # GET / and POST /analyze handlers
    ├── routes/webRoutes.js         # Web routes
    └── views/                      # EJS templates (index.ejs, result.ejs)
```

## Module Responsibilities

- **models**: fetch the model list from `https://opencode.ai/zen/go/v1/models`, normalize and validate each model against ArtificialAnalysis, and build the comparison URL.
- **scraper**: download the ArtificialAnalysis comparison page, extract normalized `ModelData` from the Next.js RSC payload (`self.__next_f.push` chunks) with JSON-LD fallback.
- **analysis**: build the analysis prompt (in Spanish by design), select the configured AI provider (gemini/openrouter) and generate the Markdown analysis.
- **web**: render the EJS UI (`GET /`, `POST /analyze`) and mount the API routes.
- **shared**: configuration, constants, security helpers (SSRF guards, payload validation, optional API key middleware) and the central error response utility.

## Core Mechanics

- **Model Fetching**: Fetches JSON from `https://opencode.ai/zen/go/v1/models` (expects `{ data: [{ id: string }] }`).
- **Normalization & Validation**: Replaces dots `.` with hyphens `-` in model IDs (`model.id.replace(/\./g, "-")`) and validates existence via HTTP 200 response from `https://artificialanalysis.ai/models/${idNormalized}`.
- **Model Selection**: `getValidModels()` returns `validIds`, `allResults` (raw validation results with `originalId`/`normalizedId`/`checkUrl` per model) and a default `comparisonUrl`. The CLI and web UI present the valid models in a table (with per-model AA URLs) and let the user choose exactly **two** models before scraping.
- **URL Generation**: `buildComparisonUrl(validIds)` constructs `https://artificialanalysis.ai/models/comparisons/${validIds[0]}-vs-${validIds[1]}` with query params containing comma-separated valid normalized model IDs (minimum 2 valid models required). The **first two IDs form the URL slug** (the user-selected pair must be sorted first); the full list goes in the `models=` query param so the comparison page shows every available model.

## Interaction Flows

- **CLI** (`src/cli.js`): Prints the valid models with `console.table` (index, model, individual AA URL), prompts the user for two model numbers (`readline/promises`), reorders the selected pair first, then scrapes and analyzes.
- **Web** (`GET /`, `POST /analyze`): `index.ejs` loads the model table client-side via `GET /api/models`, lets the user select exactly two checkboxes, then submits `model1`, `model2` and the repeated `allValidIds[]` hidden fields (urlencoded) to `POST /analyze`. `webController.runAnalysis` rebuilds the comparison URL from that selection and renders `result.ejs`.
- **Tests** (`node:test` + `node:assert`, in `src/__tests__/`): cover model fetching/validation, comparison URL building, RSC page scraping, prompt building, provider selection and analysis service. Run with `npm test` or `node --test src/__tests__/**/*.test.js`.

## Security Notes

- `/api/scrape` and `/api/analyze` validate URLs against SSRF (only `https://artificialanalysis.ai/models/comparisons/...` is allowed) and limit payload size.
- The `/api/*` routes are rate-limited in `server.js` (`/api/analyze` stricter, 20 req/15min, because AI calls are paid).
- Set `API_ACCESS_KEY` in `.env` before exposing the server to the Internet; otherwise `/api/*` routes stay open.
