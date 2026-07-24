import type { InstallmentStatus } from "../../../domain/model/installment";
import type { PurchaseStatus } from "../../../domain/model/purchase";
import type { MoneyResponse } from "./credit-line-response";

export type PayInstallmentResponse = {
    purchaseId: string;
    installmentNumber: number;
    status: InstallmentStatus;
    paidAt: string;
    recoveredCredit: MoneyResponse;
    availableCredit: MoneyResponse;
    purchaseStatus: PurchaseStatus;
};
