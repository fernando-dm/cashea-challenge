import {
    ApplicationError,
    ApplicationErrorCode
} from "./application-error";

export class CreditLineNotFoundError extends ApplicationError {
    constructor(userId: string) {
        super(
            ApplicationErrorCode.CREDIT_LINE_NOT_FOUND,
            `Credit line not found for user: ${userId}`
        );
    }
}
