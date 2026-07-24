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
        expect(creditLine).toEqual({
            userId: "user-1",
            creditLimit: {
                amount: 100000,
                currency: Currency.VES
            },
            availableCredit: {
                amount: 100000,
                currency: Currency.VES
            }
        });
    });

    it("finds a valid credit line with zero available credit", () => {
        // given
        const creditLineRepository: InMemoryCreditLineRepository =
            new InMemoryCreditLineRepository();

        // when
        const creditLine: CreditLine | null =
            creditLineRepository.findCreditLineByUserId("user-without-credit");

        // then
        expect(creditLine).toEqual({
            userId: "user-without-credit",
            creditLimit: {
                amount: 100000,
                currency: Currency.VES
            },
            availableCredit: {
                amount: 0,
                currency: Currency.VES
            }
        });
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
});
