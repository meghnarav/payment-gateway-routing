# Product Requirements: Gateway Health-Based Failover Routing

## 1. Problem Statement
Payment gateways experience micro-downtimes and intermittent bank API drop-offs that standard round-robin or static routing cannot handle. Transactions routed to a degraded gateway fail or time out, directly causing customer churn and lost checkout revenue.

## 2. Core Metrics
* **Primary Metric (North Star):** Payment Success Rate (PSR) — target +2.5% lift across all checkout traffic.
* **Secondary Metric:** P95 Latency per successful transaction — target < 2500ms.
* **Guardrail Metric:** Blended Gateway Fee — must not increase by more than 0.15% overall.

## 3. System Rules
* **Degradation Threshold:** If a gateway's rolling 15-minute success rate drops below 75% on a minimum sample of 50 transactions, mark status as `DEGRADED`.
* **Routing Action:** Automatically shift 90% of checkout traffic to the secondary active gateway. Keep 10% canary traffic on the primary gateway to probe for recovery.
* **Recovery Action:** Once primary gateway success rate remains >= 85% for 3 consecutive windows, restore standard volume allocation.

## 4. Rollout Strategy
* **Phase 1 (Canary):** 10% traffic on dynamic routing for 3 days.
* **Phase 2 (50/50 Split):** Run A/B test across 50,000 transactions to validate statistical significance.
* **Phase 3 (General Availability):** 100% deployment with automatic circuit breaker.