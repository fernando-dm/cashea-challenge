import type { Currency } from "../../domain/model/money";

export type MoneyResponse = {
    amount: number;
    currency: Currency;
};

export type CreditLineResponse = {
    userId: string;
    creditLimit: MoneyResponse;
    availableCredit: MoneyResponse;
};
