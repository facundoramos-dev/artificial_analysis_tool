# Artificial Analysis Tool

AI-powered comparison analyzer for LLM models. Fetches the list of AI models from the OpenCode API, validates each model against **ArtificialAnalysis.ai**, scrapes the generated comparison page and produces a detailed AI analysis (intelligence, pricing, benchmarks, speed and recommended use cases).

## Purpose

This tool automates the full workflow of comparing AI models:

1. **Fetch & validate** the model list from the OpenCode API and verify each model exists on ArtificialAnalysis.ai.
2. **Generate** a comparison URL on ArtificialAnalysis.ai that includes all valid models.
3. **Scrape** the comparison page to extract normalized metrics (ModelData) per model.
4. **Analyze** the data with an AI provider (Google Gemini or OpenRouter) and return a detailed Markdown report in Spanish.

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
│   └── web/                    # Web UI controllers and routes (EJS views)
├── .env.example                # Environment variable template
├── package.json
└── AGENTS.md                   # Developer guide (architecture, commands, modules)
```

## Usage

### CLI mode

Runs the full pipeline (fetch -> validate -> scrape -> analyze) and prints the AI analysis to the console:

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

Then open <http://localhost:3000> to run the analysis from the UI.

## API endpoints

| Method | Endpoint       | Description                                                                                             |
| ------ | -------------- | ------------------------------------------------------------------------------------------------------- |
| `GET`  | `/api/models`  | Returns the validated models and the generated comparison URL.                                          |
| `POST` | `/api/scrape`  | Scrapes a comparison URL. Body: `{ "url": "https://artificialanalysis.ai/models/comparisons/a-vs-b" }`. |
| `POST` | `/api/analyze` | Analyzes model data with AI. Body: either `{ "models": [...] }` or `{ "url": "..." }` (scraped first).  |

If `API_ACCESS_KEY` is set, all `/api/*` endpoints require it via the `x-api-key` header or `Authorization: Bearer <key>`.

## Output example (CLI)

```
🔍 Fetching models from OpenCode...
✅ 21 valid models found.

🔗 Comparison URL: https://artificialanalysis.ai/models/comparisons/...

📊 Scraping comparison page...
✅ Extracted data for 21 models.

🤖 Analyzing with AI...
<detailed Markdown analysis>
```

## For developers

See [AGENTS.md](./AGENTS.md) for the architecture, module responsibilities, dependencies and commands.

## Tests

```bash
npm test
```

> No automated tests are configured yet; the command is a placeholder.
