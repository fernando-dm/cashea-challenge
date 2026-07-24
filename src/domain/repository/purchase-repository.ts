import type { Purchase } from "../model/purchase";

export interface PurchaseRepository {
    save(purchase: Purchase): Purchase;
    findPurchaseById(purchaseId: string): Purchase | null;
}
