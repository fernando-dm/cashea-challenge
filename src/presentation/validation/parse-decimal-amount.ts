import Decimal from "decimal.js";
import { InvalidPurchaseAmountError } from "../../application/exception/invalid-purchase-amount-error";

export function parseDecimalAmount(value: unknown): Decimal {
    if (typeof value !== "string") {
        throw new InvalidPurchaseAmountError(String(value));
    }

    const decimalAmountPattern: RegExp = /^\d+(\.\d{1,2})?$/;

    // Contrato HTTP: recibimos dinero como texto decimal para no depender de number de JavaScript.
    if (!decimalAmountPattern.test(value)) {
        throw new InvalidPurchaseAmountError(value);
    }

    return new Decimal(value);
}
