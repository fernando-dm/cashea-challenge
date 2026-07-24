import type { Request, Response } from "express";
import type { CreatePurchaseRequest } from "../../application/dto/request/create-purchase-request";
import type { CreatePurchaseResponse } from "../../application/dto/response/create-purchase-response";
import { CreatePurchaseCommandService } from "../../application/service/create-purchase-command-service";
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

export class PurchaseController {
    constructor(private readonly createPurchaseCommandService: CreatePurchaseCommandService) {}

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
}
