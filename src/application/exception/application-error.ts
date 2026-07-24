export enum ApplicationErrorCode {
    INVALID_USER_ID = "INVALID_USER_ID",
    CREDIT_LINE_NOT_FOUND = "CREDIT_LINE_NOT_FOUND",
    INVALID_INSTALLMENT_PLAN = "INVALID_INSTALLMENT_PLAN",
    INVALID_PURCHASE_AMOUNT = "INVALID_PURCHASE_AMOUNT",
    INSUFFICIENT_CREDIT = "INSUFFICIENT_CREDIT",
    PURCHASE_NOT_FOUND = "PURCHASE_NOT_FOUND",
    INSTALLMENT_NOT_FOUND = "INSTALLMENT_NOT_FOUND",
    INSTALLMENT_ALREADY_PAID = "INSTALLMENT_ALREADY_PAID"
}

export abstract class ApplicationError extends Error {
    protected constructor(
        public readonly code: ApplicationErrorCode,
        message: string
    ) {
        super(message);
        this.name = new.target.name;
    }
}

export function isApplicationError(error: unknown): error is ApplicationError {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        "message" in error
    );
}
