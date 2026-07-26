import type { NextFunction, Request, Response } from "express";
import type { JwtTokenService } from "./jwt-token-service";
import type { SecureUserRepository } from "./secure-user-repository";

export type AuthenticatedRequest = Request & {
    userId?: string;
};

export class AuthenticateMiddleware {
    constructor(
        private readonly jwtTokenService: JwtTokenService,
        private readonly userRepository: SecureUserRepository
    ) {}

    handle = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        // Flujo de autenticación:
        // 1. exigir header Bearer,
        // 2. verificar firma y expiración del JWT,
        // 3. confirmar que el userId del token exista en users,
        // 4. recién ahí dejar pasar el request.
        const token: string | null = this.extractBearerToken(
            req.headers.authorization
        );

        if (!token) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const userId: string | null = this.jwtTokenService.verifyUserToken(token);

        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const userExists: boolean =
            await this.userRepository.existsUserById(userId);

        // Un token válido debe pertenecer a un usuario existente.
        // Si el usuario fue borrado o nunca existió, cortamos el request.
        if (!userExists) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        req.userId = userId;
        next();
    };

    private extractBearerToken(
        authorizationHeader: string | undefined
    ): string | null {
        // Aceptamos solo el formato estándar Authorization: Bearer <token>.
        if (!authorizationHeader) {
            return null;
        }

        const [scheme, token] = authorizationHeader.split(" ");

        if (scheme !== "Bearer" || !token) {
            return null;
        }

        return token;
    }
}
