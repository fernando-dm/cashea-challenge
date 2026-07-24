import type { PayInstallmentRequest } from "../dto/request/pay-installment-request";
import type { PayInstallmentResponse } from "../dto/response/pay-installment-response";
import { CreditLineNotFoundError } from "../exception/credit-line-not-found-error";
import { InstallmentAlreadyPaidError } from "../exception/installment-already-paid-error";
import { InstallmentNotFoundError } from "../exception/installment-not-found-error";
import type { CreditLine } from "../../domain/model/credit-line";
import type { Installment } from "../../domain/model/installment";
import { InstallmentStatus } from "../../domain/model/installment";
import type { Purchase } from "../../domain/model/purchase";
import { PurchaseStatus } from "../../domain/model/purchase";
import type { CreditLineRepository } from "../../domain/repository/credit-line-repository";
import type { PurchaseRepository } from "../../domain/repository/purchase-repository";
import { PurchaseByIdFinder } from "./purchase-by-id-finder";

type PaidInstallment = Installment & {
    status: InstallmentStatus.PAID;
    paidAt: Date;
};

type PayInstallmentResult = {
    purchase: Purchase;
    creditLine: CreditLine;
    paidInstallment: PaidInstallment;
};

export class PayInstallmentCommandService {
    constructor(
        private readonly purchaseByIdFinder: PurchaseByIdFinder,
        private readonly purchaseRepository: PurchaseRepository,
        private readonly creditLineRepository: CreditLineRepository
    ) {}

    execute(payInstallmentRequest: PayInstallmentRequest): PayInstallmentResponse {
        // Validamos solo los datos propios del comando HTTP: la existencia de la compra
        // se resuelve con el finder para no duplicar reglas de búsqueda.
        this.validate(payInstallmentRequest);

        // Reutilizamos el finder porque ya trae la compra completa con su plan de cuotas.
        const purchase: Purchase = this.purchaseByIdFinder.find(payInstallmentRequest.purchaseId);

        // Construimos el nuevo estado de la compra y de la línea de crédito antes de persistir.
        const payInstallmentResult: PayInstallmentResult =
            this.payInstallment(purchase, payInstallmentRequest.installmentNumber);

        // Hoy son dos saves en memoria; con PostgreSQL este bloque debería quedar dentro
        // de una transacción para cubrir atomicidad, concurrencia e idempotencia.
        this.savePayInstallmentResult(payInstallmentResult);

        // La respuesta expone únicamente el resultado del caso de uso, no los modelos internos.
        return this.toResponse(payInstallmentResult);
    }

    private validate(payInstallmentRequest: PayInstallmentRequest): void {
        // Si el número de cuota no representa una cuota posible, lo tratamos como no encontrada.
        if (!Number.isInteger(payInstallmentRequest.installmentNumber) ||
            payInstallmentRequest.installmentNumber <= 0) {

            throw new InstallmentNotFoundError(
                payInstallmentRequest.installmentNumber
            );
        }
    }

    private payInstallment(purchase: Purchase, installmentNumber: number): PayInstallmentResult {
        // Solo una cuota pendiente puede producir un nuevo pago y recuperar crédito.
        const installment: Installment = this.findPayableInstallment(purchase, installmentNumber);

        // La compra identifica al propietario de la línea que recuperará crédito.
        const creditLine: CreditLine = this.findCreditLineByUserId(purchase.userId);
        const paymentDate: Date = new Date();
        const paidInstallment: PaidInstallment = this.createPaidInstallment(installment, paymentDate);
        const updatedPurchase: Purchase = this.updatePurchase(purchase, paidInstallment, paymentDate);

        const updatedCreditLine: CreditLine =
            this.recoverAvailableCredit(creditLine, paidInstallment, paymentDate);

        return {
            purchase: updatedPurchase,
            creditLine: updatedCreditLine,
            paidInstallment
        };
    }

