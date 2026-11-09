import os
import time
import json
from uuid import uuid4

import redis
from fastapi import FastAPI, HTTPException

from .models import PaymentRequest, PaymentResponse, PaymentWebhookEvent

PRIMARY_GATEWAY = "Gateway A"
BACKUP_GATEWAY = "Gateway B"
HEALTH_THRESHOLD = 75.0
ROLLING_WINDOW_SECONDS = 15 * 60
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
REDIS_KEY_PREFIX = "gateway-events:"
PAYMENT_OUTCOMES_CHANNEL = "payment-outcomes"

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
    """Select the primary unless its rolling PSR is below the health threshold."""
    if get_gateway_health(PRIMARY_GATEWAY) < HEALTH_THRESHOLD:
        return BACKUP_GATEWAY
    return PRIMARY_GATEWAY


@app.post("/route-payment", response_model=PaymentResponse)
def route_payment(payment: PaymentRequest) -> PaymentResponse:
    transaction_id = str(uuid4())
    gateway = select_gateway()
    return PaymentResponse(
        transaction_id=transaction_id,
        merchant_id=payment.merchant_id,
        amount=payment.amount,
        currency=payment.currency,
        gateway=gateway,
    )


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
