import type { CreditLineResponse } from "../../application/dto/response/credit-line-response";
import { GetCreditLineByUserIdQueryService } from "../../application/service/get-credit-line-by-user-id-query-service";
import type { GetCreditLineRequestHttp } from "./dto/request/get-credit-line-request-http";
import type { GetCreditLineResponseHttp } from "./dto/response/get-credit-line-response-http";

export class CreditLineController {
    constructor(
        private readonly getCreditLineByUserIdQueryService: GetCreditLineByUserIdQueryService
    ) {}

    async getCreditLineByUserId(
        req: GetCreditLineRequestHttp,
        res: GetCreditLineResponseHttp
    ): Promise<GetCreditLineResponseHttp> {
        const userId: string = req.params.userId;

        const creditLineResponse: CreditLineResponse =
            await this.getCreditLineByUserIdQueryService.execute(userId);

        return res.status(200).json(creditLineResponse);
    }
}
