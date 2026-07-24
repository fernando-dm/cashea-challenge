# Diseño

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

## Convenciones de codigo, no solo TypeScript-Bounded

El código prioriza tipos explícitos en variables, parámetros, retornos y propiedades. \
**Aunque TypeScript permite inferencia**, esta convención busca que el flujo sea más fácil de leer para perfiles acostumbrados a lenguajes fuertemente tipados como Java, y reduce ambigüedad en un dominio sensible como dinero y crédito.

Los controllers declaran explícitamente el contrato HTTP de cada endpoint: path params, request body, query params y response body, **esto evita depender de tipos genéricos demasiado amplios de Express** y hace que el contrato de cada endpoint sea visible en el código.

Las carpetas se nombran **por intención estable** y no por mecanismo accidental del framework. \
Por ejemplo, el manejo de errores HTTP vive en `presentation/error` y no en `presentation/middleware`, porque su responsabilidad principal es traducir errores de aplicación a respuestas HTTP.

Los contratos de entrada y salida de la capa de aplicación se separan por intención: dentro de `application/dto/request` y `application/dto/response`. \
No se usa `dto` como cajón genérico: 
 - si una estructura representa entrada de caso de uso va en `request`; 
 - si representa salida hacia presentation va en `response`.

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
- implementación simulada de gateway de medio de pago

### Presentation

Contiene adapters de entrada HTTP: rutas, controladores, validaciones y traducción de errores.

Los controladores no manejan errores de aplicación con `try/catch`. Si un caso de uso lanza un error, `presentation/error` lo traduce a una respuesta HTTP.

Aunque Express registre el error handler como middleware, el proyecto lo ubica por intención y no por mecanismo: su rol estable es adaptar errores de aplicación a HTTP.

## Repository vs Gateway

Un `repository` representa persistencia propia del dominio de este servicio.

Un `gateway` representa comunicación con un sistema externo o una capacidad fuera del core del dominio.

Ejemplo: 
- Consultar o guardar compras es responsabilidad de un repository. 
- Cobrar la primera cuota con un proveedor de pagos sería responsabilidad de un gateway, basicamente una pegada a una api o servicio de terceros.

## Consulta de línea de crédito
### Parte 1 Consultar la línea de crédito de un usuario (su límite y cuánto tiene disponible ahora).

La consulta `GET /users/:userId/credit-line` se implementa como una query dentro de la capa de aplicación.

El controller solo traduce HTTP al caso de uso. La lectura depende de `CreditLineRepository`, lo que permite empezar con una implementación in-memory y luego reemplazarla por PostgreSQL dockerizado sin cambiar presentación, aplicación ni dominio.

Esta decisión aplica Dependency Inversion: la lógica de aplicación depende de una abstracción y no de una base de datos concreta.

Una línea de crédito con disponible `0` es un estado válido y se responde con `200 OK`; no se trata como error. Desde la perspectiva del usuario, esto significa que tiene una línea aprobada pero no tiene crédito disponible para nuevas compras.

Si no existe una línea de crédito aprobada asociada al `userId`, la API responde `404 Not Found`. Esta respuesta no intenta inferir si el usuario existe o no; solo expresa que el servicio no encontró una línea de crédito consultable para ese identificador.

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

En 1er instancia etapa se realizo con una persistencia in-memory para validar reglas de negocio y flujo HTTP.  
Los repositories se mantienen como abstracciones para reemplazar luego por PostgreSQL sin modificar controllers ni casos de uso.

## Consultar detalle de compra
### Parte 1 Consultar el detalle de una compra con su plan de cuotas.

La consulta `GET /purchases/:purchaseId` se implementa como query dentro de la capa de aplicación, por lo tanto no modifica estado.

El caso de uso depende de `PurchaseRepository`, esto permite consultar compras guardadas hoy en memoria y luego reemplazar esa implementación por PostgreSQL sin modificar el controller ni la lógica de aplicación.

La respuesta expone el detalle de la compra y su plan de cuotas: monto total, estado de la compra, fechas de creación/modificación y cuotas con número, monto, vencimiento, estado y fecha de pago cuando aplica.

Una cuota pagada tiene estado `PAID` y `paidAt` informado. Una cuota pendiente tiene estado `PENDING` y `paidAt: null`, porque todavía no existe una fecha de pago.

Si no existe una compra asociada al `purchaseId`, la API responde `404 Not Found` con `Purchase not found`, el `null` que puede devolver el repository se transforma inmediatamente en un error de aplicación, evitando que valores ausentes se filtren al resto del flujo.

## Supuestos iniciales

- Los montos se reciben como texto decimal con hasta dos decimales y se modelan internamente con `Decimal` para evitar errores de precisión de JavaScript.
- Modele un tipo de objeto especifico para la moneda porque permite trabajar de forma mas dinamica, ejemplo que pasa con moneda de otro pais?
- Las cuotas permitidas son 3, 6 o 12.
- Una compra consume crédito disponible al momento de confirmarse.
- La primera cuota se paga al momento de crear la compra.
- Las cuotas futuras quedan pendientes con fecha de vencimiento.
- Pagar una cuota pendiente restaura crédito disponible por el monto de esa cuota.
- Las operaciones que modifican dinero o crédito deben ejecutarse dentro de una transacción.
- La API debe rechazar valores inválidos antes de ejecutar reglas de negocio.

---
__La validación manual del flujo se documenta en [README.md](./README.md#pruebas-manuales-con-curl) mediante comandos `curl` y respuestas esperadas. \
Este documento se mantiene enfocado en las decisiones de modelado, arquitectura y reglas de negocio.__
