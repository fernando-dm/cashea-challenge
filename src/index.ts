import { Express } from "express";
import { createApp } from "./app";

const port: string | number = process.env.PORT ?? 3000;

const app: Express = createApp();

app.listen(port, () => {
    console.log(`Cashea challenge backend running on port ${port}`);
});
