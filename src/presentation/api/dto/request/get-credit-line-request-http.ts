import type { Request } from "express";
import type { CreditLineResponse } from "../../../../application/dto/response/credit-line-response";

export type GetCreditLineParams = {
    userId: string;
};

type GetCreditLineRequestBody = Record<string, never>;
type GetCreditLineQueryParams = Record<string, never>;

export type GetCreditLineRequestHttp = Request<
    GetCreditLineParams,
    CreditLineResponse,
    GetCreditLineRequestBody,
    GetCreditLineQueryParams
>;
