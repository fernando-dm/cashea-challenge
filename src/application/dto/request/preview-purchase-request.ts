import type Decimal from "decimal.js";

export type PreviewPurchaseRequest = {
    userId: string;
    amount: Decimal;
    installments: number;
};
