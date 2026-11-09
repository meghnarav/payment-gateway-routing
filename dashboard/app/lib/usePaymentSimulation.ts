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
  const reset = useCallback(() => {
    setHistory([]);
    setTicks(0);
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
        const primaryHealth = primaryVolume
          ? primaryPsr / primaryVolume
          : outage ? PRIMARY_OUTAGE_PSR : PRIMARY_PSR;
        const backupHealth = backupVolume ? backupPsr / backupVolume : BACKUP_PSR;

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
        const nextHistory = [...current, { gateway: selectedGateway, successes, transactions: TICK_RATE }].slice(-WINDOW_TICKS);

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
      const expectedPsr = gateway === "primary"
        ? (outage ? PRIMARY_OUTAGE_PSR : PRIMARY_PSR)
        : BACKUP_PSR;
      const psr = transactions ? (successes / transactions) * 100 : expectedPsr * 100;

      return {
        name: gateway === "primary" ? "Gateway A / HDFC" : "Gateway B / Backup",
        code: gateway === "primary" ? "GW-A" : "GW-B",
        psr,
        latency: gateway === "primary" && outage ? latency + 700 : latency,
        color: gateway === "primary" ? "red" : "blue",
        load: 0,
        status: statusFor(psr),
        transactions,
        successes
      };
    });
  }, [history, latency, outage]);

  const allocation = useMemo(() => {
    const primaryIsDegraded = gateways[0].psr < 75;

    if (algorithm === "static") {
      return { primary: 100, backup: 0 };
    }

    if (algorithm === "rolling") {
      return primaryIsDegraded
        ? { primary: 0, backup: 100 }
        : { primary: 100, backup: 0 };
    }

    return gateways[0].psr >= gateways[1].psr
      ? { primary: 95, backup: 5 }
      : { primary: 5, backup: 95 };
  }, [algorithm, gateways]);

  const gatewaysWithAllocation = useMemo(
    () => gateways.map((gateway, index) => ({
      ...gateway,
      load: index === 0 ? allocation.primary : allocation.backup
    })),
    [allocation, gateways]
  );

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

  const staticBaselinePsr = gatewaysWithAllocation[0].psr;
  const overallPsr = useMemo(
    () => gatewaysWithAllocation.reduce(
      (sum, gateway) => sum + gateway.psr * (gateway.load / 100),
      0
    ),
    [gatewaysWithAllocation]
  );
  const psrDelta = overallPsr - staticBaselinePsr;
  const recoveredTransactions = algorithm === "static"
    ? 0
    : Math.max(0, ticks * TICK_RATE * (psrDelta / 100));

  return {
    algorithm,
    setAlgorithm,
    gateways: gatewaysWithAllocation,
    latency,
    setLatency,
    outage,
    setOutage,
    recoveredTransactions,
    recoveredRevenue: recoveredTransactions * 42.5,
    overallPsr,
    staticBaselinePsr,
    psrDelta,
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
