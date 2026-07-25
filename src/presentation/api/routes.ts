import { Router } from "express";
import type { CreditLineController } from "./credit-line-controller";
import type { InstallmentController } from "./installment-controller";
import type { PurchaseController } from "./purchase-controller";
import type { GetCreditLineRequestHttp } from "./dto/request/get-credit-line-request-http";
import type { CreatePurchaseRequestHttp } from "./dto/request/create-purchase-request-http";
import type { GetPurchaseDetailRequestHttp } from "./dto/request/get-purchase-detail-request-http";
import type { PayInstallmentRequestHttp } from "./dto/request/pay-installment-request-http";
import type { PreviewPurchaseRequestHttp } from "./dto/request/preview-purchase-request-http";
import type { GetCreditLineResponseHttp } from "./dto/response/get-credit-line-response-http";
import type { CreatePurchaseResponseHttp } from "./dto/response/create-purchase-response-http";
import type { GetPurchaseDetailResponseHttp } from "./dto/response/get-purchase-detail-response-http";
import type { PayInstallmentResponseHttp } from "./dto/response/pay-installment-response-http";
import type { PreviewPurchaseResponseHttp } from "./dto/response/preview-purchase-response-http";

type RouteDependencies = {
    creditLineController: CreditLineController;
    purchaseController: PurchaseController;
    installmentController: InstallmentController;
};

export function createRoutes(dependencies: RouteDependencies): Router {
    const router: Router = Router();

    // Routes solo conoce los controllers que necesita para exponer HTTP.
    // No importa el DependencyContainer para no acoplar presentación al composition root.
    router.get(
        "/users/:userId/credit-line",
        async (req: GetCreditLineRequestHttp, res: GetCreditLineResponseHttp) =>
            dependencies.creditLineController.getCreditLineByUserId(req, res)
    );

    router.post(
        "/users/:userId/purchases/preview",
        async (req: PreviewPurchaseRequestHttp, res: PreviewPurchaseResponseHttp) =>
            dependencies.purchaseController.previewPurchase(req, res)
    );

    router.post(
        "/users/:userId/purchases",
        async (req: CreatePurchaseRequestHttp, res: CreatePurchaseResponseHttp) =>
            dependencies.purchaseController.createPurchase(req, res)
    );

    router.get(
        "/purchases/:purchaseId",
        async (req: GetPurchaseDetailRequestHttp, res: GetPurchaseDetailResponseHttp) =>
            dependencies.purchaseController.getPurchaseDetailById(req, res)
    );

    router.post(
        "/purchases/:purchaseId/installments/:installmentNumber/pay",
        async (req: PayInstallmentRequestHttp, res: PayInstallmentResponseHttp) =>
            dependencies.installmentController.payInstallment(req, res)
    );

    return router;
}
