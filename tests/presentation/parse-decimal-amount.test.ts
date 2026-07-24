import { describe, expect, it } from "vitest";
import { InvalidPurchaseAmountError } from "../../src/application/exception/invalid-purchase-amount-error";
import { parseDecimalAmount } from "../../src/presentation/validation/parse-decimal-amount";

describe("parseDecimalAmount", () => {
    it("parses valid decimal amount strings", () => {
        // given
        const amountWithoutCents: string = "300";
        const amountWithOneDecimalDigit: string = "300.5";
        const amountWithTwoDecimalDigits: string = "300.50";
        const minimumAmountWithCents: string = "0.01";

        // when / then
        expect(parseDecimalAmount(amountWithoutCents).toFixed(2)).toBe("300.00");
        expect(parseDecimalAmount(amountWithOneDecimalDigit).toFixed(2)).toBe("300.50");
        expect(parseDecimalAmount(amountWithTwoDecimalDigits).toFixed(2)).toBe("300.50");
        expect(parseDecimalAmount(minimumAmountWithCents).toFixed(2)).toBe("0.01");
    });

    it("throws InvalidPurchaseAmountError when amount has more than two decimal digits", () => {
        // given
        const amountWithTooManyDecimals: string = "300.555";

        // when / then
        expect(() => parseDecimalAmount(amountWithTooManyDecimals))
            .toThrow(InvalidPurchaseAmountError);
    });

    it("throws InvalidPurchaseAmountError when amount is not a string", () => {
        // given
        const amountAsNumber: number = 300.5;

        // when / then
        expect(() => parseDecimalAmount(amountAsNumber))
            .toThrow(InvalidPurchaseAmountError);
    });
});
