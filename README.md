# Cashea Challenge

## Documentación

- [Diseño técnico](./DESIGN.md)
- [Revisión de seguridad](./SECURITY_REVIEW.md)

Implementación del challenge técnico full stack para Cashea.

El foco principal del proyecto es el backend que maneja un flujo buy-now-pay-later: usuarios con línea de crédito
aprobada, compras en cuotas y recuperación de crédito disponible al pagar cuotas.

## Stack

- Node.js 22
- TypeScript
- Express
- PostgreSQL
- Vitest

## Requisitos

- Node.js 22
- npm
- Docker, si se quiere levantar PostgreSQL local

## Instalación

```bash
npm install
```

## Scripts
Correr solo test:
```bash
rm -rf dist                                                                                                                                                          
npm run build
npm run test
```

Probar app en local en modo default (inmemory):
```bash
rm -rf dist   
npm run build
npm run dev
```

## Ejecución

La aplicación puede correr con persistencia in-memory o PostgreSQL. \
La persistencia default es `in-memory`, pensada para desarrollo rápido y tests sin depender de servicios externos.

## Estado del proyecto

La Parte 1 del backend está implementada: consulta de línea de crédito, creación de compra en cuotas, detalle de compra y pago de cuota. \
El proyecto prioriza correctitud, consistencia transaccional, claridad de diseño y separación entre casos de uso e infraestructura.

## Pruebas manuales con curl

Antes de ejecutar los curls, levantar la aplicación en uno de estos modos.

### Modo in-memory

Es el modo default. No requiere base de datos y reinicia los datos cada vez que se levanta el proceso.

modo default:  in-memory
```bash
npm run dev
```

### Modo PostgreSQL

## Todo completo con bd postgres limpia solo con las migraciones

```bash
docker compose down -v
docker compose up -d --build postgres  
rm -rf dist   
npm run build
PERSISTENCE=postgres npm run dev
```

Este flujo levanta PostgreSQL desde cero y luego inicia la aplicación en modo desarrollo usando la base real. \
El comando `docker compose down -v` borra el volumen de PostgreSQL, por eso sirve para repetir las pruebas desde un estado limpio.

Si se quiere probar el build real en lugar del modo desarrollo:

```bash
docker compose down -v
docker compose up -d postgres
rm -rf dist   
npm run build
PERSISTENCE=postgres npm run start
```

Con esto podemos verificar que PostgreSQL carga los datos base para la prueba:

```bash
docker compose exec postgres psql -U cashea -d cashea_challenge \
  -c "select user_id, credit_limit_amount, available_credit_amount from credit_lines order by user_id;"
```

Salida esperada:

```txt
         user_id          | credit_limit_amount | available_credit_amount
--------------------------+---------------------+-------------------------
 user-1                   |           100000.00 |               100000.00
 user-with-1000-credit    |             1000.00 |                 1000.00
 user-with-limited-credit |           100000.00 |                  100.00
 user-without-credit      |           100000.00 |                    0.00
(4 rows)
```

El comando que levanta la aplicación queda corriendo. \
Los curls de abajo se ejecutan en otra terminal.

Los ejemplos asumen la aplicación recién levantada. \
Con `in-memory`, los ids de compra empiezan en `purchase-1` y se reinician al levantar de nuevo el proceso. \
Con `postgres`, los datos quedan persistidos en la base local.

___
# Comienzo de las pruebas 

### Flujo de crédito y compras

#### 1. Consultar crédito inicial

```bash
curl -i http://localhost:3000/users/user-with-1000-credit/credit-line
```

Respuesta esperada:

```json
{
  "userId": "user-with-1000-credit",
  "creditLimit": {
    "amount": "1000.00",
    "currency": "VES"
  },
  "availableCredit": {
    "amount": "1000.00",
    "currency": "VES"
  }
}
```

Verificación en PostgreSQL:

```bash
docker compose exec postgres psql -U cashea -d cashea_challenge \
  -c "select user_id, credit_limit_amount, available_credit_amount from credit_lines where user_id = 'user-with-1000-credit';"
```

Estado esperado:

```txt
user_id               | credit_limit_amount | available_credit_amount
----------------------+---------------------+-------------------------
user-with-1000-credit |             1000.00 |                 1000.00
```

