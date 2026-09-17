/**
 * schedulerService.js
 *
 * Pure functions only — no database, no Express, no side effects.
 * This is deliberate: the scheduling math should be testable with
 * plain inputs/outputs and independently verifiable, since it's the
 * part of the app that decides what a user actually sees on their
 * calendar. Keeping it pure also means the AI layer never has to
 * touch this logic — it stays deterministic and explainable.
 */

const DIFFICULTY_WEIGHT = {
    easy: 1,
    medium: 1.5,
    hard: 2,
};

const MIN_SESSION_HOURS = 0.25; // don't create sessions shorter than 15 min
const ROUND_TO = 0.25; // round allocations to nearest 15 min

function round(value, step = ROUND_TO) {
    return Math.round(value / step) * step;
}

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function toDateKey(date) {
    return new Date(date).toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Builds the list of study days: from startDate up to (but not including)
 * examDate itself. The exam day is intentionally left free.
 */
function buildDayRange(startDate, examDate) {
    const days = [];
    let cursor = new Date(startDate);
    const end = new Date(examDate);

    while (toDateKey(cursor) < toDateKey(end)) {
        days.push(toDateKey(cursor));
        cursor = addDays(cursor, 1);
    }
    return days;
}

/**
 * Allocates a single day's available hours across subjects that still
 * have remaining hours, weighted by (remainingHours * difficultyWeight).
 * Runs multiple passes ("water-filling") because a subject can hit its
 * remaining-hours cap before the day's capacity is used up — in that
 * case the leftover capacity needs to be redistributed to the other
 * subjects instead of being wasted.
 */
function allocateDay(dayCapacity, remaining, subjectsMeta) {
    const allocation = {}; // subjectName -> hours allocated this day
    let capacityLeft = dayCapacity;

    // safety cap on passes so a pathological input can't loop forever
    for (let pass = 0; pass < subjectsMeta.length + 1 && capacityLeft > 0.001; pass++) {
        const active = subjectsMeta.filter((s) => remaining[s.name] > 0.001);
        if (active.length === 0) break;

        const weights = active.map((s) => remaining[s.name] * DIFFICULTY_WEIGHT[s.difficulty]);
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        if (totalWeight <= 0) break;

        let anyAllocatedThisPass = false;

        active.forEach((s, i) => {
            const share = capacityLeft * (weights[i] / totalWeight);
            const grantable = Math.min(share, remaining[s.name]);
            if (grantable <= 0.001) return;

            allocation[s.name] = (allocation[s.name] || 0) + grantable;
            remaining[s.name] -= grantable;
            capacityLeft -= grantable;
            anyAllocatedThisPass = true;
        });

        if (!anyAllocatedThisPass) break;
    }

    // round + drop anything under the minimum session length
    Object.keys(allocation).forEach((name) => {
        const roundedVal = round(allocation[name]);
        if (roundedVal < MIN_SESSION_HOURS) {
            delete allocation[name];
        } else {
            allocation[name] = roundedVal;
        }
    });

    return allocation;
}

/**
 * Generates the initial study plan.
 *
 * @param {Object} params
 * @param {Array}  params.subjects - [{ name, difficulty: 'easy'|'medium'|'hard', totalHoursNeeded }]
 * @param {Date}   params.startDate
 * @param {Date}   params.examDate
 * @param {number} params.dailyAvailableHours
 *
 * @returns {Object} { schedule: [{date, sessions:[{subject,hours}]}], shortfall: {subject: hoursNotFit} }
 */
function generateSchedule({ subjects, startDate, examDate, dailyAvailableHours }) {
    const days = buildDayRange(startDate, examDate);
    const remaining = {};
    subjects.forEach((s) => (remaining[s.name] = s.totalHoursNeeded));

    const schedule = days.map((date) => {
        const allocation = allocateDay(dailyAvailableHours, remaining, subjects);
        const sessions = Object.entries(allocation).map(([subject, hours]) => ({
            subject,
            hours,
            status: "pending",
        }));
        return { date, sessions };
    });

    const shortfall = {};
    Object.entries(remaining).forEach(([name, hrs]) => {
        if (hrs > 0.001) shortfall[name] = round(hrs);
    });

    return { schedule, shortfall };
}

/**
 * Redistributes hours from a missed session across the remaining
 * schedulable days (today+1 ... day before exam), respecting each
 * day's existing load and the same dailyAvailableHours cap.
 *
 * This is the exact question that gets asked in the interview:
 * "where do the missed hours actually go?" — answer: spread across
 * every remaining day proportional to how much free capacity that
 * day has, not dumped onto the very next day.
 *
 * @param {Object} params
 * @param {Array}  params.schedule - the existing schedule (from generateSchedule, or after prior redistributions)
 * @param {string} params.missedDate - YYYY-MM-DD of the missed session
 * @param {string} params.missedSubject
 * @param {number} params.missedHours
 * @param {number} params.dailyAvailableHours
 * @param {Date}   params.examDate
 *
 * @returns {Object} { schedule: updatedSchedule, unplaced: hoursThatDidNotFit }
 */
function redistributeMissed({ schedule, missedDate, missedSubject, missedHours, dailyAvailableHours, examDate }) {
    const examKey = toDateKey(examDate);

    // mark the missed session as rescheduled in place
    const updatedSchedule = schedule.map((day) => {
        if (day.date !== missedDate) return day;
        return {
            ...day,
            sessions: day.sessions.map((s) =>
                s.subject === missedSubject && s.status !== "rescheduled"
                    ? { ...s, status: "rescheduled" }
                    : s
            ),
        };
    });

    // candidate days: strictly after the missed day, strictly before exam day
    const candidateDays = updatedSchedule.filter(
        (day) => day.date > missedDate && day.date < examKey
    );

    let hoursLeft = missedHours;

    // water-filling across remaining days, using each day's leftover capacity
    for (let pass = 0; pass < candidateDays.length + 1 && hoursLeft > 0.001; pass++) {
        const capacities = candidateDays.map((day) => {
            const used = day.sessions.reduce((sum, s) => sum + s.hours, 0);
            return Math.max(0, dailyAvailableHours - used);
        });
        const totalCapacity = capacities.reduce((a, b) => a + b, 0);
        if (totalCapacity <= 0.001) break;

        let anyAllocatedThisPass = false;

        candidateDays.forEach((day, i) => {
            if (capacities[i] <= 0.001) return;
            const share = hoursLeft * (capacities[i] / totalCapacity);
            const grantable = Math.min(share, capacities[i]);
            if (grantable <= 0.001) return;

            const existing = day.sessions.find((s) => s.subject === missedSubject);
            if (existing) {
                existing.hours = round(existing.hours + grantable);
            } else {
                day.sessions.push({
                    subject: missedSubject,
                    hours: round(grantable),
                    status: "pending",
                    rescheduledFrom: missedDate,
                });
            }

            hoursLeft -= grantable;
            anyAllocatedThisPass = true;
        });

        if (!anyAllocatedThisPass) break;
    }

    return {
        schedule: updatedSchedule,
        unplaced: round(Math.max(0, hoursLeft)),
    };
}

export { generateSchedule, redistributeMissed, buildDayRange, toDateKey };
