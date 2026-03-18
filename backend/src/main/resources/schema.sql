-- Create database if not exists
CREATE DATABASE IF NOT EXISTS hamkkebu_ledger;
USE hamkkebu_ledger;

-- Create users table (auth-service에서 동기화)
CREATE TABLE IF NOT EXISTS tbl_users (
    user_id BIGINT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    nickname VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    user_role VARCHAR(20) NOT NULL DEFAULT 'USER',
    -- BaseEntity fields
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_is_deleted (is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create ledgers table (가계부)
CREATE TABLE IF NOT EXISTS tbl_ledgers (
    ledger_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    ledger_name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    currency VARCHAR(10) NOT NULL DEFAULT 'KRW',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    -- BaseEntity fields (auditing and soft delete)
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_is_deleted (is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create categories table (카테고리)
CREATE TABLE IF NOT EXISTS tbl_categories (
    category_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ledger_id BIGINT NOT NULL,
    category_name VARCHAR(50) NOT NULL,
    category_type ENUM('INCOME', 'EXPENSE') NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(20),
    parent_id BIGINT,
    -- BaseEntity fields
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ledger_id (ledger_id),
    INDEX idx_category_type (category_type),
    INDEX idx_is_deleted (is_deleted),
    FOREIGN KEY (ledger_id) REFERENCES tbl_ledgers(ledger_id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES tbl_categories(category_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create transactions table (거래내역)
CREATE TABLE IF NOT EXISTS tbl_transactions (
    transaction_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ledger_id BIGINT NOT NULL,
    category_id BIGINT,
    transaction_type ENUM('INCOME', 'EXPENSE', 'TRANSFER') NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description VARCHAR(500),
    transaction_date DATE NOT NULL,
    memo VARCHAR(1000),
    -- BaseEntity fields
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ledger_id (ledger_id),
    INDEX idx_category_id (category_id),
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_is_deleted (is_deleted),
    FOREIGN KEY (ledger_id) REFERENCES tbl_ledgers(ledger_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES tbl_categories(category_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create ledger shares table (가계부 공유)
CREATE TABLE IF NOT EXISTS tbl_ledger_shares (
    ledger_share_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ledger_id BIGINT NOT NULL,
    owner_id BIGINT NOT NULL,
    shared_user_id BIGINT NOT NULL,
    share_status ENUM('PENDING', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    permission VARCHAR(20) NOT NULL DEFAULT 'READ_ONLY',
    shared_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP NULL,
    rejection_reason VARCHAR(500),
    -- BaseEntity fields
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_ledger_shared_user (ledger_id, shared_user_id),
    INDEX idx_shared_user_id (shared_user_id),
    INDEX idx_owner_id (owner_id),
    INDEX idx_share_status (share_status),
    INDEX idx_is_deleted (is_deleted),
    FOREIGN KEY (ledger_id) REFERENCES tbl_ledgers(ledger_id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES tbl_users(user_id),
    FOREIGN KEY (shared_user_id) REFERENCES tbl_users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create Transactional Outbox Event table
CREATE TABLE IF NOT EXISTS tbl_outbox_event (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_id VARCHAR(36) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    topic VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100) NOT NULL,
    payload JSON NOT NULL,
    event_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    retry_count INT NOT NULL DEFAULT 0,
    max_retry INT NOT NULL DEFAULT 3,
    error_message TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at DATETIME,
    last_retry_at DATETIME,
    version BIGINT DEFAULT 0,
    INDEX idx_event_status_created (event_status, created_at),
    INDEX idx_event_id (event_id),
    INDEX idx_topic (topic)
) COMMENT='Transactional Outbox 이벤트 테이블';

-- ==========================================
-- 가계부 멤버 테이블
-- ==========================================
CREATE TABLE IF NOT EXISTS tbl_ledger_members (
    ledger_member_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ledger_id        BIGINT       NOT NULL,
    account_id       BIGINT       NOT NULL,
    role             VARCHAR(20)  NOT NULL DEFAULT 'MEMBER',
    joined_at        DATETIME,
    created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by       VARCHAR(50),
    updated_by       VARCHAR(50),
    is_deleted       BOOLEAN      NOT NULL DEFAULT FALSE,
    deleted_at       DATETIME,
    CONSTRAINT fk_ledger_member_ledger FOREIGN KEY (ledger_id) REFERENCES tbl_ledgers(ledger_id) ON DELETE CASCADE,
    CONSTRAINT uk_ledger_member UNIQUE (ledger_id, account_id)
);

CREATE INDEX idx_ledger_member_account ON tbl_ledger_members(account_id);
CREATE INDEX idx_ledger_member_ledger ON tbl_ledger_members(ledger_id);

-- ==========================================
-- 가계부 초대 테이블
-- ==========================================
CREATE TABLE IF NOT EXISTS tbl_ledger_invitations (
    invitation_id    BIGINT AUTO_INCREMENT PRIMARY KEY,
    ledger_id        BIGINT       NOT NULL,
    inviter_id       BIGINT       NOT NULL,
    invitee_email    VARCHAR(255) NOT NULL,
    role             VARCHAR(20)  NOT NULL DEFAULT 'MEMBER',
    status           VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    invite_code      VARCHAR(36)  UNIQUE,
    expires_at       DATETIME,
    created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by       VARCHAR(50),
    updated_by       VARCHAR(50),
    is_deleted       BOOLEAN      NOT NULL DEFAULT FALSE,
    deleted_at       DATETIME,
    CONSTRAINT fk_invitation_ledger FOREIGN KEY (ledger_id) REFERENCES tbl_ledgers(ledger_id) ON DELETE CASCADE
);

CREATE INDEX idx_invitation_ledger ON tbl_ledger_invitations(ledger_id);
CREATE INDEX idx_invitation_email ON tbl_ledger_invitations(invitee_email);
CREATE INDEX idx_invitation_code ON tbl_ledger_invitations(invite_code);
