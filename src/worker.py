import json
import logging
import os
from datetime import datetime, timezone

import psycopg2
import redis

from .api import (
    PAYMENT_OUTCOMES_CHANNEL,
    REDIS_URL,
    record_gateway_event,
)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost/payment_routing")
logger = logging.getLogger(__name__)


def persist_transaction(connection, event: dict) -> None:
    status = "success" if event["success"] else "failure"
    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO payment_transactions
                (transaction_id, gateway, status, updated_at)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (transaction_id) DO UPDATE SET
                gateway = EXCLUDED.gateway,
                status = EXCLUDED.status,
                updated_at = EXCLUDED.updated_at
            """,
            (
                event["transaction_id"],
                event["gateway"],
                status,
                datetime.now(timezone.utc),
            ),
        )
    connection.commit()


def process_event(connection, message: str) -> None:
    event = json.loads(message)
    record_gateway_event(event["gateway"], event["success"])
    persist_transaction(connection, event)


def run_worker() -> None:
    redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
    pubsub = redis_client.pubsub()
    pubsub.subscribe(PAYMENT_OUTCOMES_CHANNEL)

    with psycopg2.connect(DATABASE_URL) as connection:
        logger.info("Payment outcome worker started")
        for message in pubsub.listen():
            if message["type"] != "message":
                continue
            process_event(connection, message["data"])


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_worker()
