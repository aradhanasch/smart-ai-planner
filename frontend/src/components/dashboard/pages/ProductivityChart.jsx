import React, { useEffect, useState } from "react";
import axiosInstance from "../../../utils/axiosInstance.js";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// This component only handles FETCHING + RESHAPING data for the chart.
// It doesn't know anything about study plans or sessions conceptually —
// that separation is deliberate, so Analytics.jsx can reuse it for any dataset.
const ProductivityChart = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await axiosInstance.get("/api/planner/analytics");

                // backend returns raw grouped rows like:
                // { _id: { date: "2026-09-10", status: "completed" }, totalHours: 2 }
                // we need to RESHAPE this into one row per date with separate
                // completed/missed columns, which is what Recharts expects
                const byDate = {};
                res.data.stats.forEach((row) => {
                    const { date, status } = row._id;
                    if (!byDate[date]) byDate[date] = { date, completed: 0, missed: 0 };
                    byDate[date][status] = row.totalHours;
                });

                setData(Object.values(byDate));
            } catch (err) {
                console.log(err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) return <p className="text-slate-400">Loading chart...</p>;
    if (!data.length) return <p className="text-slate-400">No session data yet — create a study plan first.</p>;

    return (
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-white">
            <h2 className="text-lg font-semibold mb-4">Hours Studied Per Day</h2>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip contentStyle={{ background: "#1e293b", border: "none", borderRadius: 8 }} />
                    <Line type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} />
                    <Line type="monotone" dataKey="missed" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ProductivityChart;