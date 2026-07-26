# Revisión de Seguridad

## Documentación relacionada

- [README y pruebas manuales](./README.md)
- [Diseño técnico](./DESIGN.md)


Este documento registra los hallazgos encontrados en `insecure/auth.ts`,
incluye severidad, impacto concreto, evidencia y corrección propuesta

El módulo quedó separado del backend principal para poder probarlo sin afectar el flujo de compras,
se levantó en el puerto `3001`, conectado a Postgres, con datos de prueba creados desde cero.

Esta separado porque se pide en un punto aparte y se pide dejarlo tal cual esta y luego crear otro file como fix y analizarlo posteriormente en una defensa del caso.

## Pasos de prueba

El script `npm run dev:insecure` levanta un server aislado para la revisión de seguridad,
ese server monta dos rutas:

- `/insecure`: snippet vulnerable usado para reproducir hallazgos.
- `/secure`: versión corregida usada para validar la solución.
```bash
docker compose down -v
docker compose up -d --build postgres
rm -rf dist
npm run build
JWT_SECRET=dev_secret_for_security_review npm run dev:insecure
```
Paso a paso 
- Levantar Postgres desde cero (con las migraciones iniciales)
- Compilar el backend principal
- levantar el módulo inseguro aislado (insecure esta separado del backend)


Verifiqué que el módulo vulnerable responda en:

```text
http://localhost:3001/insecure
```

Verifiqué que el módulo corregido responda en:

```text
http://localhost:3001/secure
```

La tabla de users es
```bash
$ docker compose exec postgres psql -U cashea -d cashea_challenge -c "select user_id, email, password from users order by user_id;"                           
```
```txt
user_id          |               email               |  password  
--------------------------+-----------------------------------+------------
legacy-only-user         | legacy.only@cashea.test           | Legacy123!
secure-only-user         | secure.only@cashea.test           | Secure123!
user-1                   | legacy.user1@cashea.test          | Legacy123!
user-with-1000-credit    | secure.1000@cashea.test           | Secure123!
user-with-limited-credit | legacy.limited@cashea.test        | Legacy123!
user-without-credit      | legacy.without.credit@cashea.test | Legacy123!
```


## Login válido

Primero probé un login válido para obtener un token real,
esto sirve como caso base antes de probar ataques

```bash
curl -i -X POST http://localhost:3001/insecure/login \
  -H "Content-Type: application/json" \
  -d '{"email":"legacy.user1@cashea.test","password":"Legacy123!"}'
```
__Corresponde al user: user1__

Respuesta:

```text
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
```

Guardé el token para las pruebas siguientes:

```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Consulta de línea de crédito con token válido

Probé consultar la línea de crédito del usuario autenticado,
el endpoint respondió datos del usuario del token

```bash
curl -i http://localhost:3001/insecure/credit-line \
  -H "Authorization: Bearer $TOKEN"
```

Respuesta:

```json
{
  "credit_limit": "100000.00",
  "available_credit": "100000.00",
  "card_number": null
}
```

## IDOR en consulta de línea de crédito

Probé si un token válido de `user-1` podía consultar la línea de crédito de otro usuario,
el endpoint aceptó `userId` por query param y devolvió datos de `user-with-1000-credit`

```bash
curl -i "http://localhost:3001/insecure/credit-line?userId=user-with-1000-credit" \
  -H "Authorization: Bearer $TOKEN"
```

Respuesta:

```json
{
  "credit_limit": "1000.00",
  "available_credit": "1000.00",
  "card_number": null
}
```

Conclusión,
hay **IDOR** porque el backend deja que el request elija el usuario a consultar,
en vez de usar solo el `userId` del token autenticado

## SQL Injection en login

Probé login con inyección SQL en el campo `email`,
el endpoint devolvió token aunque la password no era válida

```bash
curl -i -X POST http://localhost:3001/insecure/login \
  -H "Content-Type: application/json" \
  -d '{"email":"legacy.user1@cashea.test'\'' OR '\''1'\''='\''1","password":"cualquier-cosa"}'
