-- No seed data for users table
-- Users are synced from auth-service via Kafka events (USER_REGISTERED)
-- When auth-service starts, it publishes USER_REGISTERED events from tbl_outbox_event
-- ledger-service's UserEventConsumer receives the event and syncs users via gRPC

SELECT 1;
