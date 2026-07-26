import { Pool, type QueryResult } from "pg";

const databaseUrl: string =
    process.env.DATABASE_URL ?? "postgres://cashea:cashea@localhost:5432/cashea_challenge";

const pool: Pool = new Pool({
    connectionString: databaseUrl
});

// Adaptador mínimo de DB para el módulo de seguridad.
// Vive dentro de insecure porque este punto del challenge está aislado del backend principal
// y solo necesita ejecutar queries simples contra Postgres.
export const db = {
    query<T extends object = any>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
        return pool.query<T>(text, params);
    }
};