#### 2. Crear primera compra en 3 cuotas

```bash
curl -i -X POST http://localhost:3000/users/user-with-1000-credit/purchases \
  -H "Content-Type: application/json" \
  -d '{"amount":"900.00","installments":3}'
```

Regla esperada:

```txt
Compra: 900.00 en 3 cuotas
Cuota 1: 300.00 PAID al momento
Cuotas pendientes: 600.00

Nuevo crédito disponible: 1000.00 - 600.00 = 400.00
```

Respuesta esperada:

```json
{
  "purchaseId": "purchase-1",
  "userId": "user-with-1000-credit",
  "amount": {
    "amount": "900.00",
    "currency": "VES"
  },
  "installments": 3
}
```

Verificación en PostgreSQL:

```bash
docker compose exec postgres psql -U cashea -d cashea_challenge \
  -c "select purchase_id, user_id, amount, currency, installments, status from purchases where purchase_id = 'purchase-1';"
```

Estado esperado:

```txt
purchase_id | user_id               | amount | currency | installments | status
------------+-----------------------+--------+----------+--------------+--------
purchase-1  | user-with-1000-credit | 900.00 | VES      |            3 | ACTIVE
```

Verificación del plan de cuotas:

```bash
docker compose exec postgres psql -U cashea -d cashea_challenge \
  -c "select purchase_id, installment_number, amount, status, coalesce(paid_at::text, 'null') as paid_at from installments where purchase_id = 'purchase-1' order by installment_number;"
```

Estado esperado:

```txt
purchase_id | installment_number | amount | status  | paid_at
------------+--------------------+--------+---------+-------------------------------
purchase-1  |                  1 | 300.00 | PAID    | fecha de pago
purchase-1  |                  2 | 300.00 | PENDING | null
purchase-1  |                  3 | 300.00 | PENDING | null
```

#### 3. Consultar detalle de la primera compra

```bash
curl -i http://localhost:3000/purchases/purchase-1
```

Respuesta esperada:

```json
{
  "purchaseId": "purchase-1",
  "userId": "user-with-1000-credit",
  "amount": {
    "amount": "900.00",
    "currency": "VES"
  },
  "status": "ACTIVE",
  "createdAt": "fecha de creación",
  "updatedAt": "fecha de actualización",
  "installmentPlan": [
    {
      "installmentNumber": 1,
      "amount": {
        "amount": "300.00",
        "currency": "VES"
      },
      "status": "PAID",
      "dueDate": "fecha de vencimiento",
      "paidAt": "fecha de pago"
    },
    {
      "installmentNumber": 2,
      "amount": {
        "amount": "300.00",
        "currency": "VES"
      },
      "status": "PENDING",
      "dueDate": "fecha de vencimiento",
      "paidAt": null
    },
    {
      "installmentNumber": 3,
      "amount": {
        "amount": "300.00",
        "currency": "VES"
      },
      "status": "PENDING",
      "dueDate": "fecha de vencimiento",
      "paidAt": null
    }
  ]
}
```

Verificación en PostgreSQL:

```bash
docker compose exec postgres psql -U cashea -d cashea_challenge \
  -c "select purchase_id, installment_number, amount, status, coalesce(paid_at::text, 'null') as paid_at from installments where purchase_id = 'purchase-1' order by installment_number;"
```

#### 4. Consultar crédito luego de la primera compra

```bash
curl -i http://localhost:3000/users/user-with-1000-credit/credit-line
```

Respuesta esperada:

```json
{
  "userId": "user-with-1000-credit",
  "creditLimit": {
    "amount": "1000.00",
    "currency": "VES"
  },
  "availableCredit": {
    "amount": "400.00",
    "currency": "VES"
  }
}
```

Verificación en PostgreSQL:

```bash
docker compose exec postgres psql -U cashea -d cashea_challenge \
  -c "select user_id, available_credit_amount from credit_lines where user_id = 'user-with-1000-credit';"
```

Estado esperado:

```txt
user_id               | available_credit_amount
----------------------+-------------------------
user-with-1000-credit |                  400.00
```

#### 5. Crear segunda compra en 3 cuotas

