import type { Request, Response } from "express";
import type { CreatePurchaseRequest } from "../../application/dto/request/create-purchase-request";
import type { CreatePurchaseResponse } from "../../application/dto/response/create-purchase-response";
import type { PurchaseDetailResponse } from "../../application/dto/response/purchase-detail-response";
import { CreatePurchaseCommandService } from "../../application/service/create-purchase-command-service";
import { GetPurchaseDetailByIdQueryService } from "../../application/service/get-purchase-detail-by-id-query-service";
import { parseDecimalAmount } from "../validation/parse-decimal-amount";

export type CreatePurchaseParams = {
    userId: string;
};

export type CreatePurchaseRequestBody = {
    amount: string;
    installments: number;
};

type CreatePurchaseQueryParams = Record<string, never>;

export type CreatePurchaseRequestHttp = Request<
    CreatePurchaseParams,
    CreatePurchaseResponse,
    CreatePurchaseRequestBody,
    CreatePurchaseQueryParams
>;

export type CreatePurchaseResponseHttp = Response<CreatePurchaseResponse>;

export type GetPurchaseDetailParams = {
    purchaseId: string;
};

type GetPurchaseDetailRequestBody = Record<string, never>;
type GetPurchaseDetailQueryParams = Record<string, never>;

export type GetPurchaseDetailRequestHttp = Request<
    GetPurchaseDetailParams,
    PurchaseDetailResponse,
    GetPurchaseDetailRequestBody,
    GetPurchaseDetailQueryParams
>;

export type GetPurchaseDetailResponseHttp = Response<PurchaseDetailResponse>;

export class PurchaseController {
    constructor(
        private readonly createPurchaseCommandService: CreatePurchaseCommandService,
        private readonly getPurchaseDetailByIdQueryService: GetPurchaseDetailByIdQueryService
    ) {}

    createPurchase(
        req: CreatePurchaseRequestHttp,
        res: CreatePurchaseResponseHttp): CreatePurchaseResponseHttp {

        const createPurchaseRequest: CreatePurchaseRequest = {
            userId: req.params.userId,
            amount: parseDecimalAmount(req.body.amount), // validamos entrada
            installments: req.body.installments
        };

        const createPurchaseResponse: CreatePurchaseResponse =
            this.createPurchaseCommandService.execute(createPurchaseRequest);

        return res.status(201).json(createPurchaseResponse);
    }

    getPurchaseDetailById(
        req: GetPurchaseDetailRequestHttp,
        res: GetPurchaseDetailResponseHttp): GetPurchaseDetailResponseHttp {

        const purchaseDetailResponse: PurchaseDetailResponse =
            this.getPurchaseDetailByIdQueryService.execute(req.params.purchaseId);

        return res.status(200).json(purchaseDetailResponse);
    }
}
