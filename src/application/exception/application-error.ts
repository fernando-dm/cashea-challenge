export enum ApplicationErrorCode {
    INVALID_USER_ID = "INVALID_USER_ID",
    CREDIT_LINE_NOT_FOUND = "CREDIT_LINE_NOT_FOUND"
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
