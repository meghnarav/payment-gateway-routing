"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CircleDot, Router, ShieldCheck } from "lucide-react";
import type { GatewaySimulation } from "../lib/usePaymentSimulation";

type Packet = {
  id: number;
  gateway: "primary" | "backup";
  outcome: "success" | "failure" | "rerouted";
};

type Props = {
  gateways: GatewaySimulation[];
  outage: boolean;
  algorithm: string;
};

export function FlowBoard({ gateways, outage, algorithm }: Props) {
  const [packets, setPackets] = useState<Packet[]>([]);
  const leader = gateways.reduce((best, gateway) => gateway.psr > best.psr ? gateway : best);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPackets((current) => {
        const id = Date.now();
        const gateway: Packet["gateway"] = Math.random() < leader.load / 100 ? "primary" : "backup";
        const selected = gateways[gateway === "primary" ? 0 : 1];
        const rerouted = algorithm !== "static" && selected.code !== leader.code;
        const success = Math.random() < selected.psr / 100;
        const outcome: Packet["outcome"] = rerouted ? "rerouted" : success ? "success" : "failure";
        return [
          ...current,
          { id, gateway, outcome }
        ].slice(-10);
      });
    }, 420);
    return () => window.clearInterval(timer);
  }, [algorithm, gateways, leader.code, leader.load]);

  return (
    <div className="relative overflow-hidden border-2 border-ink bg-white p-4 md:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em]">01 / flow board</div>
          <h2 className="text-2xl font-black uppercase tracking-[-0.06em]">Transaction stream</h2>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase">
          <span className="pulse-dot h-2 w-2 rounded-full bg-bauhaus-blue" /> 50 tx / sec
        </div>
      </div>
      <div className="grid min-h-[260px] gap-3 md:grid-cols-[130px_1fr_180px] md:items-center">
        <div className="grid place-items-center border-2 border-ink bg-paper p-5 text-center">
          <CircleDot size={30} />
          <strong className="mt-3 font-mono text-[10px] uppercase">Merchant<br />traffic</strong>
        </div>
        <div className="relative h-full min-h-[170px]">
          <div className="absolute left-0 right-0 top-1/2 border-t-2 border-dashed border-ink" />
          <motion.div
            animate={{ x: ["0%", "100%"] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
            className="absolute left-0 top-[calc(50%-8px)] h-4 w-4 rounded-full border-2 border-ink bg-bauhaus-yellow"
          />
          <div className="absolute left-1/2 top-1/2 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center border-2 border-ink bg-bauhaus-yellow shadow-hard">
            <Router size={30} />
            <span className="font-mono text-[8px] font-bold uppercase">MAB<br />router</span>
          </div>
          {packets.map((packet, index) => (
            <motion.div
              key={packet.id}
              initial={{ x: "12%", y: "50%", opacity: 0 }}
              animate={{ x: "88%", y: packet.gateway === "primary" ? "25%" : "75%", opacity: [0, 1, 1, 0] }}
              transition={{ duration: 1.25, ease: "easeInOut", delay: index * 0.02 }}
              className={`absolute h-3 w-3 rounded-full border-2 border-ink ${
                packet.outcome === "success" ? "bg-bauhaus-blue" : packet.outcome === "failure" ? "bg-bauhaus-red" : "bg-bauhaus-yellow"
              }`}
            />
          ))}
          <div className="absolute bottom-1 left-0 right-0 flex justify-between font-mono text-[9px] uppercase">
            <span>Ingress</span><span>Decision plane</span><span>Egress</span>
          </div>
        </div>
        <div className="space-y-3">
          {gateways.map((gateway) => (
            <div key={gateway.code} className="border-2 border-ink p-3">
              <div className="flex items-center justify-between font-mono text-[10px] font-bold uppercase">
                <span className="flex items-center gap-2"><span className={`h-3 w-3 rounded-full ${gateway.color === "red" ? "bg-bauhaus-red" : "bg-bauhaus-blue"}`} />{gateway.code}</span>
                <ArrowRight size={14} />
              </div>
              <div className="mt-2 flex items-center justify-between font-mono text-[9px] uppercase">
                <span>{gateway.status}</span><strong>{gateway.psr.toFixed(1)}%</strong>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-4 border-t-2 border-ink pt-3 font-mono text-[9px] font-bold uppercase">
        <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full border-2 border-ink bg-bauhaus-blue" /> Success</span>
        <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full border-2 border-ink bg-bauhaus-red" /> Failure</span>
        <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full border-2 border-ink bg-bauhaus-yellow" /> Re-routed</span>
        {outage && <span className="ml-auto flex items-center gap-1 text-bauhaus-red"><ShieldCheck size={12} /> Outage active</span>}
      </div>
    </div>
  );
}
