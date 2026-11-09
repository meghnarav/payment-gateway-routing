"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import type { PsrHistoryPoint } from "../lib/usePaymentSimulation";

export function TimeSeriesChart({ data }: { data: PsrHistoryPoint[] }) {
  return (
    <div className="border-2 border-ink bg-white p-5 md:p-7">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em]">02 / PSR telemetry</div>
          <h2 className="text-2xl font-black uppercase tracking-[-0.06em]">Rolling health comparison</h2>
        </div>
        <span className="font-mono text-[10px] uppercase">15 ticks</span>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="#121212" strokeDasharray="2 5" opacity={0.2} />
            <XAxis dataKey="tick" tick={{ fill: "#121212", fontSize: 10, fontFamily: "monospace" }} axisLine={{ stroke: "#121212", strokeWidth: 2 }} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: "#121212", fontSize: 10, fontFamily: "monospace" }} axisLine={{ stroke: "#121212", strokeWidth: 2 }} tickLine={false} />
            <Tooltip contentStyle={{ border: "2px solid #121212", borderRadius: 0, background: "#F4F1EA", fontFamily: "monospace", fontSize: 11 }} />
            <Legend wrapperStyle={{ fontFamily: "monospace", fontSize: 10, textTransform: "uppercase" }} />
            <Line type="monotone" dataKey="primary" name="HDFC / Primary" stroke="#E63926" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: "#F5C400", stroke: "#121212", strokeWidth: 2 }} />
            <Line type="monotone" dataKey="backup" name="Backup" stroke="#121212" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: "#1D4ED8", stroke: "#121212", strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
