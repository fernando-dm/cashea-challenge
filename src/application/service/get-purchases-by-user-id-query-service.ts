import { InstallmentStatus } from "../../domain/model/installment";
import type { CreditLine } from "../../domain/model/credit-line";
import type { Purchase } from "../../domain/model/purchase";
import type { CreditLineRepository } from "../../domain/repository/credit-line-repository";
import type { PurchaseRepository } from "../../domain/repository/purchase-repository";
import type { PurchaseSummaryResponse } from "../dto/response/purchase-summary-response";
import { CreditLineNotFoundError } from "../exception/credit-line-not-found-error";
import { InvalidUserIdError } from "../exception/invalid-user-id-error";

export class GetPurchasesByUserIdQueryService {
    constructor(
        private readonly creditLineRepository: CreditLineRepository,
        private readonly purchaseRepository: PurchaseRepository
    ) {}

    async execute(userId: string): Promise<PurchaseSummaryResponse[]> {
        // Validamos el usuario y verificamos su línea para distinguir usuario inexistente
        // de usuario válido que todavía no tiene compras.
        this.validate(userId);
        await this.findCreditLineByUserId(userId);

        const purchases: Purchase[] =
            await this.purchaseRepository.findPurchasesByUserId(userId);

        return purchases.map(
            (purchase: Purchase): PurchaseSummaryResponse =>
                this.toResponse(purchase)
        );
    }

    private validate(userId: string): void {
        if (userId.trim().length === 0) {
            throw new InvalidUserIdError();
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

    private toResponse(purchase: Purchase): PurchaseSummaryResponse {
        return {
            purchaseId: purchase.purchaseId,
            amount: {
                amount: purchase.amount.amount.toFixed(2),
                currency: purchase.amount.currency
            },
            status: purchase.status,
            installments: purchase.installments,
            pendingInstallments: purchase.installmentPlan.filter(
                (installment): boolean =>
                    installment.status === InstallmentStatus.PENDING
            ).length,
            createdAt: purchase.createdAt.toISOString()
        };
    }
}
