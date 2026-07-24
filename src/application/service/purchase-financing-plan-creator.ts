import Decimal from "decimal.js";
import { InvalidInstallmentPlanError } from "../exception/invalid-installment-plan-error";
import type { Installment } from "../../domain/model/installment";
import { InstallmentStatus } from "../../domain/model/installment";
import type { Money } from "../../domain/model/money";
import type { PurchaseFinancingPlan } from "../../domain/model/purchase-financing-plan";

export class PurchaseFinancingPlanCreator {
    private readonly allowedInstallmentPlans: ReadonlySet<number>;

    constructor() {
        this.allowedInstallmentPlans = new Set<number>([3, 6, 12]);
    }

    create(purchaseAmount: Money, installments: number, purchaseDate: Date): PurchaseFinancingPlan {
        // Validamos que el plan elegido sea uno permitido por producto.
        this.validateInstallments(installments);

        // Dividimos el monto total en cuotas sin perder centavos.
        const installmentAmounts: Decimal[] = this.splitAmountIntoInstallments(purchaseAmount, installments);

        // Creamos las cuotas con estado inicial: primera pagada, restantes pendientes.
        const installmentPlan: Installment[] = this.createInstallments(installmentAmounts, purchaseAmount, purchaseDate);

        // El crédito reservado equivale al monto de cuotas que quedan pendientes.
        const creditToReserve: Money = this.calculatePendingInstallmentsAmount(installmentPlan, purchaseAmount);

        return {
            installmentPlan,
            creditToReserve
        };
    }

    private validateInstallments(installments: number): void {
        // Regla explícita del enunciado: solo se permiten planes de 3, 6 o 12 cuotas.
        if (!this.allowedInstallmentPlans.has(installments)) {
            throw new InvalidInstallmentPlanError(installments);
        }
    }

    private splitAmountIntoInstallments(purchaseAmount: Money, installments: number): Decimal[] {
        // Tomamos una cuota base redondeada hacia abajo y luego repartimos el resto.
        const baseInstallmentAmount: Decimal = purchaseAmount.amount
            .dividedBy(installments)
            .toDecimalPlaces(2, Decimal.ROUND_DOWN);
        const allocatedAmount: Decimal = baseInstallmentAmount.times(installments);
        const remainingCents: number = purchaseAmount.amount
            .minus(allocatedAmount)
            .times(100)
            .toNumber();
        const installmentAmounts: Decimal[] = [];

        for (let installmentIndex: number = 0; installmentIndex < installments; installmentIndex += 1) {
            // Si la división no es exacta, distribuimos centavos en las primeras cuotas
            // para que la suma del plan coincida exactamente con la compra.
            const extraCent: Decimal = installmentIndex < remainingCents
                ? new Decimal("0.01")
                : new Decimal("0.00");

            installmentAmounts.push(baseInstallmentAmount.plus(extraCent));
        }

        return installmentAmounts;
    }

    private createInstallments(installmentAmounts: Decimal[], purchaseAmount: Money, purchaseDate: Date): Installment[] {
        return installmentAmounts.map(
            (installmentAmount: Decimal, installmentIndex: number): Installment => {
                const installmentNumber: number = installmentIndex + 1;

                // Por regla de negocio, la primera cuota se paga en el momento de la compra.
                const isFirstInstallment: boolean = installmentNumber === 1;

                return {
                    installmentNumber,
                    amount: {
                        amount: installmentAmount,
                        currency: purchaseAmount.currency
                    },
                    status: isFirstInstallment
                        ? InstallmentStatus.PAID
                        : InstallmentStatus.PENDING,
                    dueDate: this.addMonths(purchaseDate, installmentIndex),
                    paidAt: isFirstInstallment ? purchaseDate : null
                };
            }
        );
    }

    private calculatePendingInstallmentsAmount(installmentPlan: Installment[], purchaseAmount: Money): Money {
        // Solo las cuotas pendientes consumen crédito disponible.
        // Ejemplo: si el usuario tiene 1000.00 disponibles y compra 900.00 en 3 cuotas,
        // la primera cuota de 300.00 se paga al momento y queda en estado PAID.
        // Las otras dos cuotas quedan en estado PENDING: 300.00 + 300.00 = 600.00.
        // Por eso el crédito a reservar es 600.00.
        // Nuevo crédito disponible esperado: 1000.00 - 600.00 = 400.00.
        const pendingInstallmentsAmount: Decimal = installmentPlan
            .filter((installment: Installment): boolean =>
                installment.status === InstallmentStatus.PENDING
            )
            .reduce(
                (total: Decimal, installment: Installment): Decimal =>
                    total.plus(installment.amount.amount),
                new Decimal("0.00")
            );

        return {
            amount: pendingInstallmentsAmount,
            currency: purchaseAmount.currency
        };
    }

    private addMonths(date: Date, months: number): Date {
        const dueDate: Date = new Date(date);
        dueDate.setMonth(dueDate.getMonth() + months);

        return dueDate;
    }
}
