import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import { InstallmentStatus } from "../../src/domain/model/installment";
import { Currency } from "../../src/domain/model/money";
import type { Purchase } from "../../src/domain/model/purchase";
import { PurchaseStatus } from "../../src/domain/model/purchase";
import type { PurchaseRepository } from "../../src/domain/repository/purchase-repository";
import type { PurchaseDetailResponse } from "../../src/application/dto/response/purchase-detail-response";
import { PurchaseNotFoundError } from "../../src/application/exception/purchase-not-found-error";
import { GetPurchaseDetailByIdQueryService } from "../../src/application/service/get-purchase-detail-by-id-query-service";
import { PurchaseByIdFinder } from "../../src/application/service/purchase-by-id-finder";

class FakePurchaseRepository implements PurchaseRepository {
    constructor(private readonly purchase: Purchase | null) {}

    async save(purchase: Purchase): Promise<Purchase> {
        return purchase;
    }

    async findPurchaseById(_purchaseId: string): Promise<Purchase | null> {
        return this.purchase;
    }
}

function createPurchase(): Purchase {
    const purchaseDate: Date = new Date("2026-01-01T00:00:00.000Z");

    return {
        purchaseId: "purchase-1",
        userId: "user-1",
        amount: {
            amount: new Decimal("900.00"),
            currency: Currency.VES
        },
        installments: 3,
        installmentPlan: [
            {
                installmentNumber: 1,
                amount: {
                    amount: new Decimal("300.00"),
                    currency: Currency.VES
                },
                status: InstallmentStatus.PAID,
                dueDate: purchaseDate,
                paidAt: purchaseDate
            },
            {
                installmentNumber: 2,
                amount: {
                    amount: new Decimal("300.00"),
                    currency: Currency.VES
                },
                status: InstallmentStatus.PENDING,
                dueDate: new Date("2026-02-01T00:00:00.000Z"),
                paidAt: null
            }
        ],
        status: PurchaseStatus.ACTIVE,
        createdAt: purchaseDate,
        updatedAt: purchaseDate
    };
}

describe("GetPurchaseDetailByIdQueryService", () => {
    it("returns purchase detail with installment plan", async () => {
        // given
        const purchaseRepository: PurchaseRepository =
            new FakePurchaseRepository(createPurchase());
        const purchaseByIdFinder: PurchaseByIdFinder =
            new PurchaseByIdFinder(purchaseRepository);
        const getPurchaseDetailByIdQueryService: GetPurchaseDetailByIdQueryService =
            new GetPurchaseDetailByIdQueryService(purchaseByIdFinder);

        // when
        const purchaseDetailResponse: PurchaseDetailResponse =
            await getPurchaseDetailByIdQueryService.execute("purchase-1");

        // then
        expect(purchaseDetailResponse.purchaseId).toBe("purchase-1");
        expect(purchaseDetailResponse.amount.amount).toBe("900.00");
        expect(purchaseDetailResponse.installmentPlan).toHaveLength(2);
        expect(purchaseDetailResponse.installmentPlan[0].status)
            .toBe(InstallmentStatus.PAID);
        expect(purchaseDetailResponse.installmentPlan[1].status)
            .toBe(InstallmentStatus.PENDING);
    });

    it("throws PurchaseNotFoundError when purchase does not exist", async () => {
        // given
        const purchaseRepository: PurchaseRepository =
            new FakePurchaseRepository(null);
        const purchaseByIdFinder: PurchaseByIdFinder =
            new PurchaseByIdFinder(purchaseRepository);
        const getPurchaseDetailByIdQueryService: GetPurchaseDetailByIdQueryService =
            new GetPurchaseDetailByIdQueryService(purchaseByIdFinder);

        // when / then
        await expect(
            getPurchaseDetailByIdQueryService.execute("unknown-purchase")
        ).rejects.toThrow(PurchaseNotFoundError);
    });
});
