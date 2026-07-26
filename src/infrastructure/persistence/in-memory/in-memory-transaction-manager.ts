import type {
    TransactionalRepositories,
    TransactionManager
} from "../../../application/transaction/transaction-manager";
import { InMemoryCreditLineRepository } from "./in-memory-credit-line-repository";
import { InMemoryPurchaseRepository } from "./in-memory-purchase-repository";
import type { CreditLine } from "../../../domain/model/credit-line";
import type { Purchase } from "../../../domain/model/purchase";

export class InMemoryTransactionManager implements TransactionManager {
    constructor(
        private readonly creditLineRepository: InMemoryCreditLineRepository,
        private readonly purchaseRepository: InMemoryPurchaseRepository
    ) {}

    async execute<T>(
        operation: (repositories: TransactionalRepositories) => Promise<T>
    ): Promise<T> {
        const creditLineSnapshot: Map<string, CreditLine> =
            this.creditLineRepository.snapshot();
        const purchaseSnapshot: Map<string, Purchase> =
            this.purchaseRepository.snapshot();

        try {
            // In-memory no tiene BEGIN/COMMIT real como PostgreSQL,
            // pero usamos snapshots para respetar la misma semántica de unidad de trabajo:
            // si algo falla, volvemos al estado anterior.
            return await operation({
                creditLineRepository: this.creditLineRepository,
                purchaseRepository: this.purchaseRepository
            });
        } catch (error) {
            this.creditLineRepository.restore(creditLineSnapshot);
            this.purchaseRepository.restore(purchaseSnapshot);

            throw error;
        }
    }
}