```

Respuesta:

```text
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
```

**Conclusión:**
el login concatena input del usuario dentro del SQL,
un atacante puede autenticarse sin conocer credenciales

## JWT no verificado

Creé un token falso,
el payload declara `userId` sin firma válida

```bash
FAKE_TOKEN=$(/usr/local/opt/node@22/bin/node -e 'console.log(["x", Buffer.from(JSON.stringify({userId:"user-with-1000-credit"})).toString("base64url"), "x"].join("."))')
```

Probé el token falso contra `/credit-line`

```bash
curl -i http://localhost:3001/insecure/credit-line \
  -H "Authorization: Bearer $FAKE_TOKEN"
```

Respuesta:

```text
HTTP/1.1 200 OK
Content-Length: 0
```

El endpoint respondió `200 OK`,
eso confirma que el middleware aceptó el token falso y dejó pasar el request. \
No arrojo data pero lo acepta, eso nos marca que no valida token y el ataque consiste en probar, se ve mas claro en el siguiente caso.

Después combiné el token falso con el IDOR,
el endpoint devolvió datos reales de otro usuario

```bash
curl -i "http://localhost:3001/insecure/credit-line?userId=user-with-1000-credit" \
  -H "Authorization: Bearer $FAKE_TOKEN"
```

Respuesta:

```json
{
  "credit_limit": "1000.00",
  "available_credit": "1000.00",
  "card_number": null
}
```

Conclusión,
`jwt.decode` no valida firma,
el middleware debe usar `jwt.verify` y rechazar tokens inválidos con `401`


## Hallazgos detectados en el módulo vulnerable

| # | Hallazgo | Severidad | Evidencia | Impacto concreto | Corrección |
|---|---|---:|---|---|---|
| 1 | SQL Injection en `POST /login` | Crítica | El email con `OR '1'='1'` devuelve `200 OK` y token en `/insecure/login` | Un atacante puede autenticarse sin conocer password | `auth.fixed.ts` usa query parametrizada en `SecureUserRepository` |
| 2 | IDOR en `GET /credit-line` | Alta | Un token de `user-1` puede consultar `?userId=user-with-1000-credit` en `/insecure/credit-line` | Un usuario puede leer datos financieros de otro usuario | `/secure/credit-line` usa el `userId` del token, si recibe otro `userId` por query devuelve `403` |
| 3 | JWT no verificado | Crítica | Un token falso llega al handler vulnerable, combinado con `?userId` devuelve datos reales | Un atacante puede fabricar tokens y saltear autenticación | `JwtTokenService` usa `jwt.verify`, token ausente, inválido o vencido devuelve `401` |
| 4 | Password en texto plano | Crítica | La tabla `users` guarda `password`, el login vulnerable compara contra ese campo | Una filtración de DB o logs expone credenciales reutilizables | `004_users_password_hash.sql` agrega `password_hash`, `/secure/login` compara con `bcrypt.compare` |
| 5 | Secret JWT hardcodeado | Alta | El código vulnerable define `JWT_SECRET = "cashea_prod_secret_2024"` | Si alguien lee el repo o build puede firmar tokens válidos | `JwtTokenService.fromEnvironment()` exige `JWT_SECRET` por env |
| 6 | Token sin expiración | Alta | `jwt.sign({ userId })` no define `expiresIn` en el módulo vulnerable | Un token robado mantiene acceso sin límite práctico | `JwtTokenService` firma tokens con expiración de 5 minutos |
| 7 | Logging de credenciales | Alta | El login vulnerable ejecuta `console.log` con email y password | Los logs pueden guardar passwords en texto plano | La versión segura no loguea passwords |
| 8 | Falta validación del header `Authorization` | Alta | El middleware vulnerable no corta cuando el token falta o no tiene formato Bearer válido | Requests inválidos pueden llegar al handler | `AuthenticateMiddleware` valida Bearer token y responde `401` |
| 9 | Exposición de datos sensibles | Media | El snippet original intenta devolver `card_number`, en esta adaptación quedó `null` | El endpoint podría exponer datos financieros no necesarios | `/secure/credit-line` devuelve solo `credit_limit` y `available_credit` |
| 10 | SQL dentro del router | Media | El router vulnerable arma queries y decide reglas de acceso | La mezcla de HTTP, SQL y autorización facilita SQL Injection e IDOR | La versión segura mueve queries a repositorios y JWT a `JwtTokenService` |
| 11 | Errores sin manejo controlado | Media | Un error de SQL o JWT puede terminar como respuesta inconsistente | El módulo puede filtrar detalles o responder estados incorrectos | La versión segura responde `401`, `403` o `404` según el caso esperado |

___
## Solución aplicada

La solución quedó en `insecure/auth.fixed.ts`,
el router corregido se monta en `insecure/server.ts` bajo `/secure`

El comportamiento seguro se separó en archivos chicos dentro de `insecure/secure`,
esto deja el router como entrada HTTP y mueve JWT, autenticación y queries a responsabilidades específicas

```text
insecure/auth.fixed.ts
insecure/secure/authenticate.ts
insecure/secure/jwt-token-service.ts
insecure/secure/secure-user-repository.ts
insecure/secure/secure-credit-line-repository.ts
```

También agregué `docker/postgres/init/004_users_password_hash.sql`,
esa migración crea `password_hash` y migra las passwords existentes a bcrypt,
la versión segura usa solo `password_hash`. \

__Este ultimo paso lo pense evaluando un caso real, donde estaba todo inseguro como el nombre lo indica y los fixes paso a pasos sin romper retrocompatibilidad.__

### Verificación de hash migrado

```bash
docker compose exec postgres psql -U cashea -d cashea_challenge -c "select user_id, email, password, password_hash is not null as has_hash from users order by user_id;"
```

Resultado esperado:

```text
has_hash = t
```

Todos los usuarios deben tener `has_hash = t`, eso confirma que pueden autenticarse con la versión segura.

- El campo `password` queda solo para reproducir el caso vulnerable en `/insecure/login`. \
- En `/secure/login` el cliente sigue enviando `password`, pero el backend no compara contra esa columna, compara contra `password_hash` usando bcrypt.

El usuario siempre envía password en texto plano al login, idealmente por HTTPS, y el backend compara eso contra password_hash con:
```ts
await bcrypt.compare(password, user.passwordHash)
```

### Login seguro válido

```bash
curl -i -X POST http://localhost:3001/secure/login \
  -H "Content-Type: application/json" \
  -d '{"email":"secure.1000@cashea.test","password":"Secure123!"}'
