# Artificial Analysis Tool

AI-powered comparison analyzer for LLM models. Fetches the list of AI models from the OpenCode API, validates each model against **ArtificialAnalysis.ai**, lets the user pick two models and produces a detailed AI analysis (intelligence, pricing, benchmarks, speed and recommended use cases).

## Purpose

This tool automates the full workflow of comparing AI models:

1. **Fetch & validate** the model list from the OpenCode API and verify each model exists on ArtificialAnalysis.ai.
2. **Select** two models from the list (each shown with its individual ArtificialAnalysis URL).
3. **Generate** a comparison URL on ArtificialAnalysis.ai whose slug highlights the selected pair while including every valid model.
4. **Scrape** the comparison page to extract normalized metrics (ModelData) per model.
5. **Analyze** the data with an AI provider (Google Gemini or OpenRouter) and return a detailed Markdown report in Spanish.

## Prerequisites

- **Node.js v26** (recommended via `nvm`; the project uses global `fetch` and modern ESM).
- An API key for at least one AI provider: **Google Gemini** (`GEMINI_API_KEY`) or **OpenRouter** (`OPENROUTER_API_KEY`).
- Internet connection to reach the OpenCode, ArtificialAnalysis and AI provider services.

## Installation

```bash
git clone <repository-url>
cd artificial_analysis_tool
nvm use 26
npm install
```

### Environment configuration

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

Available variables (see `.env.example` for defaults):

| Variable              | Description                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `AI_PROVIDER`         | AI provider to use: `gemini` or `openrouter`.                                                                                   |
| `GEMINI_API_KEY`      | Google Gemini API key (required when `AI_PROVIDER=gemini`).                                                                     |
| `GEMINI_MODEL`        | Gemini model identifier (default `gemini-2.5-flash`).                                                                           |
| `OPENROUTER_API_KEY`  | OpenRouter API key (required when `AI_PROVIDER=openrouter`).                                                                    |
| `OPENROUTER_MODEL`    | OpenRouter model identifier (default `google/gemini-2.5-flash`).                                                                |
| `OPENROUTER_BASE_URL` | OpenRouter base URL (default `https://openrouter.ai/api/v1`).                                                                   |
| `PORT`                | Web server port (default `3000`).                                                                                               |
| `API_ACCESS_KEY`      | Optional key that protects `/api/*` routes (via `x-api-key` header or `Authorization: Bearer <key>`). Leave empty on localhost. |

## Project structure

```
artificial_analysis_tool/
├── src/
│   ├── cli.js                  # CLI entry point
│   ├── server.js               # Express web server entry point
│   ├── shared/                 # Shared config, constants, routes, helpers and middlewares
│   ├── models/                 # Model fetching, validation and comparison URL generation
│   ├── scraper/                # Comparison page scraping and data normalization
│   ├── analysis/               # AI prompt building and provider integration (Gemini/OpenRouter)
│   ├── web/                    # Web UI controllers and routes (EJS views)
│   └── __tests__/              # Unit test suite (node:test)
├── .env.example                # Environment variable template
├── package.json
└── AGENTS.md                   # Developer guide (architecture, commands, modules)
```

## Usage

### CLI mode

Runs the full pipeline (fetch -> select -> scrape -> analyze). The valid models are shown in a table with their individual URLs, then you pick two for the comparison:

```bash
npm run cli
# or
nvm use 26 && node src/cli.js
```

### Web mode

Starts the Express server with a browser UI and a REST API:

```bash
npm start
# or
nvm use 26 && node src/server.js
```

Then open <http://localhost:3000>. Click **Load Models** to see the model table, select exactly two models, and click **Analyze Selected Models**.

## API endpoints

| Method | Endpoint       | Description                                                                                             |
| ------ | -------------- | ------------------------------------------------------------------------------------------------------- |
| `GET`  | `/api/models`  | Returns the validated models (`validIds`, `allResults`, default `comparisonUrl`).                       |
| `POST` | `/api/scrape`  | Scrapes a comparison URL. Body: `{ "url": "https://artificialanalysis.ai/models/comparisons/a-vs-b" }`. |
| `POST` | `/api/analyze` | Analyzes model data with AI. Body: either `{ "models": [...] }` or `{ "url": "..." }` (scraped first).  |

If `API_ACCESS_KEY` is set, all `/api/*` endpoints require it via the `x-api-key` header or `Authorization: Bearer <key>`.

## Output example (CLI)

```
🔍 Fetching models from OpenCode...
✅ 22 valid models found.

┌─────┬─────────────────────────┬──────────────────────────────────────────────────┐
│  #  │          Model          │                       URL                        │
├─────┼─────────────────────────┼──────────────────────────────────────────────────┤
│  1  │      'minimax-m3'       │   'https://artificialanalysis.ai/models/...'     │
│  2  │     'minimax-m2.7'      │   'https://artificialanalysis.ai/models/...'     │
│ ... │                         │                                                  │
│ 22  │       'grok-4.5'        │   'https://artificialanalysis.ai/models/...'     │
└─────┴─────────────────────────┴──────────────────────────────────────────────────┘

Select the first model for comparison (1-22): 3
Select the second model for comparison (1-22): 10

🔗 Comparison URL: https://artificialanalysis.ai/models/comparisons/minimax-m2-5-vs-glm-5?...

📊 Scraping comparison page...
✅ Extracted data for 2 models.

🤖 Analyzing with AI...
<detailed Markdown analysis>
```

## For developers

See [AGENTS.md](./AGENTS.md) for the architecture, module responsibilities, dependencies and commands.

## Tests

The project includes 50 unit tests (Node.js built-in test runner, `node:test` + `node:assert`) covering model fetching/validation, comparison URL building, RSC page scraping, prompt building, provider selection and the analysis service:

```bash
npm test
```
