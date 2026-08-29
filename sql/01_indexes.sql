CREATE INDEX IF NOT EXISTS idx_tx_gateway_created 
ON transactions (gateway_id, created_at);

CREATE INDEX IF NOT EXISTS idx_tx_user_created 
ON transactions (user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_tx_status_routing 
ON transactions (status, routing_strategy);

CREATE INDEX IF NOT EXISTS idx_tx_created_at_brin 
ON transactions USING BRIN (created_at);