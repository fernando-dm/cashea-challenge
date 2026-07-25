import type { Request } from "express";
import type { PurchaseSummaryResponse } from "../../../../application/dto/response/purchase-summary-response";

export type GetPurchasesParams = {
    userId: string;
};

type GetPurchasesRequestBody = Record<string, never>;
type GetPurchasesQueryParams = Record<string, never>;

export type GetPurchasesRequestHttp = Request<
    GetPurchasesParams,
    PurchaseSummaryResponse[],
    GetPurchasesRequestBody,
    GetPurchasesQueryParams
>;
