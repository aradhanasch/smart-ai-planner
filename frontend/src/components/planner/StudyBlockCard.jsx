import React from "react";
import { Check, X } from "lucide-react";

// StudyBlockCard renders ONE study session (e.g. "Math - 2h - pending").
// It has NO idea how "mark complete" or "mark missed" actually work over the
// network — that logic lives in StudyPlanner.jsx (the parent) and gets passed
// down as the onComplete/onMissed props. This is the "dumb component" pattern:
// this file only cares about what things look like, not how they work.

const STATUS_STYLES = {
    pending: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    completed: "bg-green-500/20 text-green-300 border-green-500/30",
    missed: "bg-red-500/20 text-red-300 border-red-500/30",
    rescheduled: "bg-purple-500/20 text-purple-300 border-purple-500/30",
};

const StudyBlockCard = ({ session, onComplete, onMissed }) => {
    const isPending = session.status === "pending";

    return (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
            <div>
                <div className="flex items-center gap-3">
                    <span className="font-medium">{session.subject}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLES[session.status]}`}>
                        {session.status}
                    </span>
                </div>
                <p className="text-sm text-slate-400 mt-1">
                    {session.hours}h • {session.difficulty}
                    {/* if the backend redistributed this session from a missed day,
                        rescheduledFrom will hold the original date */}
                    {session.rescheduledFrom && (
                        <span className="ml-2 text-purple-300">
                            (moved from {session.rescheduledFrom})
                        </span>
                    )}
                </p>
            </div>

            {/* Only show action buttons while the session is still pending —
                once it's completed/missed, there's nothing left to do with it */}
            {isPending && (
                <div className="flex gap-2 shrink-0">
                    <button
                        onClick={() => onComplete(session._id)}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-green-600/80 hover:bg-green-500 transition text-sm cursor-pointer"
                    >
                        <Check size={14} /> Complete
                    </button>
                    <button
                        onClick={() => onMissed(session._id)}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-red-600/80 hover:bg-red-500 transition text-sm cursor-pointer"
                    >
                        <X size={14} /> Missed
                    </button>
                </div>
            )}
        </div>
    );
};

export default StudyBlockCard;