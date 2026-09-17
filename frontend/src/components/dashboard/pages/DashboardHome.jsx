import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";

// Pomodoro-style timer with EDITABLE durations. Instead of a fixed 25/5 split,
// we keep the desired minutes for each mode in state (focusMinutes, breakMinutes),
// and the user can type a new number while the timer is stopped. Once they hit
// Start, the number input locks so they can't change it mid-countdown.

const DEFAULT_FOCUS_MIN = 25;
const DEFAULT_BREAK_MIN = 5;

const FocusMode = () => {
    const [mode, setMode] = useState("focus");                  // "focus" or "break"

    // desired duration for each mode, in MINUTES (what the input field edits)
    const [focusMinutes, setFocusMinutes] = useState(DEFAULT_FOCUS_MIN);
    const [breakMinutes, setBreakMinutes] = useState(DEFAULT_BREAK_MIN);

    // the actual countdown, in SECONDS (what the ring/display uses)
    const [secondsLeft, setSecondsLeft] = useState(DEFAULT_FOCUS_MIN * 60);
    const [isRunning, setIsRunning] = useState(false);

    const intervalRef = useRef(null);

    // small helper: minutes for whichever mode we're currently in
    const currentModeMinutes = mode === "focus" ? focusMinutes : breakMinutes;

    // ================= TICK =================
    useEffect(() => {
        if (!isRunning) return;

        intervalRef.current = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(intervalRef.current);
                    setIsRunning(false);

                    // timer hit zero -> flip to the other mode, using THAT mode's
                    // own custom duration (so if the user set break to 10 min,
                    // finishing a focus session gives you a 10 min break, not 5)
                    const nextMode = mode === "focus" ? "break" : "focus";
                    const nextMinutes = nextMode === "focus" ? focusMinutes : breakMinutes;
                    setMode(nextMode);

                    return nextMinutes * 60;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(intervalRef.current);
    }, [isRunning, mode, focusMinutes, breakMinutes]);

    // ================= CONTROLS =================
    const toggleRunning = () => setIsRunning((prev) => !prev);

    const reset = () => {
        setIsRunning(false);
        setSecondsLeft(currentModeMinutes * 60);
    };

    const switchMode = (newMode) => {
        setIsRunning(false);
        setMode(newMode);
        const minutes = newMode === "focus" ? focusMinutes : breakMinutes;
        setSecondsLeft(minutes * 60);
    };

    // ================= EDIT DURATION =================
    // called from the number input — only reachable while isRunning is false,
    // since the input itself gets disabled during a running countdown
    const handleMinutesChange = (value) => {
        // clamp between 1 and 180 minutes so a stray empty/huge value can't
        // break the countdown or the ring animation
        const clamped = Math.min(180, Math.max(1, Number(value) || 1));

        if (mode === "focus") {
            setFocusMinutes(clamped);
        } else {
            setBreakMinutes(clamped);
        }

        // keep the visible countdown in sync with whatever was just typed,
        // since the timer isn't running yet
        setSecondsLeft(clamped * 60);
    };

    // ================= FORMAT mm:ss =================
    const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
    const seconds = String(secondsLeft % 60).padStart(2, "0");

    const progress = 1 - secondsLeft / (currentModeMinutes * 60);

    return (
        <div className="flex flex-col items-center justify-center py-12 text-white">

            {/* MODE TABS */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => switchMode("focus")}
                    className={`px-5 py-2 rounded-xl text-sm font-medium transition cursor-pointer ${
                        mode === "focus"
                            ? "bg-linear-to-r from-purple-600 to-blue-500 text-white"
                            : "bg-white/5 border border-white/10 text-slate-400 hover:text-white"
                    }`}
                >
                    Focus
                </button>
                <button
                    onClick={() => switchMode("break")}
                    className={`px-5 py-2 rounded-xl text-sm font-medium transition cursor-pointer ${
                        mode === "break"
                            ? "bg-linear-to-r from-purple-600 to-blue-500 text-white"
                            : "bg-white/5 border border-white/10 text-slate-400 hover:text-white"
                    }`}
                >
                    Break
                </button>
            </div>

            {/* DURATION INPUT — only editable while stopped */}
            <div className="flex items-center gap-2 mb-8 text-sm text-slate-400">
                <span>Set {mode} length:</span>
                <input
                    type="number"
                    min="1"
                    max="180"
                    value={currentModeMinutes}
                    disabled={isRunning}
                    onChange={(e) => handleMinutesChange(e.target.value)}
                    className="w-20 px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white text-center outline-none focus:border-purple-400 disabled:opacity-40 disabled:cursor-not-allowed"
                />
                <span>min</span>
            </div>

            {/* TIMER RING */}
            <div className="relative w-64 h-64 mb-10">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                        cx="50" cy="50" r="45"
                        fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6"
                    />
                    <circle
                        cx="50" cy="50" r="45"
                        fill="none"
                        stroke={mode === "focus" ? "#a855f7" : "#3b82f6"}
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 45}
                        strokeDashoffset={2 * Math.PI * 45 * (1 - progress)}
                        style={{ transition: "stroke-dashoffset 1s linear" }}
                    />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-semibold tabular-nums">
                        {minutes}:{seconds}
                    </span>
                    <span className="text-sm text-slate-400 mt-2 capitalize">
                        {mode} session
                    </span>
                </div>
            </div>

            {/* CONTROLS */}
            <div className="flex gap-4">
                <button
                    onClick={toggleRunning}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold bg-linear-to-r from-blue-700 via-indigo-700 to-purple-700 shadow-lg transition hover:-translate-y-1 hover:scale-105 active:scale-95 cursor-pointer"
                >
                    {isRunning ? <Pause size={18} /> : <Play size={18} />}
                    {isRunning ? "Pause" : "Start"}
                </button>

                <button
                    onClick={reset}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition cursor-pointer"
                >
                    <RotateCcw size={18} />
                    Reset
                </button>
            </div>
        </div>
    );
};

export default FocusMode;