import type { Pool, PoolClient } from "pg";
import type {
    TransactionalRepositories,
    TransactionManager
} from "../../../../application/transaction/transaction-manager";
import { PostgresCreditLineRepository } from "../repository/postgres-credit-line-repository";
import { PostgresPurchaseRepository } from "../repository/postgres-purchase-repository";

export class PostgresTransactionManager implements TransactionManager {
    constructor(private readonly postgresPool: Pool) {}

    async execute<T>(
        operation: (repositories: TransactionalRepositories) => Promise<T>
    ): Promise<T> {
        const postgresClient: PoolClient = await this.postgresPool.connect();

        try {
            await postgresClient.query("BEGIN");

            // Creamos los repositorios con el mismo cliente para que todos los writes
            // participen de la misma transacción de PostgreSQL.
            const result: T = await operation({
                creditLineRepository: new PostgresCreditLineRepository(postgresClient),
                purchaseRepository: new PostgresPurchaseRepository(postgresClient)
            });

            await postgresClient.query("COMMIT");

            return result;
        } catch (error) {
            await postgresClient.query("ROLLBACK");

            throw error;
        } finally {
            postgresClient.release();
        }
    }
}