```bash
curl -i -X POST http://localhost:3000/users/user-with-1000-credit/purchases \
  -H "Content-Type: application/json" \
  -d '{"amount":"300.00","installments":3}'
```

Respuesta esperada:

```json
{
  "purchaseId": "purchase-2",
  "userId": "user-with-1000-credit",
  "amount": {
    "amount": "300.00",
    "currency": "VES"
  },
  "installments": 3
}
```

Verificación en PostgreSQL:

```bash
docker compose exec postgres psql -U cashea -d cashea_challenge \
  -c "select purchase_id, user_id, amount, installments, status from purchases order by purchase_id;"
```

Estado esperado:

```txt
purchase_id | user_id               | amount | installments | status
------------+-----------------------+--------+--------------+--------
purchase-1  | user-with-1000-credit | 900.00 |            3 | ACTIVE
purchase-2  | user-with-1000-credit | 300.00 |            3 | ACTIVE
```

#### 6. Consultar crédito luego de la segunda compra

```bash
curl -i http://localhost:3000/users/user-with-1000-credit/credit-line
```

Respuesta esperada:

```json
{
  "userId": "user-with-1000-credit",
  "creditLimit": {
    "amount": "1000.00",
    "currency": "VES"
  },
  "availableCredit": {
    "amount": "200.00",
    "currency": "VES"
  }
}
```

Verificación en PostgreSQL:

```bash
docker compose exec postgres psql -U cashea -d cashea_challenge \
  -c "select user_id, available_credit_amount from credit_lines where user_id = 'user-with-1000-credit';"
```

#### 7. Compra rechazada por crédito insuficiente

```bash
curl -i -X POST http://localhost:3000/users/user-with-1000-credit/purchases \
  -H "Content-Type: application/json" \
  -d '{"amount":"600.00","installments":3}'
```

Respuesta esperada:

```json
{
  "error": "Insufficient credit"
}
```

Verificación en PostgreSQL:

```bash
docker compose exec postgres psql -U cashea -d cashea_challenge \
  -c "select purchase_id, amount, status from purchases order by purchase_id;"
```

Estado esperado: no se crea una nueva compra; siguen existiendo `purchase-1` y `purchase-2`.

#### 8. Cuotas inválidas

```bash
curl -i -X POST http://localhost:3000/users/user-with-1000-credit/purchases \
  -H "Content-Type: application/json" \
  -d '{"amount":"300.00","installments":5}'
```

Respuesta esperada:

```json
{
  "error": "Invalid installment plan"
}
```

Verificación en PostgreSQL:

```bash
docker compose exec postgres psql -U cashea -d cashea_challenge \
  -c "select count(*) as purchases_count from purchases;"
```

Estado esperado:

```txt
purchases_count
---------------
2
```

#### 9. Monto inválido

```bash
curl -i -X POST http://localhost:3000/users/user-with-1000-credit/purchases \
  -H "Content-Type: application/json" \
  -d '{"amount":"0","installments":3}'
```

Respuesta esperada:

```json
{
  "error": "Invalid purchase amount"
}
```

Verificación en PostgreSQL:

```bash
docker compose exec postgres psql -U cashea -d cashea_challenge \
  -c "select count(*) as purchases_count from purchases;"
```

Estado esperado: `purchases_count = 2`.

#### 10. Línea de crédito no encontrada

```bash
curl -i -X POST http://localhost:3000/users/unknown-user/purchases \
  -H "Content-Type: application/json" \
  -d '{"amount":"300.00","installments":3}'
```

Respuesta esperada:

```json
{
  "error": "Credit line not found"
}
```

Verificación en PostgreSQL:

```bash
docker compose exec postgres psql -U cashea -d cashea_challenge \
  -c "select purchase_id, user_id, amount, installments, status from purchases order by purchase_id;"
```

Estado esperado: 

``` 
purchase_id |        user_id        | amount | installments | status 
-------------+-----------------------+--------+--------------+--------
 purchase-1  | user-with-1000-credit | 900.00 |            3 | ACTIVE
 purchase-2  | user-with-1000-credit | 300.00 |            3 | ACTIVE
(2 rows)
```

#### 11. Consultar detalle de la segunda compra

```bash
curl -i http://localhost:3000/purchases/purchase-2
```

Respuesta esperada:

