import type { InstallmentStatus } from "../../../domain/model/installment";
import type { MoneyResponse } from "./credit-line-response";

export enum PreviewInstallmentPaymentTiming {
    PAID_AT_PURCHASE = "PAID_AT_PURCHASE",
    FINANCED = "FINANCED"
}

export type PreviewInstallmentResponse = {
    installmentNumber: number;
    amount: MoneyResponse;
    status: InstallmentStatus;
    dueDate: string;
    paymentTiming: PreviewInstallmentPaymentTiming;
};

export type PreviewPurchaseResponse = {
    userId: string;
    amount: MoneyResponse;
    installments: number;
    installmentPlan: PreviewInstallmentResponse[];
    creditToReserve: MoneyResponse;
    availableCredit: MoneyResponse;
    canBeConfirmed: boolean;
};
