import type { Request } from "express";
import type { PayInstallmentResponse } from "../../../../application/dto/response/pay-installment-response";

export type PayInstallmentParams = {
    purchaseId: string;
    installmentNumber: string;
};

type PayInstallmentRequestBody = Record<string, never>;
type PayInstallmentQueryParams = Record<string, never>;

export type PayInstallmentRequestHttp = Request<
    PayInstallmentParams,
    PayInstallmentResponse,
    PayInstallmentRequestBody,
    PayInstallmentQueryParams
>;