```

Resultado esperado:

```text
HTTP/1.1 200 OK
```

Respuesta esperada:

```json
{
  "token": "JWT_VALIDO"
}
```

Para guardar el token:

```bash
SECURE_TOKEN=$(curl -s -X POST http://localhost:3001/secure/login \
  -H "Content-Type: application/json" \
  -d '{"email":"secure.1000@cashea.test","password":"Secure123!"}' \
  | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
```

### Consulta segura de línea de crédito

```bash
curl -i http://localhost:3001/secure/credit-line \
  -H "Authorization: Bearer $SECURE_TOKEN"
```

Resultado esperado:

```text
HTTP/1.1 200 OK
```

Respuesta esperada:

```json
{
  "credit_limit": "1000.00",
  "available_credit": "1000.00"
}
```

### SQL Injection corregida

```bash
curl -i -X POST http://localhost:3001/secure/login \
  -H "Content-Type: application/json" \
  -d '{"email":"secure.1000@cashea.test'\'' OR '\''1'\''='\''1","password":"cualquier-cosa"}'
```

Resultado esperado:

```text
HTTP/1.1 401 Unauthorized
```

Respuesta esperada:

```json
{
  "error": "Invalid credentials"
}
```

### Password incorrecta al pedir token

```bash
curl -i -X POST http://localhost:3001/secure/login \
  -H "Content-Type: application/json" \
  -d '{"email":"secure.1000@cashea.test","password":"wrong-password"}'
```
o
```bash
$ curl -i -X POST http://localhost:3001/secure/login \
  -H "Content-Type: application/json" \
  -d '{"email":"secure.1000@cashea.test'\'' OR '\''1'\''='\''1","password":"cualquier-cosa"}'

```
Resultado esperado:

```text
HTTP/1.1 401 Unauthorized
```

Respuesta esperada:

```json
{
  "error": "Invalid credentials"
}
```

### Token falso rechazado

```bash
FAKE_TOKEN=$(/usr/local/opt/node@22/bin/node -e 'console.log(["x", Buffer.from(JSON.stringify({userId:"user-with-1000-credit"})).toString("base64url"), "x"].join("."))')
```

```bash
curl -i http://localhost:3001/secure/credit-line \
  -H "Authorization: Bearer $FAKE_TOKEN"
```

Resultado esperado:

```text
HTTP/1.1 401 Unauthorized
```

Respuesta esperada:

```json
{
  "error": "Unauthorized"
}
```

### Request sin token rechazado

```bash
curl -i http://localhost:3001/secure/credit-line
```

Resultado esperado:

```text
HTTP/1.1 401 Unauthorized
```

Respuesta esperada:

```json
{
  "error": "Unauthorized"
}
```

### IDOR bloqueado

Con token de `secure.1000@cashea.test` (user-with-1000-credit) valido,
probé pedir datos de `user-1` - no valido por token

```bash
curl -i "http://localhost:3001/secure/credit-line?userId=user-1" \
  -H "Authorization: Bearer $SECURE_TOKEN"
```

Resultado esperado:

```text
HTTP/1.1 403 Forbidden
```

Respuesta esperada:

```json
{
  "error": "Forbidden"
}
```

### Query param permitido solo si coincide con el token

```bash
curl -i "http://localhost:3001/secure/credit-line?userId=user-with-1000-credit" \
  -H "Authorization: Bearer $SECURE_TOKEN"
```

Resultado esperado:

```text
HTTP/1.1 200 OK
```

Respuesta esperada:

```json
{
  "credit_limit": "1000.00",
  "available_credit": "1000.00"
}
```

### Token vencido

El token seguro expira en 5 minutos,
si se repite la consulta después de ese tiempo, el endpoint debe rechazarlo

```bash
curl -i http://localhost:3001/secure/credit-line \
  -H "Authorization: Bearer $SECURE_TOKEN"
```

Resultado esperado:

```text
HTTP/1.1 401 Unauthorized
```

No ejecuté esta prueba completa por tiempo de espera,
la expiración queda configurada en `insecure/secure/jwt-token-service.ts` con `expiresIn = "5m"`

## Hallazgos Corregidos
| # | Hallazgo validado | Prueba sobre `/secure` | Resultado esperado |
|---|---|---|---|
| 1 | SQL Injection corregida | Login con email que incluye `OR '1'='1'` | `401 Unauthorized` |
| 2 | IDOR bloqueado | Token de un usuario intentando consultar `?userId` de otro | `403 Forbidden` |
| 3 | JWT falso rechazado | Token fabricado sin firma válida | `401 Unauthorized` |
| 4 | Password plano eliminado del login seguro | `/secure/login` compara password contra `password_hash` con bcrypt | Login válido `200`, password incorrecta `401` |
| 5 | Secret hardcodeado eliminado | Arranque sin `JWT_SECRET` | El módulo seguro no inicia |
| 6 | Expiración de token configurada | Reutilizar token después de 5 minutos | `401 Unauthorized` |
| 7 | Credenciales no logueadas | Login seguro | No se imprime password |
| 8 | Header Authorization validado | Request sin Bearer token | `401 Unauthorized` |
| 9 | Datos sensibles reducidos | Consulta `/secure/credit-line` | No devuelve `card_number` |
| 10 | SQL fuera del router | Revisar `auth.fixed.ts` y repositorios | Controller sin queries inline |
| 11 | Errores controlados | Casos inválidos conocidos | `401`, `403` o `404` según corresponda |