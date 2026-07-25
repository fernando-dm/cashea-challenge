import "dotenv/config";
import { Express } from "express";
import { createApp } from "./app";
import { environment } from "./config/environment";

const app: Express = createApp();

app.listen(environment.port, () => {
    console.log(`Cashea challenge backend running on port ${environment.port}`);
});
