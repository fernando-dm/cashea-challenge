import type { Request } from "express";
import type { CreatePurchaseResponse } from "../../../../application/dto/response/create-purchase-response";

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
