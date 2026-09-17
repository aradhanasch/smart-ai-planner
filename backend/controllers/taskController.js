import Task from '../models/taskModel.js';
import asyncHandler from "../middlewares/asyncHandler.js";
import AppError from "../utils/AppError.js";

//creates a new task for currently logged-in user
export const createTask = asyncHandler(async (req, res) => {
    const { title, description, dueDate, priority = "medium", completed = false } = req.body; //pulls fields sent from frontend

    if(!title) throw new AppError("Title is required", 400);

    const task = await Task.create({ // insert a new document
      userId: req.userId, // always use the one set in the auth middleware, not from req.body
      title,
      description,
      dueDate,
      priority,
      completed
    });
    res.json( {success: true, task} ); //send the created task back so frontend can update the UI
});

//fetches all tasks belonging to current logged-in user only
export const getTasks = asyncHandler(async (req, res) => {
    const tasks = await Task.find({userId: req.userId})
      .sort( {dueDate: 1 }); //shows nearest due date first, 1- ascending
    res.json({ success: true, tasks });
});


//updates a task belonging to the current logged-in user
export const updateTask = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const task = await Task.findOneAndUpdate({ _id: id, userId: req.userId }, req.body, { new: true });

    if (!task) throw new AppError("Task not found", 404);

    res.json({ success: true, task });
});

//deletes a task and throws the message task not found if the task doesn't belong to the current logged-in user
export const deleteTask = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const task = await Task.findOneAndDelete({ _id: id, userId: req.userId });

    if (!task) throw new AppError("Task not found", 404);

    res.json({ success: true, message: "Deleted successfully" });
});