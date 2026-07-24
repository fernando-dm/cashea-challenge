import type { Installment } from "./installment";
import type { Money } from "./money";

export type PurchaseFinancingPlan = {
    installmentPlan: Installment[];
    creditToReserve: Money;
};
