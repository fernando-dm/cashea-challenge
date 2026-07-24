import { Router } from "express";
import type { PurchaseIdGenerator } from "../../application/gateway/purchase-id-generator";
import { CreatePurchaseCommandService } from "../../application/service/create-purchase-command-service";
import { GetCreditLineByUserIdQueryService } from "../../application/service/get-credit-line-by-user-id-query-service";
import { GetPurchaseDetailByIdQueryService } from "../../application/service/get-purchase-detail-by-id-query-service";
import { PayInstallmentCommandService } from "../../application/service/pay-installment-command-service";
import { PurchaseByIdFinder } from "../../application/service/purchase-by-id-finder";
import { PurchaseFinancingPlanCreator } from "../../application/service/purchase-financing-plan-creator";
import type { CreditLineRepository } from "../../domain/repository/credit-line-repository";
import type { PurchaseRepository } from "../../domain/repository/purchase-repository";
import { SequentialPurchaseIdGenerator } from "../../infrastructure/gateway/sequential-purchase-id-generator";
import { InMemoryCreditLineRepository } from "../../infrastructure/persistence/in-memory/in-memory-credit-line-repository";
import { InMemoryPurchaseRepository } from "../../infrastructure/persistence/in-memory/in-memory-purchase-repository";
import { CreditLineController } from "./credit-line-controller";
import {
    InstallmentController,
    PayInstallmentRequestHttp,
    PayInstallmentResponseHttp
} from "./installment-controller";
import type {
    GetCreditLineRequest,
    GetCreditLineResponse
} from "./credit-line-controller";
import {
    CreatePurchaseRequestHttp,
    CreatePurchaseResponseHttp,
    GetPurchaseDetailRequestHttp,
    GetPurchaseDetailResponseHttp,
    PurchaseController
} from "./purchase-controller";

export function createRoutes(): Router {
    const router: Router = Router();

    // Punto de composición: conectamos la aplicación con infraestructura reemplazable.
    const creditLineRepository: CreditLineRepository = new InMemoryCreditLineRepository();
    const purchaseRepository: PurchaseRepository = new InMemoryPurchaseRepository();
    const purchaseIdGenerator: PurchaseIdGenerator = new SequentialPurchaseIdGenerator();
    const purchaseFinancingPlanCreator: PurchaseFinancingPlanCreator =new PurchaseFinancingPlanCreator();
    const purchaseByIdFinder: PurchaseByIdFinder = new PurchaseByIdFinder(purchaseRepository);

    const getCreditLineByUserIdQueryService: GetCreditLineByUserIdQueryService =
        new GetCreditLineByUserIdQueryService(creditLineRepository);

    const creditLineController: CreditLineController = new CreditLineController(
        getCreditLineByUserIdQueryService
    );
    const createPurchaseCommandService: CreatePurchaseCommandService =new CreatePurchaseCommandService(creditLineRepository,purchaseRepository,purchaseIdGenerator,purchaseFinancingPlanCreator);
    const getPurchaseDetailByIdQueryService: GetPurchaseDetailByIdQueryService = new GetPurchaseDetailByIdQueryService(purchaseByIdFinder);
    const purchaseController: PurchaseController = new PurchaseController(createPurchaseCommandService,getPurchaseDetailByIdQueryService);
    const payInstallmentCommandService: PayInstallmentCommandService = new PayInstallmentCommandService(purchaseByIdFinder,purchaseRepository,creditLineRepository);
    const installmentController: InstallmentController = new InstallmentController(payInstallmentCommandService);

    router.get(
        "/users/:userId/credit-line",
        (req: GetCreditLineRequest, res: GetCreditLineResponse) =>
            creditLineController.getCreditLineByUserId(req, res)
    );

    router.post(
        "/users/:userId/purchases",
        (req: CreatePurchaseRequestHttp, res: CreatePurchaseResponseHttp) =>
            purchaseController.createPurchase(req, res)
    );

    router.get(
        "/purchases/:purchaseId",
        (req: GetPurchaseDetailRequestHttp, res: GetPurchaseDetailResponseHttp) =>
            purchaseController.getPurchaseDetailById(req, res)
    );

    router.post(
        "/purchases/:purchaseId/installments/:installmentNumber/pay",
        (req: PayInstallmentRequestHttp, res: PayInstallmentResponseHttp) =>
            installmentController.payInstallment(req, res)
    );

    return router;
}
