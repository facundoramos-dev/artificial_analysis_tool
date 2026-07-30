async function verifyAndGenerateUrlComparison() {
  const urlOrigen = "https://opencode.ai/zen/go/v1/models";

  try {
    console.log("Fetching model list from OpenCode...\n");

    const response = await fetch(urlOrigen);
    if (!response.ok) {
      throw new Error(`Request error: ${response.status}`);
    }

    const json = await response.json();
    if (!json.data || !Array.isArray(json.data)) {
      throw new Error("Unexpected JSON format.");
    }

    console.log(
      `Found ${json.data.length} models. Normalizing and validating...\n`,
    );

    // Array of promises for validate all models in parallel
    const validations = json.data.map(async (model) => {
      const originalId = model.id;
      // Normalize: replace all dots with dashes
      const idNormalized = originalId.replace(/\./g, "-");
      const checkUrl = `https://artificialanalysis.ai/models/${idNormalized}`;

      try {
        // Validate that the route exists and returns a 200 OK
        const checkResponse = await fetch(checkUrl);

        if (checkResponse.status === 200) {
          return {
            check: "✅",
            modelID: originalId,
            urlGenerated: checkUrl,
            idNormalized: idNormalized,
            isValid: true,
          };
        } else {
          return {
            check: "❌",
            modelID: originalId,
            urlGenerated: checkUrl,
            idNormalized: null,
            isValid: false,
          };
        }
      } catch (error) {
        return {
          check: "⚠️",
          modelID: originalId,
          urlGenerated: checkUrl,
          idNormalized: null,
          isValid: false,
        };
      }
    });

    // Wait for all validations to finish
    const results = await Promise.allSettled(validations);

    // Format and print the table in console
    const tableData = results
      .map((res) => {
        if (res.status !== "fulfilled") return;

        const data = res.value;
        return {
          check: data.check,
          modelID: data.modelID,
          urlGenerated: data.urlGenerated,
        };
      })
      .filter((res) => res);

    console.table(tableData);

    // Filter only the normalized IDs of the models that passed the validation
    const modelIdsValid = results
      .filter((res) => res.status === "fulfilled" && res.value?.isValid)
      .map((res) => res.value.idNormalized);

    if (modelIdsValid.length < 2) {
      console.log(
        "\nNot enough valid models (minimum 2) to generate comparison.",
      );
      return;
    }

    // Construct the Artificial Analysis URL with valid IDs
    const basePath = `${modelIdsValid[0]}-vs-${modelIdsValid[1]}`;

    const queryParams = new URLSearchParams({
      intelligence: "artificial-analysis-intelligence-index",
      "intelligence-comparison": "intelligence-vs-end-to-end-response-time",
      "intelligence-index-token-use": "intelligence-vs-token-use",
      pricing: "input-output-pricing",
      "context-window": "intelligence-vs-context-window",
      speed: "latency-vs-output-speed",
      "agentic-speed": "cost-vs-time-per-task",
      latency: "latency-over-time",
      "model-size": "intelligence-vs-total-parameters",
      models: modelIdsValid.join(","),
    });

    const finalUrl = `https://artificialanalysis.ai/models/comparisons/${basePath}?${queryParams.toString()}`;

    console.log("\n=== GENERATED COMPARISON URL ===\n");
    console.log(finalUrl);
    console.log(
      `\nTotal models included: ${modelIdsValid.length} out of ${json.data.length} original models.`,
    );
  } catch (error) {
    console.error("An error occurred during execution:", error.message);
  }
}

verifyAndGenerateUrlComparison();
