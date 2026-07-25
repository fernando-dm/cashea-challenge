CREATE TABLE users
(
    user_id  TEXT PRIMARY KEY,
    email    TEXT NOT NULL,
    password TEXT
);

CREATE UNIQUE INDEX users_email_unique ON users (email);

INSERT INTO users (user_id, email, password)
VALUES
    -- Usuarios legacy/inseguros: password en texto plano.
    -- Sirven para reproducir el comportamiento vulnerable del snippet original.
    ('user-1', 'legacy.user1@cashea.test', 'Legacy123!'),
    ('user-with-limited-credit', 'legacy.limited@cashea.test', 'Legacy123!'),
    ('user-without-credit', 'legacy.without.credit@cashea.test', 'Legacy123!'),
    ('legacy-only-user', 'legacy.only@cashea.test', 'Legacy123!'),

    -- Por ahora dejamos todos los usuarios con password plano.
    -- En el siguiente paso migramos auth.fixed.ts a password_hash.
    ('user-with-1000-credit', 'secure.1000@cashea.test', 'Secure123!'),
    ('secure-only-user', 'secure.only@cashea.test', 'Secure123!');