import type { Response } from "express";
import type { PurchaseDetailResponse } from "../../../../application/dto/response/purchase-detail-response";

export type GetPurchaseDetailResponseHttp = Response<PurchaseDetailResponse>;
