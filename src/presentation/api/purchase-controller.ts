import type { CreatePurchaseRequest } from "../../application/dto/request/create-purchase-request";
import type { PreviewPurchaseRequest } from "../../application/dto/request/preview-purchase-request";
import type { CreatePurchaseResponse } from "../../application/dto/response/create-purchase-response";
import type { PreviewPurchaseResponse } from "../../application/dto/response/preview-purchase-response";
import type { PurchaseSummaryResponse } from "../../application/dto/response/purchase-summary-response";
import type { PurchaseDetailResponse } from "../../application/dto/response/purchase-detail-response";
import { CreatePurchaseCommandService } from "../../application/service/create-purchase-command-service";
import { GetPurchaseDetailByIdQueryService } from "../../application/service/get-purchase-detail-by-id-query-service";
import { GetPurchasesByUserIdQueryService } from "../../application/service/get-purchases-by-user-id-query-service";
import { PreviewPurchaseQueryService } from "../../application/service/preview-purchase-query-service";
import type { CreatePurchaseRequestHttp } from "./dto/request/create-purchase-request-http";
import type { GetPurchaseDetailRequestHttp } from "./dto/request/get-purchase-detail-request-http";
import type { GetPurchasesRequestHttp } from "./dto/request/get-purchases-request-http";
import type { PreviewPurchaseRequestHttp } from "./dto/request/preview-purchase-request-http";
import type { CreatePurchaseResponseHttp } from "./dto/response/create-purchase-response-http";
import type { GetPurchaseDetailResponseHttp } from "./dto/response/get-purchase-detail-response-http";
import type { GetPurchasesResponseHttp } from "./dto/response/get-purchases-response-http";
import type { PreviewPurchaseResponseHttp } from "./dto/response/preview-purchase-response-http";
import { parseDecimalAmount } from "../validation/parse-decimal-amount";

export class PurchaseController {
    constructor(
        private readonly createPurchaseCommandService: CreatePurchaseCommandService,
        private readonly getPurchaseDetailByIdQueryService: GetPurchaseDetailByIdQueryService,
        private readonly getPurchasesByUserIdQueryService: GetPurchasesByUserIdQueryService,
        private readonly previewPurchaseQueryService: PreviewPurchaseQueryService
    ) {}

    async previewPurchase(
        req: PreviewPurchaseRequestHttp,
        res: PreviewPurchaseResponseHttp): Promise<PreviewPurchaseResponseHttp> {

        const previewPurchaseRequest: PreviewPurchaseRequest = {
            userId: req.params.userId,
            amount: parseDecimalAmount(req.body.amount),
            installments: req.body.installments
        };

        const previewPurchaseResponse: PreviewPurchaseResponse =
            await this.previewPurchaseQueryService.execute(previewPurchaseRequest);

        return res.status(200).json(previewPurchaseResponse);
    }

    async createPurchase(
        req: CreatePurchaseRequestHttp,
        res: CreatePurchaseResponseHttp): Promise<CreatePurchaseResponseHttp> {

        const createPurchaseRequest: CreatePurchaseRequest = {
            userId: req.params.userId,
            amount: parseDecimalAmount(req.body.amount), // validamos entrada
            installments: req.body.installments
        };

        const createPurchaseResponse: CreatePurchaseResponse =
            await this.createPurchaseCommandService.execute(createPurchaseRequest);

        return res.status(201).json(createPurchaseResponse);
    }

    async getPurchasesByUserId(
        req: GetPurchasesRequestHttp,
        res: GetPurchasesResponseHttp): Promise<GetPurchasesResponseHttp> {

        const purchasesResponse: PurchaseSummaryResponse[] =
            await this.getPurchasesByUserIdQueryService.execute(req.params.userId);

        return res.status(200).json(purchasesResponse);
    }

    async getPurchaseDetailById(
        req: GetPurchaseDetailRequestHttp,
        res: GetPurchaseDetailResponseHttp): Promise<GetPurchaseDetailResponseHttp> {

        const purchaseDetailResponse: PurchaseDetailResponse =
            await this.getPurchaseDetailByIdQueryService.execute(req.params.purchaseId);

        return res.status(200).json(purchaseDetailResponse);
    }
}
