import type { Purchase } from "../../../domain/model/purchase";
import type { PurchaseRepository } from "../../../domain/repository/purchase-repository";

export class InMemoryPurchaseRepository implements PurchaseRepository {
    private readonly purchasesById: Map<string, Purchase>;

    constructor() {
        this.purchasesById = new Map<string, Purchase>();
    }

    async save(purchase: Purchase): Promise<Purchase> {
        this.purchasesById.set(purchase.purchaseId, purchase);

        return purchase;
    }

    async findPurchaseById(purchaseId: string): Promise<Purchase | null> {
        const purchase: Purchase | undefined = this.purchasesById.get(purchaseId);

        return purchase ?? null;
    }

    async findPurchasesByUserId(userId: string): Promise<Purchase[]> {
        return Array.from(this.purchasesById.values())
            .filter((purchase: Purchase): boolean => purchase.userId === userId)
            .sort(
                (leftPurchase: Purchase, rightPurchase: Purchase): number =>
                    rightPurchase.createdAt.getTime() - leftPurchase.createdAt.getTime()
            );
    }

    snapshot(): Map<string, Purchase> {
        return new Map<string, Purchase>(this.purchasesById);
    }

    restore(snapshot: Map<string, Purchase>): void {
        this.purchasesById.clear();

        for (const [purchaseId, purchase] of snapshot.entries()) {
            this.purchasesById.set(purchaseId, purchase);
        }
    }
}