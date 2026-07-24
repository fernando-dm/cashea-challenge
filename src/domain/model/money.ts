import type Decimal from "decimal.js";

export enum Currency {
    VES = "VES"
}

export type Money = {
    amount: Decimal;
    currency: Currency;
};
