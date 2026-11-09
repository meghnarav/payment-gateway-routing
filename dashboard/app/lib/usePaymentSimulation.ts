import { useCallback, useEffect, useMemo, useState } from "react";

export type SimulationAlgorithm =
  | "static"
  | "rolling"
  | "mab";

export type GatewayStatus = "HEALTHY" | "MONITOR" | "DEGRADED";

export type GatewaySimulation = {
  name: string;
  code: string;
  psr: number;
  latency: number;
  color: "red" | "blue";
  load: number;
  status: GatewayStatus;
  transactions: number;
  successes: number;
};

type Tick = {
  gateway: "primary" | "backup";
  successes: number;
  transactions: number;
};

export type PsrHistoryPoint = {
  tick: number;
  primary: number;
  backup: number;
};

const TICK_RATE = 50;
const WINDOW_TICKS = 15;
const PRIMARY_PSR = 0.985;
const PRIMARY_OUTAGE_PSR = 0.35;
const BACKUP_PSR = 0.97;

const statusFor = (psr: number): GatewayStatus => {
  if (psr >= 95) return "HEALTHY";
  if (psr >= 75) return "MONITOR";
  return "DEGRADED";
};

const sampleSuccesses = (transactions: number, probability: number) =>
  Array.from({ length: transactions }, () => Math.random() < probability).filter(Boolean).length;

export function usePaymentSimulation() {
  const [outage, setOutage] = useState(false);
  const [latency, setLatency] = useState(180);
  const [algorithm, setAlgorithm] = useState<SimulationAlgorithm>("mab");
  const [ticks, setTicks] = useState(0);
  const [history, setHistory] = useState<Tick[]>([]);
  const [recoveredTransactions, setRecoveredTransactions] = useState(0);
  const reset = useCallback(() => {
    setHistory([]);
    setTicks(0);
    setRecoveredTransactions(0);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHistory((current) => {
        const primaryPsr = current
          .filter((tick) => tick.gateway === "primary")
          .reduce((sum, tick) => sum + tick.successes, 0);
        const primaryVolume = current
          .filter((tick) => tick.gateway === "primary")
          .reduce((sum, tick) => sum + tick.transactions, 0);
        const backupPsr = current
          .filter((tick) => tick.gateway === "backup")
          .reduce((sum, tick) => sum + tick.successes, 0);
        const backupVolume = current
          .filter((tick) => tick.gateway === "backup")
          .reduce((sum, tick) => sum + tick.transactions, 0);
        const primaryHealth = primaryVolume ? primaryPsr / primaryVolume : 1;
        const backupHealth = backupVolume ? backupPsr / backupVolume : 1;

        const bestGateway = primaryHealth >= backupHealth ? "primary" : "backup";
        const selectedGateway: Tick["gateway"] =
          algorithm === "static"
            ? "primary"
            : algorithm === "rolling"
              ? bestGateway
              : Math.random() < 0.05
                ? bestGateway === "primary" ? "backup" : "primary"
                : bestGateway;
        const latencyPenalty = Math.max(0, (latency - 200) / 20000);
        const primaryProbability = Math.max(
          0,
          (outage ? PRIMARY_OUTAGE_PSR : PRIMARY_PSR) - latencyPenalty
        );
        const backupProbability = Math.max(0, BACKUP_PSR - latencyPenalty);
        const selectedProbability = selectedGateway === "primary" ? primaryProbability : backupProbability;
        const successes = sampleSuccesses(TICK_RATE, selectedProbability);
        const baselineSuccesses = sampleSuccesses(TICK_RATE, primaryProbability);
        const recovered = Math.max(0, successes - baselineSuccesses);
        const nextHistory = [...current, { gateway: selectedGateway, successes, transactions: TICK_RATE }].slice(-WINDOW_TICKS);

        setRecoveredTransactions((value) => value + recovered);
        setTicks((value) => value + 1);
        return nextHistory;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [algorithm, latency, outage]);

  const gateways = useMemo<GatewaySimulation[]>(() => {
    return (["primary", "backup"] as const).map((gateway) => {
      const entries = history.filter((tick) => tick.gateway === gateway);
      const transactions = entries.reduce((sum, tick) => sum + tick.transactions, 0);
      const successes = entries.reduce((sum, tick) => sum + tick.successes, 0);
      const psr = transactions ? (successes / transactions) * 100 : gateway === "primary" && outage ? 35 : 100;
      const load = history.length
        ? Math.round((entries.reduce((sum, tick) => sum + tick.transactions, 0) / history.reduce((sum, tick) => sum + tick.transactions, 0)) * 100)
        : gateway === "primary" ? 68 : 32;

      return {
        name: gateway === "primary" ? "Gateway A / HDFC" : "Gateway B / Backup",
        code: gateway === "primary" ? "GW-A" : "GW-B",
        psr,
        latency: gateway === "primary" && outage ? latency + 700 : latency,
        color: gateway === "primary" ? "red" : "blue",
        load,
        status: statusFor(psr),
        transactions,
        successes
      };
    });
  }, [history, latency, outage]);

  const psrHistory = useMemo<PsrHistoryPoint[]>(() => {
    return history.map((_, index) => {
      const window = history.slice(Math.max(0, index - WINDOW_TICKS + 1), index + 1);
      return {
        tick: index + 1,
        primary: rollingPsr(window, "primary"),
        backup: rollingPsr(window, "backup")
      };
    });
  }, [history]);

  const overallPsr = useMemo(() => {
    const transactions = history.reduce((sum, tick) => sum + tick.transactions, 0);
    const successes = history.reduce((sum, tick) => sum + tick.successes, 0);
    return transactions ? (successes / transactions) * 100 : 0;
  }, [history]);

  return {
    algorithm,
    setAlgorithm,
    gateways,
    latency,
    setLatency,
    outage,
    setOutage,
    recoveredTransactions,
    recoveredRevenue: recoveredTransactions * 42.5,
    overallPsr,
    psrHistory,
    throughput: TICK_RATE,
    ticks,
    reset
  };
}

function rollingPsr(ticks: Tick[], gateway: Tick["gateway"]) {
  const gatewayTicks = ticks.filter((tick) => tick.gateway === gateway);
  const transactions = gatewayTicks.reduce((sum, tick) => sum + tick.transactions, 0);
  const successes = gatewayTicks.reduce((sum, tick) => sum + tick.successes, 0);
  return transactions ? (successes / transactions) * 100 : 100;
}
