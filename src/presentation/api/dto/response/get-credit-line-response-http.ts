import type { Response } from "express";
import type { CreditLineResponse } from "../../../../application/dto/response/credit-line-response";

export type GetCreditLineResponseHttp = Response<CreditLineResponse>;
