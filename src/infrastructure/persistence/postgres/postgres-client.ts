import type { QueryResult, QueryResultRow } from "pg";

export type PostgresClient = {
    query<Row extends QueryResultRow = QueryResultRow>(
        sql: string,
        values?: unknown[]
    ): Promise<QueryResult<Row>>;
};
