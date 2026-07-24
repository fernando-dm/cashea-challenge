import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import { Currency } from "../../src/domain/model/money";
import type { Purchase } from "../../src/domain/model/purchase";
import { PurchaseStatus } from "../../src/domain/model/purchase";
import type { PurchaseRepository } from "../../src/domain/repository/purchase-repository";
import { PurchaseNotFoundError } from "../../src/application/exception/purchase-not-found-error";
import { PurchaseByIdFinder } from "../../src/application/service/purchase-by-id-finder";

class FakePurchaseRepository implements PurchaseRepository {
    constructor(private readonly purchase: Purchase | null) {}

    save(purchase: Purchase): Purchase {
        return purchase;
    }

    findPurchaseById(_purchaseId: string): Purchase | null {
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
        installmentPlan: [],
        status: PurchaseStatus.ACTIVE,
        createdAt: purchaseDate,
        updatedAt: purchaseDate
    };
}

describe("PurchaseByIdFinder", () => {
    it("returns purchase when it exists", () => {
        // given
        const purchaseRepository: PurchaseRepository =
            new FakePurchaseRepository(createPurchase());
        const purchaseByIdFinder: PurchaseByIdFinder =
            new PurchaseByIdFinder(purchaseRepository);

        // when
        const purchase: Purchase = purchaseByIdFinder.find("purchase-1");

        // then
        expect(purchase.purchaseId).toBe("purchase-1");
    });

    it("throws PurchaseNotFoundError when purchase does not exist", () => {
        // given
        const purchaseRepository: PurchaseRepository =
            new FakePurchaseRepository(null);
        const purchaseByIdFinder: PurchaseByIdFinder =
            new PurchaseByIdFinder(purchaseRepository);

        // when / then
        expect((): Purchase =>
            purchaseByIdFinder.find("unknown-purchase")
        ).toThrow(PurchaseNotFoundError);
    });

    it("throws PurchaseNotFoundError when purchase id is blank", () => {
        // given
        const purchaseRepository: PurchaseRepository =
            new FakePurchaseRepository(createPurchase());
        const purchaseByIdFinder: PurchaseByIdFinder =
            new PurchaseByIdFinder(purchaseRepository);

        // when / then
        expect((): Purchase =>
            purchaseByIdFinder.find(" ")
        ).toThrow(PurchaseNotFoundError);
    });
});
