"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { GatewaySimulation } from "@/app/lib/usePaymentSimulation";

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

const FLOW = {
  ingress: { x: 190, y: 165 },
  routerIn: { x: 430, y: 165 },
  routerOut: { x: 570, y: 165 },
  fork: { x: 650, y: 165 },
  primary: { x: 810, y: 95 },
  backup: { x: 810, y: 235 }
} as const;

const packetColor = {
  success: "#1D4ED8",
  failure: "#E63926",
  rerouted: "#F5C400"
} as const;

const pathFor = (gateway: Packet["gateway"]) => {
  const target = FLOW[gateway === "primary" ? "primary" : "backup"];
  return `M ${FLOW.ingress.x} ${FLOW.ingress.y} H ${FLOW.routerIn.x} H ${FLOW.routerOut.x} H ${FLOW.fork.x} V ${target.y} H ${target.x}`;
};

export function FlowBoard({ gateways, outage, algorithm }: Props) {
  const [packets, setPackets] = useState<Packet[]>([]);
  const leader = gateways.reduce((best, gateway) => (gateway.psr > best.psr ? gateway : best));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPackets((current) => {
        const gateway: Packet["gateway"] = Math.random() < leader.load / 100 ? "primary" : "backup";
        const selected = gateways[gateway === "primary" ? 0 : 1];
        const rerouted = algorithm !== "static" && selected.code !== leader.code;
        const outcome: Packet["outcome"] = rerouted
          ? "rerouted"
          : Math.random() < selected.psr / 100
            ? "success"
            : "failure";

        return [...current, { id: Date.now(), gateway, outcome }].slice(-8);
      });
    }, 420);

    return () => window.clearInterval(timer);
  }, [algorithm, gateways, leader.code, leader.load]);

  return (
    <div className="relative overflow-hidden border-2 border-ink bg-white p-4 md:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="mb-2 inline-block bg-bauhaus-yellow px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em]">
            01 / flow board
          </div>
          <h2 className="text-2xl font-black uppercase tracking-[-0.06em]">Transaction stream</h2>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase">
          <span className="pulse-dot h-2 w-2 rounded-full bg-bauhaus-blue" /> 50 tx / sec
        </div>
      </div>

      <div className="overflow-x-auto border-y-2 border-ink bg-paper">
        <svg
          aria-label="Animated transaction routing flow"
          className="block h-[330px] min-w-[900px] w-full"
          viewBox="0 0 1000 330"
          role="img"
        >
          <path
            d={`M ${FLOW.ingress.x} ${FLOW.ingress.y} H ${FLOW.routerIn.x} H ${FLOW.routerOut.x}`}
            fill="none"
            stroke="#121212"
            strokeDasharray="7 7"
            strokeWidth="3"
          />
          <path
            d={`M ${FLOW.routerOut.x} ${FLOW.routerOut.y} H ${FLOW.fork.x} V ${FLOW.primary.y} H ${FLOW.primary.x}`}
            fill="none"
            stroke="#121212"
            strokeDasharray="7 7"
            strokeWidth="3"
          />
          <path
            d={`M ${FLOW.routerOut.x} ${FLOW.routerOut.y} H ${FLOW.fork.x} V ${FLOW.backup.y} H ${FLOW.backup.x}`}
            fill="none"
            stroke="#121212"
            strokeDasharray="7 7"
            strokeWidth="3"
          />

          {packets.map((packet) => {
            const target = FLOW[packet.gateway];
            return (
              <motion.circle
                key={packet.id}
                r="7"
                fill={packetColor[packet.outcome]}
                stroke="#121212"
                strokeWidth="2"
                initial={{ cx: FLOW.ingress.x, cy: FLOW.ingress.y, opacity: 0 }}
                animate={{
                  cx: [FLOW.ingress.x, FLOW.routerIn.x, FLOW.routerOut.x, FLOW.fork.x, FLOW.fork.x, target.x],
                  cy: [FLOW.ingress.y, FLOW.ingress.y, FLOW.routerOut.y, FLOW.fork.y, target.y, target.y],
                  opacity: [0, 1, 1, 1, 1, 0]
                }}
                transition={{ duration: 1.5, ease: "linear", times: [0, 0.2, 0.4, 0.58, 0.78, 1] }}
              />
            );
          })}

          <rect x="20" y="120" width="170" height="90" fill="#FFFFFF" stroke="#121212" strokeWidth="3" />
          <circle cx="105" cy="153" r="15" fill="#F4F1EA" stroke="#121212" strokeWidth="3" />
          <circle cx="105" cy="153" r="4" fill="#121212" />
          <text x="105" y="184" fill="#121212" fontFamily="monospace" fontSize="11" fontWeight="700" textAnchor="middle">MERCHANT TRAFFIC</text>

          <rect x="430" y="115" width="140" height="100" fill="#F5C400" stroke="#121212" strokeWidth="3" />
          <rect x="438" y="123" width="140" height="100" fill="#121212" opacity="0.9" />
          <rect x="430" y="115" width="140" height="100" fill="#F5C400" stroke="#121212" strokeWidth="3" />
          <text x="500" y="153" fill="#121212" fontFamily="monospace" fontSize="11" fontWeight="700" textAnchor="middle">MAB ROUTER</text>
          <text x="500" y="174" fill="#121212" fontFamily="monospace" fontSize="9" textAnchor="middle">DECISION PLANE</text>

          {gateways.map((gateway, index) => {
            const target = index === 0 ? FLOW.primary : FLOW.backup;
            const accent = gateway.color === "red" ? "#E63926" : "#1D4ED8";
            return (
              <g key={gateway.code}>
                <rect x={target.x} y={target.y - 35} width="170" height="70" fill="#FFFFFF" stroke="#121212" strokeWidth="3" />
                <circle cx={target.x + 18} cy={target.y - 12} r="8" fill={accent} />
                <text x={target.x + 34} y={target.y - 8} fill="#121212" fontFamily="monospace" fontSize="11" fontWeight="700">{gateway.code}</text>
                <text x={target.x + 15} y={target.y + 16} fill="#121212" fontFamily="monospace" fontSize="9">{gateway.status}</text>
                <text x={target.x + 155} y={target.y + 16} fill="#121212" fontFamily="monospace" fontSize="11" fontWeight="700" textAnchor="end">{gateway.psr.toFixed(1)}%</text>
              </g>
            );
          })}

          <text x="105" y="292" fill="#121212" fontFamily="monospace" fontSize="10" fontWeight="700" textAnchor="middle">01 / INGRESS</text>
          <text x="500" y="292" fill="#121212" fontFamily="monospace" fontSize="10" fontWeight="700" textAnchor="middle">02 / DECISION PLANE</text>
          <text x="895" y="292" fill="#121212" fontFamily="monospace" fontSize="10" fontWeight="700" textAnchor="middle">03 / EGRESS BRANCHES</text>
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 border-t-2 border-ink pt-3 font-mono text-[9px] font-bold uppercase">
        <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full border-2 border-ink bg-bauhaus-blue" /> Success</span>
        <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full border-2 border-ink bg-bauhaus-red" /> Failure</span>
        <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full border-2 border-ink bg-bauhaus-yellow" /> Re-routed</span>
        {outage && <span className="ml-auto font-bold text-bauhaus-red">Outage active</span>}
      </div>
    </div>
  );
}
