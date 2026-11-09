CREATE TABLE IF NOT EXISTS payment_transactions (
    transaction_id VARCHAR(36) PRIMARY KEY,
    gateway VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failure')),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway_updated
    ON payment_transactions (gateway, updated_at);
