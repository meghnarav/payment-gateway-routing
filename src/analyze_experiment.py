import pandas as pd
import numpy as np
from statsmodels.stats.proportion import proportions_ztest

def run_hypothesis_test(csv_path="data/raw/transactions.csv"):
    df = pd.read_csv(csv_path)
    
    static = df[df["routing_strategy"] == "static"]
    dynamic = df[df["routing_strategy"] == "dynamic_failover"]
    
    n_static = len(static)
    n_dynamic = len(dynamic)
    
    succ_static = len(static[static["status"] == "success"])
    succ_dynamic = len(dynamic[dynamic["status"] == "success"])
    
    psr_static = (succ_static / n_static) * 100
    psr_dynamic = (succ_dynamic / n_dynamic) * 100
    
    counts = np.array([succ_dynamic, succ_static])
    nobs = np.array([n_dynamic, n_static])
    
    z_stat, p_val = proportions_ztest(count=counts, nobs=nobs, alternative='larger')
    
    print("=" * 45)
    print("        A/B TEST VALIDATION RESULTS         ")
    print("=" * 45)
    print(f"Static Count:    {n_static:,}")
    print(f"Static PSR:      {psr_static:.2f}%")
    print("-" * 45)
    print(f"Dynamic Count:   {n_dynamic:,}")
    print(f"Dynamic PSR:     {psr_dynamic:.2f}%")
    print("-" * 45)
    print(f"Absolute Lift:   +{psr_dynamic - psr_static:.2f}%")
    print(f"Z-Statistic:     {z_stat:.4f}")
    print(f"P-Value:         {p_val:.5e}")
    print(f"Significant:     {p_val < 0.01}")
    print("=" * 45)

if __name__ == "__main__":
    run_hypothesis_test()