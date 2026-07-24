import {
    ApplicationError,
    ApplicationErrorCode
} from "./application-error";

export class InstallmentNotFoundError extends ApplicationError {
    constructor(installmentNumber: number) {
        super(
            ApplicationErrorCode.INSTALLMENT_NOT_FOUND,
            `Installment not found: ${installmentNumber}`
        );
    }
}
