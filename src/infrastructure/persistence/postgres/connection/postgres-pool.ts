import { Pool } from "pg";
import { environment } from "../../../../config/environment";

export const postgresPool: Pool = new Pool({
    connectionString: environment.databaseUrl
});
