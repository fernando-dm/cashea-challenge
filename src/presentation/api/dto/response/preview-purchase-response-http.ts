import type { Response } from "express";
import type { PreviewPurchaseResponse } from "../../../../application/dto/response/preview-purchase-response";

export type PreviewPurchaseResponseHttp = Response<PreviewPurchaseResponse>;
