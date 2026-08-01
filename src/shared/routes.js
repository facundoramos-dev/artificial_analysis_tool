import { Router } from "express";
import webRoutes from "../web/routes/webRoutes.js";
import { requireApiKey } from "../shared/middlewares/auth.js";
import { getModels } from "../models/controllers/modelController.js";
import { scrapeUrl } from "../scraper/controllers/scraperController.js";
import { analyzeModels } from "../analysis/controllers/analysisController.js";

/**
 * Main application router.
 *
 * Mounts the web routes and exposes the REST API endpoints:
 * - GET  /api/models  -> fetch and validate models from OpenCode.
 * - POST /api/scrape  -> scrape a comparison page.
 * - POST /api/analyze -> analyze model data with an AI provider.
 *
 * @type {import("express").Router}
 */
const router = Router();

router.use("/", webRoutes);
router.get("/api/models", requireApiKey, getModels);
router.post("/api/scrape", requireApiKey, scrapeUrl);
router.post("/api/analyze", requireApiKey, analyzeModels);

export default router;
