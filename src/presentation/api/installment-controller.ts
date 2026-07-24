import type { Request, Response } from "express";
import type { PayInstallmentRequest } from "../../application/dto/request/pay-installment-request";
import type { PayInstallmentResponse } from "../../application/dto/response/pay-installment-response";
import { PayInstallmentCommandService } from "../../application/service/pay-installment-command-service";

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

export type PayInstallmentResponseHttp = Response<PayInstallmentResponse>;

export class InstallmentController {
    constructor(
        private readonly payInstallmentCommandService:
            PayInstallmentCommandService
    ) {}

    payInstallment(
        req: PayInstallmentRequestHttp,
        res: PayInstallmentResponseHttp
    ): PayInstallmentResponseHttp {
        const payInstallmentRequest: PayInstallmentRequest = {
            purchaseId: req.params.purchaseId,
            installmentNumber: Number(req.params.installmentNumber)
        };

        const payInstallmentResponse: PayInstallmentResponse =
            this.payInstallmentCommandService.execute(payInstallmentRequest);

        return res.status(200).json(payInstallmentResponse);
    }
}
