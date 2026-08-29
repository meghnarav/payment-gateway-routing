CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(36) PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    segment VARCHAR(20) NOT NULL CHECK (segment IN ('retail', 'enterprise', 'high_frequency'))
);

CREATE TABLE IF NOT EXISTS gateways (
    gateway_id VARCHAR(20) PRIMARY KEY,
    gateway_name VARCHAR(50) NOT NULL,
    base_fee_pct NUMERIC(4, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS transactions (
    transaction_id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(user_id),
    gateway_id VARCHAR(20) NOT NULL REFERENCES gateways(gateway_id),
    amount_inr NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('upi', 'card', 'netbanking')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failure', 'timeout')),
    latency_ms INTEGER NOT NULL,
    routing_strategy VARCHAR(20) NOT NULL CHECK (routing_strategy IN ('static', 'dynamic_failover')),
    is_retry BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tx_gateway_created ON transactions (gateway_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tx_user_created ON transactions (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions (status);