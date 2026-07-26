import type { db } from "../db";

export type SecureCreditLine = {
    creditLimit: string;
    availableCredit: string;
};

type CreditLineRow = {
    credit_limit: string;
    available_credit: string;
};

export class SecureCreditLineRepository {
    constructor(private readonly database: typeof db) {}

    async findCreditLineByUserId(userId: string): Promise<SecureCreditLine | null> {
        // Este repositorio encapsula cómo se lee la línea de crédito en Postgres.
        // El controller decide autorización, pero el query queda acá para mantener responsabilidad única.
        // Además usamos $1 para no concatenar userId y evitar SQL Injection.
        const result = await this.database.query<CreditLineRow>(
            `SELECT credit_limit_amount AS credit_limit,
                    available_credit_amount AS available_credit
             FROM credit_lines
             WHERE user_id = $1`,
            [userId]
        );

        return this.toSecureCreditLine(result.rows[0]);
    }

    private toSecureCreditLine(
        creditLineRow: CreditLineRow | undefined
    ): SecureCreditLine | null {
        if (!creditLineRow) {
            return null;
        }

        return {
            creditLimit: creditLineRow.credit_limit,
            availableCredit: creditLineRow.available_credit
        };
    }
}
