import type { PurchaseIdGenerator } from "../application/gateway/purchase-id-generator";
import { CreatePurchaseCommandService } from "../application/service/create-purchase-command-service";
import { GetCreditLineByUserIdQueryService } from "../application/service/get-credit-line-by-user-id-query-service";
import { GetPurchaseDetailByIdQueryService } from "../application/service/get-purchase-detail-by-id-query-service";
import { GetPurchasesByUserIdQueryService } from "../application/service/get-purchases-by-user-id-query-service";
import { PayInstallmentCommandService } from "../application/service/pay-installment-command-service";
import { PreviewPurchaseQueryService } from "../application/service/preview-purchase-query-service";
import { PurchaseByIdFinder } from "../application/service/purchase-by-id-finder";
import { PurchaseFinancingPlanCreator } from "../application/service/purchase-financing-plan-creator";
import type { TransactionManager } from "../application/transaction/transaction-manager";
import type { CreditLineRepository } from "../domain/repository/credit-line-repository";
import type { PurchaseRepository } from "../domain/repository/purchase-repository";
import { SequentialPurchaseIdGenerator } from "../infrastructure/gateway/sequential-purchase-id-generator";
import { InMemoryCreditLineRepository } from "../infrastructure/persistence/in-memory/in-memory-credit-line-repository";
import { InMemoryPurchaseRepository } from "../infrastructure/persistence/in-memory/in-memory-purchase-repository";
import { InMemoryTransactionManager } from "../infrastructure/persistence/in-memory/in-memory-transaction-manager";
import { postgresPool } from "../infrastructure/persistence/postgres/connection/postgres-pool";
import { PostgresCreditLineRepository } from "../infrastructure/persistence/postgres/repository/postgres-credit-line-repository";
import { PostgresPurchaseRepository } from "../infrastructure/persistence/postgres/repository/postgres-purchase-repository";
import { PostgresTransactionManager } from "../infrastructure/persistence/postgres/transaction/postgres-transaction-manager";
import { CreditLineController } from "../presentation/api/credit-line-controller";
import { InstallmentController } from "../presentation/api/installment-controller";
import { PurchaseController } from "../presentation/api/purchase-controller";
import { environment } from "./environment";
import { PersistenceType } from "./persistence-type";

export type DependencyContainer = {
    creditLineController: CreditLineController;
    purchaseController: PurchaseController;
    installmentController: InstallmentController;
};

type PersistenceDependencies = {
    creditLineRepository: CreditLineRepository;
    purchaseRepository: PurchaseRepository;
    transactionManager: TransactionManager;
};

export function createDependencyContainer(): DependencyContainer {
    // Punto de composición: conectamos la aplicación con infraestructura reemplazable.
    // Todas las clases concretas se instancian acá para que controllers y casos de uso
    // dependan de contratos simples y no decidan qué implementación usar.
    const persistenceDependencies: PersistenceDependencies =
        createPersistenceDependencies();
    const purchaseIdGenerator: PurchaseIdGenerator =
        new SequentialPurchaseIdGenerator();
    const purchaseFinancingPlanCreator: PurchaseFinancingPlanCreator =
        new PurchaseFinancingPlanCreator();
    const purchaseByIdFinder: PurchaseByIdFinder =
        new PurchaseByIdFinder(persistenceDependencies.purchaseRepository);

    const getCreditLineByUserIdQueryService: GetCreditLineByUserIdQueryService =
        new GetCreditLineByUserIdQueryService(
            persistenceDependencies.creditLineRepository
        );
    const createPurchaseCommandService: CreatePurchaseCommandService =
        new CreatePurchaseCommandService(
            persistenceDependencies.transactionManager,
            purchaseIdGenerator,
            purchaseFinancingPlanCreator
        );
    const getPurchaseDetailByIdQueryService: GetPurchaseDetailByIdQueryService =
        new GetPurchaseDetailByIdQueryService(purchaseByIdFinder);
    const getPurchasesByUserIdQueryService: GetPurchasesByUserIdQueryService =
        new GetPurchasesByUserIdQueryService(
            persistenceDependencies.creditLineRepository,
            persistenceDependencies.purchaseRepository
        );
    const previewPurchaseQueryService: PreviewPurchaseQueryService =
        new PreviewPurchaseQueryService(
            persistenceDependencies.creditLineRepository,
            purchaseFinancingPlanCreator
        );
    const payInstallmentCommandService: PayInstallmentCommandService =
        new PayInstallmentCommandService(
            persistenceDependencies.transactionManager
        );

    return {
        creditLineController: new CreditLineController(
            getCreditLineByUserIdQueryService
        ),
        purchaseController: new PurchaseController(
            createPurchaseCommandService,
            getPurchaseDetailByIdQueryService,
            getPurchasesByUserIdQueryService,
            previewPurchaseQueryService
        ),
        installmentController: new InstallmentController(
            payInstallmentCommandService
        )
    };
}

function createPersistenceDependencies(): PersistenceDependencies {
    const persistenceType: PersistenceType = environment.persistence;

    if (persistenceType === PersistenceType.IN_MEMORY) {
        // In-memory comparte las mismas instancias entre queries, commands y transaction manager.
        // Esto permite que el manager tome snapshots y restaure estado si falla una unidad de trabajo.
        const creditLineRepository: InMemoryCreditLineRepository =
            new InMemoryCreditLineRepository();
        const purchaseRepository: InMemoryPurchaseRepository =
            new InMemoryPurchaseRepository();

        return {
            creditLineRepository,
            purchaseRepository,
            transactionManager: new InMemoryTransactionManager(
                creditLineRepository,
                purchaseRepository
            )
        };
    }

    if (persistenceType === PersistenceType.POSTGRES) {
        // PostgreSQL usa repositorios normales para lecturas y un transaction manager
        // que crea repositorios con el mismo cliente dentro de BEGIN/COMMIT/ROLLBACK.
        return {
            creditLineRepository: new PostgresCreditLineRepository(postgresPool),
            purchaseRepository: new PostgresPurchaseRepository(postgresPool),
            transactionManager: new PostgresTransactionManager(postgresPool)
        };
    }

    throw new Error(`Unsupported persistence type: ${persistenceType}`);
}