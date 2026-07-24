import express, { Express } from "express";
import { createRoutes } from "./presentation/api/routes";
import { errorHandler } from "./presentation/error/error-handler";

export function createApp(): Express {
    const app: Express = express();

    app.use(express.json());
    app.use(createRoutes());
    app.use(errorHandler);

    return app;
}
