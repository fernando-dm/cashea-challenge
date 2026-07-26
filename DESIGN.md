# Diseño

## Arquitectura hexagonal simplificada

El proyecto sigue una arquitectura hexagonal simplificada. \

La idea principal es que las reglas de negocio no dependan de la tecnología usada, como Express, PostgreSQL, Docker ni de cómo se expone la API.

En esta arquitectura el objetivo es simplificar la solución: el centro del sistema es el dominio y los casos de uso.

Un **puerto** es un contrato que la aplicación necesita para ejecutar un caso de uso, pero sin saber cómo se implementa. \
Por ejemplo, `PurchaseRepository` dice que la aplicación puede guardar o buscar compras, pero no dice si eso ocurre en memoria, PostgreSQL o cualquier otra base.

Un **adaptador** es una implementación concreta de un puerto. \
Por ejemplo, `PostgresPurchaseRepository` implementa `PurchaseRepository` usando PostgreSQL, mientras que `InMemoryPurchaseRepository` implementa el mismo contrato usando memoria.

Esto permite que los casos de uso dependan de abstracciones y no de infraestructura concreta. \
Por eso `CreatePurchaseCommandService` y `PayInstallmentCommandService` no saben si están usando Postgres o memoria: solo reciben repositories y un `TransactionManager`.

```
src/
│
├── index.ts                                      Entrypoint HTTP
├── app.ts                                        Configura Express, frontend estático, rutas y error handler
│
├── config/                                       COMPOSITION ROOT
│   ├── dependency-container.ts                   Instancia servicios, controllers y adapters concretos
│   ├── environment.ts                            Lee variables de entorno con zod
│   └── persistence-type.ts                       Define persistencia: in-memory o postgres
│
├── domain/                                       CAPA DOMINIO
│   ├── model/
│   │   ├── money.ts                              Value object de dinero con Decimal y moneda
│   │   ├── credit-line.ts                        Línea de crédito del usuario
│   │   ├── purchase.ts                           Compra y estado de compra
│   │   ├── installment.ts                        Cuota y estado de cuota
│   │   └── purchase-financing-plan.ts            Plan financiero generado para una compra
│   ├── repository/
│   │   ├── credit-line-repository.ts             Puerto: persistir y consultar líneas de crédito
│   │   └── purchase-repository.ts                Puerto: persistir y consultar compras
│   └── exception/
│       └── domain-error.ts                       Error base de dominio
│
├── application/                                  CAPA APLICACION
│   ├── service/
│   │   ├── get-credit-line-by-user-id-query-service.ts      Caso de uso: consultar línea
│   │   ├── preview-purchase-query-service.ts                Caso de uso: simular compra
│   │   ├── create-purchase-command-service.ts               Caso de uso: crear compra
│   │   ├── get-purchase-detail-by-id-query-service.ts       Caso de uso: consultar detalle
│   │   ├── get-purchases-by-user-id-query-service.ts        Caso de uso: listar compras del usuario
│   │   ├── pay-installment-command-service.ts               Caso de uso: pagar cuota
│   │   ├── purchase-by-id-finder.ts                         Servicio compartido para buscar compra
│   │   └── purchase-financing-plan-creator.ts               Crea plan de cuotas y crédito a reservar
│   ├── transaction/
│   │   └── transaction-manager.ts                Puerto: ejecutar una unidad de trabajo transaccional
│   ├── gateway/
│   │   └── purchase-id-generator.ts              Puerto: generar identificadores de compra
│   ├── dto/
│   │   ├── request/                              Inputs de casos de uso
│   │   └── response/                             Outputs de casos de uso
│   └── exception/                                Errores de aplicación traducibles a HTTP
│
├── infrastructure/                               CAPA INFRAESTRUCTURA
│   ├── gateway/
│   │   └── sequential-purchase-id-generator.ts   Adaptador: genera IDs secuenciales para el challenge
│   └── persistence/
│       ├── in-memory/
│       │   ├── in-memory-credit-line-repository.ts   Adaptador: CreditLineRepository en memoria
│       │   ├── in-memory-purchase-repository.ts      Adaptador: PurchaseRepository en memoria
│       │   └── in-memory-transaction-manager.ts      Adaptador: TransactionManager con snapshot/rollback
│       └── postgres/
│           ├── connection/
│           │   ├── postgres-pool.ts                  Pool de conexión PostgreSQL
│           │   └── postgres-client.ts                Tipo compartido para Pool/Client
│           ├── repository/
│           │   ├── postgres-credit-line-repository.ts Adaptador: CreditLineRepository en PostgreSQL
│           │   └── postgres-purchase-repository.ts    Adaptador: PurchaseRepository en PostgreSQL
│           └── transaction/
│               └── postgres-transaction-manager.ts    Adaptador: TransactionManager con BEGIN/COMMIT/ROLLBACK
│
└── presentation/                                 CAPA PRESENTACION
    ├── api/
    │   ├── routes.ts                             Registro de endpoints HTTP
    │   ├── credit-line-controller.ts             Controller REST de línea de crédito
    │   ├── purchase-controller.ts                Controller REST de compras
    │   ├── installment-controller.ts             Controller REST de cuotas
    │   └── dto/
    │       ├── request/                          Tipos HTTP de entrada
    │       └── response/                         Tipos HTTP de salida
    ├── validation/
    │   └── parse-decimal-amount.ts               Validación/adaptación de monto recibido por HTTP
    └── error/
        └── error-handler.ts                      Traduce errores de aplicación a respuestas HTTP
```

