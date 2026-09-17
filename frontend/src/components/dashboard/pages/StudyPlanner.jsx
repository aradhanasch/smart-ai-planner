import React, { useEffect, useState } from "react";
import axiosInstance from "../../../utils/axiosInstance.js";
import SubjectSelector from "../../planner/SubjectSelector.jsx";
import StudyBlockCard from "../../planner/StudyBlockCard.jsx";

// StudyPlanner has two "modes":
//   1. NO PLAN YET -> show a form to create one (subjects + exam date + daily hours)
//   2. PLAN EXISTS -> show the generated sessions, grouped by date, as a list
//
// We remember the current plan's ID in localStorage (same idea as the JWT token)
// so refreshing the page doesn't lose the plan. On mount, we check if a planId is
// saved and, if so, fetch that plan's sessions right away.

const StudyPlanner = () => {
    const [planId, setPlanId] = useState(localStorage.getItem("studyPlanId"));
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(false);

    // ---- create-plan form state ----
    const [subjects, setSubjects] = useState([]);
    const [examDate, setExamDate] = useState("");
    const [dailyAvailableHours, setDailyAvailableHours] = useState("");
    // shortfall comes back from the backend as an OBJECT like { "Math": 2.5 }
    // meaning "Math is short by 2.5 hours before the exam" — not an array
    const [shortfall, setShortfall] = useState({});

    // ================= FETCH EXISTING PLAN =================
    const fetchPlan = async (id) => {
        setLoading(true);
        try {
            const res = await axiosInstance.get(`/api/planner/${id}`);
            setSessions(res.data.sessions || []);
        } catch (err) {
            console.log(err);
            // if the fetch fails (e.g. plan doesn't exist anymore), clear it so the
            // user can start fresh instead of being stuck staring at an error
            localStorage.removeItem("studyPlanId");
            setPlanId(null);
        } finally {
            setLoading(false);
        }
    };

    // runs once when the page first loads
    useEffect(() => {
        if (planId) fetchPlan(planId);
    }, []); // empty array = run only on mount

    // ================= CREATE PLAN =================
    const handleCreatePlan = async () => {
        if (!subjects.length || !examDate || !dailyAvailableHours) {
            alert("Add at least one subject, an exam date, and your daily available hours.");
            return;
        }

        setLoading(true);
        try {
            const res = await axiosInstance.post("/api/planner/create", {
                subjects,
                examDate,
                dailyAvailableHours: Number(dailyAvailableHours),
            });

            // save the new planId so it survives a page refresh
            localStorage.setItem("studyPlanId", res.data.planId);
            setPlanId(res.data.planId);
            setSessions(res.data.sessions || []);
            setShortfall(res.data.shortfall || {});
        } catch (err) {
            console.log(err);
            alert("Couldn't create the plan. Check the console for details.");
        } finally {
            setLoading(false);
        }
    };

    // ================= MARK COMPLETE =================
    const handleComplete = async (sessionId) => {
        try {
            const res = await axiosInstance.post("/api/planner/mark-completed", { sessionId });
            // simple case: just swap that one session in our local list
            setSessions(prev =>
                prev.map(s => (s._id === sessionId ? res.data.session : s))
            );
        } catch (err) {
            console.log(err);
        }
    };

    // ================= MARK MISSED =================
    const handleMissed = async (sessionId) => {
        try {
            const res = await axiosInstance.post("/api/planner/mark-missed", { sessionId });
            // markMissed can create BRAND NEW sessions on the backend (to redistribute
            // the missed hours into future days), so a single local update isn't
            // enough here — refetch the whole plan to get the accurate list
            if (res.data.message) alert(res.data.message);
            await fetchPlan(planId);
        } catch (err) {
            console.log(err);
        }
    };

    // ================= START OVER =================
    const handleReset = () => {
        localStorage.removeItem("studyPlanId");
        setPlanId(null);
        setSessions([]);
        setSubjects([]);
        setExamDate("");
        setDailyAvailableHours("");
        setShortfall({});
    };

    // ================= GROUP SESSIONS BY DATE =================
    // sessions come back as one flat array; we group them into
    // { "2026-10-01": [...], "2026-10-02": [...] } so we can render one heading per day
    const groupedByDate = sessions.reduce((groups, session) => {
        if (!groups[session.date]) groups[session.date] = [];
        groups[session.date].push(session);
        return groups;
    }, {});

    // "YYYY-MM-DD" strings sort correctly with plain .sort()
    const sortedDates = Object.keys(groupedByDate).sort();

    // ================= RENDER: NO PLAN YET =================
    if (!planId) {
        return (
            <div className="text-white max-w-2xl">
                <h1 className="text-3xl font-semibold mb-6">📅 Create a Study Plan</h1>

                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-6">
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Subjects</label>
                        <SubjectSelector subjects={subjects} setSubjects={setSubjects} />
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm text-slate-400 mb-2">Exam date</label>
                            <input
                                type="date"
                                value={examDate}
                                onChange={(e) => setExamDate(e.target.value)}
                                className="w-full p-3 rounded-xl bg-white/10 border border-white/10 text-white outline-none focus:border-blue-400"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm text-slate-400 mb-2">Daily available hours</label>
                            <input
                                type="number"
                                min="1"
                                value={dailyAvailableHours}
                                onChange={(e) => setDailyAvailableHours(e.target.value)}
                                className="w-full p-3 rounded-xl bg-white/10 border border-white/10 text-white outline-none focus:border-blue-400"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleCreatePlan}
                        disabled={loading}
                        className="w-full py-3 rounded-xl text-white font-medium bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg transition hover:-translate-y-0.5 active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                        {loading ? "Generating..." : "Generate Study Plan"}
                    </button>
                </div>
            </div>
        );
    }

    // ================= RENDER: PLAN EXISTS =================
    return (
        <div className="text-white">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-semibold">📅 Your Study Plan</h1>
                <button
                    onClick={handleReset}
                    className="text-sm text-slate-400 hover:text-white transition cursor-pointer"
                >
                    Start a new plan
                </button>
            </div>

            {Object.keys(shortfall).length > 0 && (
                <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-sm">
                    Heads up — these subjects won't get enough time before the exam:{" "}
                    {Object.entries(shortfall).map(([subject, hrs]) => `${subject} (${hrs}h short)`).join(", ")}
                </div>
            )}

            {loading ? (
                <p className="text-slate-400">Loading...</p>
            ) : (
                <div className="space-y-8">
                    {sortedDates.map(date => (
                        <div key={date}>
                            <h2 className="text-lg font-semibold mb-3 text-slate-300">
                                {new Date(date).toLocaleDateString(undefined, {
                                    weekday: "long", month: "short", day: "numeric"
                                })}
                            </h2>
                            <div className="flex flex-col gap-3">
                                {groupedByDate[date].map(session => (
                                    <StudyBlockCard
                                        key={session._id}
                                        session={session}
                                        onComplete={handleComplete}
                                        onMissed={handleMissed}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default StudyPlanner;