    private findPayableInstallment(purchase: Purchase, installmentNumber: number): Installment {
        // Primero distinguimos entre una cuota inexistente y una cuota ya pagada
        // para devolver errores de aplicación más claros.
        const installment: Installment | undefined =
            purchase.installmentPlan.find(
                (candidate: Installment): boolean =>
                    candidate.installmentNumber === installmentNumber
            );

        if (installment === undefined) {
            throw new InstallmentNotFoundError(installmentNumber);
        }

        if (installment.status === InstallmentStatus.PAID) {
            throw new InstallmentAlreadyPaidError(installmentNumber);
        }

        return installment;
    }

    private findCreditLineByUserId(userId: string): CreditLine {
        const creditLine: CreditLine | null =
            this.creditLineRepository.findCreditLineByUserId(userId);

        if (creditLine === null) {
            throw new CreditLineNotFoundError(userId);
        }

        return creditLine;
    }

    private createPaidInstallment(installment: Installment, paymentDate: Date): PaidInstallment {
        // No mutamos la cuota original: creamos una copia con el estado de pago aplicado.
        return {
            ...installment,
            status: InstallmentStatus.PAID,
            paidAt: paymentDate
        };
    }

    private updatePurchase(purchase: Purchase, paidInstallment: PaidInstallment, paymentDate: Date): Purchase {

        // Reemplazamos solo la cuota pagada para mantener el resto del plan intacto.
        const updatedInstallmentPlan: Installment[] = purchase.installmentPlan.map(
            (installment: Installment): Installment =>
                installment.installmentNumber === paidInstallment.installmentNumber
                    ? paidInstallment
                    : installment
        );

        return {
            ...purchase,
            installmentPlan: updatedInstallmentPlan,
            status: this.calculatePurchaseStatus(updatedInstallmentPlan),
            updatedAt: paymentDate
        };
    }

    private calculatePurchaseStatus(installmentPlan: Installment[]): PurchaseStatus {

        // La compra se completa únicamente cuando no quedan cuotas pendientes.
        const hasPendingInstallments: boolean = installmentPlan.some(
            (installment: Installment): boolean =>
                installment.status === InstallmentStatus.PENDING
        );

        return hasPendingInstallments
            ? PurchaseStatus.ACTIVE
            : PurchaseStatus.COMPLETED;
    }

    private recoverAvailableCredit(creditLine: CreditLine, paidInstallment: PaidInstallment, paymentDate: Date): CreditLine {
        // Al pagar una cuota pendiente, esa porción deja de consumir línea de crédito.
        return {
            ...creditLine,
            availableCredit: {
                ...creditLine.availableCredit,
                amount: creditLine.availableCredit.amount.plus(
                    paidInstallment.amount.amount
                )
            },
            updatedAt: paymentDate
        };
    }

    private savePayInstallmentResult(payInstallmentResult: PayInstallmentResult): void {
        // Persistimos ambos agregados afectados por el pago: compra y línea de crédito.
        this.purchaseRepository.save(payInstallmentResult.purchase);
        this.creditLineRepository.save(payInstallmentResult.creditLine);
    }

    private toResponse(payInstallmentResult: PayInstallmentResult): PayInstallmentResponse {

        // Convertimos Decimal y Date a tipos simples para mantener estable el contrato HTTP.
        return {
            purchaseId: payInstallmentResult.purchase.purchaseId,
            installmentNumber: payInstallmentResult.paidInstallment.installmentNumber,
            status: payInstallmentResult.paidInstallment.status,
            paidAt: payInstallmentResult.paidInstallment.paidAt.toISOString(),
            recoveredCredit: {
                amount: payInstallmentResult.paidInstallment.amount.amount.toFixed(2),
                currency: payInstallmentResult.paidInstallment.amount.currency
            },
            availableCredit: {
                amount: payInstallmentResult.creditLine.availableCredit.amount.toFixed(2),
                currency: payInstallmentResult.creditLine.availableCredit.currency
            },
            purchaseStatus: payInstallmentResult.purchase.status
        };
    }
}
