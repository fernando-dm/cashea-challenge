CREATE TABLE credit_lines (
    user_id TEXT PRIMARY KEY,
    credit_limit_amount NUMERIC(12, 2) NOT NULL,
    credit_limit_currency TEXT NOT NULL,
    available_credit_amount NUMERIC(12, 2) NOT NULL,
    available_credit_currency TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE purchases (
    purchase_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency TEXT NOT NULL,
    installments INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE installments (
    purchase_id TEXT NOT NULL,
    installment_number INTEGER NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    paid_at TIMESTAMPTZ,
    PRIMARY KEY (purchase_id, installment_number)
);