**Puertos y adaptadores usados**:

**Puertos y adaptadores usados**:

| Puerto | Qué necesita la aplicación | Adaptador in-memory | Adaptador PostgreSQL |
|---|---|---|---|
| `CreditLineRepository` | Consultar y guardar línea de crédito | `InMemoryCreditLineRepository` | `PostgresCreditLineRepository` |
| `PurchaseRepository` | Consultar y guardar compras con cuotas | `InMemoryPurchaseRepository` | `PostgresPurchaseRepository` |
| `TransactionManager` | Ejecutar cambios de compra y crédito como unidad de trabajo | `InMemoryTransactionManager` | `PostgresTransactionManager` |
| `PurchaseIdGenerator` | Generar ids de compra | `SequentialPurchaseIdGenerator` | No aplica todavía |

Los `puertos` existen aunque no haya una carpeta llamada `ports`. \
En este proyecto uso nombres más específicos para esos contratos: `repository`, `transaction` y `gateway`. \
Los `controllers` funcionan como `adaptadores` de entrada, porque reciben HTTP y lo traducen a `casos de uso`. \
PostgreSQL e in-memory funcionan como `adaptadores` de salida, porque implementan persistencia concreta detrás de los contratos que consume la aplicación.

___
## Documentación relacionada

- [README y pruebas manuales](./README.md)
- [Revisión de seguridad](./SECURITY_REVIEW.md)

___
## Objetivo

Construir el backend para un flujo buy-now-pay-later donde un usuario tiene una línea de crédito aprobada, puede crear compras en 3, 6 o 12 cuotas, y recupera crédito disponible a medida que paga cuotas pendientes.

## Arquitectura

El proyecto usa una arquitectura limpia/hexagonal simple y directa la idea es no atarse a una tecnologia, si bien se pidio node (typescript) con express, o sea javascript si lo hacemos clean es mas entendible a cualquier backend engineer que venga de otra tecnologia, al margen de que facilit la migracion al ser agnostico de la tecnologia.

La decisión busca separar las reglas de negocio de los detalles técnicos, como Express, PostgreSQL o posibles integraciones externas. \
En un sistema que mueve dinero, esta separación ayuda a testear la lógica crítica sin depender de HTTP o base de datos, y hace más explícitas las decisiones de diseño - toda decision es basada siempre en clean code + clean architecture.

- La capa de dominio contiene conceptos y reglas de negocio.
- La capa de aplicación orquesta casos de uso y define contratos necesarios para ejecutarlos.
- La capa de infraestructura contiene implementaciones técnicas, como repositorios PostgreSQL o clientes para integraciones externas.
- La capa de presentación expone la API HTTP.

Uso nombres como `repository` y `gateway` en lugar del término genérico `ports` porque expresan mejor la intención del contrato y hacen que el código sea más fácil de navegar para un equipo, esto es debido a que la arquitectura hexagonal tiende a crear (en algunos casos) una sobre ingenieria y por motivos practicos para este ejercicio vamos a obviar.

`routes.ts` registra endpoints y delega en controllers, la creación de objetos concretos vive en `src/config/dependency-container.ts`, porque en algún punto hay que conectar Express, casos de uso e infraestructura. \
Tener ese punto separado deja `routes.ts` más chico y permite elegir entre in-memory y PostgreSQL sin tocar la definición de rutas.

