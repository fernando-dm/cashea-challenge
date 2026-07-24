import type { Money } from "./money";

export enum InstallmentStatus {
    PAID = "PAID",
    PENDING = "PENDING"
}

export type Installment = {
    installmentNumber: number;
    amount: Money;
    status: InstallmentStatus;
    dueDate: Date;
    paidAt: Date | null;
};
