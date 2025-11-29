-- Admin account for development environment
-- This admin account is automatically created on application startup
-- user_id must match auth-service's admin user_id

INSERT INTO users (user_id, username, email, first_name, last_name, is_active, role, is_deleted, created_at, updated_at)
SELECT 1, 'admin', 'admin@hamkkebu.com', 'Admin', 'User', TRUE, 'ADMIN', FALSE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');
