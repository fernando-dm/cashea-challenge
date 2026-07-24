import {
    ApplicationError,
    ApplicationErrorCode
} from "./application-error";

export class InstallmentAlreadyPaidError extends ApplicationError {
    constructor(installmentNumber: number) {
        super(
            ApplicationErrorCode.INSTALLMENT_ALREADY_PAID,
            `Installment already paid: ${installmentNumber}`
        );
    }
}
