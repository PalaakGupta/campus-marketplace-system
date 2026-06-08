CREATE DATABASE IF NOT EXISTS campus_marketplace;
USE campus_marketplace;

-- TABLE 1: users
-- Every person on the platform, buyer or seller.

CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    roll_number   VARCHAR(50)         NOT NULL UNIQUE,
    email         VARCHAR(150)        NOT NULL UNIQUE,
    password_hash VARCHAR(255)        NOT NULL,
    role          ENUM('admin','student') NOT NULL DEFAULT 'student',
    is_active     BOOLEAN             NOT NULL DEFAULT TRUE,
    created_at    DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP
                                      ON UPDATE CURRENT_TIMESTAMP
);

-- TABLE 2: wallets
-- One wallet per user. Holds token balance.

CREATE TABLE IF NOT EXISTS wallets (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT            NOT NULL UNIQUE,
    balance    DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    created_at DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                       ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_wallet_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE RESTRICT
);

-- TABLE 3: items
-- Everything listed for sale.

CREATE TABLE IF NOT EXISTS items (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    seller_id       INT            NOT NULL,
    title           VARCHAR(200)   NOT NULL,
    description     TEXT,
    price           DECIMAL(12, 2) NOT NULL,
    status          ENUM(
                        'available',
                        'reserved',
                        'sold'
                    )              NOT NULL DEFAULT 'available',
    listing_channel ENUM(
                        'marketplace',
                        'thrift_store'
                    )              NOT NULL DEFAULT 'marketplace',
    category        VARCHAR(100),
    created_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                            ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_item_seller
        FOREIGN KEY (seller_id) REFERENCES users(id)
        ON DELETE RESTRICT
);

-- TABLE 4: holding_records
-- The escrow vault. Tokens are locked here between

CREATE TABLE IF NOT EXISTS holding_records (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    item_id       INT            NOT NULL UNIQUE,
    buyer_id      INT            NOT NULL,
    seller_id     INT            NOT NULL,
    amount        DECIMAL(12, 2) NOT NULL,
    status        ENUM(
                      'holding',
                      'released',
                      'refunded'
                  )              NOT NULL DEFAULT 'holding',
    created_at    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                          ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_holding_item
        FOREIGN KEY (item_id)    REFERENCES items(id)   ON DELETE RESTRICT,
    CONSTRAINT fk_holding_buyer
        FOREIGN KEY (buyer_id)   REFERENCES users(id)   ON DELETE RESTRICT,
    CONSTRAINT fk_holding_seller
        FOREIGN KEY (seller_id)  REFERENCES users(id)   ON DELETE RESTRICT
);

-- TABLE 5: transactions
-- Permanent financial ledger. One row per token movement.

CREATE TABLE IF NOT EXISTS transactions (
    id                 INT AUTO_INCREMENT PRIMARY KEY,
    holding_record_id  INT            NOT NULL,
    from_user_id       INT            NOT NULL,
    to_user_id         INT            NOT NULL,
    amount             DECIMAL(12, 2) NOT NULL,
    transaction_type   ENUM(
                           'purchase',
                           'release',
                           'refund'
                       )              NOT NULL,
    created_at         DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_txn_holding
        FOREIGN KEY (holding_record_id) REFERENCES holding_records(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_txn_from
        FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_txn_to
        FOREIGN KEY (to_user_id)   REFERENCES users(id) ON DELETE RESTRICT
);
-- ============================================================
-- TABLE 6: messages
-- Stores all chat messages scoped to a specific item.

CREATE TABLE IF NOT EXISTS messages (
    id         INT          AUTO_INCREMENT PRIMARY KEY,
    item_id    INT          NOT NULL,
    sender_id  INT          NOT NULL,
    content    TEXT         NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_message_item
        FOREIGN KEY (item_id)   REFERENCES items(id)  ON DELETE RESTRICT,
    CONSTRAINT fk_message_sender
        FOREIGN KEY (sender_id) REFERENCES users(id)  ON DELETE RESTRICT
);