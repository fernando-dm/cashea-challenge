import Decimal from "decimal.js";
import type { QueryResultRow } from "pg";
import type { CreditLine } from "../../../domain/model/credit-line";
import type { Money } from "../../../domain/model/money";
import { Currency } from "../../../domain/model/money";
import type { CreditLineRepository } from "../../../domain/repository/credit-line-repository";
import type { PostgresClient } from "./postgres-client";

type CreditLineRow = QueryResultRow & {
    user_id: string;
    credit_limit_amount: string;
    credit_limit_currency: string;
    available_credit_amount: string;
    available_credit_currency: string;
    updated_at: Date;
};

export class PostgresCreditLineRepository implements CreditLineRepository {
    constructor(private readonly postgresClient: PostgresClient) {}

    async findCreditLineByUserId(userId: string): Promise<CreditLine | null> {
        const result = await this.postgresClient.query<CreditLineRow>(
            `SELECT
                user_id,
                credit_limit_amount,
                credit_limit_currency,
                available_credit_amount,
                available_credit_currency,
                updated_at
            FROM credit_lines
            WHERE user_id = $1`,
            [userId]
        );

        if (result.rowCount === 0) {
            return null;
        }

        return this.toCreditLine(result.rows[0]);
    }

    async save(creditLine: CreditLine): Promise<CreditLine> {
        // Usamos upsert para mantener una sola línea por usuario sin duplicar registros.
        // Si la línea ya existe, actualizamos los montos y la fecha de modificación.
        await this.postgresClient.query(
            `INSERT INTO credit_lines (
                user_id,
                credit_limit_amount,
                credit_limit_currency,
                available_credit_amount,
                available_credit_currency,
                updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (user_id) DO UPDATE SET
                credit_limit_amount = EXCLUDED.credit_limit_amount,
                credit_limit_currency = EXCLUDED.credit_limit_currency,
                available_credit_amount = EXCLUDED.available_credit_amount,
                available_credit_currency = EXCLUDED.available_credit_currency,
                updated_at = EXCLUDED.updated_at`,
            [
                creditLine.userId,
                creditLine.creditLimit.amount.toFixed(2),
                creditLine.creditLimit.currency,
                creditLine.availableCredit.amount.toFixed(2),
                creditLine.availableCredit.currency,
                creditLine.updatedAt
            ]
        );

        return creditLine;
    }

    private toCreditLine(creditLineRow: CreditLineRow): CreditLine {
        return {
            userId: creditLineRow.user_id,
            creditLimit: this.toMoney(
                creditLineRow.credit_limit_amount,
                creditLineRow.credit_limit_currency
            ),
            availableCredit: this.toMoney(
                creditLineRow.available_credit_amount,
                creditLineRow.available_credit_currency
            ),
            updatedAt: creditLineRow.updated_at
        };
    }

    private toMoney(amount: string, currency: string): Money {
        return {
            amount: new Decimal(amount),
            currency: currency as Currency
        };
    }
}
