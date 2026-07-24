import {
    ApplicationError,
    ApplicationErrorCode
} from "./application-error";

export class InvalidInstallmentPlanError extends ApplicationError {
    constructor(installments: number) {
        super(
            ApplicationErrorCode.INVALID_INSTALLMENT_PLAN,
            `Invalid installment plan: ${installments}`
        );
    }
}
