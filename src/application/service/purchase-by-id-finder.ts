import type { Purchase } from "../../domain/model/purchase";
import type { PurchaseRepository } from "../../domain/repository/purchase-repository";
import { PurchaseNotFoundError } from "../exception/purchase-not-found-error";

export class PurchaseByIdFinder {
    constructor(private readonly purchaseRepository: PurchaseRepository) {}

    async find(purchaseId: string): Promise<Purchase> {
        this.validate(purchaseId);

        const purchase: Purchase | null =
            await this.purchaseRepository.findPurchaseById(purchaseId);

        if (purchase === null) {
            throw new PurchaseNotFoundError(purchaseId);
        }

        return purchase;
    }

    private validate(purchaseId: string): void {
        if (purchaseId.trim().length === 0) {
            throw new PurchaseNotFoundError(purchaseId);
        }
    }
}
