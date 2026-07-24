import { Currency } from "../../../domain/model/money";

export type MoneyResponse = {
    amount: string;
    currency: Currency;
};

export type CreditLineResponse = {
    userId: string;
    creditLimit: MoneyResponse;
    availableCredit: MoneyResponse;
};
