import type { Installment } from "./installment";
import type { Money } from "./money";

export enum PurchaseStatus {
    ACTIVE = "ACTIVE"
}

export type Purchase = {
    purchaseId: string;
    userId: string;
    amount: Money;
    installments: number;
    installmentPlan: Installment[];
    status: PurchaseStatus;
    createdAt: Date;
    updatedAt: Date;
};
