-- Apply before enabling keyed manual payment creation. No remote execution by Codex.
BEGIN;
CREATE TABLE IF NOT EXISTS payment_creation_keys (
    subscription_id uuid NOT NULL REFERENCES subscriptions(id),
    idempotency_key uuid NOT NULL,
    request_fingerprint text NOT NULL,
    payment_id uuid NOT NULL REFERENCES payments(id),
    PRIMARY KEY (subscription_id, idempotency_key),
    UNIQUE (payment_id)
);
COMMIT;
