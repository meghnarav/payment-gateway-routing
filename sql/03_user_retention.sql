WITH first_attempts AS (
    SELECT DISTINCT ON (user_id)
        user_id,
        status AS initial_outcome,
        created_at AS first_attempt_at
    FROM transactions
    ORDER BY user_id, created_at ASC
),
subsequent_orders AS (
    SELECT 
        fa.user_id,
        fa.initial_outcome,
        COUNT(t.transaction_id) AS repeat_success_count
    FROM first_attempts fa
    LEFT JOIN transactions t 
        ON fa.user_id = t.user_id 
        AND t.created_at > fa.first_attempt_at 
        AND t.created_at <= fa.first_attempt_at + INTERVAL '30 days'
        AND t.status = 'success'
    GROUP BY fa.user_id, fa.initial_outcome
)
SELECT 
    initial_outcome AS first_payment_result,
    COUNT(user_id) AS total_users,
    COUNT(CASE WHEN repeat_success_count > 0 THEN 1 END) AS retained_users,
    ROUND(
        (COUNT(CASE WHEN repeat_success_count > 0 THEN 1 END)::NUMERIC / COUNT(user_id)) * 100, 
        2
    ) AS day_30_retention_pct
FROM subsequent_orders
GROUP BY 1;