import type { Purchase } from "../../../domain/model/purchase";
import type { PurchaseRepository } from "../../../domain/repository/purchase-repository";

export class InMemoryPurchaseRepository implements PurchaseRepository {
    private readonly purchasesById: Map<string, Purchase>;

    constructor() {
        this.purchasesById = new Map<string, Purchase>();
    }

    save(purchase: Purchase): Purchase {
        this.purchasesById.set(purchase.purchaseId, purchase);

        return purchase;
    }

    findPurchaseById(purchaseId: string): Purchase | null {
        const purchase: Purchase | undefined = this.purchasesById.get(purchaseId);

        return purchase ?? null;
    }
}