```json
{
  "purchaseId": "purchase-2",
  "userId": "user-with-1000-credit",
  "amount": {
    "amount": "300.00",
    "currency": "VES"
  },
  "status": "ACTIVE",
  "createdAt": "fecha de creación",
  "updatedAt": "fecha de actualización",
  "installmentPlan": [
    {
      "installmentNumber": 1,
      "amount": {
        "amount": "100.00",
        "currency": "VES"
      },
      "status": "PAID",
      "dueDate": "fecha de vencimiento",
      "paidAt": "fecha de pago"
    },
    {
      "installmentNumber": 2,
      "amount": {
        "amount": "100.00",
        "currency": "VES"
      },
      "status": "PENDING",
      "dueDate": "fecha de vencimiento",
      "paidAt": null
    },
    {
      "installmentNumber": 3,
      "amount": {
        "amount": "100.00",
        "currency": "VES"
      },
      "status": "PENDING",
      "dueDate": "fecha de vencimiento",
      "paidAt": null
    }
  ]
}
```

Verificación en PostgreSQL:

```bash
docker compose exec postgres psql -U cashea -d cashea_challenge \
  -c "select purchase_id, installment_number, amount, status, coalesce(paid_at::text, 'null') as paid_at from installments where purchase_id = 'purchase-2' order by installment_number;"
```

#### 12. Compra no encontrada

```bash
curl -i http://localhost:3000/purchases/unknown-purchase
```

Respuesta esperada:

```json
{
  "error": "Purchase not found"
}
```

Verificación en PostgreSQL:

```bash
docker compose exec postgres psql -U cashea -d cashea_challenge \
  -c "select purchase_id, status from purchases order by purchase_id;"
```

Estado esperado: la consulta de error no modifica estado.

### Pagar cuota

#### 13. Pagar la cuota 2 de la primera compra

```bash
curl -i -X POST http://localhost:3000/purchases/purchase-1/installments/2/pay
```

Respuesta esperada:

```json
{
  "purchaseId": "purchase-1",
  "installmentNumber": 2,
  "status": "PAID",
  "paidAt": "fecha de pago",
  "recoveredCredit": {
    "amount": "300.00",
    "currency": "VES"
  },
  "availableCredit": {
    "amount": "500.00",
    "currency": "VES"
  },
  "purchaseStatus": "ACTIVE"
}
```

Verificación de cuotas en PostgreSQL:

```bash
docker compose exec postgres psql -U cashea -d cashea_challenge \
  -c "select purchase_id, installment_number, amount, status, coalesce(paid_at::text, 'null') as paid_at from installments where purchase_id = 'purchase-1' order by installment_number;"
```

Estado esperado:

```txt
purchase_id | installment_number | amount | status  | paid_at
------------+--------------------+--------+---------+-------------------------------
purchase-1  |                  1 | 300.00 | PAID    | fecha de pago
purchase-1  |                  2 | 300.00 | PAID    | fecha de pago
purchase-1  |                  3 | 300.00 | PENDING | null
```

Verificación de crédito en PostgreSQL:

```bash
docker compose exec postgres psql -U cashea -d cashea_challenge \
  -c "select user_id, available_credit_amount from credit_lines where user_id = 'user-with-1000-credit';"
```

Estado esperado: `available_credit_amount = 500.00`.

#### 14. Consultar detalle luego del pago

```bash
curl -i http://localhost:3000/purchases/purchase-1
```

Regla esperada:

```txt
La cuota 1 queda PAID.
La cuota 2 queda PAID.
La cuota 3 sigue PENDING.
La compra sigue ACTIVE porque todavía queda una cuota pendiente.
```

