# Enterprise Payment Gateway Routing Engine

Real-time, health-aware payment routing for merchants that need resilient
gateway selection, asynchronous outcome processing, and production-grade
observability.

The engine combines:

- **FastAPI** for low-latency payment routing and provider webhooks.
- **Redis Sorted Sets** for a 15-minute rolling Payment Success Rate (PSR).
- **Redis Pub/Sub** to decouple webhook ingestion from outcome processing.
- **PostgreSQL** for durable final transaction state.
- **Epsilon-greedy Multi-Armed Bandit routing** to balance exploitation and
  recovery detection.
- **Prometheus and Grafana** for live operational metrics and dashboards.

## System architecture

```mermaid
flowchart LR
    Merchant[Merchant checkout] -->|POST /route-payment| API[FastAPI routing API]
    API -->|Read rolling PSR| Redis[(Redis)]
    API -->|Selected gateway| GatewayA[Gateway A]
    API -->|Selected gateway| GatewayB[Gateway B]

    GatewayA -->|Async outcome| Webhook["POST /webhook/{gateway}"]
    GatewayB -->|Async outcome| Webhook
    Webhook -->|Publish payment outcome| PubSub[Redis Pub/Sub]
    PubSub --> Worker[Outcome worker]
    Worker -->|Record success/failure event| Redis
    Worker -->|Upsert final transaction state| Postgres[(PostgreSQL)]

    API -->|/metrics| Prometheus[Prometheus]
    Prometheus --> Grafana[Grafana]
```

## Request and outcome flow

1. A merchant sends a payment request to `POST /route-payment`.
2. The API reads each gateway's rolling PSR from Redis and selects a gateway.
3. The response includes a `transaction_id` for provider correlation.
4. The provider sends its eventual result to `POST /webhook/{gateway}`.
5. The webhook publishes the event to Redis Pub/Sub and returns immediately.
6. The worker consumes the event, records the outcome in Redis, and upserts
   the final transaction status in PostgreSQL.

The webhook is intentionally not responsible for database work. This keeps
provider callbacks short and prevents database latency from blocking outcome
acknowledgement.

## Routing algorithms

### Rolling PSR

Each gateway has a Redis Sorted Set:

```text
gateway-events:<gateway-name>
```

Each member contains a success flag and unique event ID, while its score is
the Unix timestamp of the outcome. Events older than 15 minutes are removed
before calculating:

```text
PSR = successful events / total events * 100
```

When a gateway has no observations in the window, its PSR is treated as 100%
so the service remains routable during startup.

### Epsilon-greedy Multi-Armed Bandit

The routing engine compares the live PSR of Gateway A and Gateway B:

- **95% exploitation:** route to the gateway with the highest current PSR.
- **5% exploration:** route to the other gateway, even when it is currently
  degraded, to detect recovery.

An exploratory decision is counted as a failover decision in Prometheus. This
strategy avoids permanently abandoning a recovering gateway while still
concentrating traffic on the strongest observed option.

## API

### Route a payment

```bash
curl -X POST http://localhost:8000/route-payment \
  -H "Content-Type: application/json" \
  -d '{"merchant_id":"merchant-123","amount":750,"currency":"INR"}'
```

Example response:

```json
{
  "transaction_id": "generated-transaction-id",
  "merchant_id": "merchant-123",
  "amount": "750",
  "currency": "INR",
  "gateway": "Gateway A"
}
```

### Submit an asynchronous outcome

Use the `transaction_id` returned by the routing request:

```bash
curl -X POST "http://localhost:8000/webhook/Gateway%20A" \
  -H "Content-Type: application/json" \
  -d '{"transaction_id":"generated-transaction-id","success":true}'
```

The webhook returns an accepted response after publishing the event to Redis.

### Interactive documentation and metrics

- OpenAPI documentation: `http://localhost:8000/docs`
- Prometheus endpoint: `http://localhost:8000/metrics`