## Convenciones de codigo, no solo TypeScript-Bounded

El código prioriza tipos explícitos en variables, parámetros, retornos y propiedades. \
**Aunque TypeScript permite inferencia**, esta convención busca que el flujo sea más fácil de leer para perfiles acostumbrados a lenguajes fuertemente tipados como Java, y reduce ambigüedad en un dominio sensible como dinero y crédito.

Los controllers declaran explícitamente el contrato HTTP de cada endpoint: path params, request body, query params y response body, **esto evita depender de tipos genéricos demasiado amplios de Express** y hace que el contrato de cada endpoint sea visible en el código.

Los DTOs HTTP viven en `presentation/api/dto/request` y `presentation/api/dto/response`, son tipos de Express (un tipo de acoplamiento a la tecnologia a discutir en persona), por eso no van en `application/dto`, la capa de aplicación mantiene sus propios contratos en `application/dto/request` y `application/dto/response`; de esa forma un caso de uso no queda acoplado a `Request` o `Response`.

Las carpetas se nombran **por intención estable** y no por mecanismo accidental del framework. \
Por ejemplo, el manejo de errores HTTP vive en `presentation/error` y no en `presentation/middleware`, porque su responsabilidad principal es traducir errores de aplicación a respuestas HTTP.

Los contratos de entrada y salida de la capa de aplicación se separan por intención: dentro de `application/dto/request` y `application/dto/response`. \
No se usa `dto` como cajón genérico: 
 - si una estructura representa entrada de caso de uso va en `request`; 
 - si representa salida hacia presentation va en `response`.

La capa de presentación sigue la misma idea para contratos HTTP, pero en su propia carpeta para no mezclar responsabilidades.

## Capas

### Domain

Contiene modelos, value objects, reglas de negocio y errores propios del dominio.

### Application

Contiene los servicios de aplicación que representan casos de uso:

- consultar línea de crédito
- crear compra
- consultar detalle de compra
- pagar cuota

### Infrastructure

Contiene detalles técnicos reemplazables:

- conexión a PostgreSQL
- implementación de repositorios

### Presentation

Contiene adapters de entrada HTTP: rutas, controladores, validaciones y traducción de errores.

Los controladores no manejan errores de aplicación con `try/catch`, si un caso de uso lanza un error, `presentation/error` lo traduce a una respuesta HTTP.

Aunque Express registre el error handler como middleware, el proyecto lo ubica por intención y no por mecanismo: su rol estable es adaptar errores de aplicación a HTTP.

La composición de dependencias vive fuera de `presentation/api/routes`. \
Hoy el container instancia repositorios, servicios de aplicación y controllers. \
La implementación concreta de persistencia se elige desde configuración: in-memory para desarrollo/tests rápidos o PostgreSQL como base real. \
Ojo, tambien es util para mantener responsabilidades separadas, clases chicas y dedicadas!, mas facil de leer y entender

## Repository vs Gateway

Un `repository` representa persistencia propia del dominio de este servicio.

Un `gateway` representa comunicación con un sistema externo o una capacidad fuera del core del dominio.

Ejemplo: 
- Consultar o guardar compras es responsabilidad de un repository. 
- Cobrar la primera cuota con un proveedor de pagos sería responsabilidad de un gateway, basicamente una pegada a una api o servicio de terceros.

Hoy no hay gateway real de pagos porque el enunciado pide modelar el flujo y estado de cuotas/crédito, si mañana se integra un PSP, el contrato debería nacer en `application/gateway` y la implementación concreta vivir en `infrastructure/gateway`.

## Consulta de línea de crédito
### Parte 1 Consultar la línea de crédito de un usuario (su límite y cuánto tiene disponible ahora).

La consulta `GET /users/:userId/credit-line` se implementa como una query dentro de la capa de aplicación.

El controller solo traduce HTTP al caso de uso. La lectura depende de `CreditLineRepository`, lo que permite usar in-memory o PostgreSQL dockerizado sin cambiar presentación, aplicación ni dominio.

Esta decisión aplica Dependency Inversion: la lógica de aplicación depende de una abstracción y no de una base de datos concreta.

