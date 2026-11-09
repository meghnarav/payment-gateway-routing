"use client";

import { motion } from "framer-motion";
import {
  Activity,
  Circle,
  GitBranch,
  Radio
} from "lucide-react";
import { ChaosControlDeck } from "@/app/components/ChaosControlDeck";
import { FlowBoard } from "@/app/components/FlowBoard";
import { MetricGrid } from "@/app/components/MetricGrid";
import { TimeSeriesChart } from "@/app/components/TimeSeriesChart";
import { ExportReportButton } from "@/app/components/ExportReportButton";
import { usePaymentSimulation } from "@/app/lib/usePaymentSimulation";

export default function Home() {
  const simulation = usePaymentSimulation();
  const { gateways, outage: chaosMode } = simulation;

  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b-2 border-ink px-5 py-5 md:px-8">
        <div className="mx-auto flex max-w-[1600px] flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 place-items-center border-2 border-ink bg-bauhaus-red shadow-hard">
              <GitBranch size={26} strokeWidth={2.5} />
            </div>
            <div>
              <div className="mb-1 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em]">
                <span className="pulse-dot h-2 w-2 rounded-full bg-bauhaus-blue" />
                Production control room / v1.0.4
              </div>
              <h1 className="text-3xl font-black uppercase leading-none tracking-[-0.06em] md:text-5xl">
                Route <span className="text-bauhaus-red">/</span> Control
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3 font-mono text-xs font-bold uppercase">
            <ExportReportButton
              algorithm={simulation.algorithm}
              gateways={gateways}
              overallPsr={simulation.overallPsr}
              recoveredTransactions={simulation.recoveredTransactions}
              recoveredRevenue={simulation.recoveredRevenue}
              throughputPerSecond={simulation.throughput}
            />
            <div className="border-2 border-ink bg-bauhaus-yellow px-3 py-2">Live system</div>
            <div className="flex items-center gap-2 border-2 border-ink bg-paper px-3 py-2">
              <Activity size={14} /> 42ms ingest lag
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] lg:grid-cols-[270px_1fr]">
        <ChaosControlDeck {...simulation} />

        <section className="min-w-0">
          <div className="border-b-2 border-ink p-5 md:p-7">
            <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
              <div>
                <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em]">01 / live routing schematic</div>
                <h2 className="text-3xl font-black uppercase leading-none tracking-[-0.06em] md:text-4xl">Traffic in motion</h2>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs uppercase">
                <Radio size={16} className="text-bauhaus-red" /> Streaming from Redis
              </div>
            </div>
            <FlowBoard gateways={gateways} outage={chaosMode} algorithm={simulation.algorithm} />
          </div>

          <MetricGrid overallPsr={simulation.overallPsr} recoveredRevenue={simulation.recoveredRevenue} outage={chaosMode} />

          <div className="grid gap-0 xl:grid-cols-[1.4fr_1fr]">
            <div className="border-b-2 border-ink p-5 md:p-7 xl:border-r-2 xl:border-b-0">
              <div className="mb-7 flex items-end justify-between">
                <div>
                  <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em]">02 / performance analytics</div>
                  <h2 className="text-2xl font-black uppercase tracking-[-0.05em]">Throughput velocity</h2>
                </div>
                <div className="font-mono text-xs font-bold">LAST 90 MIN</div>
              </div>
              <TimeSeriesChart data={simulation.psrHistory} />
            </div>
            <div className="p-5 md:p-7">
              <div className="mb-7">
                <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em]">03 / allocation</div>
                <h2 className="text-2xl font-black uppercase tracking-[-0.05em]">Traffic split</h2>
              </div>
              <div className="mb-8 flex h-10 border-2 border-ink">
                <motion.div animate={{ width: `${gateways[0].load}%` }} className="bg-bauhaus-red" />
                <motion.div animate={{ width: `${gateways[1].load}%` }} className="bg-bauhaus-blue" />
              </div>
              <div className="space-y-4 font-mono text-xs font-bold uppercase">
                {gateways.map((gateway) => (
                  <div key={gateway.code} className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><Circle size={10} fill={gateway.color === "red" ? "#E63926" : "#1D4ED8"} />{gateway.name}</span>
                    <span>{gateway.load}%</span>
                  </div>
                ))}
              </div>
              <div className="mt-10 border-2 border-ink bg-bauhaus-yellow p-4 font-mono text-[10px] font-bold uppercase leading-relaxed">
                <span className="mb-1 block">Bandit signal</span>
                {simulation.algorithm === "mab" ? "Exploration is active: 5% of traffic probes the alternate arm." : `${simulation.algorithm === "static" ? "Static baseline" : "Rolling health failover"} is controlling allocation.`}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
