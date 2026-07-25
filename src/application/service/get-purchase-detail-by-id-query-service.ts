import type { Installment } from "../../domain/model/installment";
import type { Purchase } from "../../domain/model/purchase";
import type {
    InstallmentDetailResponse,
    PurchaseDetailResponse
} from "../dto/response/purchase-detail-response";
import { PurchaseNotFoundError } from "../exception/purchase-not-found-error";
import { PurchaseByIdFinder } from "./purchase-by-id-finder";

export class GetPurchaseDetailByIdQueryService {
    constructor(private readonly purchaseByIdFinder: PurchaseByIdFinder) {}

    async execute(purchaseId: string): Promise<PurchaseDetailResponse> {

        this.validate(purchaseId);

        const purchase: Purchase = await this.purchaseByIdFinder.find(purchaseId);

        return this.toResponse(purchase);
    }

    private validate(purchaseId: string): void {
        if (purchaseId.trim().length === 0) {
            throw new PurchaseNotFoundError(purchaseId);
        }
    }

    private toResponse(purchase: Purchase): PurchaseDetailResponse {
        return {
            purchaseId: purchase.purchaseId,
            userId: purchase.userId,
            amount: {
                amount: purchase.amount.amount.toFixed(2),
                currency: purchase.amount.currency
            },
            status: purchase.status,
            createdAt: purchase.createdAt.toISOString(),
            updatedAt: purchase.updatedAt.toISOString(),
            installmentPlan: purchase.installmentPlan.map(
                (installment: Installment): InstallmentDetailResponse =>
                    this.toInstallmentResponse(installment)
            )
        };
    }

    private toInstallmentResponse(
        installment: Installment
    ): InstallmentDetailResponse {
        // El response expone fechas y montos como tipos serializables para HTTP.
        return {
            installmentNumber: installment.installmentNumber,
            amount: {
                amount: installment.amount.amount.toFixed(2),
                currency: installment.amount.currency
            },
            status: installment.status,
            dueDate: installment.dueDate.toISOString(),
            paidAt: installment.paidAt?.toISOString() ?? null
        };
    }
}
