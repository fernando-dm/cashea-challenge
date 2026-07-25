import bcrypt from "bcryptjs";
import express, { type NextFunction, type Request, type Response } from "express";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { db } from "./db";

const router = express.Router();
const jwtSecret: string = getJwtSecret();
const jwtExpiresIn: SignOptions["expiresIn"] = "5m";

type AuthenticatedRequest = Request & {
    userId?: string;
};

type UserRow = {
    user_id: string;
    email: string;
    password_hash: string | null;
};

type CreditLineRow = {
    credit_limit: string;
    available_credit: string;
};

type LoginRequestBody = {
    email?: unknown;
    password?: unknown;
};

// Por simplicidad tomamos el secret desde env.
// En un sistema productivo podría venir de un servicio de autenticación,
// un servicio de autorización, un secret manager o un sidecar.
function getJwtSecret(): string {
    const secret: string | undefined = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error("JWT_SECRET is required to start the secure auth module");
    }

    return secret;
}

router.post(
    "/login",
    async (
        req: Request<object, object, LoginRequestBody>,
        res: Response
    ): Promise<Response> => {
        const { email, password } = req.body;

        // Validamos input antes de ir a la base para evitar consultas ambiguas.
        if (typeof email !== "string" || typeof password !== "string") {
            return res.status(400).json({ error: "Invalid login request" });
        }

        const user: UserRow | null = await findUserByEmail(email);

        // Respondemos el mismo mensaje para usuario inexistente o password inválida.
        // Así evitamos filtrar qué emails existen en la base.
        if (!user || !user.password_hash) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const passwordMatches: boolean = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatches) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token: string = jwt.sign(
            { userId: user.user_id },
            jwtSecret,
            { expiresIn: jwtExpiresIn }
        );

        return res.json({ token });
    }
);

function authenticate(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void {
    const authorizationHeader: string | undefined = req.headers.authorization;
    const token: string | null = extractBearerToken(authorizationHeader);

    if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }

    try {
        const decoded: string | JwtPayload = jwt.verify(token, jwtSecret);

        if (typeof decoded === "string" || typeof decoded.userId !== "string") {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        req.userId = decoded.userId;
        next();
    } catch {
        res.status(401).json({ error: "Unauthorized" });
    }
}

router.get(
    "/credit-line",
    authenticate,
    async (req: AuthenticatedRequest, res: Response): Promise<Response> => {

        const authenticatedUserId: string | undefined = req.userId;
        // si manda por query param:
        const requestedUserId: unknown = req.query.userId;

        if (!authenticatedUserId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Defensa anti-IDOR: si el cliente manda userId, debe coincidir con el token.
        // La consulta real usa siempre el userId autenticado.
        if (typeof requestedUserId === "string" &&
            requestedUserId !== authenticatedUserId
        ) {
            return res.status(403).json({ error: "Forbidden" });
        }


        const userExists: boolean = await existsUserById(authenticatedUserId);

        // Un token válido debe pertenecer a un usuario existente.
        // Si el usuario fue borrado o nunca existió, cortamos el request.
        if (!userExists) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        console.log(`creditLine for User ${authenticatedUserId} logged `);
        const creditLine: CreditLineRow | null = await findCreditLineByUserId(authenticatedUserId);

        if (!creditLine) {
            return res.status(404).json({ error: "Credit line not found" });
        }

        return res.json({
            credit_limit: creditLine.credit_limit,
            available_credit: creditLine.available_credit
        });
    }
);

async function findUserByEmail(email: string): Promise<UserRow | null> {
    const result = await db.query<UserRow>(
        `SELECT user_id, email, password_hash
         FROM users
         WHERE email = $1`,
        [email]
    );

    return result.rows[0] ?? null;
}

async function existsUserById(userId: string): Promise<boolean> {
    const result = await db.query<{ exists: boolean }>(
        `SELECT EXISTS (
             SELECT 1
             FROM users
             WHERE user_id = $1
         ) AS exists`,
        [userId]
    );

    return result.rows[0]?.exists === true;
}

async function findCreditLineByUserId(
    userId: string
): Promise<CreditLineRow | null> {
    const result = await db.query<CreditLineRow>(
        `SELECT credit_limit_amount AS credit_limit,
                available_credit_amount AS available_credit
         FROM credit_lines
         WHERE user_id = $1`,
        [userId]
    );

    return result.rows[0] ?? null;
}

function extractBearerToken(authorizationHeader: string | undefined): string | null {
    if (!authorizationHeader) {
        return null;
    }

    const [scheme, token] = authorizationHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
        return null;
    }

    return token;
}

export default router;
