import type { CreatePurchaseRequest } from "../../application/dto/request/create-purchase-request";
import type { CreatePurchaseResponse } from "../../application/dto/response/create-purchase-response";
import type { PurchaseDetailResponse } from "../../application/dto/response/purchase-detail-response";
import { CreatePurchaseCommandService } from "../../application/service/create-purchase-command-service";
import { GetPurchaseDetailByIdQueryService } from "../../application/service/get-purchase-detail-by-id-query-service";
import type { CreatePurchaseRequestHttp } from "./dto/request/create-purchase-request-http";
import type { GetPurchaseDetailRequestHttp } from "./dto/request/get-purchase-detail-request-http";
import type { CreatePurchaseResponseHttp } from "./dto/response/create-purchase-response-http";
import type { GetPurchaseDetailResponseHttp } from "./dto/response/get-purchase-detail-response-http";
import { parseDecimalAmount } from "../validation/parse-decimal-amount";

export class PurchaseController {
    constructor(
        private readonly createPurchaseCommandService: CreatePurchaseCommandService,
        private readonly getPurchaseDetailByIdQueryService: GetPurchaseDetailByIdQueryService
    ) {}

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

    async getPurchaseDetailById(
        req: GetPurchaseDetailRequestHttp,
        res: GetPurchaseDetailResponseHttp): Promise<GetPurchaseDetailResponseHttp> {

        const purchaseDetailResponse: PurchaseDetailResponse =
            await this.getPurchaseDetailByIdQueryService.execute(req.params.purchaseId);

        return res.status(200).json(purchaseDetailResponse);
    }
}
