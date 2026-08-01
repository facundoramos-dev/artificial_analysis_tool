/**
 * Web server entry point.
 *
 * Boots the Express application with the EJS view engine and the global
 * router (web UI + REST API), then starts listening on the configured port.
 *
 * The server applies security hardening:
 * - `X-Powered-By` header disabled.
 * - Security headers (nosniff, X-Frame-Options, Referrer-Policy, CSP).
 * - Body size limits to prevent abusive payloads.
 * - Rate limiting on the /api routes (AI calls are paid).
 * - Central error handler that never exposes stack traces.
 *
 * @example
 * // node src/server.js
 * // Server running at http://localhost:3000
 */
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";
import { config } from "./shared/config.js";
import routes from "./shared/routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.disable("x-powered-by");
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "web", "views"));

// Security headers (lightweight alternative to helmet).
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; script-src 'self' 'unsafe-inline'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  );
  next();
});

// Body size limits to prevent abusive payloads.
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// Rate limiting: mitigates DoS and cost abuse (AI calls are paid).
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many analysis requests. Please try again later." },
});

app.use("/api/models", apiLimiter);
app.use("/api/scrape", apiLimiter);
app.use("/api/analyze", aiLimiter);

app.use(routes);

// Central error handler: never expose stack traces to the client.
app.use((err, req, res, next) => {
  console.error("[server]", err);
  res.status(500).json({ error: "Internal server error." });
});

app.listen(config.port, () => {
  console.log(`Server running at http://localhost:${config.port}`);
});
