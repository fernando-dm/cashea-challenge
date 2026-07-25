# Cashea Challenge

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
- PostgreSQL

## Instalación

```bash
npm install
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run test
```

Ejecución en desarrollo

```bash
npm run dev
```

## Estado del proyecto

Este proyecto está en construcción paso a paso. La implementación prioriza correctitud, consistencia transaccional, seguridad y claridad de diseño.

## Pruebas manuales con curl

Levantar la aplicación:

```bash
npm run start
```

Los ejemplos asumen la aplicación recién levantada. Hoy la persistencia default es in-memory, por eso los ids de compra empiezan en `purchase-1` y se reinician al levantar de nuevo el proceso.

### Flujo de crédito y compras

Consultar crédito inicial:

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

Crear primera compra en 3 cuotas:

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

Consultar detalle de la primera compra:

```bash
curl -i http://localhost:3000/purchases/purchase-1
```

Respuesta esperada:

```json
{
  "purchaseId": "purchase-1",
  "status": "ACTIVE",
  "installmentPlan": [
    {
      "installmentNumber": 1,
      "status": "PAID",
      "amount": {
        "amount": "300.00",
        "currency": "VES"
      }
    },
    {
      "installmentNumber": 2,
      "status": "PENDING",
      "amount": {
        "amount": "300.00",
        "currency": "VES"
      }
    },
    {
      "installmentNumber": 3,
      "status": "PENDING",
      "amount": {
        "amount": "300.00",
        "currency": "VES"
      }
    }
  ]
}
```

Consultar crédito luego de la primera compra:

```bash
curl -i http://localhost:3000/users/user-with-1000-credit/credit-line
```

Respuesta esperada:

```json
{
  "availableCredit": {
    "amount": "400.00",
    "currency": "VES"
  }
}
```

Crear segunda compra en 3 cuotas:

```bash
curl -i -X POST http://localhost:3000/users/user-with-1000-credit/purchases \
  -H "Content-Type: application/json" \
  -d '{"amount":"300.00","installments":3}'
```

Consultar crédito luego de la segunda compra:

```bash
curl -i http://localhost:3000/users/user-with-1000-credit/credit-line
```

Respuesta esperada:

```json
{
  "availableCredit": {
    "amount": "200.00",
    "currency": "VES"
  }
}
```

Compra rechazada por crédito insuficiente:

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

Cuotas inválidas:

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

Monto inválido:

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

Línea de crédito no encontrada:

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

Consultar detalle de compra:

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
  "installmentPlan": [
    {
      "installmentNumber": 1,
      "amount": {
        "amount": "100.00",
        "currency": "VES"
      },
      "status": "PAID",
      "paidAt": "fecha de pago"
    },
    {
      "installmentNumber": 2,
      "amount": {
        "amount": "100.00",
        "currency": "VES"
      },
      "status": "PENDING",
      "paidAt": null
    }
  ]
}
```

Compra no encontrada:

```bash
curl -i http://localhost:3000/purchases/unknown-purchase
```

Respuesta esperada:

```json
{
  "error": "Purchase not found"
}
```

### Pagar cuota

Pagar la cuota 2 de la primera compra:

```bash
curl -i -X POST http://localhost:3000/purchases/purchase-1/installments/2/pay
```

Respuesta esperada:

```json
{
  "purchaseId": "purchase-1",
  "installmentNumber": 2,
  "status": "PAID",
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

Consultar detalle luego del pago:

```bash
curl -i http://localhost:3000/purchases/purchase-1
```

Regla esperada:

```txt
La cuota 2 queda PAID.
La cuota 3 sigue PENDING.
La compra sigue ACTIVE porque todavia queda una cuota pendiente.
```

Consultar crédito luego del pago:

```bash
curl -i http://localhost:3000/users/user-with-1000-credit/credit-line
```

Respuesta esperada:

```json
{
  "availableCredit": {
    "amount": "500.00",
    "currency": "VES"
  }
}
```

Reintentar pagar la misma cuota:

```bash
curl -i -X POST http://localhost:3000/purchases/purchase-1/installments/2/pay
```

Respuesta esperada:

```json
{
  "error": "Installment already paid"
}
```

Pagar una cuota inexistente:

```bash
curl -i -X POST http://localhost:3000/purchases/purchase-1/installments/99/pay
```

Respuesta esperada:

```json
{
  "error": "Installment not found"
}
```

Pagar una cuota de una compra inexistente:

```bash
curl -i -X POST http://localhost:3000/purchases/unknown-purchase/installments/2/pay
```

Respuesta esperada:

```json
{
  "error": "Purchase not found"
}
```

Pagar la cuota 3 de la primera compra:

```bash
curl -i -X POST http://localhost:3000/purchases/purchase-1/installments/3/pay
```

Respuesta esperada:

```json
{
  "purchaseId": "purchase-1",
  "installmentNumber": 3,
  "status": "PAID",
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

Consultar detalle final de la primera compra:

```bash
curl -i http://localhost:3000/purchases/purchase-1
```

Regla esperada:

```txt
Las 3 cuotas quedan PAID.
La compra queda COMPLETED.
```

Consultar crédito final:

```bash
curl -i http://localhost:3000/users/user-with-1000-credit/credit-line
```

Respuesta esperada:

```json
{
  "availableCredit": {
    "amount": "800.00",
    "currency": "VES"
  }
}
```
