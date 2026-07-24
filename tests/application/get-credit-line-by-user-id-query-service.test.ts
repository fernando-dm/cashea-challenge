import { describe, expect, it } from "vitest";
import type { CreditLine } from "../../src/domain/model/credit-line";
import { Currency } from "../../src/domain/model/money";
import type { CreditLineRepository } from "../../src/domain/repository/credit-line-repository";
import { CreditLineNotFoundError } from "../../src/application/exception/credit-line-not-found-error";
import { InvalidUserIdError } from "../../src/application/exception/invalid-user-id-error";
import type { CreditLineResponse } from "../../src/application/response/credit-line-response";
import { GetCreditLineByUserIdQueryService } from "../../src/application/service/get-credit-line-by-user-id-query-service";

class FakeCreditLineRepository implements CreditLineRepository {
    constructor(private readonly creditLine: CreditLine | null) {}

    findCreditLineByUserId(_userId: string): CreditLine | null {
        return this.creditLine;
    }
}

describe("GetCreditLineByUserIdQueryService", () => {
    it("returns the credit line when the repository finds it", () => {
        // given
        const creditLine: CreditLine = {
            userId: "user-1",
            creditLimit: {
                amount: 100000,
                currency: Currency.VES
            },
            availableCredit: {
                amount: 25000,
                currency: Currency.VES
            }
        };
        const creditLineRepository: CreditLineRepository =
            new FakeCreditLineRepository(creditLine);
        const getCreditLineByUserIdQueryService: GetCreditLineByUserIdQueryService =
            new GetCreditLineByUserIdQueryService(creditLineRepository);

        // when
        const creditLineResponse: CreditLineResponse =
            getCreditLineByUserIdQueryService.execute("user-1");

        // then
        expect(creditLineResponse).toEqual({
            userId: "user-1",
            creditLimit: {
                amount: 100000,
                currency: Currency.VES
            },
            availableCredit: {
                amount: 25000,
                currency: Currency.VES
            }
        });
    });

    it("accepts zero available credit as a valid credit line state", () => {
        // given
        const creditLine: CreditLine = {
            userId: "user-without-credit",
            creditLimit: {
                amount: 100000,
                currency: Currency.VES
            },
            availableCredit: {
                amount: 0,
                currency: Currency.VES
            }
        };
        const creditLineRepository: CreditLineRepository =
            new FakeCreditLineRepository(creditLine);
        const getCreditLineByUserIdQueryService: GetCreditLineByUserIdQueryService =
            new GetCreditLineByUserIdQueryService(creditLineRepository);

        // when
        const creditLineResponse: CreditLineResponse =
            getCreditLineByUserIdQueryService.execute("user-without-credit");

        // then
        expect(creditLineResponse.availableCredit.amount).toBe(0);
    });

    it("throws InvalidUserIdError when user id is blank", () => {
        // given
        const creditLineRepository: CreditLineRepository =
            new FakeCreditLineRepository(null);
        const getCreditLineByUserIdQueryService: GetCreditLineByUserIdQueryService =
            new GetCreditLineByUserIdQueryService(creditLineRepository);

        // when / then
        expect((): CreditLineResponse =>
            getCreditLineByUserIdQueryService.execute(" ")
        ).toThrow(InvalidUserIdError);
    });

    it("throws CreditLineNotFoundError when the repository does not find a credit line", () => {
        // given
        const creditLineRepository: CreditLineRepository =
            new FakeCreditLineRepository(null);
        const getCreditLineByUserIdQueryService: GetCreditLineByUserIdQueryService =
            new GetCreditLineByUserIdQueryService(creditLineRepository);

        // when / then
        expect((): CreditLineResponse =>
            getCreditLineByUserIdQueryService.execute("unknown-user")
        ).toThrow(CreditLineNotFoundError);
    });
});
