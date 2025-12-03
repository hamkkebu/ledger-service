-- Initial admin user (synced from auth-service)
-- This is a fallback in case Kafka sync doesn't work on initial startup
INSERT INTO users (user_id, username, email, first_name, last_name, is_active, role, is_deleted)
SELECT 1, 'admin', 'admin@hamkkebu.com', 'Admin', 'User', 1, 'ADMIN', 0
WHERE NOT EXISTS (SELECT 1 FROM users WHERE user_id = 1);

SELECT 1;
