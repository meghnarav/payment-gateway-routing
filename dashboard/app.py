import os
import pandas as pd
import streamlit as st

st.set_page_config(
    page_title="Payment Gateway Routing Telemetry",
    layout="wide"
)

st.title("Payment Gateway Routing Telemetry")

DATA_PATH = "data/raw/transactions.csv"

if not os.path.exists(DATA_PATH):
    st.error("Dataset not found. Run `python src/generate_data.py` first.")
    st.stop()

@st.cache_data
def load_data():
    data = pd.read_csv(DATA_PATH)
    data["created_at"] = pd.to_datetime(data["created_at"])
    return data

df = load_data()

st.sidebar.header("Filters")
selected_methods = st.sidebar.multiselect(
    "Payment Methods",
    options=df["payment_method"].unique(),
    default=df["payment_method"].unique()
)

filtered_df = df[df["payment_method"].isin(selected_methods)]

col1, col2, col3, col4 = st.columns(4)

total_txns = len(filtered_df)
success_txns = len(filtered_df[filtered_df["status"] == "success"])
overall_psr = (success_txns / total_txns * 100) if total_txns > 0 else 0
total_gmv = filtered_df[filtered_df["status"] == "success"]["amount_inr"].sum()
avg_latency = filtered_df[filtered_df["status"] == "success"]["latency_ms"].mean()

col1.metric("Total Transactions", f"{total_txns:,}")
col2.metric("Payment Success Rate", f"{overall_psr:.2f}%")
col3.metric("Processed GMV", f"₹{total_gmv:,.2f}")
col4.metric("Avg Latency (Success)", f"{avg_latency:.0f} ms")

st.divider()

st.subheader("Strategy Comparison: Static vs Dynamic Failover")

strategy_summary = filtered_df.groupby("routing_strategy").agg(
    Volume=("transaction_id", "count"),
    Successes=("status", lambda s: (s == "success").sum()),
    Timeouts=("status", lambda s: (s == "timeout").sum()),
    Failures=("status", lambda s: (s == "failure").sum()),
    Avg_Latency_ms=("latency_ms", "mean")
).reset_index()

strategy_summary["PSR_pct"] = (strategy_summary["Successes"] / strategy_summary["Volume"]) * 100
strategy_summary["PSR_pct"] = strategy_summary["PSR_pct"].round(2)
strategy_summary["Avg_Latency_ms"] = strategy_summary["Avg_Latency_ms"].round(0)

st.dataframe(strategy_summary, use_container_width=True)

st.divider()

st.subheader("Gateway Health & Volume Distribution")

col_left, col_right = st.columns(2)

with col_left:
    st.write("Traffic Share by Gateway")
    gw_counts = filtered_df["gateway_id"].value_counts()
    st.bar_chart(gw_counts)

with col_right:
    st.write("Success Rate by Gateway (%)")
    gw_psr = filtered_df.groupby("gateway_id").apply(
        lambda x: (x["status"] == "success").sum() / len(x) * 100
    ).round(2)
    st.bar_chart(gw_psr)

st.divider()

st.subheader("Timeline: 15-Minute Volume & Failures")

time_series = filtered_df.set_index("created_at").resample("15min").agg(
    Total=("transaction_id", "count"),
    Failed=("status", lambda s: (s != "success").sum())
)

st.line_chart(time_series)