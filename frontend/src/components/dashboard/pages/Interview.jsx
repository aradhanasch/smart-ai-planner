import React, { useState } from "react"; // just need local component state, no fetching

// Static content array — each item has a question and answer string.
// Add to this over time as you learn new talking points from the project.
const QUESTIONS = [
    {
        category: "REST & API Design",
        q: "Why GET for reads, POST for creates, PUT for updates, DELETE for removal?",
        a: "These are conventions, not enforced by Express — GET should be safe and idempotent (no side effects, repeatable), POST creates a new resource and isn't idempotent, PUT/PATCH update an existing resource, DELETE removes it. Following them makes an API predictable to any client or teammate."
    },
    {
        category: "Authentication",
        q: "Walk through the JWT auth flow in this app.",
        a: "On login, the server verifies email/password, signs a JWT containing the user's id, and returns it. The frontend stores it in localStorage and attaches it as a Bearer header on every request via an axios interceptor. The isAuthenticated middleware verifies the token's signature and expiry, looks up the user, and sets req.userId before the route handler runs. It's stateless — the server doesn't store sessions, the token itself carries the identity."
    },
    {
        category: "Authorization",
        q: "How does this app prevent one user from accessing another user's data?",
        a: "Every controller query filters by a compound condition like { _id: id, userId: req.userId }, not just { _id: id }. So even if a user guesses or brute-forces another user's document ID, the query returns nothing because the userId won't match. This is authorization, distinct from authentication — knowing who you are doesn't mean you can touch everything."
    },
    {
        category: "Error Handling",
        q: "How is error handling structured across the backend?",
        a: "Controllers are wrapped in an asyncHandler that catches thrown errors or rejected promises and forwards them to next(err). A custom AppError class marks expected, safe-to-show errors with isOperational=true and a statusCode. A single errorHandler middleware, registered last in server.js, reads that and sends a clean JSON response — while genuinely unexpected errors get logged server-side but show a generic message to the client, so internals never leak."
    },
    {
        category: "Database",
        q: "What does Mongoose schema validation give you that raw MongoDB doesn't?",
        a: "Mongoose schemas enforce types, required fields, and enums at the application layer before a write ever reaches MongoDB — e.g. Task's priority field can only be low/medium/high. It also gives structure like timestamps and default values without extra code in every controller."
    },
    {
        category: "React",
        q: "What's a controlled component, and where does this app use them?",
        a: "A controlled component's value comes from React state, and every change goes through an onChange handler that updates that state — React state is the single source of truth, not the DOM. Every form in this app (Tasks, Notes, Auth) uses this pattern instead of reading values directly from the DOM on submit."
    },
    {
        category: "CORS",
        q: "Why does this app need CORS configured, and what does it actually restrict?",
        a: "The frontend runs on localhost:5173 and the backend on a different port, so without CORS the browser blocks the frontend's requests as cross-origin. cors({ origin: 'http://localhost:5173' }) tells the browser this specific origin is allowed. It's a browser-enforced restriction, not a server one — a tool like curl or Postman ignores CORS entirely, which is a common point of confusion."
    },
];

const Interview = () => {
    const [openIndex, setOpenIndex] = useState(null); // tracks which single Q&A is expanded, null = none open

    const toggle = (index) => {
        setOpenIndex(prev => (prev === index ? null : index)); // clicking an open one closes it, clicking a closed one opens it and closes any other
    };

    return (
        <div className="min-h-screen p-8 text-white">
            <div className="mb-8 backdrop-blur-xl bg-white/5 border border-white/10 p-5 rounded-2xl">
                <h1 className="text-3xl font-semibold">🎓 Interview Prep</h1>
                <p className="text-gray-400 mt-1">Talking points pulled from building this project.</p>
            </div>

            <div className="flex flex-col gap-3">
                {QUESTIONS.map((item, index) => (
                    <div
                        key={index} // index is fine here since this list is static and never reordered
                        className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden"
                    >
                        <button
                            onClick={() => toggle(index)}
                            className="w-full text-left p-5 flex justify-between items-center cursor-pointer hover:bg-white/5 transition"
                        >
                            <div>
                                <span className="text-xs uppercase tracking-wide text-blue-400">{item.category}</span>
                                <h3 className="font-semibold mt-1">{item.q}</h3>
                            </div>
                            <span className={`text-xl transition-transform duration-300 ${openIndex === index ? "rotate-180" : ""}`}>
                                ▾
                            </span>
                        </button>

                        {openIndex === index && ( // only render the answer when this item is the open one, keeps the DOM light
                            <div className="px-5 pb-5 text-gray-300 leading-relaxed">
                                 {item.a}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Interview;