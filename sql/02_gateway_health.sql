WITH time_windows AS (
    SELECT 
        gateway_id,
        payment_method,
        DATE_TRUNC('hour', created_at) + 
        INTERVAL '15 min' * (EXTRACT(MINUTE FROM created_at)::INT / 15) AS window_start,
        COUNT(*) AS total_attempts,
        COUNT(CASE WHEN status = 'success' THEN 1 END) AS successful_attempts,
        AVG(latency_ms) AS avg_latency_ms
    FROM transactions
    WHERE created_at >= NOW() - INTERVAL '24 hours'
    GROUP BY 1, 2, 3
)
SELECT 
    gateway_id,
    payment_method,
    window_start,
    total_attempts,
    successful_attempts,
    ROUND((successful_attempts::NUMERIC / NULLIF(total_attempts, 0)) * 100, 2) AS success_rate_pct,
    ROUND(avg_latency_ms, 0) AS avg_latency_ms,
    CASE 
        WHEN (successful_attempts::NUMERIC / NULLIF(total_attempts, 0)) < 0.75 THEN 'DEGRADED'
        WHEN (successful_attempts::NUMERIC / NULLIF(total_attempts, 0)) < 0.85 THEN 'MONITOR'
        ELSE 'HEALTHY'
    END AS operational_status
FROM time_windows
ORDER BY window_start DESC, gateway_id ASC;