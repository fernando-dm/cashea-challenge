import type Decimal from "decimal.js";

export type CreatePurchaseRequest = {
    userId: string;
    amount: Decimal;
    installments: number;
};