Available custom metrics:

| Metric | Type | Description |
|---|---|---|
| `gateway_psr_percent{gateway="..."}` | Gauge | Live PSR over the rolling 15-minute window |
| `routing_failover_decisions_total` | Counter | Decisions that selected the non-best gateway, including exploration |
| `routing_latency_average_seconds` | Gauge | Average routing decision latency |

## Run the distributed system

### Prerequisites

- Docker Engine
- Docker Compose v2

Start the complete stack from the repository root:

```bash
docker compose up --build
```

The Compose stack starts:

| Service | Purpose | Local address |
|---|---|---|
| `api` | FastAPI routing and webhook service | `http://localhost:8000` |
| `worker` | Redis outcome consumer and PostgreSQL writer | Internal service |
| `redis` | Rolling health windows and Pub/Sub | Internal service |
| `postgres` | Durable transaction state | Internal service |
| `prometheus` | Metrics scraping and time-series storage | `http://localhost:9090` |
| `grafana` | Metrics dashboards | `http://localhost:3000` |

PostgreSQL is initialized with:

- [`sql/00_schema.sql`](./sql/00_schema.sql)
- [`sql/05_payment_transactions.sql`](./sql/05_payment_transactions.sql)

The API and worker use these Compose service URLs by default:

```text
REDIS_URL=redis://redis:6379/0
DATABASE_URL=postgresql://routing:routing@postgres:5432/payment_routing
```

These database credentials match the `postgres` service configuration in
[`docker-compose.yml`](./docker-compose.yml). For local development outside
Compose, use the same credentials with `localhost` as shown below.

To run in the background:

```bash
docker compose up --build -d
docker compose logs -f api worker
```

Stop the services:

```bash
docker compose down
```

To remove the PostgreSQL data volume as well:

```bash
docker compose down -v
```

Add Prometheus as a Grafana data source using:

```text
http://prometheus:9090
```

The scrape configuration is in [`prometheus.yml`](./prometheus.yml).

## Local development

Install Python dependencies:

```bash
python3 -m pip install -r requirements.txt
```

Run the API against local Redis:

```bash
uvicorn src.api:app --reload
```

Run the worker in a separate terminal:

```bash
python3 -m src.worker
```

Override service locations when required:

```bash
export REDIS_URL=redis://localhost:6379/0
export DATABASE_URL=postgresql://routing:routing@localhost:5432/payment_routing
```

## Repository structure

```text
src/api.py                 FastAPI routes, Redis health, MAB selection, metrics
src/models.py              Pydantic request and response models
src/worker.py              Redis Pub/Sub consumer and PostgreSQL persistence
sql/00_schema.sql          Existing analytical schema
sql/05_payment_transactions.sql  Durable API transaction table
Dockerfile                 API and worker image
docker-compose.yml         Full local distributed stack
prometheus.yml             Prometheus scrape configuration
dashboard/app/page.tsx     Next.js dashboard entry point
dashboard/app/components/  Dashboard UI components
dashboard/app/lib/         Simulation and report-export modules
dashboard/package.json     Dashboard dependencies and scripts
```

## Existing analytical workflows

The repository also retains the original simulation and analysis workflows:

```bash
python3 src/generate_data.py
python3 src/analyze_experiment.py
python3 src/simulate_routing.py
```

These scripts support historical experiment analysis; the FastAPI, Redis, and
worker services provide the real-time production-oriented path.

## Deploy the Next.js dashboard to Vercel

The dashboard is a standalone Next.js App Router project in
[`dashboard/`](./dashboard/), with repository-level Vercel settings in
[`vercel.json`](./vercel.json).

From the repository root, authenticate once:

```bash
npx vercel login
```

Deploy the dashboard to production with one terminal command:

```bash
cd dashboard && npm run deploy:vercel
```

The dashboard's **Export system report** control downloads the current
simulation summary as either JSON or CSV.
