import csv
import random
import uuid
from datetime import datetime, timedelta

NUM_USERS = 8000
NUM_TRANSACTIONS = 50000
START_DATE = datetime(2026, 8, 1, 0, 0, 0)

GATEWAYS = {
    "gw_hdfc": {"name": "HDFC Direct", "base_fee": 1.20, "base_psr": 0.88, "base_lat": 1800},
    "gw_razorpay": {"name": "Razorpay Aggregator", "base_fee": 1.85, "base_psr": 0.86, "base_lat": 2100},
    "gw_payu": {"name": "PayU Enterprise", "base_fee": 1.70, "base_psr": 0.83, "base_lat": 2300}
}

PAYMENT_METHODS = ["upi", "card", "netbanking"]

OUTAGE_START = datetime(2026, 8, 5, 14, 0, 0)
OUTAGE_END = datetime(2026, 8, 5, 14, 45, 0)

user_ids = [str(uuid.uuid4()) for _ in range(NUM_USERS)]

def generate_dataset():
    with open("data/raw/users.csv", "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["user_id", "created_at", "segment"])
        for uid in user_ids:
            u_date = START_DATE - timedelta(days=random.randint(0, 90))
            writer.writerow([uid, u_date.isoformat(), random.choice(["retail", "enterprise", "high_frequency"])])

    with open("data/raw/transactions.csv", "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "transaction_id", "user_id", "gateway_id", "amount_inr",
            "payment_method", "status", "latency_ms", "routing_strategy",
            "is_retry", "created_at"
        ])

        for _ in range(NUM_TRANSACTIONS):
            tx_id = str(uuid.uuid4())
            uid = random.choice(user_ids)
            method = random.choice(PAYMENT_METHODS)
            amount = round(random.uniform(50.0, 5000.0), 2)
            
            sec_offset = random.randint(0, 14 * 86400)
            tx_time = START_DATE + timedelta(seconds=sec_offset)
            
            strategy = "dynamic_failover" if random.random() > 0.5 else "static"
            is_outage = (OUTAGE_START <= tx_time <= OUTAGE_END)
            
            if strategy == "static":
                gw = "gw_hdfc"
                psr = 0.42 if is_outage else GATEWAYS[gw]["base_psr"]
                latency = random.randint(4500, 8000) if is_outage else int(random.gauss(GATEWAYS[gw]["base_lat"], 300))
            else:
                if is_outage:
                    gw = "gw_razorpay"
                    psr = GATEWAYS[gw]["base_psr"]
                    latency = int(random.gauss(GATEWAYS[gw]["base_lat"], 250))
                else:
                    gw = "gw_hdfc"
                    psr = GATEWAYS[gw]["base_psr"]
                    latency = int(random.gauss(GATEWAYS[gw]["base_lat"], 300))

            outcome_rand = random.random()
            if outcome_rand < psr:
                status = "success"
            elif outcome_rand < psr + 0.05:
                status = "timeout"
            else:
                status = "failure"

            writer.writerow([
                tx_id, uid, gw, amount, method, status, max(latency, 200),
                strategy, False, tx_time.isoformat()
            ])

if __name__ == "__main__":
    generate_dataset()