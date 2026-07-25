ALTER TABLE users
    ADD COLUMN password_hash TEXT;

-- Migramos usuarios existentes a password_hash para que el módulo seguro
-- no vuelva a depender de passwords en texto plano.
--
-- Hash bcrypt de Legacy123!
UPDATE users
SET password_hash = '$2b$10$y9zddv.hNLu5EbSk1n4lKuyrCqjenPwxiyVA8zLifDPNBi7jkW5/C'
WHERE password = 'Legacy123!';

-- Hash bcrypt de Secure123!
UPDATE users
SET password_hash = '$2b$10$yjTBxgDKgFPJ9Li169bHxe/y5ZYQpFrKz2wkJxB6/K9npHYlTJEE.'
WHERE password = 'Secure123!';