import pandas as pd

def simulate_switch_cost():
    df = pd.read_csv("data/raw/transactions.csv")
    
    fee_map = {
        "gw_hdfc": 0.0120,
        "gw_razorpay": 0.0185,
        "gw_payu": 0.0170
    }
    
    df["fee_pct"] = df["gateway_id"].map(fee_map)
    df["fee_inr"] = df.apply(lambda r: r["amount_inr"] * r["fee_pct"] if r["status"] == "success" else 0.0, axis=1)
    
    summary = df.groupby("routing_strategy").agg(
        total_txns=("transaction_id", "count"),
        successful_txns=("status", lambda s: (s == "success").sum()),
        gmv_inr=("amount_inr", lambda a: a[df.loc[a.index, "status"] == "success"].sum()),
        total_fee_inr=("fee_inr", "sum")
    ).reset_index()
    
    summary["psr_pct"] = (summary["successful_txns"] / summary["total_txns"]) * 100
    summary["blended_fee_pct"] = (summary["total_fee_inr"] / summary["gmv_inr"]) * 100
    
    print(summary.to_string(index=False))

if __name__ == "__main__":
    simulate_switch_cost()