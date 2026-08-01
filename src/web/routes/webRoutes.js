import { Router } from "express";
import { showIndex, runAnalysis } from "../controllers/webController.js";

/**
 * Web routes for the browser UI.
 *
 * Exposes:
 * - GET  /         -> renders the main page (index.ejs).
 * - POST /analyze  -> runs the full analysis pipeline and renders result.ejs.
 *
 * @type {import("express").Router}
 */
const router = Router();

router.get("/", showIndex);
router.post("/analyze", runAnalysis);

export default router;
