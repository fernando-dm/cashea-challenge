import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";

export class JwtTokenService {
    private readonly jwtExpiresIn: SignOptions["expiresIn"] = "5m";

    constructor(private readonly jwtSecret: string) {}

    // Por simplicidad tomamos el secret desde la variable de entorno JWT_SECRET.
    // En local puede venir inline al ejecutar el comando o desde un .env creado a partir de .env.example.
    // En un sistema productivo podría venir de un servicio de autenticación,
    // un servicio de autorización, un secret manager o un sidecar.
    static fromEnvironment(): JwtTokenService {
        const secret: string | undefined = process.env.JWT_SECRET;

        if (!secret) {
            throw new Error("JWT_SECRET is required to start the secure auth module");
        }

        return new JwtTokenService(secret);
    }

    signUserToken(userId: string): string {
        return jwt.sign(
            { userId },
            this.jwtSecret,
            { expiresIn: this.jwtExpiresIn }
        );
    }

    verifyUserToken(token: string): string | null {
        try {
            // verify valida firma y expiración.
            // Si algo falla devolvemos null para que el middleware responda 401
            // sin filtrar detalles internos del token.
            const decoded: string | JwtPayload = jwt.verify(token, this.jwtSecret);

            if (typeof decoded === "string" || typeof decoded.userId !== "string") {
                return null;
            }

            return decoded.userId;
        } catch {
            return null;
        }
    }
}
