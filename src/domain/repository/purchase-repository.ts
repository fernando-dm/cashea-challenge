import type { Purchase } from "../model/purchase";

export interface PurchaseRepository {
    save(purchase: Purchase): Promise<Purchase>;
    findPurchaseById(purchaseId: string): Promise<Purchase | null>;
}