Salida esperada que cumple con la regla:
```json
{
  "purchaseId": "purchase-1",
  "userId": "user-with-1000-credit",
  "amount": {
    "amount": "900.00",
    "currency": "VES"
  },
  "status": "ACTIVE",
  "createdAt": "2026-07-25T15:15:47.079Z",
  "updatedAt": "2026-07-25T15:27:55.755Z",
  "installmentPlan": [
    {
      "installmentNumber": 1,
      "amount": {
        "amount": "300.00",
        "currency": "VES"
      },
      "status": "PAID",
      "dueDate": "2026-07-25T15:15:47.079Z",
      "paidAt": "2026-07-25T15:15:47.079Z"
    },
    {
      "installmentNumber": 2,
      "amount": {
        "amount": "300.00",
        "currency": "VES"
      },
      "status": "PAID",
      "dueDate": "2026-08-25T15:15:47.079Z",
      "paidAt": "2026-07-25T15:27:55.755Z"
    },
    {
      "installmentNumber": 3,
      "amount": {
        "amount": "300.00",
        "currency": "VES"
      },
      "status": "PENDING",
      "dueDate": "2026-09-25T15:15:47.079Z",
      "paidAt": null
    }
  ]
}
```

Verificación en PostgreSQL:

```bash
docker compose exec postgres psql -U cashea -d cashea_challenge \
  -c "select purchase_id, status from purchases where purchase_id = 'purchase-1';"
```

Estado esperado: `purchase-1` sigue `ACTIVE`.

#### 15. Consultar crédito luego del pago

```bash
curl -i http://localhost:3000/users/user-with-1000-credit/credit-line
```

Respuesta esperada:

```json
{
  "userId": "user-with-1000-credit",
  "creditLimit": {
    "amount": "1000.00",
    "currency": "VES"
  },
  "availableCredit": {
    "amount": "500.00",
    "currency": "VES"
  }
}
```

Verificación en PostgreSQL:

```bash
docker compose exec postgres psql -U cashea -d cashea_challenge \
  -c "select user_id, available_credit_amount from credit_lines where user_id = 'user-with-1000-credit';"
```

#### 16. Reintentar pagar la misma cuota

```bash
curl -i -X POST http://localhost:3000/purchases/purchase-1/installments/2/pay
```

Respuesta esperada:

```json
{
  "error": "Installment already paid"
}
```

Verificación en PostgreSQL:

```bash
docker compose exec postgres psql -U cashea -d cashea_challenge \
  -c "select * from credit_lines where user_id = 'user-with-1000-credit';"
```

Estado esperado: el crédito sigue en `500.00`; el reintento no recupera crédito dos veces.

#### 17. Pagar una cuota inexistente

```bash
curl -i -X POST http://localhost:3000/purchases/purchase-1/installments/99/pay
```

Respuesta esperada:

```json
{
  "error": "Installment not found"
}
```

Verificación en PostgreSQL:

```bash
docker compose exec postgres psql -U cashea -d cashea_challenge \
  -c "select purchase_id, installment_number, status from installments where purchase_id = 'purchase-1' order by installment_number;"
```

Estado esperado: no se agrega ninguna cuota `99`.

#### 18. Pagar una cuota de una compra inexistente

```bash
curl -i -X POST http://localhost:3000/purchases/unknown-purchase/installments/2/pay
```

Respuesta esperada:

```json
{
  "error": "Purchase not found"
}
```

Verificación en PostgreSQL:

```bash
docker compose exec postgres psql -U cashea -d cashea_challenge \
  -c "select purchase_id, status from purchases order by purchase_id;"
```

Estado esperado: no se crea una compra `unknown-purchase`.

#### 19. Pagar la cuota 3 de la primera compra

```bash
curl -i -X POST http://localhost:3000/purchases/purchase-1/installments/3/pay
```

Respuesta esperada:

```json
{
  "purchaseId": "purchase-1",
  "installmentNumber": 3,
  "status": "PAID",
  "paidAt": "fecha de pago",
  "recoveredCredit": {
    "amount": "300.00",
    "currency": "VES"
  },
  "availableCredit": {
    "amount": "800.00",
    "currency": "VES"
  },
  "purchaseStatus": "COMPLETED"
}
```

Verificación en PostgreSQL:

```bash
docker compose exec postgres psql -U cashea -d cashea_challenge \
  -c "select * from purchases where purchase_id = 'purchase-1';"
```

Estado esperado: `purchase-1` queda `COMPLETED`.

#### 20. Consultar detalle final de la primera compra

```bash
curl -i http://localhost:3000/purchases/purchase-1
```

Regla esperada:

