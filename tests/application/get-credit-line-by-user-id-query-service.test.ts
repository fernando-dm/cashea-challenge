import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import type { CreditLine } from "../../src/domain/model/credit-line";
import { Currency } from "../../src/domain/model/money";
import type { CreditLineRepository } from "../../src/domain/repository/credit-line-repository";
import { CreditLineNotFoundError } from "../../src/application/exception/credit-line-not-found-error";
import { InvalidUserIdError } from "../../src/application/exception/invalid-user-id-error";
import type { CreditLineResponse } from "../../src/application/dto/response/credit-line-response";
import { GetCreditLineByUserIdQueryService } from "../../src/application/service/get-credit-line-by-user-id-query-service";

class FakeCreditLineRepository implements CreditLineRepository {
    constructor(private readonly creditLine: CreditLine | null) {}

    async findCreditLineByUserId(_userId: string): Promise<CreditLine | null> {
        return this.creditLine;
    }

    async save(creditLine: CreditLine): Promise<CreditLine> {
        return creditLine;
    }
}

describe("GetCreditLineByUserIdQueryService", () => {
    it("returns the credit line when the repository finds it", async () => {
        // given
        const updatedAt: Date = new Date("2026-01-01T00:00:00.000Z");
        const creditLine: CreditLine = {
            userId: "user-1",
            creditLimit: {
                amount: new Decimal("100000.00"),
                currency: Currency.VES
            },
            availableCredit: {
                amount: new Decimal("25000.00"),
                currency: Currency.VES
            },
            updatedAt
        };
        const creditLineRepository: CreditLineRepository =
            new FakeCreditLineRepository(creditLine);
        const getCreditLineByUserIdQueryService: GetCreditLineByUserIdQueryService =
            new GetCreditLineByUserIdQueryService(creditLineRepository);

        // when
        const creditLineResponse: CreditLineResponse =
            await getCreditLineByUserIdQueryService.execute("user-1");

        // then
        expect(creditLineResponse).toEqual({
            userId: "user-1",
            creditLimit: {
                amount: "100000.00",
                currency: Currency.VES
            },
            availableCredit: {
                amount: "25000.00",
                currency: Currency.VES
            }
        });
    });

    it("accepts zero available credit as a valid credit line state", async () => {
        // given
        const updatedAt: Date = new Date("2026-01-01T00:00:00.000Z");
        const creditLine: CreditLine = {
            userId: "user-without-credit",
            creditLimit: {
                amount: new Decimal("100000.00"),
                currency: Currency.VES
            },
            availableCredit: {
                amount: new Decimal("0.00"),
                currency: Currency.VES
            },
            updatedAt
        };
        const creditLineRepository: CreditLineRepository =
            new FakeCreditLineRepository(creditLine);
        const getCreditLineByUserIdQueryService: GetCreditLineByUserIdQueryService =
            new GetCreditLineByUserIdQueryService(creditLineRepository);

        // when
        const creditLineResponse: CreditLineResponse =
            await getCreditLineByUserIdQueryService.execute("user-without-credit");

        // then
        expect(creditLineResponse.availableCredit.amount).toBe("0.00");
    });

    it("throws InvalidUserIdError when user id is blank", async () => {
        // given
        const creditLineRepository: CreditLineRepository =
            new FakeCreditLineRepository(null);
        const getCreditLineByUserIdQueryService: GetCreditLineByUserIdQueryService =
            new GetCreditLineByUserIdQueryService(creditLineRepository);

        // when / then
        await expect(
            getCreditLineByUserIdQueryService.execute(" ")
        ).rejects.toThrow(InvalidUserIdError);
    });

    it("throws CreditLineNotFoundError when the repository does not find a credit line", async () => {
        // given
        const creditLineRepository: CreditLineRepository =
            new FakeCreditLineRepository(null);
        const getCreditLineByUserIdQueryService: GetCreditLineByUserIdQueryService =
            new GetCreditLineByUserIdQueryService(creditLineRepository);

        // when / then
        await expect(
            getCreditLineByUserIdQueryService.execute("unknown-user")
        ).rejects.toThrow(CreditLineNotFoundError);
    });
});