Una línea de crédito con disponible `0` es un estado válido y se responde con `200 OK`; no se trata como error. Desde la perspectiva del usuario, esto significa que tiene una línea aprobada pero no tiene crédito disponible para nuevas compras.

Si no existe una línea de crédito aprobada asociada al `userId`, la API responde `404 Not Found`. \
Esta respuesta no intenta inferir si el usuario existe o no; solo expresa que el servicio no encontró una línea de crédito consultable para ese identificador.

Tambien esta el caso de que haya un error en la obtencion de la linea de credito (porque no?)

La falta de crédito suficiente se validará al crear una compra, no al consultar la línea de crédito.

## Crear compra en cuotas
### Parte 1 Crear una compra en cuotas (`amount`, `installments`).

El endpoint `POST /users/:userId/purchases` se implementa como command porque modifica estado.

El request de aplicación vive en `application/dto/request/create-purchase-request.ts` y unifica el `userId` del path con el body HTTP (`amount`, `installments`).

Para este alcance, el request no recibe `currency`, los montos se interpretan en la moneda local de la línea de crédito, esta decisión evita conversiones implícitas de moneda, que en un sistema financiero requieren reglas explícitas de tipo de cambio, redondeo, auditoría y regulación.

La creación de compra valida cuotas permitidas, monto positivo y crédito suficiente. \
Si la línea de crédito existe y el crédito disponible alcanza, se crea una compra con su plan financiero: la primera cuota queda pagada al momento de la compra y las restantes quedan pendientes.

El crédito disponible no se reduce por el monto total de la compra, sino por el monto de las cuotas pendientes, esto respeta la regla del producto: la primera cuota se paga al momento y el usuario recupera crédito a medida que paga cuotas.

Ejemplo:

```txt
Crédito disponible inicial: 1000.00
Compra: 900.00 en 3 cuotas
Cuota 1: 300.00 PAID al momento

Cuotas pendientes: 300.00 + 300.00 = 600.00
Nuevo crédito disponible: 1000.00 - 600.00 = 400.00
```

El guardado de compra y la reserva de crédito se ejecutan dentro de `TransactionManager`. \
Con in-memory se reutilizan los mismos repositorios para mantener el contrato simple. \
Con PostgreSQL se abre una transacción real para persistir compra, cuotas y línea de crédito como una única unidad de trabajo.

## Consultar detalle de compra
### Parte 1 Consultar el detalle de una compra con su plan de cuotas.

La consulta `GET /purchases/:purchaseId` se implementa como query dentro de la capa de aplicación, por lo tanto no modifica estado.

El caso de uso depende de `PurchaseRepository`, esto permite consultar compras guardadas en memoria o en PostgreSQL sin modificar el controller ni la lógica de aplicación.

La respuesta expone el detalle de la compra y su plan de cuotas: monto total, estado de la compra, fechas de creación/modificación y cuotas con número, monto, vencimiento, estado y fecha de pago cuando aplica.

Una cuota pagada tiene estado `PAID` y `paidAt` informado. Una cuota pendiente tiene estado `PENDING` y `paidAt: null`, porque todavía no existe una fecha de pago.

Si no existe una compra asociada al `purchaseId`, la API responde `404 Not Found` con `Purchase not found`, el `null` que puede devolver el repository se transforma inmediatamente en un error de aplicación, evitando que valores ausentes se filtren al resto del flujo.

## Pagar cuota
### Parte 4 Pagar una cuota.

El endpoint elegido es `POST /purchases/:purchaseId/installments/:installmentNumber/pay`.

Uso `POST` porque pagar una cuota modifica estado: cambia la cuota, cambia la compra y cambia la línea de crédito. \
El `purchaseId` y el `installmentNumber` van en el path porque identifican la compra y la cuota sobre la que se ejecuta la acción.

El caso de uso `PayInstallmentCommandService` mantiene un `execute` corto:

```txt
validate
find purchase
pay installment
save result
return response
```

La validación inicial revisa solo datos propios del comando, por ejemplo que el número de cuota sea un entero positivo. \
La existencia de la compra se resuelve con `PurchaseByIdFinder`, porque ese servicio ya centraliza la búsqueda de compra y transforma el `null` del repository en `PurchaseNotFoundError`.

Una cuota puede pagarse solo si existe y está `PENDING`. \
Si la cuota no existe, la API responde `404 Installment not found`. \
Si ya está pagada, responde `409 Installment already paid`.

