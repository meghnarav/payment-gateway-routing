import os
import random
import threading
import time
import json
from uuid import uuid4

from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, generate_latest
import redis
from fastapi import FastAPI, HTTPException, Response

from .models import PaymentRequest, PaymentResponse, PaymentWebhookEvent

PRIMARY_GATEWAY = "Gateway A"
BACKUP_GATEWAY = "Gateway B"
EXPLORATION_RATE = 0.05
ROLLING_WINDOW_SECONDS = 15 * 60
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
REDIS_KEY_PREFIX = "gateway-events:"
PAYMENT_OUTCOMES_CHANNEL = "payment-outcomes"

gateway_psr = Gauge(
    "gateway_psr_percent",
    "Payment Success Rate over the rolling window.",
    ["gateway"],
)
failover_decisions = Counter(
    "routing_failover_decisions_total",
    "Routing decisions that selected a non-best gateway.",
)
average_routing_latency = Gauge(
    "routing_latency_average_seconds",
    "Average routing decision latency in seconds.",
)
latency_lock = threading.Lock()
routing_latency_total = 0.0
routing_decision_count = 0

app = FastAPI(
    title="Payment Gateway Routing API",
    description="Routes payment requests using real-time gateway health.",
    version="0.1.0",
)

redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)


def record_gateway_event(gateway_name: str, success: bool, timestamp: float | None = None) -> None:
    """Record a gateway outcome in a sorted set for rolling health calculations."""
    event_time = time.time() if timestamp is None else timestamp
    event = f"{int(success)}:{uuid4().hex}"
    redis_client.zadd(f"{REDIS_KEY_PREFIX}{gateway_name}", {event: event_time})


def get_gateway_health(gateway_name: str) -> float:
    """Return the gateway's Payment Success Rate over the last 15 minutes."""
    now = time.time()
    events_key = f"{REDIS_KEY_PREFIX}{gateway_name}"
    redis_client.zremrangebyscore(events_key, "-inf", now - ROLLING_WINDOW_SECONDS)
    events = redis_client.zrangebyscore(events_key, now - ROLLING_WINDOW_SECONDS, "+inf")

    if not events:
        return 100.0

    successful_events = sum(1 for event in events if event.startswith("1:"))
    return successful_events / len(events) * 100


def select_gateway() -> str:
    """Select a gateway with epsilon-greedy exploration over rolling PSRs."""
    gateway_health = {
        PRIMARY_GATEWAY: get_gateway_health(PRIMARY_GATEWAY),
        BACKUP_GATEWAY: get_gateway_health(BACKUP_GATEWAY),
    }
    for gateway, psr in gateway_health.items():
        gateway_psr.labels(gateway=gateway).set(psr)

    best_gateway = max(gateway_health, key=gateway_health.get)
    alternative_gateway = (
        BACKUP_GATEWAY if best_gateway == PRIMARY_GATEWAY else PRIMARY_GATEWAY
    )

    selected_gateway = (
        alternative_gateway if random.random() < EXPLORATION_RATE else best_gateway
    )
    if selected_gateway != best_gateway:
        failover_decisions.inc()
    return selected_gateway


def update_routing_latency(start_time: float) -> None:
    global routing_latency_total, routing_decision_count
    with latency_lock:
        routing_latency_total += time.perf_counter() - start_time
        routing_decision_count += 1
        average_routing_latency.set(routing_latency_total / routing_decision_count)


@app.post("/route-payment", response_model=PaymentResponse)
def route_payment(payment: PaymentRequest) -> PaymentResponse:
    transaction_id = str(uuid4())
    routing_start = time.perf_counter()
    try:
        gateway = select_gateway()
    finally:
        update_routing_latency(routing_start)
    return PaymentResponse(
        transaction_id=transaction_id,
        merchant_id=payment.merchant_id,
        amount=payment.amount,
        currency=payment.currency,
        gateway=gateway,
    )


@app.get("/metrics")
def metrics() -> Response:
    for gateway in (PRIMARY_GATEWAY, BACKUP_GATEWAY):
        gateway_psr.labels(gateway=gateway).set(get_gateway_health(gateway))
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/webhook/{gateway}")
def payment_webhook(gateway: str, event: PaymentWebhookEvent) -> dict[str, str]:
    if not gateway.strip():
        raise HTTPException(status_code=400, detail="Gateway name cannot be empty")

    message = {
        "gateway": gateway,
        **event.model_dump(),
    }
    try:
        redis_client.publish(PAYMENT_OUTCOMES_CHANNEL, json.dumps(message))
    except redis.RedisError as error:
        raise HTTPException(
            status_code=503,
            detail="Payment outcome queue is unavailable",
        ) from error

    return {"status": "accepted", "transaction_id": event.transaction_id}
