import "dotenv/config";
import express, { type Express } from "express";
import authRouter from "./auth";

const app: Express = express();
const port: number = Number(process.env.INSECURE_PORT ?? 3001);

app.use(express.json());

// Montamos el módulo bajo /insecure para probarlo aislado del backend principal.
// Esto ayuda a revisar seguridad sin contaminar el flujo productivo del challenge.
app.use("/insecure", authRouter);

app.listen(port, () => {
    console.log(`Insecure auth module running on port ${port}`);
});
