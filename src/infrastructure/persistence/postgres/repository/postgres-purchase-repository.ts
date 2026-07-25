import Decimal from "decimal.js";
import type { QueryResultRow } from "pg";
import type { Installment } from "../../../../domain/model/installment";
import { InstallmentStatus } from "../../../../domain/model/installment";
import type { Money } from "../../../../domain/model/money";
import { Currency } from "../../../../domain/model/money";
import type { Purchase } from "../../../../domain/model/purchase";
import { PurchaseStatus } from "../../../../domain/model/purchase";
import type { PurchaseRepository } from "../../../../domain/repository/purchase-repository";
import type { PostgresClient } from "../connection/postgres-client";

type PurchaseRow = QueryResultRow & {
    purchase_id: string;
    user_id: string;
    amount: string;
    currency: string;
    installments: number;
    status: string;
    created_at: Date;
    updated_at: Date;
};

type InstallmentRow = QueryResultRow & {
    purchase_id: string;
    installment_number: number;
    amount: string;
    currency: string;
    status: string;
    due_date: Date;
    paid_at: Date | null;
};

export class PostgresPurchaseRepository implements PurchaseRepository {
    constructor(private readonly postgresClient: PostgresClient) {}

    async save(purchase: Purchase): Promise<Purchase> {
        await this.savePurchase(purchase);
        await this.saveInstallments(purchase);

        return purchase;
    }

    async findPurchaseById(purchaseId: string): Promise<Purchase | null> {
        const purchaseResult = await this.postgresClient.query<PurchaseRow>(
            `SELECT
                purchase_id,
                user_id,
                amount,
                currency,
                installments,
                status,
                created_at,
                updated_at
            FROM purchases
            WHERE purchase_id = $1`,
            [purchaseId]
        );

        if (purchaseResult.rowCount === 0) {
            return null;
        }

        const installmentsResult =
            await this.postgresClient.query<InstallmentRow>(
                `SELECT
                    purchase_id,
                    installment_number,
                    amount,
                    currency,
                    status,
                    due_date,
                    paid_at
                FROM installments
                WHERE purchase_id = $1
                ORDER BY installment_number`,
                [purchaseId]
            );

        return this.toPurchase(
            purchaseResult.rows[0],
            installmentsResult.rows
        );
    }

    private async savePurchase(purchase: Purchase): Promise<void> {
        // Usamos upsert para que guardar la misma compra dos veces sea idempotente:
        // si la compra existe, actualizamos su estado; si no existe, la insertamos.
        await this.postgresClient.query(
            `INSERT INTO purchases (
                purchase_id,
                user_id,
                amount,
                currency,
                installments,
                status,
                created_at,
                updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (purchase_id) DO UPDATE SET
                user_id = EXCLUDED.user_id,
                amount = EXCLUDED.amount,
                currency = EXCLUDED.currency,
                installments = EXCLUDED.installments,
                status = EXCLUDED.status,
                created_at = EXCLUDED.created_at,
                updated_at = EXCLUDED.updated_at`,
            [
                purchase.purchaseId,
                purchase.userId,
                purchase.amount.amount.toFixed(2),
                purchase.amount.currency,
                purchase.installments,
                purchase.status,
                purchase.createdAt,
                purchase.updatedAt
            ]
        );
    }

    private async saveInstallments(purchase: Purchase): Promise<void> {
        for (const installment of purchase.installmentPlan) {
            await this.saveInstallment(purchase.purchaseId, installment);
        }
    }

    private async saveInstallment(
        purchaseId: string,
        installment: Installment
    ): Promise<void> {
        // No borramos cuotas: cada cuota conserva su identidad por purchase_id + installment_number.
        // ON CONFLICT implementa el upsert y actualiza el estado persistido de esa cuota.
        await this.postgresClient.query(
            `INSERT INTO installments (
                purchase_id,
                installment_number,
                amount,
                currency,
                status,
                due_date,
                paid_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (purchase_id, installment_number) DO UPDATE SET
                amount = EXCLUDED.amount,
                currency = EXCLUDED.currency,
                status = EXCLUDED.status,
                due_date = EXCLUDED.due_date,
                paid_at = EXCLUDED.paid_at`,
            [
                purchaseId,
                installment.installmentNumber,
                installment.amount.amount.toFixed(2),
                installment.amount.currency,
                installment.status,
                installment.dueDate,
                installment.paidAt
            ]
        );
    }

    private toPurchase(
        purchaseRow: PurchaseRow,
        installmentRows: InstallmentRow[]
    ): Purchase {
        return {
            purchaseId: purchaseRow.purchase_id,
            userId: purchaseRow.user_id,
            amount: this.toMoney(purchaseRow.amount, purchaseRow.currency),
            installments: purchaseRow.installments,
            installmentPlan: installmentRows.map(
                (installmentRow: InstallmentRow): Installment =>
                    this.toInstallment(installmentRow)
            ),
            status: purchaseRow.status as PurchaseStatus,
            createdAt: purchaseRow.created_at,
            updatedAt: purchaseRow.updated_at
        };
    }

    private toInstallment(installmentRow: InstallmentRow): Installment {
        return {
            installmentNumber: installmentRow.installment_number,
            amount: this.toMoney(installmentRow.amount, installmentRow.currency),
            status: installmentRow.status as InstallmentStatus,
            dueDate: installmentRow.due_date,
            paidAt: installmentRow.paid_at
        };
    }

    private toMoney(amount: string, currency: string): Money {
        return {
            amount: new Decimal(amount),
            currency: currency as Currency
        };
    }
}
