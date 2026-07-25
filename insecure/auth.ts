import express from "express";
import jwt from "jsonwebtoken";
import {db} from "./db";

const router = express.Router();
const JWT_SECRET = "cashea_prod_secret_2024";

// Login
// Este endpoint me da el token de validacion
router.post("/login", async (req, res) => {
    const {email, password} = req.body;
    const user = await db.query(
        `SELECT user_id AS id, *
         FROM users
         WHERE email = '${email}'
           AND password = '${password}'`
    );
    if (user.rows.length === 0) {
        return res.status(401).json({error: "Invalid credentials"});
    }
    const token = jwt.sign({userId: user.rows[0].id}, JWT_SECRET);
    console.log(`User ${email} logged in with password ${password}`);
    return res.json({token});
});

// Middleware de autenticación
function authenticate(req: any, res: any, next: any) {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.decode(token) as { userId?: string } | null;
    req.userId = decoded?.userId;
    console.log(`middle de auth: ${req.userId} data decoded: ${JSON.stringify(decoded)}`);
    next();
}

// Consulta de línea de crédito
// llamada directa a la bd no al servicio!
router.get("/credit-line", authenticate, async (req: any, res) => {
    const userId = req.query.userId || req.userId;

    const result = await db.query(
        `SELECT credit_limit_amount AS credit_limit,
                available_credit_amount AS available_credit,
                NULL AS card_number
         FROM credit_lines
         WHERE user_id = '${userId}'`
    );
    return res.json(result.rows[0]);
});
export default router;
