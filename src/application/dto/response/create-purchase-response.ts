import type { MoneyResponse } from "./credit-line-response";

export type CreatePurchaseResponse = {
    purchaseId: string;
    userId: string;
    amount: MoneyResponse;
    installments: number;
};
