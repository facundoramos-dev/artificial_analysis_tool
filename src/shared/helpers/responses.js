/**
 * Sends a JSON error response and logs the error to the console.
 * Central utility used by all controllers for error handling.
 *
 * The HTTP status is sanitized to a valid 4xx/5xx range (defaulting to 500).
 * For 5xx responses, internal details are never leaked to the client; only
 * a generic message is returned.
 *
 * @function errorResponse
 * @param {import("express").Response} res - Express HTTP response.
 * @param {Error} error - Error caught in the try/catch block.
 * @param {number} [status=error.status || 500] - HTTP status code to return.
 * @returns {import("express").Response} The HTTP response that was sent.
 * @example
 * try {
 *   // ...
 * } catch (error) {
 *   errorResponse(res, error);
 * }
 */
export function errorResponse(res, error, status = error.status || 500) {
  const safeStatus =
    Number.isInteger(status) && status >= 400 && status < 600 ? status : 500;

  // The full detail (including stack trace) is only logged on the server.
  console.error("[error]", error);

  // Never leak internal details to the client on 5xx errors.
  const message =
    safeStatus >= 500
      ? "Internal server error."
      : error.message || "Bad Request";

  return res.status(safeStatus).json({ error: message });
}
