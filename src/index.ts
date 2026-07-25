import "dotenv/config";
import { Express } from "express";
import { createApp } from "./app";
import { AppEnvironment, environment } from "./config/environment";
import { PersistenceType } from "./config/persistence-type";

const app: Express = createApp();

// Entry point: solo levanta el servidor HTTP.
// La composición de dependencias queda delegada a createApp para mantener este archivo simple.
app.listen(environment.port, () => {
    console.log(
        `Cashea challenge backend running on port ${environment.port} - ` +
        `Environment ${formatAppEnvironment()} (${formatPersistence()})`
    );
});

function formatAppEnvironment(): string {
    if (environment.appEnvironment === AppEnvironment.PRODUCTION) {
        return "PROD";
    }

    if (environment.appEnvironment === AppEnvironment.TEST) {
        return "TEST";
    }

    return "DEV";
}

function formatPersistence(): string {
    if (environment.persistence === PersistenceType.IN_MEMORY) {
        return "Default in-memory";
    }

    return `PostgreSQL ${formatDatabaseTarget()}`;
}

function formatDatabaseTarget(): string {
    try {
        const databaseUrl: URL = new URL(environment.databaseUrl);

        // Mostramos solo host/base para confirmar el destino sin exponer credenciales.
        return `${databaseUrl.host}${databaseUrl.pathname}`;
    } catch {
        return "configured";
    }
}
