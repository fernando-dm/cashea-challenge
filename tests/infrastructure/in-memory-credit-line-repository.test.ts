import { describe, expect, it } from "vitest";
import type { CreditLine } from "../../src/domain/model/credit-line";
import { Currency } from "../../src/domain/model/money";
import { InMemoryCreditLineRepository } from "../../src/infrastructure/persistence/in-memory/in-memory-credit-line-repository";

describe("InMemoryCreditLineRepository", () => {
    it("finds the credit line for an existing user", () => {
        // given
        const creditLineRepository: InMemoryCreditLineRepository =
            new InMemoryCreditLineRepository();

        // when
        const creditLine: CreditLine | null =
            creditLineRepository.findCreditLineByUserId("user-1");

        // then
        expect(creditLine?.userId).toBe("user-1");
        expect(creditLine?.creditLimit.amount.toFixed(2)).toBe("100000.00");
        expect(creditLine?.creditLimit.currency).toBe(Currency.VES);
        expect(creditLine?.availableCredit.amount.toFixed(2)).toBe("100000.00");
        expect(creditLine?.availableCredit.currency).toBe(Currency.VES);
        expect(creditLine?.updatedAt).toBeInstanceOf(Date);
    });

    it("finds a valid credit line with zero available credit", () => {
        // given
        const creditLineRepository: InMemoryCreditLineRepository =
            new InMemoryCreditLineRepository();

        // when
        const creditLine: CreditLine | null =
            creditLineRepository.findCreditLineByUserId("user-without-credit");

        // then
        expect(creditLine?.userId).toBe("user-without-credit");
        expect(creditLine?.creditLimit.amount.toFixed(2)).toBe("100000.00");
        expect(creditLine?.creditLimit.currency).toBe(Currency.VES);
        expect(creditLine?.availableCredit.amount.toFixed(2)).toBe("0.00");
        expect(creditLine?.availableCredit.currency).toBe(Currency.VES);
        expect(creditLine?.updatedAt).toBeInstanceOf(Date);
    });

    it("returns null when no approved credit line exists for the user id", () => {
        // given
        const creditLineRepository: InMemoryCreditLineRepository =
            new InMemoryCreditLineRepository();

        // when
        const creditLine: CreditLine | null =
            creditLineRepository.findCreditLineByUserId("unknown-user");

        // then
        expect(creditLine).toBeNull();
    });

    it("saves an updated credit line", () => {
        // given
        const creditLineRepository: InMemoryCreditLineRepository =
            new InMemoryCreditLineRepository();
        const creditLine: CreditLine | null =
            creditLineRepository.findCreditLineByUserId("user-1");

        if (creditLine === null) {
            throw new Error("Expected seeded credit line");
        }

        const updatedCreditLine: CreditLine = {
            ...creditLine,
            availableCredit: {
                ...creditLine.availableCredit,
                amount: creditLine.availableCredit.amount.minus("600.00")
            },
            updatedAt: new Date("2026-01-02T00:00:00.000Z")
        };

        // when
        creditLineRepository.save(updatedCreditLine);
        const savedCreditLine: CreditLine | null =
            creditLineRepository.findCreditLineByUserId("user-1");

        // then
        expect(savedCreditLine?.availableCredit.amount.toFixed(2)).toBe("99400.00");
        expect(savedCreditLine?.updatedAt).toEqual(new Date("2026-01-02T00:00:00.000Z"));
    });
});
