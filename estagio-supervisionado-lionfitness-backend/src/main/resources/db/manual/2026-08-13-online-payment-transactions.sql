-- 2026-08-13: Tabela para controle de transações de pagamento online (Pix/Gateway)
CREATE TABLE IF NOT EXISTS online_payment_transactions (
    id UUID PRIMARY KEY,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id),
    payment_id UUID NOT NULL REFERENCES payments(id),
    transaction_identifier VARCHAR(100) NOT NULL UNIQUE,
    amount NUMERIC(10, 2) NOT NULL,
    requested_at TIMESTAMP NOT NULL,
    confirmed_at TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    gateway_return TEXT,
    idempotency_key VARCHAR(100)
);

-- Mantém o script aplicável também quando a tabela já existe.
ALTER TABLE online_payment_transactions
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_online_payment_tx_sub ON online_payment_transactions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_online_payment_tx_ident ON online_payment_transactions(transaction_identifier);
CREATE UNIQUE INDEX IF NOT EXISTS idx_online_payment_tx_idempotency
    ON online_payment_transactions(idempotency_key)
    WHERE idempotency_key IS NOT NULL;
