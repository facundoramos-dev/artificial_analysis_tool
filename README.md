# Artificial Analysis Tool

## Purpose

This command‑line utility fetches a list of AI models from the OpenCode API, validates each model URL, and generates a comparison URL on **ArtificialAnalysis.ai** that includes the valid models. It prints a table of the validation results and outputs the generated comparison URL.

## Prerequisites

- **Node.js** (v18 or later, which includes the native `fetch` API)
- Internet connection to reach the OpenCode and ArtificialAnalysis services.

## Installation

Clone the repository (or copy the files) and ensure you are in the project directory:

```bash
git clone <repository‑url>
cd artificial_analysis_tool
```

No additional dependencies are required.

## Running the Tool

Execute the script with Node:

```bash
node tool.js
```

The script will:

1. Retrieve the model list.
2. Validate each model's URL.
3. Display a table of results.
4. Output a generated comparison URL for the valid models.

## Output Example

```
Fetching model list from OpenCode...
Found 23 models. Normalizing and validating...
┌─────────┬───────┬─────────────────────┬──────────────────────────────────────────────────────────┐
│ (index) │ check │       modelID       │                       urlGenerated                       │
├─────────┼───────┼─────────────────────┼──────────────────────────────────────────────────────────┤
│    0    │ '✅'  │    'minimax-m3'     │    'https://artificialanalysis.ai/models/minimax-m3'     │
…
=== GENERATED COMPARISON URL ===
https://artificialanalysis.ai/models/comparisons/…

Total models included: 21 out of 23 original models.
```

Feel free to modify the script to change the source API or customize the generated URL.
