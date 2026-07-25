import express, { Express } from "express";
import {
    createDependencyContainer,
    type DependencyContainer
} from "./config/dependency-container";
import { createRoutes } from "./presentation/api/routes";
import { errorHandler } from "./presentation/error/error-handler";

export function createApp(): Express {
    const app: Express = express();

    // Armamos las dependencias una sola vez al iniciar la aplicación.
    // Desde acá hacia afuera estamos en el borde del sistema, por eso es válido
    // conocer el composition root y luego entregar dependencias ya construidas.
    const dependencyContainer: DependencyContainer = createDependencyContainer();

    app.use(express.json());

    // Servimos el frontend mínimo como archivos estáticos separados del backend.
    // Esto permite probar el flujo end-to-end desde el mismo puerto sin agregar CORS,
    // bundlers ni dependencias de frontend que no aportan al challenge.
    app.use(express.static("frontend"));

    // Routes no instancia servicios ni repositorios: solo recibe controllers listos para usar.
    // Esto mantiene separada la configuración de dependencias del registro de endpoints.
    app.use(createRoutes(dependencyContainer));
    app.use(errorHandler);

    return app;
}
