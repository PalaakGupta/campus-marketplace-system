CREATE DATABASE IF NOT EXISTS campus_marketplace;
USE campus_marketplace;

CREATE TABLE IF NOT EXISTS users (
    id            CHAR(36)        PRIMARY KEY,
    login_id     VARCHAR(50)     NOT NULL UNIQUE,
    name          VARCHAR(100)    NOT NULL,
    email         VARCHAR(150)    NOT NULL UNIQUE,
    password_hash VARCHAR(255)    NOT NULL,
    role          ENUM('admin','student','professor','teaching_assistant','lab_staff','administrative_staff') NOT NULL DEFAULT 'student',
    is_active     BOOLEAN         NOT NULL DEFAULT TRUE,
    is_verified   BOOLEAN         NOT NULL DEFAULT FALSE,
    last_seen_at  DATETIME        NULL,
    created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wallets (
    id         CHAR(36)        PRIMARY KEY,
    user_id    CHAR(36)        NOT NULL UNIQUE,
    balance    DECIMAL(12, 2)  NOT NULL DEFAULT 0.00,
    created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_wallet_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS items (
    id              CHAR(36)        PRIMARY KEY,
    seller_id       CHAR(36)        NOT NULL,
    title           VARCHAR(200)    NOT NULL,
    description     TEXT,
    price           DECIMAL(12, 2)  NOT NULL,
    status          ENUM('available','reserved','sold')
                                    NOT NULL DEFAULT 'available',
    listing_channel ENUM('marketplace','thrift_store')
                                    NOT NULL DEFAULT 'marketplace',
    category        VARCHAR(100),
    condition_grade ENUM('New','Like New','Good','Fair','Poor')
                                    NULL,
    view_count      INT             NOT NULL DEFAULT 0,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_item_seller
        FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS saved_items (
    id         CHAR(36)    PRIMARY KEY,
    user_id    CHAR(36)    NOT NULL,
    item_id    CHAR(36)    NOT NULL,
    saved_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_saved_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_saved_item
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    CONSTRAINT uq_saved_item_user
        UNIQUE (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS holding_records (
    id           CHAR(36)        PRIMARY KEY,
    item_id      CHAR(36)        NOT NULL UNIQUE,
    buyer_id     CHAR(36)        NOT NULL,
    seller_id    CHAR(36)        NOT NULL,
    amount       DECIMAL(12, 2)  NOT NULL,
    status       ENUM('holding','released','refunded')
                                 NOT NULL DEFAULT 'holding',
    confirmed_at DATETIME        NULL,
    released_at  DATETIME        NULL,
    refunded_at  DATETIME        NULL,
    created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                 ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_holding_item
        FOREIGN KEY (item_id)   REFERENCES items(id)  ON DELETE RESTRICT,
    CONSTRAINT fk_holding_buyer
        FOREIGN KEY (buyer_id)  REFERENCES users(id)  ON DELETE RESTRICT,
    CONSTRAINT fk_holding_seller
        FOREIGN KEY (seller_id) REFERENCES users(id)  ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS transactions (
    id                CHAR(36)        PRIMARY KEY,
    holding_record_id CHAR(36)        NOT NULL,
    from_user_id      CHAR(36)        NOT NULL,
    to_user_id        CHAR(36)        NOT NULL,
    amount            DECIMAL(12, 2)  NOT NULL,
    transaction_type  ENUM('purchase','release','refund') NOT NULL,
    created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_txn_holding
        FOREIGN KEY (holding_record_id) REFERENCES holding_records(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_txn_from
        FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_txn_to
        FOREIGN KEY (to_user_id)   REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS messages (
    id         CHAR(36)    PRIMARY KEY,
    item_id    CHAR(36)    NOT NULL,
    sender_id  CHAR(36)    NOT NULL,
    content    TEXT        NOT NULL,
    is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
    read_at    DATETIME    NULL,
    created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_message_item
        FOREIGN KEY (item_id)   REFERENCES items(id)  ON DELETE RESTRICT,
    CONSTRAINT fk_message_sender
        FOREIGN KEY (sender_id) REFERENCES users(id)  ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS notifications (
    id                  CHAR(36)        PRIMARY KEY,
    recipient_id        CHAR(36)        NOT NULL,
    notification_type   ENUM(
                            'purchase_received',
                            'delivery_confirmed',
                            'payment_released',
                            'payment_refunded',
                            'item_reserved',
                            'new_message',
                            'listing_sold'
                        )               NOT NULL,
    title               VARCHAR(200)    NOT NULL,
    message             TEXT            NOT NULL,
    is_read             BOOLEAN         NOT NULL DEFAULT FALSE,
    read_at             DATETIME        NULL,
    related_item_id     CHAR(36)        NULL,
    related_holding_id  CHAR(36)        NULL,
    created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_recipient
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notif_item
        FOREIGN KEY (related_item_id) REFERENCES items(id) ON DELETE SET NULL
);