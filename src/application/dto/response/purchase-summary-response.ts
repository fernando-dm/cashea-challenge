import type { PurchaseStatus } from "../../../domain/model/purchase";
import type { MoneyResponse } from "./credit-line-response";

export type PurchaseSummaryResponse = {
    purchaseId: string;
    amount: MoneyResponse;
    status: PurchaseStatus;
    installments: number;
    pendingInstallments: number;
    createdAt: string;
};
