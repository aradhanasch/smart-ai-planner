import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

// SubjectSelector is a "controlled" component: it does NOT keep its own list of
// subjects in state. Instead, the parent (StudyPlanner.jsx) owns the `subjects`
// array and passes it down here, along with a `setSubjects` function to update it.
// This is the same idea as a controlled <input> — this component just renders
// whatever it's given and reports changes back up to the parent.

const DIFFICULTIES = ["easy", "medium", "hard"];

const SubjectSelector = ({ subjects, setSubjects }) => {
    // local state ONLY for the "add new subject" mini-form fields
    const [name, setName] = useState("");
    const [difficulty, setDifficulty] = useState("medium");
    const [hours, setHours] = useState("");

    const handleAdd = () => {
        // basic validation - don't add empty/invalid rows
        if (!name.trim() || !hours || Number(hours) <= 0) return;

        // this is the shape the backend's createPlan endpoint expects:
        // { name, difficulty, totalHoursNeeded }
        setSubjects(prev => [
            ...prev,
            { name: name.trim(), difficulty, totalHoursNeeded: Number(hours) }
        ]);

        // reset the mini-form after adding
        setName("");
        setDifficulty("medium");
        setHours("");
    };

    const handleRemove = (index) => {
        setSubjects(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-4">
            {/* Existing subjects list */}
            {subjects.length > 0 && (
                <div className="flex flex-col gap-2">
                    {subjects.map((s, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
                        >
                            <div>
                                <span className="font-medium">{s.name}</span>
                                <span className="text-xs text-slate-400 ml-2">
                                    {s.difficulty} • {s.totalHoursNeeded}h needed
                                </span>
                            </div>
                            <button
                                onClick={() => handleRemove(i)}
                                className="text-slate-400 hover:text-red-400 transition cursor-pointer"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Add-subject mini form */}
            <div className="flex gap-2 flex-wrap">
                <input
                    type="text"
                    placeholder="Subject name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 min-w-35 p-2 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-400 outline-none focus:border-blue-400"
                />

                <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="p-2 rounded-xl bg-white/10 border border-white/10 text-white outline-none focus:border-blue-400"
                >
                    {DIFFICULTIES.map(d => (
                        <option key={d} value={d}>{d}</option>
                    ))}
                </select>

                <input
                    type="number"
                    min="1"
                    placeholder="Hours needed"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    className="w-32 p-2 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-400 outline-none focus:border-blue-400"
                />

                <button
                    onClick={handleAdd}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 transition cursor-pointer"
                >
                    <Plus size={16} /> Add
                </button>
            </div>
        </div>
    );
};

export default SubjectSelector;