import {
    ApplicationError,
    ApplicationErrorCode
} from "./application-error";

export class PurchaseNotFoundError extends ApplicationError {
    constructor(purchaseId: string) {
        super(
            ApplicationErrorCode.PURCHASE_NOT_FOUND,
            `Purchase not found: ${purchaseId}`
        );
    }
}
