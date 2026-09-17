import Note from "../models/noteModel.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import AppError from "../utils/AppError.js";

/**
 * @route createNote
 * @description to create a note (only logged in user to create a note)
 * @access Private
*/
export const createNote = asyncHandler(async (req, res) => {
    const { title, description, pinned = false } = req.body;
    if (!title) throw new AppError("Title is required", 400);
        const note = await Note.create({
            userId: req.userId,
            title,
            description,
            pinned
        });

        res.json({ success: true, note });
});

/**
 * @route getNotes
 * @description to get all the notes created on particular id (means logged in user only get notes)
 * @access Private
*/
export const getNotes = asyncHandler(async (req, res) => {
    const notes = await Note.find({ userId: req.userId })
        .sort({ createdAt: -1 });

    res.json({ success: true, notes });
});

/**
 * @route updateNote
 * @description to update a note on particular id (means logged in user only update note)
 * @access Private
*/
export const updateNote = asyncHandler(async (req, res) => {
        const { id } = req.params;

        const note = await Note.findOneAndUpdate(
            { _id: id, userId: req.userId },
            req.body,
            { new: true }
        );
        if(!note) throw new AppError("Note not found", 404);
        res.json({ success: true, note });
});

/**
 * @route deleteNote
 * @description to delete a note on particular id (means only logged in user to delete a note)\
 * @access Private
*/
export const deleteNote = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const note = await Note.findOneAndDelete({
        _id: id,
        userId: req.userId
    });

    if (!note) throw new AppError("Note not found", 404);

    res.json({success: true, message: "Deleted successfully"});
});