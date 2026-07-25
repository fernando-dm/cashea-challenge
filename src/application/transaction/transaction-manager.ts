import type { CreditLineRepository } from "../../domain/repository/credit-line-repository";
import type { PurchaseRepository } from "../../domain/repository/purchase-repository";

export type TransactionalRepositories = {
    creditLineRepository: CreditLineRepository;
    purchaseRepository: PurchaseRepository;
};

export interface TransactionManager {
    execute<T>(
        operation: (repositories: TransactionalRepositories) => Promise<T>
    ): Promise<T>;
}