Al pagar una cuota pendiente, el sistema crea una copia de esa cuota con estado `PAID` y `paidAt`. \
Luego reemplaza esa cuota dentro del plan de cuotas, recalcula el estado de la compra y recupera crédito disponible por el monto de la cuota pagada.

La compra queda `COMPLETED` cuando no quedan cuotas `PENDING`. Si todavía existe al menos una cuota pendiente, la compra sigue `ACTIVE`.

La respuesta del endpoint devuelve el resultado que necesita el cliente para confirmar el pago:

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

El guardado usa dos repositories: compra y línea de crédito. \
El caso de uso no sabe si esos repositories son in-memory o PostgreSQL; solo exige que ambos cambios se confirmen dentro de `TransactionManager`. \
Con PostgreSQL, `PostgresTransactionManager` ejecuta `BEGIN`, crea repositories con el mismo cliente, y luego confirma con `COMMIT` o revierte con `ROLLBACK`.

Esto permite defender atomicidad: si falla guardar la compra o actualizar la línea de crédito, la operación completa se revierte. \
La idempotencia HTTP fuerte y la concurrencia fina quedan como hardening posterior: por ejemplo, `Idempotency-Key` para reintentos seguros y update condicional/lock sobre la cuota pendiente para evitar dobles pagos simultáneos.

Se mantiene in-memory y no trabajo solo con postgres, como opción por simpleza y pensando incluso a largo plazo: tests rápidos, pruebas locales y validación de reglas sin levantar servicios externos.

## Persistencia y transacciones

La base real elegida es PostgreSQL porque el dominio modifica dinero, crédito y cuotas, considero que la transaccionalidad es fundamental en este caso. \
PostgreSQL da persistencia durable, transacciones ACID y herramientas claras para evolucionar luego hacia control de concurrencia más fuerte.

La aplicación no depende directamente de PostgreSQL (podria ser otro motor transaccional). \
Los casos de uso dependen de repositories y de `TransactionManager`; la infraestructura decide cómo implementar esos contratos.

### In-memory

La implementación in-memory queda como default para desarrollo rápido y tests. \
No simula locks ni transacciones reales, pero respeta el mismo contrato de aplicación.

### PostgreSQL

La implementación PostgreSQL vive en `src/infrastructure/persistence/postgres`, siguiente en patron de arquitectura limpia. \
Los comandos que modifican estado se ejecutan dentro de una transacción para que compra, cuotas y crédito disponible avancen juntos.

Las tablas usan primary keys como constraint mínimo necesario:

- `credit_lines.user_id`
- `purchases.purchase_id`
- `installments.purchase_id + installment_number`

Por decisión de diseño, no se agregaron foreign keys ni constraints complejas en esta etapa. \
La idea es mantener reglas de negocio explícitas en código y usar la base como persistencia consistente, no como lugar principal para expresar todo el dominio.

`PostgresPurchaseRepository` no borra cuotas al guardar una compra. \
Cada cuota conserva identidad por `purchase_id + installment_number`; cuando cambia su estado, se actualiza el registro existente. Esto evita perder historia y deja mejor preparado el modelo para auditoría.

## Garantías actuales

Ventajas del uso de CQRS (querys vs commands):
- Los commands de compra y pago se ejecutan dentro de `TransactionManager`.
- En PostgreSQL, la transacción confirma o revierte todos los cambios del caso de uso.
- Los repositories esconden el detalle técnico de persistencia.
- Los controllers no conocen PostgreSQL ni in-memory.
- Los montos se modelan con `Decimal`, no con `number` nativo de JavaScript (punto importante para mencionar en la defensa, mencionar caso de Broker).
- Las cuotas no se borran al actualizar una compra.

## Mejoras futuras conscientes

- Agregar `Idempotency-Key` para que reintentos HTTP no dupliquen operaciones.
- Agregar control de concurrencia fino en PostgreSQL, por ejemplo update condicional sobre cuota `PENDING` o locks específicos.
- Evaluar constraints adicionales si aportan seguridad sin duplicar reglas de negocio de forma confusa.
- Integrar un gateway real de pagos si el flujo deja de ser solo modelado de estado.
- `Mencionar casos reales, respuesta rapida y guardado del request, reintentos, arquitectura event driven.`

## Supuestos iniciales

