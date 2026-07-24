import {
    ApplicationError,
    ApplicationErrorCode
} from "./application-error";

export class InvalidUserIdError extends ApplicationError {
    constructor() {
        super(ApplicationErrorCode.INVALID_USER_ID, "Invalid user id");
    }
}
