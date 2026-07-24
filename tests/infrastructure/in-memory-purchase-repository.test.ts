import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import { InstallmentStatus } from "../../src/domain/model/installment";
import { Currency } from "../../src/domain/model/money";
import type { Purchase } from "../../src/domain/model/purchase";
import { PurchaseStatus } from "../../src/domain/model/purchase";
import { InMemoryPurchaseRepository } from "../../src/infrastructure/persistence/in-memory/in-memory-purchase-repository";

describe("InMemoryPurchaseRepository", () => {
    it("saves and finds a purchase by id", () => {
        // given
        const purchaseRepository: InMemoryPurchaseRepository =
            new InMemoryPurchaseRepository();
        const createdAt: Date = new Date("2026-01-01T00:00:00.000Z");
        const purchase: Purchase = {
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
                    dueDate: createdAt,
                    paidAt: createdAt
                }
            ],
            status: PurchaseStatus.ACTIVE,
            createdAt,
            updatedAt: createdAt
        };

        // when
        purchaseRepository.save(purchase);
        const savedPurchase: Purchase | null =
            purchaseRepository.findPurchaseById("purchase-1");

        // then
        expect(savedPurchase?.purchaseId).toBe("purchase-1");
        expect(savedPurchase?.amount.amount.toFixed(2)).toBe("900.00");
        expect(savedPurchase?.updatedAt).toEqual(createdAt);
    });

    it("returns null when purchase does not exist", () => {
        // given
        const purchaseRepository: InMemoryPurchaseRepository =
            new InMemoryPurchaseRepository();

        // when
        const purchase: Purchase | null =
            purchaseRepository.findPurchaseById("unknown-purchase");

        // then
        expect(purchase).toBeNull();
    });
});
