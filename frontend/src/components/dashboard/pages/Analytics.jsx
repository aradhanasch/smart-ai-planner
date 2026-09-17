import React from "react";
import ProductivityChart from "./ProductivityChart.jsx";

// Analytics is intentionally a thin "page" component that composes smaller
// pieces (like ProductivityChart) — this is a common React pattern: pages
// orchestrate layout, while the real logic lives in focused child components.
const Analytics = () => {
    return (
        <div className="text-white">
            <h1 className="text-3xl font-semibold mb-6">📊 Analytics</h1>
            <ProductivityChart />
            {/* room to add more cards here later — e.g. streaks, subject breakdowns */}
        </div>
    );
};

export default Analytics;