import { Pool, type QueryResult } from "pg";

const databaseUrl: string =
    process.env.DATABASE_URL ?? "postgres://cashea:cashea@localhost:5432/cashea_challenge";

const pool: Pool = new Pool({
    connectionString: databaseUrl
});

// Adaptador mínimo para que el snippet inseguro pueda ejecutarse contra Postgres.
// Lo mantenemos dentro de insecure para no mezclar este módulo heredado con la app principal.
export const db = {
    query<T extends object = any>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
        return pool.query<T>(text, params);
    }
};