- Los montos se reciben como texto decimal con hasta dos decimales y se modelan internamente con `Decimal` para evitar errores de precisión de JavaScript.
- Modele un tipo de objeto especifico para la moneda porque permite trabajar de forma mas dinamica, ejemplo que pasa con moneda de otro pais?
- Las cuotas permitidas son 3, 6 o 12.
- Una compra consume crédito disponible al momento de confirmarse.
- La primera cuota se paga al momento de crear la compra.
- Las cuotas futuras quedan pendientes con fecha de vencimiento.
- Pagar una cuota pendiente restaura crédito disponible por el monto de esa cuota.
- Las operaciones que modifican dinero o crédito se ejecutan dentro de una transacción cuando la persistencia elegida es PostgreSQL.
- La API debe rechazar valores inválidos antes de ejecutar reglas de negocio.

## Cobertura del enunciado

- `GET /users/:userId/credit-line`: consulta límite y crédito disponible.
- `POST /users/:userId/purchases`: crea una compra en cuotas.
- `GET /purchases/:purchaseId`: consulta detalle de compra y plan de cuotas.
- `POST /purchases/:purchaseId/installments/:installmentNumber/pay`: paga una cuota pendiente.
- Cuotas permitidas: `3`, `6` y `12`.
- Compra rechazada cuando no cabe en crédito disponible.
- Pago de cuota recupera crédito disponible.
- Montos expresados en moneda local (`VES`).
- PostgreSQL disponible como persistencia real mediante Docker y configuración por environment.

---
__La validación manual del flujo y los paso a paso se encuentran y documenta en [README.md](./README.md#comienzo-de-las-pruebas). \
Este documento se mantiene enfocado en las decisiones de modelado, arquitectura y reglas de negocio.__
___
## Frontend web mínimo

El frontend se implementó como HTML, CSS y `fetch`, servido estáticamente desde Express. \
La decisión busca mantener el entregable simple: el foco de la prueba está en backend, reglas de dinero, persistencia y seguridad, por lo que no agregué React, Vite ni un build frontend separado.

La UI vive en `frontend/` para no mezclar código de presentación web con la arquitectura backend (`domain`, `application`, `infrastructure`, `presentation/api`). \
Express solo sirve esos archivos como estáticos; las reglas de negocio siguen estando en los casos de uso del backend.

Decisiones principales:

- La simulación de compra llama a `POST /users/:userId/purchases/preview`.
- El navegador no recalcula reglas de cuotas ni crédito disponible.
- Después de confirmar una compra, la UI consulta `GET /purchases/:purchaseId` para mostrar el estado real persistido.
- Después de pagar una cuota, la UI vuelve a consultar detalle de compra, línea de crédito y listado de compras.
- El listado de compras por usuario permite pagar cuotas existentes sin exigir que el usuario conozca un `purchaseId` de antemano.

### Endpoint agregado por simplicidad del frontend

Además de los endpoints mínimos del enunciado, agregué:

```http
GET /users/:userId/purchases
```

Este endpoint devuelve summaries de compras del usuario. \
Se agregó por motivos de simpleza y usabilidad del frontend mínimo: permite mostrar compras disponibles y elegir una para ver detalle o pagar cuotas pendientes. \
El detalle completo sigue estando en `GET /purchases/:purchaseId` y el pago sigue estando en `POST /purchases/:purchaseId/installments/:installmentNumber/pay`, manteniendo responsabilidades separadas.

En una versión con autenticación real, este endpoint debería validar que el usuario autenticado coincida con el `userId` del path. \
Los endpoints por `purchaseId` deberían validar que `purchase.userId` coincida con el usuario autenticado para evitar IDOR. No alcanza con agregar `userId` al path; la autorización debe depender del sujeto autenticado.

### Supuesto de crédito usado por frontend y backend

La primera cuota se paga al momento de crear la compra. \
Por eso, el sistema compara el crédito disponible contra el monto financiado pendiente (`creditToReserve`), no contra el monto total de la compra.

Ejemplo: una compra de `600.00 VES` en 3 cuotas genera:

- cuota 1: `200.00 VES`, pagada al momento;
- cuota 2: `200.00 VES`, financiada;
- cuota 3: `200.00 VES`, financiada.

En ese caso, el crédito a reservar es `400.00 VES`. \
Si el usuario tiene `400.00 VES` disponibles, la compra puede confirmarse porque solo las cuotas financiadas consumen crédito disponible.
