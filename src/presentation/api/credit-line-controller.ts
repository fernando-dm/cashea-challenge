import type { Request, Response } from "express";
import type { CreditLineResponse } from "../../application/dto/response/credit-line-response";
import { GetCreditLineByUserIdQueryService } from "../../application/service/get-credit-line-by-user-id-query-service";

export type GetCreditLineParams = {
    userId: string;
};

type GetCreditLineRequestBody = Record<string, never>;

type GetCreditLineQueryParams = Record<string, never>;

export type GetCreditLineResponseBody = CreditLineResponse;

export type GetCreditLineRequest = Request<
    GetCreditLineParams,
    GetCreditLineResponseBody,
    GetCreditLineRequestBody,
    GetCreditLineQueryParams
>;

export type GetCreditLineResponse = Response<GetCreditLineResponseBody>;

export class CreditLineController {
    constructor(
        private readonly getCreditLineByUserIdQueryService: GetCreditLineByUserIdQueryService
    ) {}

    getCreditLineByUserId(
        req: GetCreditLineRequest,
        res: GetCreditLineResponse
    ): GetCreditLineResponse {
        const userId: string = req.params.userId;

        const creditLineResponse: CreditLineResponse =
            this.getCreditLineByUserIdQueryService.execute(userId);

        return res.status(200).json(creditLineResponse);
    }
}
