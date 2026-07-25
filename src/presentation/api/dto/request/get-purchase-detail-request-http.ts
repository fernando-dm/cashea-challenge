import type { Request } from "express";
import type { PurchaseDetailResponse } from "../../../../application/dto/response/purchase-detail-response";

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
