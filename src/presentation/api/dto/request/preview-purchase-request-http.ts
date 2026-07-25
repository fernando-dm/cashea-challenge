import type { Request } from "express";
import type { PreviewPurchaseResponse } from "../../../../application/dto/response/preview-purchase-response";

export type PreviewPurchaseParams = {
    userId: string;
};

export type PreviewPurchaseRequestBody = {
    amount: string;
    installments: number;
};

type PreviewPurchaseQueryParams = Record<string, never>;

export type PreviewPurchaseRequestHttp = Request<
    PreviewPurchaseParams,
    PreviewPurchaseResponse,
    PreviewPurchaseRequestBody,
    PreviewPurchaseQueryParams
>;
