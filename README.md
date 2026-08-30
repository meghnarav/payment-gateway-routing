# Payment Gateway Health-Based Failover Routing

An analytical framework and simulation testing dynamic gateway failover mechanisms against static routing rules to optimize Payment Success Rates (PSR) during provider micro-downtimes.

## Architecture & Data Flow

```text
Merchant Checkout Intent
        │
        ▼
┌───────────────────────────────────────────────┐
│ Routing Evaluator                             │
│ ├─ Static Route: Primary Gateway              │
│ └─ Dynamic Failover: Rolling 15-min Window    │
└──────────────────────┬────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│ Primary Gateway │         │ Backup Gateway  │
│ (e.g. HDFC)     │         │ (e.g. Razorpay) │
└─────────────────┘         └─────────────────┘
```

---

## Problem Statement

Payment gateways experience transient network degradation, bank-side latency spikes, and micro-outages lasting 15–45 minutes. Under static routing setups, failure rates surge on primary channels, driving user drop-offs and lost checkout volume.

---

## Implementation Details

* **Schema & Indexing (`sql/`):** PostgreSQL database structure tracking high-throughput transaction events with B-tree and BRIN indexes for fast time-series rollups.
* **Rolling Health Monitoring (`sql/02_gateway_health.sql`):** Time-bucketed SQL calculations computing rolling success percentages and labeling providers as `HEALTHY`, `MONITOR`, or `DEGRADED`.
* **Experiment Validation (`src/analyze_experiment.py`):** Two-sample proportions Z-test comparing static routing vs. threshold-based dynamic failover on a sample of 50,000 transactions.
* **Cost Impact Analysis (`sql/04_cost_summary.sql`):** Calculation of blended processing fee differences across failover events.

---

## Results Summary

| Metric | Static Routing | Dynamic Failover | Delta |
| :--- | :--- | :--- | :--- |
| **Payment Success Rate (PSR)** | 84.62% | 87.89% | **+3.27%** |
| **Statistical Significance** | - | $p < 0.00001$ | Significant ($Z = 10.42$) |
| **Effective Blended Fee** | 1.20% | 1.24% | **+0.04%** |

---

## Setup & Reproduction

1. **Clone repository:**
   ```bash
   git clone https://github.com/meghnarav/payment-gateway-routing.git
   cd payment-gateway-routing
   ```

2. **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

3. **Generate transaction dataset:**
    ```bash
    python src/generate_data.py
    ```

4. **Run hypothesis testing:**
    ```bash
    python src/analyze_experiment.py
    ```

5. **Execute cost evaluation:**
    ```bash
    python src/simulate_routing.py
    ```
