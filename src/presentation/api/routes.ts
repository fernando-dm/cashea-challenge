import { Router } from "express";
import {
    createDependencyContainer,
    type DependencyContainer
} from "../../config/dependency-container";
import type { GetCreditLineRequestHttp } from "./dto/request/get-credit-line-request-http";
import type { CreatePurchaseRequestHttp } from "./dto/request/create-purchase-request-http";
import type { GetPurchaseDetailRequestHttp } from "./dto/request/get-purchase-detail-request-http";
import type { PayInstallmentRequestHttp } from "./dto/request/pay-installment-request-http";
import type { GetCreditLineResponseHttp } from "./dto/response/get-credit-line-response-http";
import type { CreatePurchaseResponseHttp } from "./dto/response/create-purchase-response-http";
import type { GetPurchaseDetailResponseHttp } from "./dto/response/get-purchase-detail-response-http";
import type { PayInstallmentResponseHttp } from "./dto/response/pay-installment-response-http";

export function createRoutes(): Router {
    const router: Router = Router();
    const dependencyContainer: DependencyContainer = createDependencyContainer();

    router.get(
        "/users/:userId/credit-line",
        async (req: GetCreditLineRequestHttp, res: GetCreditLineResponseHttp) =>
            dependencyContainer.creditLineController.getCreditLineByUserId(req, res)
    );

    router.post(
        "/users/:userId/purchases",
        async (req: CreatePurchaseRequestHttp, res: CreatePurchaseResponseHttp) =>
            dependencyContainer.purchaseController.createPurchase(req, res)
    );

    router.get(
        "/purchases/:purchaseId",
        async (req: GetPurchaseDetailRequestHttp, res: GetPurchaseDetailResponseHttp) =>
            dependencyContainer.purchaseController.getPurchaseDetailById(req, res)
    );

    router.post(
        "/purchases/:purchaseId/installments/:installmentNumber/pay",
        async (req: PayInstallmentRequestHttp, res: PayInstallmentResponseHttp) =>
            dependencyContainer.installmentController.payInstallment(req, res)
    );

    return router;
}
