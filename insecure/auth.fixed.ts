import bcrypt from "bcryptjs";
import express, {type Request, type Response} from "express";
import {db} from "./db";
import { AuthenticateMiddleware, type AuthenticatedRequest} from "./secure/authenticate";
import { JwtTokenService} from "./secure/jwt-token-service";
import { SecureCreditLineRepository, type SecureCreditLine} from "./secure/secure-credit-line-repository";
import {SecureUserRepository, type SecureUser } from "./secure/secure-user-repository";

type LoginRequestBody = {
    email?: unknown;
    password?: unknown;
};

const router = express.Router();
// Composition root mínimo del módulo seguro:
// acá conectamos router, repositorios, JWT y middleware.
// Los queries quedan en repositorios para que el controller no mezcle HTTP, SQL y reglas de seguridad.
const userRepository: SecureUserRepository = new SecureUserRepository(db);
const creditLineRepository: SecureCreditLineRepository = new SecureCreditLineRepository(db);
const jwtTokenService: JwtTokenService = JwtTokenService.fromEnvironment();
const authenticateMiddleware: AuthenticateMiddleware = new AuthenticateMiddleware(jwtTokenService, userRepository);

router.post(
    "/login",
    async (
        req: Request<object, object, LoginRequestBody>,
        res: Response
    ): Promise<Response> => {
        const {email, password} = req.body;

        // Validamos input antes de ir a la base para evitar consultas ambiguas.
        if (typeof email !== "string" || typeof password !== "string") {
            return res.status(400).json({error: "Invalid login request"});
        }

        const user: SecureUser | null =
            await userRepository.findUserByEmail(email);

        // Respondemos el mismo mensaje para usuario inexistente o password inválida.
        // Así evitamos filtrar qué emails existen en la base.
        if (!user || !user.passwordHash) {
            return res.status(401).json({error: "Invalid credentials"});
        }

        // El cliente envía password al login,
        // pero la base guarda password_hash.
        // bcrypt compara ambos sin exponer ni pedir el hash al cliente.
        const passwordMatches: boolean = await bcrypt.compare(
            password,
            user.passwordHash
        );

        if (!passwordMatches) {
            return res.status(401).json({error: "Invalid credentials"});
        }

        // Si las credenciales son válidas,
        // emitimos un JWT firmado con secret de entorno y expiración corta.
        const token: string = jwtTokenService.signUserToken(user.userId);

        return res.json({token});
    }
);

router.get(
    "/credit-line",
    authenticateMiddleware.handle,
    async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
        const authenticatedUserId: string | undefined = req.userId;
        const requestedUserId: unknown = req.query.userId;

        if (!authenticatedUserId) {
            return res.status(401).json({error: "Unauthorized"});
        }

        // Defensa anti-IDOR: si el cliente manda userId, debe coincidir con el token.
        // La consulta real usa siempre el userId autenticado.
        if (
            typeof requestedUserId === "string" &&
            requestedUserId !== authenticatedUserId
        ) {
            return res.status(403).json({error: "Forbidden"});
        }

        const creditLine: SecureCreditLine | null =
            await creditLineRepository.findCreditLineByUserId(authenticatedUserId);

        if (!creditLine) {
            return res.status(404).json({error: "Credit line not found"});
        }

        return res.json({
            credit_limit: creditLine.creditLimit,
            available_credit: creditLine.availableCredit
        });
    }
);

export default router;
