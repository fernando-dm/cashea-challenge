import {
    ApplicationError,
    ApplicationErrorCode
} from "./application-error";

export class InvalidPurchaseAmountError extends ApplicationError {
    constructor(amount: string) {
        super(
            ApplicationErrorCode.INVALID_PURCHASE_AMOUNT,
            `Invalid purchase amount: ${amount}`
        );
    }
}
