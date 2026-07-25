import type { Response } from "express";
import type { PurchaseSummaryResponse } from "../../../../application/dto/response/purchase-summary-response";

export type GetPurchasesResponseHttp = Response<PurchaseSummaryResponse[]>;
