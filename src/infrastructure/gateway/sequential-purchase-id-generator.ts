import type { PurchaseIdGenerator } from "../../application/gateway/purchase-id-generator";

export class SequentialPurchaseIdGenerator implements PurchaseIdGenerator {
    private nextId: number;

    constructor() {
        this.nextId = 1;
    }

    nextPurchaseId(): string {
        const purchaseId: string = `purchase-${this.nextId}`;
        this.nextId += 1;

        return purchaseId;
    }
}
