import type { InstallmentStatus } from "../../../domain/model/installment";
import type { PurchaseStatus } from "../../../domain/model/purchase";
import type { MoneyResponse } from "./credit-line-response";

export type InstallmentDetailResponse = {
    installmentNumber: number;
    amount: MoneyResponse;
    status: InstallmentStatus;
    dueDate: string;
    paidAt: string | null;
};

export type PurchaseDetailResponse = {
    purchaseId: string;
    userId: string;
    amount: MoneyResponse;
    status: PurchaseStatus;
    createdAt: string;
    updatedAt: string;
    installmentPlan: InstallmentDetailResponse[];
};
