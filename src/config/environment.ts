import { z } from "zod";
import { PersistenceType } from "./persistence-type";

export enum AppEnvironment {
    LOCAL = "local",
    TEST = "test",
    PRODUCTION = "production"
}

const environmentSchema = z.object({
    APP_ENV: z.enum([
        AppEnvironment.LOCAL,
        AppEnvironment.TEST,
        AppEnvironment.PRODUCTION
    ]).default(AppEnvironment.LOCAL),
    PORT: z.coerce.number().default(3000),
    PERSISTENCE: z.enum([
        PersistenceType.IN_MEMORY,
        PersistenceType.POSTGRES
    ]).default(PersistenceType.IN_MEMORY),
    DATABASE_URL: z.string()
        .default("postgres://cashea:cashea@localhost:5432/cashea_challenge")
});

const parsedEnvironment = environmentSchema.parse(process.env);

export type Environment = {
    appEnvironment: AppEnvironment;
    port: number;
    persistence: PersistenceType;
    databaseUrl: string;
};

export const environment: Environment = {
    appEnvironment: parsedEnvironment.APP_ENV,
    port: parsedEnvironment.PORT,
    persistence: parsedEnvironment.PERSISTENCE,
    databaseUrl: parsedEnvironment.DATABASE_URL
};
