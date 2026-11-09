import { AlertTriangle, Gauge, Radio, RotateCcw, SlidersHorizontal, ToggleRight, Zap } from "lucide-react";
import type { SimulationAlgorithm, GatewaySimulation } from "../lib/usePaymentSimulation";

type Props = {
  algorithm: SimulationAlgorithm;
  setAlgorithm: (algorithm: SimulationAlgorithm) => void;
  outage: boolean;
  setOutage: (outage: boolean) => void;
  latency: number;
  setLatency: (latency: number) => void;
  gateways: GatewaySimulation[];
  recoveredTransactions: number;
  throughput: number;
  ticks: number;
  reset: () => void;
};

const algorithms: { value: SimulationAlgorithm; label: string; note: string }[] = [
  { value: "static", label: "Static Baseline", note: "Always route to HDFC" },
  { value: "rolling", label: "15-min Rolling Health Failover", note: "Follow current PSR leader" },
  { value: "mab", label: "Epsilon-Greedy MAB", note: "95% exploit / 5% explore" }
];

export function ChaosControlDeck(props: Props) {
  const primary = props.gateways[0];
  return (
    <aside className="border-b-2 border-ink p-5 lg:border-r-2 lg:border-b-0 md:p-7">
      <div className="mb-8 flex items-center justify-between">
        <h2 className="font-mono text-xs font-bold uppercase tracking-[0.2em]">Chaos control deck</h2>
        <SlidersHorizontal size={18} />
      </div>
      <div className="mb-6 border-2 border-ink bg-bauhaus-red p-4 text-white shadow-hard">
        <div className="mb-5 flex items-center justify-between">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest">Primary gateway</span>
          <Zap size={18} />
        </div>
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xl font-black uppercase leading-none tracking-[-0.05em]">HDFC / GW-A</p>
            <p className="mt-2 font-mono text-[10px] uppercase">{props.outage ? "Micro-outage injected" : "Nominal operation"}</p>
          </div>
          <button
            type="button"
            aria-pressed={props.outage}
            onClick={() => props.setOutage(!props.outage)}
            className={`grid h-10 w-16 place-items-center border-2 border-ink ${props.outage ? "bg-bauhaus-yellow text-ink" : "bg-paper text-ink"}`}
          >
            <ToggleRight size={25} className={props.outage ? "rotate-180" : ""} />
          </button>
        </div>
        <button
          onClick={() => props.setOutage(!props.outage)}
          className="w-full border-2 border-ink bg-paper px-3 py-3 text-left font-mono text-[10px] font-bold uppercase text-ink"
        >
          Force Primary Gateway (HDFC) Micro-Outage
        </button>
      </div>
      <label className="mb-7 block">
        <span className="mb-3 flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-widest">
          <span className="flex items-center gap-2"><Gauge size={13} /> Bank network latency</span>
          <strong>{props.latency}ms</strong>
        </span>
        <input
          type="range"
          min="50"
          max="4000"
          step="10"
          value={props.latency}
          onChange={(event) => props.setLatency(Number(event.target.value))}
          className="w-full accent-bauhaus-blue"
        />
        <span className="mt-2 flex justify-between font-mono text-[9px] uppercase"><span>50ms</span><span>4000ms</span></span>
      </label>
      <fieldset className="mb-7">
        <legend className="mb-3 font-mono text-[10px] font-bold uppercase tracking-widest">Routing algorithm</legend>
        <div className="space-y-2">
          {algorithms.map((option) => (
            <label key={option.value} className={`block cursor-pointer border-2 border-ink p-3 ${props.algorithm === option.value ? "bg-bauhaus-yellow" : "bg-paper"}`}>
              <span className="flex items-start gap-3">
                <input
                  type="radio"
                  name="algorithm"
                  value={option.value}
                  checked={props.algorithm === option.value}
                  onChange={() => props.setAlgorithm(option.value)}
                  className="mt-1 accent-bauhaus-blue"
                />
                <span>
                  <strong className="block font-mono text-[10px] uppercase">{option.label}</strong>
                  <small className="mt-1 block font-mono text-[9px] uppercase">{option.note}</small>
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-2">
        <div className="border-2 border-ink bg-bauhaus-blue p-3 text-white">
          <span className="block font-mono text-[9px] uppercase">Recovered tx</span>
          <strong className="mt-1 block font-mono text-2xl">{props.recoveredTransactions.toLocaleString()}</strong>
        </div>
        <div className="border-2 border-ink bg-paper p-3">
          <span className="block font-mono text-[9px] uppercase">Throughput</span>
          <strong className="mt-1 block font-mono text-2xl">{props.throughput}<small className="text-[10px]">/sec</small></strong>
        </div>
      </div>
      <div className="mt-5 border-t-2 border-ink pt-4 font-mono text-[10px] uppercase leading-relaxed">
        <div className="mb-2 flex items-center justify-between"><span className="flex items-center gap-2"><Radio size={12} /> Simulation ticks</span><strong>{props.ticks}</strong></div>
        <div className="mb-2 flex items-center justify-between"><span className="flex items-center gap-2"><AlertTriangle size={12} /> Primary status</span><strong className={primary.status === "DEGRADED" ? "text-bauhaus-red" : "text-bauhaus-blue"}>{primary.status}</strong></div>
        <button onClick={props.reset} className="mt-3 flex w-full items-center justify-center gap-2 border-2 border-ink px-3 py-2 font-mono text-[10px] font-bold uppercase hover:bg-bauhaus-yellow"><RotateCcw size={13} /> Reset simulation</button>
      </div>
    </aside>
  );
}
