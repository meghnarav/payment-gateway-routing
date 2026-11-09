import { Activity, BadgeCheck, CircleDollarSign, Percent, TrendingUp } from "lucide-react";

type Props = {
  overallPsr: number;
  recoveredRevenue: number;
  outage: boolean;
};

export function MetricGrid({ overallPsr, recoveredRevenue, outage }: Props) {
  return (
    <div className="grid border-b-2 border-ink md:grid-cols-2 xl:grid-cols-4">
      <Metric icon={<Activity size={18} />} label="Live overall PSR" value={`${overallPsr.toFixed(2)}%`} accent="blue">
        <span className="bg-bauhaus-blue px-2 py-1 text-white">+3.27%</span>
      </Metric>
      <Metric icon={<CircleDollarSign size={18} />} label="Recovered revenue" value={`$${recoveredRevenue.toFixed(2)}`} accent="yellow">
        <span className="font-mono text-[9px] uppercase">{outage ? "Failover protected" : "Baseline protected"}</span>
      </Metric>
      <Metric icon={<Percent size={18} />} label="Blended processing fee" value="1.24%" accent="red">
        <span className="font-mono text-[9px] uppercase">vs 1.20% static</span>
      </Metric>
      <Metric icon={<BadgeCheck size={18} />} label="Hypothesis test" value="Z = 10.42" accent="paper">
        <span className="font-mono text-[9px] font-bold uppercase">p &lt; 0.00001</span>
      </Metric>
    </div>
  );
}

function Metric({ icon, label, value, accent, children }: { icon: React.ReactNode; label: string; value: string; accent: "blue" | "yellow" | "red" | "paper"; children: React.ReactNode }) {
  const backgrounds = { blue: "bg-bauhaus-blue text-white", yellow: "bg-bauhaus-yellow", red: "bg-bauhaus-red text-white", paper: "bg-paper" };
  return (
    <div className="border-b-2 border-ink p-5 last:border-b-0 md:border-r-2 md:border-b-0 md:last:border-r-0 md:p-6">
      <div className="mb-4 flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-widest">
        <span>{label}</span><span>{icon}</span>
      </div>
      <div className="mb-3 font-mono text-3xl font-bold tracking-[-0.08em]">{value}</div>
      <div className={`inline-flex items-center gap-1 ${accent === "paper" ? "border-2 border-ink px-2 py-1" : ""} ${backgrounds[accent]}`}>
        {children}
      </div>
    </div>
  );
}