```txt
Las 3 cuotas quedan PAID.
La compra queda COMPLETED.
```
```json
{
  "purchaseId": "purchase-1",
  "userId": "user-with-1000-credit",
  "amount": {
    "amount": "900.00",
    "currency": "VES"
  },
  "status": "COMPLETED",
  "createdAt": "2026-07-25T15:15:47.079Z",
  "updatedAt": "2026-07-25T15:34:51.495Z",
  "installmentPlan": [
    {
      "installmentNumber": 1,
      "amount": {
        "amount": "300.00",
        "currency": "VES"
      },
      "status": "PAID",
      "dueDate": "2026-07-25T15:15:47.079Z",
      "paidAt": "2026-07-25T15:15:47.079Z"
    },
    {
      "installmentNumber": 2,
      "amount": {
        "amount": "300.00",
        "currency": "VES"
      },
      "status": "PAID",
      "dueDate": "2026-08-25T15:15:47.079Z",
      "paidAt": "2026-07-25T15:27:55.755Z"
    },
    {
      "installmentNumber": 3,
      "amount": {
        "amount": "300.00",
        "currency": "VES"
      },
      "status": "PAID",
      "dueDate": "2026-09-25T15:15:47.079Z",
      "paidAt": "2026-07-25T15:34:51.495Z"
    }
  ]
}

```

Verificación de cuotas en PostgreSQL:

```bash
docker compose exec postgres psql -U cashea -d cashea_challenge \
  -c "select purchase_id, installment_number, status, coalesce(paid_at::text, 'null') as paid_at from installments where purchase_id = 'purchase-1' order by installment_number;"
```

#### 21. Consultar crédito final

```bash
curl -i http://localhost:3000/users/user-with-1000-credit/credit-line
```

Respuesta esperada:

```json
{
  "userId": "user-with-1000-credit",
  "creditLimit": {
    "amount": "1000.00",
    "currency": "VES"
  },
  "availableCredit": {
    "amount": "800.00",
    "currency": "VES"
  }
}
```

Verificación en PostgreSQL:

```bash
docker compose exec postgres psql -U cashea -d cashea_challenge \
  -c "select * from credit_lines where user_id = 'user-with-1000-credit';"
```

Estado esperado: `available_credit_amount = 800.00`.

#### 22. Resumen final en PostgreSQL

```bash
docker compose exec postgres psql -U cashea -d cashea_challenge \
  -c "select p.purchase_id, p.status as purchase_status, i.installment_number, i.amount, i.status as installment_status, coalesce(i.paid_at::text, 'null') as paid_at 
          from purchases p join installments i on 
            i.purchase_id = p.purchase_id 
          order by p.purchase_id, i.installment_number;"
```

Estado esperado:

```txt
purchase-1 queda COMPLETED con sus 3 cuotas PAID.
purchase-2 queda ACTIVE con cuota 1 PAID y cuotas 2/3 PENDING.
```

## Frontend web mínimo

La aplicación también sirve una interfaz web mínima desde Express:

Levanto con postgres y base limpia
```bash
docker compose down -v
docker compose up -d --build postgres  
rm -rf dist   
npm run build
PERSISTENCE=postgres npm run dev
```

```txt
http://localhost:3000/
```

El código del frontend vive en `frontend/` y usa HTML, CSS y `fetch`, sin framework ni build separado.

Flujo disponible desde la pantalla:

1. Consultar la línea de crédito del usuario.
2. Simular una compra contra el backend.
3. Confirmar la compra.
4. Ver compras del usuario.
5. Ver detalle de una compra.
6. Pagar cuotas pendientes.
7. Ver el crédito disponible actualizado.

Endpoints usados por el frontend:

- `GET /users/:userId/credit-line`: consulta límite y disponible.
- `POST /users/:userId/purchases/preview`: simula el plan de cuotas antes de confirmar.
- `POST /users/:userId/purchases`: confirma la compra.
- `GET /users/:userId/purchases`: lista compras del usuario para elegir cuál pagar.
- `GET /purchases/:purchaseId`: obtiene el detalle persistido de una compra.
- `POST /purchases/:purchaseId/installments/:installmentNumber/pay`: paga una cuota pendiente.

La simulación no calcula reglas de cuotas en el navegador. \
El frontend pide el preview al backend y, después de confirmar una compra o pagar una cuota, vuelve a consultar la API para mostrar estado persistido real.
