import StudySession from "../models/studySessionModel.js";
import { generateSchedule, redistributeMissed } from "../services/schedulerService.js";
import crypto from "crypto";
import asyncHandler from "../middlewares/asyncHandler.js";
import AppError from "../utils/AppError.js"; 

/**
 * @route createPlan
 * @description Generate a new adaptive study plan for the logged-in user
 * @access Private
 * body: { subjects: [{name, difficulty, totalHoursNeeded}], examDate, dailyAvailableHours }
 */
export const createPlan = asyncHandler(async (req, res) => {
    const { subjects, examDate, dailyAvailableHours } = req.body;

    if (!subjects?.length || !examDate || !dailyAvailableHours) {
        throw new AppError("subjects, examDate, and dailyAvailableHours are required", 400);
    }

    // everything below this line stays exactly as it is — same indentation,
    // same variable names, no changes to the actual logic
    const startDate = new Date();
    const planId = crypto.randomUUID();

    const { schedule, shortfall } = generateSchedule({
        subjects,
        startDate,
        examDate: new Date(examDate),
        dailyAvailableHours,
    });

    const difficultyBySubject = Object.fromEntries(subjects.map((s) => [s.name, s.difficulty]));

    const docs = [];
    schedule.forEach((day) => {
        day.sessions.forEach((s) => {
            docs.push({
                userId: req.userId,
                planId,
                subject: s.subject,
                difficulty: difficultyBySubject[s.subject],
                date: day.date,
                hours: s.hours,
                status: "pending",
                examDate: new Date(examDate).toISOString().slice(0, 10),
            });
        });
    });

    const created = await StudySession.insertMany(docs);

    return res.status(201).json({
        success: true,
        planId,
        sessions: created,
        shortfall,
    });
});

/**
 * @route getPlan
 * @description Get all sessions for a plan, grouped by date
 * @access Private
 */
export const getPlan = asyncHandler(async (req, res) => {
    const { planId } = req.params;

    const sessions = await StudySession.find({ userId: req.userId, planId }).sort({ date: 1 });

    return res.status(200).json({ success: true, sessions });
});

/**
 * @route markMissed
 * @description Mark a session as missed and redistribute its hours across remaining days
 * @access Private
 * body: { sessionId }
 */
export const markMissed = asyncHandler(async (req, res) => {
    const { sessionId } = req.body;

    const session = await StudySession.findOne({ _id: sessionId, userId: req.userId });
    if (!session) throw new AppError("Session not found", 404);

    // everything below stays exactly the same — the loop, redistribution logic,
    // all untouched. Only the outer try/catch wrapper is removed.
    const planSessions = await StudySession.find({ userId: req.userId, planId: session.planId }).sort({ date: 1 });

    const dateMap = {};
    planSessions.forEach((s) => {
        if (!dateMap[s.date]) dateMap[s.date] = [];
        dateMap[s.date].push({
            subject: s.subject,
            hours: s.hours,
            status: s.status,
            _id: s._id,
        });
    });
    const scheduleShape = Object.keys(dateMap)
        .sort()
        .map((date) => ({ date, sessions: dateMap[date] }));

    const dailyAvailableHours = Math.max(
        ...scheduleShape.map((d) => d.sessions.reduce((sum, s) => sum + s.hours, 0))
    );

    const { schedule: updatedSchedule, unplaced } = redistributeMissed({
        schedule: scheduleShape,
        missedDate: session.date,
        missedSubject: session.subject,
        missedHours: session.hours,
        dailyAvailableHours,
        examDate: new Date(session.examDate),
    });

    session.status = "missed";
    await session.save();

    for (const day of updatedSchedule) {
        for (const s of day.sessions) {
            if (s._id) {
                await StudySession.findByIdAndUpdate(s._id, { hours: s.hours, status: s.status });
            } else {
                await StudySession.create({
                    userId: req.userId,
                    planId: session.planId,
                    subject: s.subject,
                    difficulty: session.difficulty,
                    date: day.date,
                    hours: s.hours,
                    status: "pending",
                    rescheduledFrom: s.rescheduledFrom || null,
                    examDate: session.examDate,
                });
            }
        }
    }

    return res.status(200).json({
        success: true,
        message: unplaced > 0
            ? `Redistributed. ${unplaced}h of ${session.subject} couldn't fit before the exam — you're behind on this subject.`
            : "Redistributed successfully.",
        unplaced,
    });
});

/**
 * @route markCompleted
 * @description Mark a session as completed
 * @access Private
 */
export const markCompleted = asyncHandler(async (req, res) => {
    const { sessionId } = req.body;

    const session = await StudySession.findOneAndUpdate(
        { _id: sessionId, userId: req.userId },
        { status: "completed" },
        { new: true }
    );

    if (!session) throw new AppError("Session not found", 404);

    return res.status(200).json({ success: true, session });
});

/**
 * @route getAnalytics
 * @description Aggregate completed/missed session stats for charts
 * @access Private
*/
export const getAnalytics = asyncHandler(async (req, res) => {
    // group all of this user's sessions by date, summing completed vs missed hours.
    // Using Mongo's aggregation pipeline here (not a JS loop) is the resume-relevant
    // choice — it means the database does the heavy lifting, not your Node server,
    // which scales much better once there's real user data volume.
    const stats = await StudySession.aggregate([
        { $match: { userId: req.userId } },
        {
            $group: {
                _id: { date: "$date", status: "$status" },
                totalHours: { $sum: "$hours" },
                count: { $sum: 1 },
            },
        },
        { $sort: { "_id.date": 1 } },
    ]);

    res.json({ success: true, stats });
});
