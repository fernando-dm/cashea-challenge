import type { Money } from "./money";

export type CreditLine = {
    userId: string;
    creditLimit: Money;
    availableCredit: Money;
};
