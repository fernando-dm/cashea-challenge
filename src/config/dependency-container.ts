import type { PurchaseIdGenerator } from "../application/gateway/purchase-id-generator";
import { CreatePurchaseCommandService } from "../application/service/create-purchase-command-service";
import { GetCreditLineByUserIdQueryService } from "../application/service/get-credit-line-by-user-id-query-service";
import { GetPurchaseDetailByIdQueryService } from "../application/service/get-purchase-detail-by-id-query-service";
import { PayInstallmentCommandService } from "../application/service/pay-installment-command-service";
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

type Repositories = {
    creditLineRepository: CreditLineRepository;
    purchaseRepository: PurchaseRepository;
};

export function createDependencyContainer(): DependencyContainer {
    // Punto de composición: conectamos la aplicación con infraestructura reemplazable.
    // Todas las clases concretas se instancian acá para que controllers y casos de uso
    // dependan de contratos simples y no decidan qué implementación usar.
    const repositories: Repositories = createRepositories();
    const transactionManager: TransactionManager =
        createTransactionManager(repositories);
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
            transactionManager,
            purchaseIdGenerator,
            purchaseFinancingPlanCreator
        );
    const getPurchaseDetailByIdQueryService: GetPurchaseDetailByIdQueryService =
        new GetPurchaseDetailByIdQueryService(purchaseByIdFinder);
    const payInstallmentCommandService: PayInstallmentCommandService =
        new PayInstallmentCommandService(transactionManager);

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
    const persistenceType: PersistenceType = environment.persistence;

    if (persistenceType === PersistenceType.IN_MEMORY) {
        // Implementación default para desarrollo rápido y tests sin depender de servicios externos.
        return {
            creditLineRepository: new InMemoryCreditLineRepository(),
            purchaseRepository: new InMemoryPurchaseRepository()
        };
    }

    if (persistenceType === PersistenceType.POSTGRES) {
        // Implementación real seleccionada por environment, sin cambiar casos de uso ni controllers.
        return {
            creditLineRepository: new PostgresCreditLineRepository(postgresPool),
            purchaseRepository: new PostgresPurchaseRepository(postgresPool)
        };
    }

    throw new Error(`Unsupported persistence type: ${persistenceType}`);
}

function createTransactionManager(repositories: Repositories): TransactionManager {
    const persistenceType: PersistenceType = environment.persistence;

    if (persistenceType === PersistenceType.IN_MEMORY) {
        // In-memory usa los mismos repositorios compartidos para mantener el contrato transaccional.
        return new InMemoryTransactionManager(
            repositories.creditLineRepository,
            repositories.purchaseRepository
        );
    }

    if (persistenceType === PersistenceType.POSTGRES) {
        // Postgres abre una transacción real y crea repositorios con el mismo cliente dentro de ella.
        return new PostgresTransactionManager(postgresPool);
    }

    throw new Error(`Unsupported persistence type: ${persistenceType}`);
}
