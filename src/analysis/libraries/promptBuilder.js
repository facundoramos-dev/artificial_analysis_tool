/**
 * Builds the analysis prompt sent to the AI provider.
 *
 * The prompt is written in Spanish by design, because the product requires
 * the AI to respond in Spanish. It includes a full JSON dump of the models,
 * a comparative table and the analysis instructions (intelligence, pricing,
 * use cases and benchmarks). The requested output format is Markdown with
 * tables.
 */

/**
 * Formats a number for human-readable display.
 *
 * @function formatNumber
 * @param {number|null} value - Numeric value.
 * @param {number} [decimals=2] - Number of decimals to display.
 * @returns {string} "—" when null, otherwise the formatted number.
 * @example
 * formatNumber(1234.567);   // -> "1234.57"
 * formatNumber(null);       // -> "—"
 */
function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined) return "—";
  return Number(value).toFixed(decimals);
}

/**
 * Builds a row of the comparative Markdown table for a model.
 *
 * @function buildTableRow
 * @param {object} model - ModelData of the model.
 * @returns {string} Markdown row (| name | ... |).
 * @example
 * buildTableRow(modelData);
 * // -> "| gpt-5 | OpenAI | 85.00 | ... |"
 */
function buildTableRow(model) {
  const fields = [
    model.name,
    model.creator,
    formatNumber(model.intelligenceIndex),
    formatNumber(model.pricePer1MInput),
    formatNumber(model.pricePer1MOutput),
    formatNumber(model.contextWindowTokens, 0),
    formatNumber(model.outputSpeed, 0),
    formatNumber(model.costPerTask),
    model.isReasoning ? "Sí" : "No",
  ];
  return `| ${fields.join(" | ")} |`;
}

/**
 * Builds the main comparative table in Markdown.
 *
 * @function buildComparisonTable
 * @param {Array<object>} models - List of ModelData.
 * @returns {string} Complete Markdown table.
 * @example
 * const table = buildComparisonTable(models);
 */
function buildComparisonTable(models) {
  const header =
    "| Modelo | Creador | Intelligence | Precio input | Precio output | Contexto (tokens) | Velocidad (tok/s) | Costo/tarea | Reasoning |";
  const separator = "|---|---|---|---|---|---|---|---|---|";
  const rows = models.map(buildTableRow);
  return [header, separator, ...rows].join("\n");
}

/**
 * Serializes the complete model data as compact JSON so the AI has access
 * to every field, including benchmarks.
 *
 * @function buildModelsDump
 * @param {Array<object>} models - List of ModelData.
 * @returns {string} JSON with minimal indentation.
 * @example
 * const dump = buildModelsDump(models);
 */
function buildModelsDump(models) {
  return JSON.stringify(models, null, 0);
}

/**
 * Builds the complete analysis prompt in Spanish.
 *
 * @function build
 * @param {Array<object>} models - List of normalized ModelData.
 * @returns {string} Prompt ready to be sent to the AI provider.
 * @throws {Error} If the models array is empty.
 * @example
 * const prompt = build(models);
 */
export function build(models) {
  if (!Array.isArray(models) || models.length === 0) {
    throw new Error("No models provided to build the analysis prompt.");
  }

  const table = buildComparisonTable(models);
  const dump = buildModelsDump(models);

  return `
Eres un analista experto en inteligencia artificial y evaluación de modelos de lenguaje (LLM). Recibes datos estructurados extraídos de ArtificialAnalysis.ai para varios modelos. Tu tarea es generar un análisis comparativo detallado EN ESPAÑOL, en formato Markdown, que ayude a un equipo técnico a decidir qué modelo usar.

# DATOS DE LOS MODELOS

Datos completos en JSON:

\`\`\`json
${dump}
\`\`\`

Tabla comparativa resumida:

${table}

# INSTRUCCIONES DE ANÁLISIS

Estructura tu respuesta con las siguientes secciones:

## 1. Resumen ejecutivo
Una introducción de 2-3 párrafos que explique la comparación, el contexto del mercado y la recomendación general con el mejor modelo según el caso.

## 2. Análisis de inteligencia
- Analiza el AI Intelligence Index de cada modelo y ordénalos de mayor a menor.
- Desglosa los benchmarks individuales (GPQA, HLE, SciCode, gdpval, terminalbench, tauBanking, critpt, omniscience, briefcase ELO) y explica qué mide cada uno.
- Identifica fortalezas y debilidades: por ejemplo, un modelo con alto codingIndex pero menor GPQA puede ser mejor para programación que para investigación científica.
- Incluye una tabla de benchmarks por modelo.

## 3. Análisis de precios
- Compara precio por 1M tokens de input y de output, y el costo por tarea (costPerTask).
- Explica la relación costo-inteligencia: ¿cuál ofrece el mejor valor por dólar?
- Menciona cache hit price si está disponible.
- Incluye una tabla de precios por modelo.

## 4. Rendimiento y velocidad
- Analiza velocidad de output (tokens/seg), tiempo al primer token y tiempo de respuesta end-to-end.
- Relaciona la velocidad con el contexto y el tamaño del modelo (parámetros totales y activos).
- Indica si el modelo soporta imágenes o es de razonamiento (reasoning).

## 5. Casos de uso recomendados
Según los benchmarks y métricas, recomienda para cada modelo los casos de uso ideales:
- **Desarrollo de software**: codingIndex, SciCode, terminalbench.
- **Agentes y automatización**: tauBanking, terminalbench, briefcase ELO, agenticIndex.
- **Investigación científica**: GPQA, HLE, gdpval.
- **Asistencia general / uso interactivo**: velocidad, latencia, precio.

## 6. Tabla final de recomendaciones
Cierra con una tabla que resuma: Modelo | Mejor para | Precio aprox | Veredicto.

# REGLAS DE FORMATO
- Responde SIEMPRE en español.
- Usa Markdown con tablas (| columna | columna |) y encabezados con #.
- Usa valores numéricos exactos de los datos provistos; si un dato falta, indícalo con "no disponible".
- Sé crítico y objetivo; no inventes datos que no estén en la entrada.
`.trim();
}
