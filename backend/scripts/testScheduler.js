import { generateSchedule, redistributeMissed } from "../services/schedulerService.js";

function printSchedule(schedule) {
    schedule.forEach((day) => {
        const parts = day.sessions.map(
            (s) => `${s.subject}: ${s.hours}h${s.status === "rescheduled" ? " (MISSED->rescheduled)" : ""}`
        );
        console.log(`  ${day.date} -> ${parts.join(", ") || "(free)"}`);
    });
}

console.log("=== SCENARIO: 5-day exam window, Math (hard) + History (easy), 3 hrs/day available ===\n");

const startDate = new Date("2026-08-10");
const examDate = new Date("2026-08-15"); // 5 study days: 10,11,12,13,14

const subjects = [
    { name: "Math", difficulty: "hard", totalHoursNeeded: 8 },
    { name: "History", difficulty: "easy", totalHoursNeeded: 5 },
];

const dailyAvailableHours = 3;

const { schedule, shortfall } = generateSchedule({
    subjects,
    startDate,
    examDate,
    dailyAvailableHours,
});

console.log("Initial generated plan:");
printSchedule(schedule);
console.log("Shortfall (hours that didn't fit before exam):", shortfall);

// Total hours sanity check
const totalScheduled = schedule.reduce(
    (sum, day) => sum + day.sessions.reduce((s2, sess) => s2 + sess.hours, 0),
    0
);
console.log(`\nTotal hours scheduled: ${totalScheduled} (expected close to ${8 + 5} minus any shortfall)`);

console.log("\n--- User misses their Math session on 2026-08-11 (day 2) ---\n");

const missedDay = schedule.find((d) => d.date === "2026-08-11");
const missedSession = missedDay.sessions.find((s) => s.subject === "Math");
const missedHours = missedSession ? missedSession.hours : 0;

console.log(`Missed session: Math, ${missedHours}h on 2026-08-11\n`);

const { schedule: updatedSchedule, unplaced } = redistributeMissed({
    schedule,
    missedDate: "2026-08-11",
    missedSubject: "Math",
    missedHours,
    dailyAvailableHours,
    examDate,
});

console.log("Updated plan after redistribution:");
printSchedule(updatedSchedule);
console.log("Unplaced hours (didn't fit anywhere before exam):", unplaced);

// Verify no day exceeds the daily cap
console.log("\n--- Daily cap check ---");
updatedSchedule.forEach((day) => {
    const total = day.sessions.reduce((s, sess) => s + sess.hours, 0);
    const status = total > dailyAvailableHours + 0.01 ? "‼️ OVER CAP" : "ok";
    console.log(`  ${day.date}: ${total}h / ${dailyAvailableHours}h cap [${status}]`);
});
