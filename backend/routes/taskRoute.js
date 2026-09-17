import express from "express";
import { getTasks, createTask, updateTask, deleteTask } from "../controllers/taskController.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";

const router = express.Router();

router.post("/create", isAuthenticated, createTask);

router.get("/get-tasks", isAuthenticated, getTasks);

router.put("/update-task/:id", isAuthenticated, updateTask);

router.delete("/delete-task/:id", isAuthenticated, deleteTask);

export default router;