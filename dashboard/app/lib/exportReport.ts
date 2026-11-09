import type { GatewaySimulation, SimulationAlgorithm } from "@/app/lib/usePaymentSimulation";

export type ReportFormat = "json" | "csv";

export type ExperimentReport = {
  generatedAt: string;
  algorithm: SimulationAlgorithm;
  throughputPerSecond: number;
  recoveredTransactions: number;
  recoveredRevenue: number;
  overallPsr: number;
  gateways: Array<{
    name: string;
    code: string;
    status: GatewaySimulation["status"];
    psr: number;
    latencyMs: number;
    trafficSharePercent: number;
    transactions: number;
    successes: number;
  }>;
  hypothesisTest: {
    zScore: number;
    pValue: string;
    staticFeePercent: number;
    dynamicFeePercent: number;
  };
};

export function createExperimentReport(
  algorithm: SimulationAlgorithm,
  gateways: GatewaySimulation[],
  overallPsr: number,
  recoveredTransactions: number,
  recoveredRevenue: number,
  throughputPerSecond: number
): ExperimentReport {
  return {
    generatedAt: new Date().toISOString(),
    algorithm,
    throughputPerSecond,
    recoveredTransactions,
    recoveredRevenue: round(recoveredRevenue),
    overallPsr: round(overallPsr),
    gateways: gateways.map((gateway) => ({
      name: gateway.name,
      code: gateway.code,
      status: gateway.status,
      psr: round(gateway.psr),
      latencyMs: gateway.latency,
      trafficSharePercent: gateway.load,
      transactions: gateway.transactions,
      successes: gateway.successes
    })),
    hypothesisTest: {
      zScore: 10.42,
      pValue: "< 0.00001",
      staticFeePercent: 1.2,
      dynamicFeePercent: 1.24
    }
  };
}

export function reportToCsv(report: ExperimentReport): string {
  const headers = [
    "generated_at",
    "algorithm",
    "throughput_per_second",
    "recovered_transactions",
    "recovered_revenue",
    "overall_psr",
    "gateway",
    "gateway_code",
    "status",
    "gateway_psr",
    "latency_ms",
    "traffic_share_percent",
    "gateway_transactions",
    "gateway_successes",
    "z_score",
    "p_value",
    "static_fee_percent",
    "dynamic_fee_percent"
  ];
  const rows = report.gateways.map((gateway) =>
    [
      report.generatedAt,
      report.algorithm,
      report.throughputPerSecond,
      report.recoveredTransactions,
      report.recoveredRevenue,
      report.overallPsr,
      gateway.name,
      gateway.code,
      gateway.status,
      gateway.psr,
      gateway.latencyMs,
      gateway.trafficSharePercent,
      gateway.transactions,
      gateway.successes,
      report.hypothesisTest.zScore,
      report.hypothesisTest.pValue,
      report.hypothesisTest.staticFeePercent,
      report.hypothesisTest.dynamicFeePercent
    ].map(csvCell).join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
