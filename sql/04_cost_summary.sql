SELECT 
    t.routing_strategy,
    t.gateway_id,
    g.gateway_name,
    COUNT(*) AS total_transactions,
    COUNT(CASE WHEN t.status = 'success' THEN 1 END) AS successful_transactions,
    SUM(CASE WHEN t.status = 'success' THEN t.amount_inr ELSE 0 END) AS total_processed_volume_inr,
    ROUND(
        SUM(CASE WHEN t.status = 'success' THEN (t.amount_inr * g.base_fee_pct / 100.0) ELSE 0 END),
        2
    ) AS total_gateway_fees_inr,
    ROUND(
        (SUM(CASE WHEN t.status = 'success' THEN (t.amount_inr * g.base_fee_pct / 100.0) ELSE 0 END) / 
        NULLIF(SUM(CASE WHEN t.status = 'success' THEN t.amount_inr ELSE 0 END), 0)) * 100,
        3
    ) AS effective_fee_pct
FROM transactions t
JOIN gateways g ON t.gateway_id = g.gateway_id
GROUP BY 1, 2, 3
ORDER BY t.routing_strategy, total_processed_volume_inr DESC;