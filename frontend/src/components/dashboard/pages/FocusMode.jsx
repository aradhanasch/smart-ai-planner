import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, SkipForward } from "lucide-react";

// Pomodoro timer where the user only sets ONE number: how long they want to
// focus for. The break length is DERIVED from that automatically (not typed
// in separately), using the same ratio the classic Pomodoro technique uses
// (25 min focus -> 5 min break, i.e. break is ~20% of focus). This way a
// 40-minute focus session gets a proportionally longer break, instead of
// always defaulting to 5 minutes regardless of how long the user just worked.
//
// A "skip breaks" toggle and a manual "Skip" button both let the user bypass
// a break entirely if they don't want one — that's a conscious choice they
// make, not something we force on them.

const DEFAULT_FOCUS_MIN = 25;

// given a focus length, work out an appropriate break length
function computeBreakMinutes(focusMinutes) {
    const RATIO = 0.2; // 20% — mirrors the standard 25-focus/5-break Pomodoro ratio
    const raw = Math.round(focusMinutes * RATIO);
    return Math.min(30, Math.max(5, raw)); // keep it within a sane 5–30 min window
}

const FocusMode = () => {
    const [focusMinutes, setFocusMinutes] = useState(DEFAULT_FOCUS_MIN);
    const [skipBreaks, setSkipBreaks] = useState(false);

    // breakMinutes is NOT its own independent state — it's always recalculated
    // from focusMinutes, so it can never drift out of sync with it
    const breakMinutes = computeBreakMinutes(focusMinutes);

    const [mode, setMode] = useState("focus");                    // "focus" or "break"
    const [secondsLeft, setSecondsLeft] = useState(DEFAULT_FOCUS_MIN * 60);
    const [isRunning, setIsRunning] = useState(false);

    const intervalRef = useRef(null);

    const currentModeMinutes = mode === "focus" ? focusMinutes : breakMinutes;

    // ================= TICK =================
    useEffect(() => {
        if (!isRunning) return;

        intervalRef.current = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(intervalRef.current);
                    setIsRunning(false);

                    if (mode === "focus") {
                        if (skipBreaks) {
                            // stay in focus mode, just reset for the next round —
                            // user presses Start again when they're ready
                            setMode("focus");
                            return focusMinutes * 60;
                        }
                        setMode("break");
                        return breakMinutes * 60;
                    }

                    // a break just finished -> back to a fresh focus round
                    setMode("focus");
                    return focusMinutes * 60;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(intervalRef.current);
    }, [isRunning, mode, focusMinutes, breakMinutes, skipBreaks]);

    // ================= CONTROLS =================
    const toggleRunning = () => setIsRunning((prev) => !prev);

    const reset = () => {
        setIsRunning(false);
        setSecondsLeft(currentModeMinutes * 60);
    };

    // manually bail out of a break right now, regardless of the skipBreaks toggle
    const skipBreakNow = () => {
        setIsRunning(false);
        setMode("focus");
        setSecondsLeft(focusMinutes * 60);
    };

    // ================= EDIT FOCUS LENGTH =================
    const handleFocusMinutesChange = (value) => {
        // clamp between 1 and 180 minutes so a stray empty/huge value can't
        // break the countdown or the ring animation
        const clamped = Math.min(180, Math.max(1, Number(value) || 1));
        setFocusMinutes(clamped);

        // if we're currently sitting in focus mode (not running), keep the
        // visible countdown in sync with whatever was just typed
        if (mode === "focus") {
            setSecondsLeft(clamped * 60);
        }
    };

    // ================= FORMAT mm:ss =================
    const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
    const seconds = String(secondsLeft % 60).padStart(2, "0");

    const progress = 1 - secondsLeft / (currentModeMinutes * 60);

    return (
        <div className="flex flex-col items-center justify-center py-12 text-white">

            {/* MODE INDICATOR */}
            <div className="mb-6 px-5 py-2 rounded-xl text-sm font-medium bg-linear-to-r from-purple-600 to-blue-500 capitalize">
                {mode} session
            </div>

            {/* FOCUS LENGTH INPUT — this is the only thing the user directly sets */}
            <div className="flex flex-col items-center gap-3 mb-8">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                    <span>Focus length:</span>
                    <input
                        type="number"
                        min="1"
                        max="180"
                        value={focusMinutes}
                        disabled={isRunning}
                        onChange={(e) => handleFocusMinutesChange(e.target.value)}
                        className="w-20 px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white text-center outline-none focus:border-purple-400 disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                    <span>min</span>
                </div>

                {/* break length is shown but NOT editable — it's derived */}
                <p className="text-xs text-slate-500">
                    Break auto-set to {breakMinutes} min based on your focus length
                </p>

                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={skipBreaks}
                        onChange={(e) => setSkipBreaks(e.target.checked)}
                        className="accent-purple-500 cursor-pointer"
                    />
                    Skip breaks between focus sessions
                </label>
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

                {/* only makes sense to offer this while actually on a break */}
                {mode === "break" && (
                    <button
                        onClick={skipBreakNow}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition cursor-pointer"
                    >
                        <SkipForward size={18} />
                        Skip Break
                    </button>
                )}
            </div>
        </div>
    );
};

export default FocusMode;