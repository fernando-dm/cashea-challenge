import type { NextFunction, Request, Response } from "express";
import {
    ApplicationErrorCode,
    isApplicationError
} from "../../application/exception/application-error";

type ErrorResponseBody = {
    error: string;
};

type ErrorHttpMapping = {
    statusCode: number;
    message: string;
};

const errorMappings: Record<ApplicationErrorCode, ErrorHttpMapping> = {
    [ApplicationErrorCode.INVALID_USER_ID]: {
        statusCode: 400,
        message: "Invalid user id"
    },
    [ApplicationErrorCode.CREDIT_LINE_NOT_FOUND]: {
        statusCode: 404,
        message: "Credit line not found"
    }
};

export function errorHandler(
    error: Error,
    _req: Request,
    res: Response<ErrorResponseBody>,
    _next: NextFunction
): Response<ErrorResponseBody> | void {
    if (isApplicationError(error)) {
        const errorHttpMapping: ErrorHttpMapping = errorMappings[error.code];

        return res.status(errorHttpMapping.statusCode).json({
            error: errorHttpMapping.message
        });
    }

    return res.status(500).json({
        error: "Internal server error"
    });
}
