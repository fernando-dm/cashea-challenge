import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import type { CreditLine } from "../../src/domain/model/credit-line";
import { InstallmentStatus } from "../../src/domain/model/installment";
import { Currency } from "../../src/domain/model/money";
import type { Purchase } from "../../src/domain/model/purchase";
import { PurchaseStatus } from "../../src/domain/model/purchase";
import { InMemoryCreditLineRepository } from "../../src/infrastructure/persistence/in-memory/in-memory-credit-line-repository";
import { InMemoryPurchaseRepository } from "../../src/infrastructure/persistence/in-memory/in-memory-purchase-repository";
import { InMemoryTransactionManager } from "../../src/infrastructure/persistence/in-memory/in-memory-transaction-manager";

describe("InMemoryTransactionManager", () => {
    it("rolls back repository changes when the operation fails", async () => {
        // given
        const creditLineRepository: InMemoryCreditLineRepository =
            new InMemoryCreditLineRepository();
        const purchaseRepository: InMemoryPurchaseRepository =
            new InMemoryPurchaseRepository();
        const transactionManager: InMemoryTransactionManager =
            new InMemoryTransactionManager(
                creditLineRepository,
                purchaseRepository
            );

        const originalCreditLine: CreditLine | null =
            await creditLineRepository.findCreditLineByUserId("user-with-1000-credit");

        if (originalCreditLine === null) {
            throw new Error("Expected seeded credit line");
        }

        const purchaseDate: Date = new Date("2026-01-01T00:00:00.000Z");
        const purchase: Purchase = {
            purchaseId: "purchase-rollback",
            userId: "user-with-1000-credit",
            amount: {
                amount: new Decimal("300.00"),
                currency: Currency.VES
            },
            installments: 3,
            installmentPlan: [
                {
                    installmentNumber: 1,
                    amount: {
                        amount: new Decimal("100.00"),
                        currency: Currency.VES
                    },
                    status: InstallmentStatus.PAID,
                    dueDate: purchaseDate,
                    paidAt: purchaseDate
                }
            ],
            status: PurchaseStatus.ACTIVE,
            createdAt: purchaseDate,
            updatedAt: purchaseDate
        };

        // when
        await expect(
            transactionManager.execute(async (repositories) => {
                await repositories.purchaseRepository.save(purchase);

                await repositories.creditLineRepository.save({
                    ...originalCreditLine,
                    availableCredit: {
                        ...originalCreditLine.availableCredit,
                        amount: new Decimal("700.00")
                    },
                    updatedAt: purchaseDate
                });

                throw new Error("Forced transaction failure");
            })
        ).rejects.toThrow("Forced transaction failure");

        // then
        const rolledBackPurchase: Purchase | null =
            await purchaseRepository.findPurchaseById("purchase-rollback");
        const rolledBackCreditLine: CreditLine | null =
            await creditLineRepository.findCreditLineByUserId("user-with-1000-credit");

        expect(rolledBackPurchase).toBeNull();
        expect(rolledBackCreditLine?.availableCredit.amount.toFixed(2))
            .toBe(originalCreditLine.availableCredit.amount.toFixed(2));
    });
});