import { Router } from "express";
import type { PurchaseIdGenerator } from "../../application/gateway/purchase-id-generator";
import { CreatePurchaseCommandService } from "../../application/service/create-purchase-command-service";
import { GetCreditLineByUserIdQueryService } from "../../application/service/get-credit-line-by-user-id-query-service";
import { PurchaseFinancingPlanCreator } from "../../application/service/purchase-financing-plan-creator";
import type { CreditLineRepository } from "../../domain/repository/credit-line-repository";
import type { PurchaseRepository } from "../../domain/repository/purchase-repository";
import { SequentialPurchaseIdGenerator } from "../../infrastructure/gateway/sequential-purchase-id-generator";
import { InMemoryCreditLineRepository } from "../../infrastructure/persistence/in-memory/in-memory-credit-line-repository";
import { InMemoryPurchaseRepository } from "../../infrastructure/persistence/in-memory/in-memory-purchase-repository";
import { CreditLineController } from "./credit-line-controller";
import type {
    GetCreditLineRequest,
    GetCreditLineResponse
} from "./credit-line-controller";
import {
    CreatePurchaseRequestHttp,
    CreatePurchaseResponseHttp,
    PurchaseController
} from "./purchase-controller";

export function createRoutes(): Router {
    const router: Router = Router();

    // Punto de composición: conectamos la aplicación con infraestructura reemplazable.
    const creditLineRepository: CreditLineRepository =
        new InMemoryCreditLineRepository();
    const purchaseRepository: PurchaseRepository =
        new InMemoryPurchaseRepository();
    const purchaseIdGenerator: PurchaseIdGenerator =
        new SequentialPurchaseIdGenerator();
    const purchaseFinancingPlanCreator: PurchaseFinancingPlanCreator =
        new PurchaseFinancingPlanCreator();

    const getCreditLineByUserIdQueryService: GetCreditLineByUserIdQueryService =
        new GetCreditLineByUserIdQueryService(creditLineRepository);

    const creditLineController: CreditLineController = new CreditLineController(
        getCreditLineByUserIdQueryService
    );
    const createPurchaseCommandService: CreatePurchaseCommandService =
        new CreatePurchaseCommandService(
            creditLineRepository,
            purchaseRepository,
            purchaseIdGenerator,
            purchaseFinancingPlanCreator
        );
    const purchaseController: PurchaseController = new PurchaseController(
        createPurchaseCommandService
    );

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

    return router;
}
