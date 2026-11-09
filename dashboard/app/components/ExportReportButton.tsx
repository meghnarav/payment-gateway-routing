"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { createExperimentReport, reportToCsv, type ReportFormat } from "@/app/lib/exportReport";
import type { GatewaySimulation, SimulationAlgorithm } from "@/app/lib/usePaymentSimulation";

type Props = {
  algorithm: SimulationAlgorithm;
  gateways: GatewaySimulation[];
  overallPsr: number;
  recoveredTransactions: number;
  recoveredRevenue: number;
  throughputPerSecond: number;
};

export function ExportReportButton(props: Props) {
  const [format, setFormat] = useState<ReportFormat>("json");

  const downloadReport = () => {
    const report = createExperimentReport(
      props.algorithm,
      props.gateways,
      props.overallPsr,
      props.recoveredTransactions,
      props.recoveredRevenue,
      props.throughputPerSecond
    );
    const isCsv = format === "csv";
    const content = isCsv ? reportToCsv(report) : JSON.stringify(report, null, 2);
    const blob = new Blob([content], { type: isCsv ? "text/csv;charset=utf-8" : "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payment-routing-report-${new Date().toISOString().slice(0, 10)}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center border-2 border-ink bg-paper">
      <select
        aria-label="Export report format"
        value={format}
        onChange={(event) => setFormat(event.target.value as ReportFormat)}
        className="h-full border-r-2 border-ink bg-paper px-2 py-2 font-mono text-[10px] font-bold uppercase outline-none"
      >
        <option value="json">JSON</option>
        <option value="csv">CSV</option>
      </select>
      <button
        type="button"
        onClick={downloadReport}
        className="flex items-center gap-2 px-3 py-2 font-mono text-[10px] font-bold uppercase transition-colors hover:bg-bauhaus-yellow"
      >
        <Download size={14} /> Export system report
      </button>
    </div>
  );
}
