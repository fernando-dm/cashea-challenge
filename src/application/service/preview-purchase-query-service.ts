import type { PreviewPurchaseRequest } from "../dto/request/preview-purchase-request";
import type {
    PreviewInstallmentResponse,
    PreviewPurchaseResponse
} from "../dto/response/preview-purchase-response";
import { PreviewInstallmentPaymentTiming } from "../dto/response/preview-purchase-response";
import { CreditLineNotFoundError } from "../exception/credit-line-not-found-error";
import { InvalidPurchaseAmountError } from "../exception/invalid-purchase-amount-error";
import { InvalidUserIdError } from "../exception/invalid-user-id-error";
import type { CreditLine } from "../../domain/model/credit-line";
import type { Installment } from "../../domain/model/installment";
import { InstallmentStatus } from "../../domain/model/installment";
import type { Money } from "../../domain/model/money";
import { Currency } from "../../domain/model/money";
import type { PurchaseFinancingPlan } from "../../domain/model/purchase-financing-plan";
import type { CreditLineRepository } from "../../domain/repository/credit-line-repository";
import { PurchaseFinancingPlanCreator } from "./purchase-financing-plan-creator";

export class PreviewPurchaseQueryService {
    constructor(
        private readonly creditLineRepository: CreditLineRepository,
        private readonly purchaseFinancingPlanCreator: PurchaseFinancingPlanCreator
    ) {}

    async execute(previewPurchaseRequest: PreviewPurchaseRequest): Promise<PreviewPurchaseResponse> {
        const previewDate: Date = new Date();

        // Validamos datos mínimos del request antes de consultar dependencias externas.
        this.validate(previewPurchaseRequest);

        // La simulación consulta la línea real del usuario para no hardcodear disponibilidad en frontend.
        const creditLine: CreditLine =
            await this.findCreditLineByUserId(previewPurchaseRequest.userId);
        const purchaseAmount: Money = this.createPurchaseAmount(previewPurchaseRequest);

        // Reutilizamos el mismo creador de plan que usa la compra real.
        // Así preview y confirmación comparten la regla de cuotas, centavos y crédito reservado.
        const purchaseFinancingPlan: PurchaseFinancingPlan =
            this.purchaseFinancingPlanCreator.create(
                purchaseAmount,
                previewPurchaseRequest.installments,
                previewDate
            );

        return this.toResponse(
            previewPurchaseRequest,
            purchaseAmount,
            purchaseFinancingPlan,
            creditLine
        );
    }

    private validate(previewPurchaseRequest: PreviewPurchaseRequest): void {
        if (previewPurchaseRequest.userId.trim().length === 0) {
            throw new InvalidUserIdError();
        }

        if (previewPurchaseRequest.amount.lessThanOrEqualTo(0)) {
            throw new InvalidPurchaseAmountError(
                previewPurchaseRequest.amount.toFixed(2)
            );
        }
    }

    private async findCreditLineByUserId(userId: string): Promise<CreditLine> {
        const creditLine: CreditLine | null =
            await this.creditLineRepository.findCreditLineByUserId(userId);

        if (creditLine === null) {
            throw new CreditLineNotFoundError(userId);
        }

        return creditLine;
    }

    private createPurchaseAmount(
        previewPurchaseRequest: PreviewPurchaseRequest
    ): Money {
        return {
            amount: previewPurchaseRequest.amount,
            currency: Currency.VES
        };
    }

    private toResponse(
        previewPurchaseRequest: PreviewPurchaseRequest,
        purchaseAmount: Money,
        purchaseFinancingPlan: PurchaseFinancingPlan,
        creditLine: CreditLine
    ): PreviewPurchaseResponse {
        return {
            userId: previewPurchaseRequest.userId,
            amount: {
                amount: purchaseAmount.amount.toFixed(2),
                currency: purchaseAmount.currency
            },
            installments: previewPurchaseRequest.installments,
            installmentPlan: purchaseFinancingPlan.installmentPlan.map(
                (installment: Installment): PreviewInstallmentResponse =>
                    this.toInstallmentResponse(installment)
            ),
            creditToReserve: {
                amount: purchaseFinancingPlan.creditToReserve.amount.toFixed(2),
                currency: purchaseFinancingPlan.creditToReserve.currency
            },
            availableCredit: {
                amount: creditLine.availableCredit.amount.toFixed(2),
                currency: creditLine.availableCredit.currency
            },
            canBeConfirmed: purchaseFinancingPlan.creditToReserve.amount
                .lessThanOrEqualTo(creditLine.availableCredit.amount)
        };
    }

    private toInstallmentResponse(
        installment: Installment
    ): PreviewInstallmentResponse {
        return {
            installmentNumber: installment.installmentNumber,
            amount: {
                amount: installment.amount.amount.toFixed(2),
                currency: installment.amount.currency
            },
            status: installment.status,
            dueDate: installment.dueDate.toISOString(),
            paymentTiming: installment.status === InstallmentStatus.PAID
                ? PreviewInstallmentPaymentTiming.PAID_AT_PURCHASE
                : PreviewInstallmentPaymentTiming.FINANCED
        };
    }
}
