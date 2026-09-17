import React, { useEffect, useState } from "react";
import axiosInstance from "../../../utils/axiosInstance.js"; // pre-configured axios that auto-attaches the JWT to every request

const PRIORITY_STYLES = { // maps each priority value to tailwind classes, used for the colored badge
    high: "bg-red-500/20 text-red-300 border border-red-500/30",
    medium: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
    low: "bg-green-500/20 text-green-300 border border-green-500/30",
};

const emptyForm = { title: "", description: "", dueDate: "", priority: "medium" }; // a reusable blank shape so we don't repeat this object everywhere

const Tasks = () => {
    const [tasks, setTasks] = useState([]); // holds the full list fetched from the backend
    const [form, setForm] = useState(emptyForm); // holds whatever the user is currently typing in the modal
    const [editingId, setEditingId] = useState(null); // null = creating new, non-null = editing that task's _id
    const [showForm, setShowForm] = useState(false); // toggles the modal visibility
    const [filter, setFilter] = useState("all"); // which filter tab is active: all / pending / completed

    const token = localStorage.getItem("token"); // stored at login — axiosInstance already attaches this automatically, but Notes.jsx passes it explicitly too, so we mirror that pattern

    // ================= FETCH =================
    const fetchTasks = async () => {
        try {
            const res = await axiosInstance.get("/api/tasks/get-tasks", {
                headers: { Authorization: `Bearer ${token}` } // Bearer <token> is the standard format servers expect
            });
            setTasks(res.data.tasks || []); // fallback to [] so .map() never crashes on undefined
        } catch (err) {
            console.log(err);
            setTasks([]);
        }
    };

    useEffect(() => {
        fetchTasks(); // runs once when the component mounts
    }, []); // empty dependency array = run only on mount, not on every re-render

    // ================= SAVE (handles both create and update) =================
    const handleSave = async () => {
        if (!form.title.trim()) return; // guard: don't submit an empty/whitespace title

        const payload = {
            title: form.title,
            description: form.description,
            dueDate: form.dueDate || null, // send null instead of empty string if no date picked
            priority: form.priority
        };

        try {
            if (editingId) { // editingId set means we're updating an existing task
                const res = await axiosInstance.put(
                    `/api/tasks/update-task/${editingId}`,
                    payload,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                setTasks(prev =>
                    prev.map(t => (t._id === editingId ? res.data.task : t)) // swap the old version for the updated one, keep everything else unchanged
                );

                setEditingId(null); // reset editing state
            } else { // no editingId means we're creating a new task
                const res = await axiosInstance.post(
                    "/api/tasks/create",
                    payload,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                setTasks(prev => [res.data.task, ...prev]); // prepend new task so it shows at the top
            }

            setForm(emptyForm); // clear the form
            setShowForm(false); // close the modal
        } catch (err) {
            console.log(err);
        }
    };

    // ================= DELETE =================
    const handleDelete = async (id, title) => {
        const confirmDelete = window.confirm(`Are you sure you want to delete "${title}"?`); // native browser confirm dialog

        if (!confirmDelete) return; // stop here if user clicked "Cancel"

        try {
            await axiosInstance.delete(`/api/tasks/delete-task/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setTasks(prev => prev.filter(t => t._id !== id)); // remove it from local state without refetching everything
        } catch (err) {
            console.log(err);
        }
    };

    // ================= EDIT =================
    const handleEdit = (task) => {
        setForm({ // pre-fill the form with this task's current values
            title: task.title || "",
            description: task.description || "",
            dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "", // Mongo returns a full ISO string, <input type="date"> needs just YYYY-MM-DD
            priority: task.priority || "medium"
        });
        setEditingId(task._id); // remember which task we're editing
        setShowForm(true);
    };

    const handleCancelForm = () => {
        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm); // reset everything so a stale edit doesn't leak into the next "create" action
    };

    // ================= TOGGLE COMPLETE =================
    const handleToggleComplete = async (task) => {
        try {
            const res = await axiosInstance.put(
                `/api/tasks/update-task/${task._id}`,
                { completed: !task.completed }, // only send the one changed field — backend just merges it in
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setTasks(prev =>
                prev.map(t => (t._id === task._id ? res.data.task : t))
            );
        } catch (err) {
            console.log(err);
        }
    };

    // ================= FILTER (client-side, no API call needed) =================
    const filteredTasks = (tasks || []).filter(t => {
        if (filter === "pending") return !t.completed;
        if (filter === "completed") return !!t.completed;
        return true; // "all"
    });

    const totalCount = tasks.length;
    const pendingCount = tasks.filter(t => !t.completed).length;
    const completedCount = tasks.filter(t => t.completed).length;

    return (
        <div className="min-h-screen p-8 text-white">

            {/* HEADER */}
            <div className="flex justify-between items-center mb-8 backdrop-blur-xl bg-white/5 border border-white/10 p-5 rounded-2xl">
                <h1 className="text-3xl font-semibold">✅ My Tasks</h1>

                <button
                    onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }} // reset form state, THEN open modal
                    className="group relative flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-white bg-linear-to-r from-blue-700 via-indigo-700 to-purple-700 shadow-lg transition-all duration-300 ease-in-out hover:-translate-y-1 hover:scale-105 active:scale-95 overflow-hidden cursor-pointer"
                >
                    <span className="text-xl transition-transform duration-300 group-hover:rotate-90">➕</span>
                    Create Task
                </button>
            </div>

            {/* STATS */}
            <div className="flex gap-6 mb-6">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">Total: {totalCount}</div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">Pending: {pendingCount}</div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">Completed: {completedCount}</div>
            </div>

            {/* FILTER TABS */}
            <div className="flex gap-3 mb-8">
                {["all", "pending", "completed"].map(f => ( // loop over the three tab names instead of writing three buttons by hand
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition cursor-pointer ${
                            filter === f
                                ? "bg-blue-600 text-white" // highlight the active tab
                                : "bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10"
                        }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* TASK LIST */}
            <div className="flex flex-col gap-4">
                {filteredTasks.length === 0 && ( // empty-state message
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-gray-400 text-center">
                        No tasks here yet.
                    </div>
                )}

                {filteredTasks.map(task => (
                    <div
                        key={task._id} // React needs a stable unique key for list items — Mongo's _id is perfect for this
                        className={`flex items-center justify-between gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 transition hover:-translate-y-0.5 hover:scale-[1.01] ${task.completed ? "opacity-60" : ""}`}
                    >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <input
                                type="checkbox"
                                checked={!!task.completed} // !! coerces undefined/null to false, keeps this a controlled input
                                onChange={() => handleToggleComplete(task)}
                                className="w-5 h-5 cursor-pointer accent-blue-600 shrink-0"
                            />

                            <div className="min-w-0">
                                <h3 className={`font-semibold truncate ${task.completed ? "line-through text-gray-400" : ""}`}>
                                    {task.title}
                                </h3>
                                {task.description && <p className="text-sm text-gray-300 truncate">{task.description}</p>}
                                {task.dueDate && (
                                    <p className="text-xs text-gray-400 mt-1">
                                        Due: {new Date(task.dueDate).toLocaleDateString()} {/* format the raw ISO string into a readable date */}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium}`}>
                                {task.priority}
                            </span>

                            <button onClick={() => handleEdit(task)} className="px-3 py-1.5 bg-yellow-400 text-black rounded-xl text-sm cursor-pointer hover:scale-105 active:scale-95 transition">
                                Edit
                            </button>

                            <button onClick={() => handleDelete(task._id, task.title)} className="px-3 py-1.5 bg-red-500 text-white rounded-xl text-sm cursor-pointer hover:scale-105 active:scale-95 transition">
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* FORM MODAL */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="relative w-full max-w-lg p-6 rounded-3xl bg-gray-800 border shadow-2xl animate-[fadeIn_.3s_ease]">
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-lg font-semibold text-white">{editingId ? "Update Task" : "Create Task"}</h2>
                            <button onClick={handleCancelForm} className="text-gray-400 hover:text-white transition hover:rotate-90 duration-300 cursor-pointer">✖</button>
                        </div>

                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })} // spread keeps other form fields intact, only title changes
                            placeholder="Task title..."
                            className="w-full p-3 mb-4 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 transition"
                        />

                        <textarea
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            placeholder="Description (optional)..."
                            className="w-full p-3 mb-4 h-24 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 transition resize-none"
                        />

                        <div className="flex gap-4 mb-5">
                            <div className="flex-1">
                                <label className="text-sm text-gray-400 mb-1 block">Due date</label>
                                <input
                                    type="date"
                                    value={form.dueDate}
                                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                                    className="w-full p-3 rounded-xl bg-white/10 border border-white/10 text-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 transition"
                                />
                            </div>

                            <div className="flex-1">
                                <label className="text-sm text-gray-400 mb-1 block">Priority</label>
                                <select
                                    value={form.priority}
                                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                                    className="w-full p-3 rounded-xl bg-white/10 border border-white/10 text-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 transition"
                                >
                                    <option value="low" className="bg-gray-800">Low</option>
                                    <option value="medium" className="bg-gray-800">Medium</option>
                                    <option value="high" className="bg-gray-800">High</option>
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={handleSave}
                            className="w-full py-3 rounded-xl text-white font-medium bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg transition-all duration-300 hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                        >
                            {editingId ? "Update Task" : "Save Task"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Tasks;