import type { db } from "../db";

export type SecureUser = {
    userId: string;
    email: string;
    passwordHash: string | null;
};

type UserRow = {
    user_id: string;
    email: string;
    password_hash: string | null;
};

export class SecureUserRepository {
    constructor(private readonly database: typeof db) {}

    async findUserByEmail(email: string): Promise<SecureUser | null> {
        // Dejamos el query pegado a este repositorio porque es una necesidad de persistencia,
        // no una regla HTTP ni una regla de negocio del controller.
        // Usar $1 evita concatenar input del usuario y corrige el SQL Injection del snippet vulnerable.
        const result = await this.database.query<UserRow>(
            `SELECT user_id, email, password_hash
             FROM users
             WHERE email = $1`,
            [email]
        );

        return this.toSecureUser(result.rows[0]);
    }

    async existsUserById(userId: string): Promise<boolean> {
        // Un JWT firmado no alcanza por sí solo:
        // también verificamos que el userId exista en la tabla users.
        // Esto evita aceptar tokens válidos para usuarios borrados o inexistentes.
        const result = await this.database.query<{ exists: boolean }>(
            `SELECT EXISTS (
                 SELECT 1
                 FROM users
                 WHERE user_id = $1
             ) AS exists`,
            [userId]
        );

        return result.rows[0]?.exists === true;
    }

    private toSecureUser(userRow: UserRow | undefined): SecureUser | null {
        if (!userRow) {
            return null;
        }

        return {
            userId: userRow.user_id,
            email: userRow.email,
            passwordHash: userRow.password_hash
        };
    }
}
