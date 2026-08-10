import mongoose from "mongoose";

const studySessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "User",
        },
        planId: {
            // groups all sessions generated together for one exam/plan
            type: String,
            required: true,
        },
        subject: {
            type: String,
            required: true,
        },
        difficulty: {
            type: String,
            enum: ["easy", "medium", "hard"],
            required: true,
        },
        date: {
            // stored as YYYY-MM-DD to match schedulerService's date keys
            type: String,
            required: true,
        },
        hours: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "completed", "missed", "rescheduled"],
            default: "pending",
        },
        rescheduledFrom: {
            // date string this session's hours originated from, if any
            type: String,
            default: null,
        },
        examDate: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

studySessionSchema.index({ userId: 1, date: 1 });

const StudySession = mongoose.model("StudySession", studySessionSchema);

export default StudySession;
