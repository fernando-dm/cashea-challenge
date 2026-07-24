import {
    ApplicationError,
    ApplicationErrorCode
} from "./application-error";

export class InsufficientCreditError extends ApplicationError {
    constructor(userId: string) {
        super(
            ApplicationErrorCode.INSUFFICIENT_CREDIT,
            `Insufficient credit for user: ${userId}`
        );
    }
}
