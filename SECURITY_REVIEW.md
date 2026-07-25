# Revisión de Seguridad

Este documento registra los hallazgos encontrados en `insecure/auth.ts`,
incluye severidad, impacto concreto, evidencia y corrección propuesta

El módulo quedó separado del backend principal para poder probarlo sin afectar el flujo de compras,
se levantó en el puerto `3001`, conectado a Postgres, con datos de prueba creados desde cero

## Pasos de prueba

Levanté Postgres desde cero,
compilé el backend principal,
levanté el módulo inseguro aislado

```bash
docker compose down -v
docker compose up -d --build postgres
rm -rf dist
npm run build
npm run dev:insecure
```

Verifiqué que el módulo responda en:

```text
http://localhost:3001/insecure
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
eso confirma que el middleware aceptó el token falso y dejó pasar el request

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

## Hallazgos

| # | Hallazgo | Severidad | Evidencia | Impacto concreto | Corrección |
|---|---|---:|---|---|---|
| 1 | SQL Injection en `POST /login` | Crítica | El email con `OR '1'='1'` devuelve `200 OK` y token | Un atacante puede autenticarse sin conocer password | Usar query parametrizada, por ejemplo `WHERE email = $1` |
| 2 | IDOR en `GET /credit-line` | Alta | Un token de `user-1` puede consultar `?userId=user-with-1000-credit` | Un usuario puede leer datos financieros de otro usuario | Ignorar `req.query.userId`, usar solo el `userId` del token verificado |
| 3 | JWT no verificado | Crítica | Un token falso llega al handler, combinado con `?userId` devuelve datos reales | Un atacante puede fabricar tokens y saltear autenticación | Usar `jwt.verify`, rechazar token ausente, inválido o vencido |
| 4 | Password en texto plano | Crítica | La tabla `users` guarda `password`, el login compara contra ese campo | Una filtración de DB o logs expone credenciales reutilizables | Guardar `password_hash`, comparar con `bcrypt.compare` o alternativa equivalente |
| 5 | Secret JWT hardcodeado | Alta | El código define `JWT_SECRET = "cashea_prod_secret_2024"` | Si alguien lee el repo o build puede firmar tokens válidos | Leer el secret desde env, fallar al iniciar si falta |
| 6 | Token sin expiración | Alta | `jwt.sign({ userId })` no define `expiresIn` | Un token robado mantiene acceso sin límite práctico | Agregar expiración corta, por ejemplo `15m` o `1h` |
| 7 | Logging de credenciales | Alta | El login ejecuta `console.log` con email y password | Los logs pueden guardar passwords en texto plano | No loguear secretos, registrar solo eventos sin credenciales |
| 8 | Falta validación del header `Authorization` | Alta | El middleware no corta cuando el token falta o no tiene formato Bearer válido | Requests inválidos pueden llegar al handler | Validar `Authorization: Bearer <token>`, responder `401` si falla |
| 9 | Exposición de datos sensibles | Media | El snippet original intenta devolver `card_number`, en esta adaptación quedó `null` | El endpoint podría exponer datos financieros no necesarios | Devolver solo límite y disponible, nunca número de tarjeta completo |
| 10 | SQL dentro del router | Media | El router arma queries y decide reglas de acceso | La mezcla de HTTP, SQL y autorización facilita SQL Injection e IDOR | Extraer helpers seguros o servicios mínimos, mantener autorización cerca del caso protegido |
| 11 | Errores sin manejo controlado | Media | Un error de SQL o JWT puede terminar como respuesta inconsistente | El módulo puede filtrar detalles o responder estados incorrectos | Agregar manejo de errores y respuestas `401`, `400`, `500` controladas |

## Corrección pendiente

La versión corregida debe quedar en `insecure/auth.fixed.ts`,
debe mantener el flujo del snippet original,
pero corregir los puntos explotados

Cambios mínimos esperados:

- query parametrizada en login
- password hasheado con `bcrypt`
- JWT secret leído desde env
- token con expiración
- middleware con `jwt.verify`
- rechazo de token ausente, inválido o vencido
- consulta de crédito usando solo `userId` autenticado
- eliminación de logs con passwords
- respuesta sin `card_number`
