import type { PurchaseIdGenerator } from "../application/gateway/purchase-id-generator";
import { CreatePurchaseCommandService } from "../application/service/create-purchase-command-service";
import { GetCreditLineByUserIdQueryService } from "../application/service/get-credit-line-by-user-id-query-service";
import { GetPurchaseDetailByIdQueryService } from "../application/service/get-purchase-detail-by-id-query-service";
import { PayInstallmentCommandService } from "../application/service/pay-installment-command-service";
import { PurchaseByIdFinder } from "../application/service/purchase-by-id-finder";
import { PurchaseFinancingPlanCreator } from "../application/service/purchase-financing-plan-creator";
import type { CreditLineRepository } from "../domain/repository/credit-line-repository";
import type { PurchaseRepository } from "../domain/repository/purchase-repository";
import { SequentialPurchaseIdGenerator } from "../infrastructure/gateway/sequential-purchase-id-generator";
import { InMemoryCreditLineRepository } from "../infrastructure/persistence/in-memory/in-memory-credit-line-repository";
import { InMemoryPurchaseRepository } from "../infrastructure/persistence/in-memory/in-memory-purchase-repository";
import { CreditLineController } from "../presentation/api/credit-line-controller";
import { InstallmentController } from "../presentation/api/installment-controller";
import { PurchaseController } from "../presentation/api/purchase-controller";

export type DependencyContainer = {
    creditLineController: CreditLineController;
    purchaseController: PurchaseController;
    installmentController: InstallmentController;
};

export function createDependencyContainer(): DependencyContainer {
    // Punto de composición: conectamos la aplicación con infraestructura reemplazable.
    const creditLineRepository: CreditLineRepository =
        new InMemoryCreditLineRepository();
    const purchaseRepository: PurchaseRepository =
        new InMemoryPurchaseRepository();
    const purchaseIdGenerator: PurchaseIdGenerator =
        new SequentialPurchaseIdGenerator();
    const purchaseFinancingPlanCreator: PurchaseFinancingPlanCreator =
        new PurchaseFinancingPlanCreator();
    const purchaseByIdFinder: PurchaseByIdFinder =
        new PurchaseByIdFinder(purchaseRepository);

    const getCreditLineByUserIdQueryService: GetCreditLineByUserIdQueryService =
        new GetCreditLineByUserIdQueryService(creditLineRepository);
    const createPurchaseCommandService: CreatePurchaseCommandService =
        new CreatePurchaseCommandService(
            creditLineRepository,
            purchaseRepository,
            purchaseIdGenerator,
            purchaseFinancingPlanCreator
        );
    const getPurchaseDetailByIdQueryService: GetPurchaseDetailByIdQueryService =
        new GetPurchaseDetailByIdQueryService(purchaseByIdFinder);
    const payInstallmentCommandService: PayInstallmentCommandService =
        new PayInstallmentCommandService(
            purchaseByIdFinder,
            purchaseRepository,
            creditLineRepository
        );

    return {
        creditLineController: new CreditLineController(
            getCreditLineByUserIdQueryService
        ),
        purchaseController: new PurchaseController(
            createPurchaseCommandService,
            getPurchaseDetailByIdQueryService
        ),
        installmentController: new InstallmentController(
            payInstallmentCommandService
        )
    };
}
