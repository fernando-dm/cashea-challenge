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
import { getPersistenceType } from "./persistence-config";
import { PersistenceType } from "./persistence-type";

export type DependencyContainer = {
    creditLineController: CreditLineController;
    purchaseController: PurchaseController;
    installmentController: InstallmentController;
};

type Repositories = {
    creditLineRepository: CreditLineRepository;
    purchaseRepository: PurchaseRepository;
};

export function createDependencyContainer(): DependencyContainer {
    // Punto de composición: conectamos la aplicación con infraestructura reemplazable.
    const repositories: Repositories = createRepositories();
    const purchaseIdGenerator: PurchaseIdGenerator =
        new SequentialPurchaseIdGenerator();
    const purchaseFinancingPlanCreator: PurchaseFinancingPlanCreator =
        new PurchaseFinancingPlanCreator();
    const purchaseByIdFinder: PurchaseByIdFinder =
        new PurchaseByIdFinder(repositories.purchaseRepository);

    const getCreditLineByUserIdQueryService: GetCreditLineByUserIdQueryService =
        new GetCreditLineByUserIdQueryService(repositories.creditLineRepository);
    const createPurchaseCommandService: CreatePurchaseCommandService =
        new CreatePurchaseCommandService(
            repositories.creditLineRepository,
            repositories.purchaseRepository,
            purchaseIdGenerator,
            purchaseFinancingPlanCreator
        );
    const getPurchaseDetailByIdQueryService: GetPurchaseDetailByIdQueryService =
        new GetPurchaseDetailByIdQueryService(purchaseByIdFinder);
    const payInstallmentCommandService: PayInstallmentCommandService =
        new PayInstallmentCommandService(
            purchaseByIdFinder,
            repositories.purchaseRepository,
            repositories.creditLineRepository
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

function createRepositories(): Repositories {
    const persistenceType: PersistenceType = getPersistenceType();

    if (persistenceType === PersistenceType.IN_MEMORY) {
        return {
            creditLineRepository: new InMemoryCreditLineRepository(),
            purchaseRepository: new InMemoryPurchaseRepository()
        };
    }

    throw new Error("Postgres persistence is not implemented yet");
}
