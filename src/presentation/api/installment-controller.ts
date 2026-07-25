import type { PayInstallmentRequest } from "../../application/dto/request/pay-installment-request";
import type { PayInstallmentResponse } from "../../application/dto/response/pay-installment-response";
import { PayInstallmentCommandService } from "../../application/service/pay-installment-command-service";
import type { PayInstallmentRequestHttp } from "./dto/request/pay-installment-request-http";
import type { PayInstallmentResponseHttp } from "./dto/response/pay-installment-response-http";

export class InstallmentController {
    constructor(
        private readonly payInstallmentCommandService:
            PayInstallmentCommandService
    ) {}

    async payInstallment(
        req: PayInstallmentRequestHttp,
        res: PayInstallmentResponseHttp
    ): Promise<PayInstallmentResponseHttp> {
        const payInstallmentRequest: PayInstallmentRequest = {
            purchaseId: req.params.purchaseId,
            installmentNumber: Number(req.params.installmentNumber)
        };

        const payInstallmentResponse: PayInstallmentResponse =
            await this.payInstallmentCommandService.execute(payInstallmentRequest);

        return res.status(200).json(payInstallmentResponse);
    }
}
