import type {
    TransactionalRepositories,
    TransactionManager
} from "../../../application/transaction/transaction-manager";
import type { CreditLineRepository } from "../../../domain/repository/credit-line-repository";
import type { PurchaseRepository } from "../../../domain/repository/purchase-repository";

export class InMemoryTransactionManager implements TransactionManager {
    constructor(
        private readonly creditLineRepository: CreditLineRepository,
        private readonly purchaseRepository: PurchaseRepository
    ) {}

    async execute<T>(
        operation: (repositories: TransactionalRepositories) => Promise<T>
    ): Promise<T> {
        // In-memory no necesita BEGIN/COMMIT; reutilizamos los mismos repositorios
        // para mantener el contrato transaccional sin agregar infraestructura falsa.
        return operation({
            creditLineRepository: this.creditLineRepository,
            purchaseRepository: this.purchaseRepository
        });
    }
}
