import { config } from "../config.js";

/**
 * Optional API key authentication middleware for /api/* routes.
 *
 * It only activates when the API_ACCESS_KEY environment variable is set.
 * When it is not set, the middleware blocks nothing (current behavior),
 * but it is recommended to define it before exposing the server to the
 * Internet, since /api/scrape and /api/analyze consume resources and make
 * paid calls to AI providers.
 *
 * The API key is accepted via the `x-api-key` header or
 * `Authorization: Bearer <key>`.
 *
 * @function requireApiKey
 * @param {import("express").Request} req - Express HTTP request.
 * @param {import("express").Response} res - Express HTTP response.
 * @param {import("express").NextFunction} next - Express next middleware.
 * @returns {void} Calls next() on success or responds 401 on failure.
 * @example
 * // GET /api/models (with API_ACCESS_KEY set)
 * // Headers: { "x-api-key": "my-secret-key" }
 */
export function requireApiKey(req, res, next) {
  if (!config.apiAccessKey) {
    return next();
  }

  const authHeader = req.headers.authorization || "";
  const bearerKey = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  const provided = req.headers["x-api-key"] || bearerKey;

  if (!provided || provided !== config.apiAccessKey) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  next();
}
