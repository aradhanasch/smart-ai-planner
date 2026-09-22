import express from "express";
import { createPlan, getPlan, markMissed, markCompleted } from "../controllers/studySessionController.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { getAnalytics } from "../controllers/studySessionController.js";

const router = express.Router();

/**
 * - POST /api/planner/create
 * - Generate a new adaptive study plan
 */
router.post("/create", isAuthenticated, createPlan);

router.get("/analytics", isAuthenticated, getAnalytics);
/**
 * - GET /api/planner/:planId
 * - Get all sessions for a plan
 */
router.get("/:planId", isAuthenticated, getPlan);

/**
 * - POST /api/planner/mark-missed
 * - Mark a session missed and trigger redistribution
 */
router.post("/mark-missed", isAuthenticated, markMissed);

/**
 * - POST /api/planner/mark-completed
 * - Mark a session completed
 */
router.post("/mark-completed", isAuthenticated, markCompleted);


export default router;
