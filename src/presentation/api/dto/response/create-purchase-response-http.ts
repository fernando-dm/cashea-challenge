import type { Response } from "express";
import type { CreatePurchaseResponse } from "../../../../application/dto/response/create-purchase-response";

export type CreatePurchaseResponseHttp = Response<CreatePurchaseResponse>;
