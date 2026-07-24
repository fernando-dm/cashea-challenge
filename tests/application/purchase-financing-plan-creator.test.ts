import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import { InvalidInstallmentPlanError } from "../../src/application/exception/invalid-installment-plan-error";
import { InstallmentStatus } from "../../src/domain/model/installment";
import type { Money } from "../../src/domain/model/money";
import { Currency } from "../../src/domain/model/money";
import type { PurchaseFinancingPlan } from "../../src/domain/model/purchase-financing-plan";
import { PurchaseFinancingPlanCreator } from "../../src/application/service/purchase-financing-plan-creator";

function createPurchaseAmount(amount: string): Money {
    return {
        amount: new Decimal(amount),
        currency: Currency.VES
    };
}

describe("PurchaseFinancingPlanCreator", () => {
    it("creates a plan with the first installment paid and the rest pending", () => {
        // given
        const purchaseFinancingPlanCreator: PurchaseFinancingPlanCreator =
            new PurchaseFinancingPlanCreator();
        const purchaseAmount: Money = createPurchaseAmount("900.00");
        const purchaseDate: Date = new Date("2026-01-01T00:00:00.000Z");

        // when
        const purchaseFinancingPlan: PurchaseFinancingPlan =
            purchaseFinancingPlanCreator.create(purchaseAmount, 3, purchaseDate);

        // then
        expect(purchaseFinancingPlan.installmentPlan).toHaveLength(3);
        expect(purchaseFinancingPlan.installmentPlan[0].status)
            .toBe(InstallmentStatus.PAID);
        expect(purchaseFinancingPlan.installmentPlan[1].status)
            .toBe(InstallmentStatus.PENDING);
        expect(purchaseFinancingPlan.installmentPlan[2].status)
            .toBe(InstallmentStatus.PENDING);
        expect(purchaseFinancingPlan.creditToReserve.amount.toFixed(2))
            .toBe("600.00");
    });

    it("splits cents across installments without losing money", () => {
        // given
        const purchaseFinancingPlanCreator: PurchaseFinancingPlanCreator =
            new PurchaseFinancingPlanCreator();
        const purchaseAmount: Money = createPurchaseAmount("100.00");
        const purchaseDate: Date = new Date("2026-01-01T00:00:00.000Z");

        // when
        const purchaseFinancingPlan: PurchaseFinancingPlan =
            purchaseFinancingPlanCreator.create(purchaseAmount, 3, purchaseDate);

        // then
        expect(purchaseFinancingPlan.installmentPlan[0].amount.amount.toFixed(2))
            .toBe("33.34");
        expect(purchaseFinancingPlan.installmentPlan[1].amount.amount.toFixed(2))
            .toBe("33.33");
        expect(purchaseFinancingPlan.installmentPlan[2].amount.amount.toFixed(2))
            .toBe("33.33");
    });

    it("throws InvalidInstallmentPlanError when installments are not allowed", () => {
        // given
        const purchaseFinancingPlanCreator: PurchaseFinancingPlanCreator =
            new PurchaseFinancingPlanCreator();
        const purchaseAmount: Money = createPurchaseAmount("900.00");
        const purchaseDate: Date = new Date("2026-01-01T00:00:00.000Z");

        // when / then
        expect((): PurchaseFinancingPlan =>
            purchaseFinancingPlanCreator.create(purchaseAmount, 5, purchaseDate)
        ).toThrow(InvalidInstallmentPlanError);
    });
});
