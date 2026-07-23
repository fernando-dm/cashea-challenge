# Diseño

## Objetivo

Construir el backend para un flujo buy-now-pay-later donde un usuario tiene una línea de crédito aprobada, puede crear compras en 3, 6 o 12 cuotas, y recupera crédito disponible a medida que paga cuotas pendientes.

## Arquitectura

El proyecto usa una arquitectura limpia/hexagonal simple y directa.
porque decidi usar este tipo de arquitectura? porque como dice MArtin Fowler, la idea es que nuestro codigo lo lea y lo entienda otro dev, no solo la computadora, trabajar con arquitectura limpia es habar un lenguaje universal agnostico de la tecnologia incluso.

La capa de dominio contiene conceptos y reglas de negocio. 
La capa de aplicación orquesta casos de uso y define contratos necesarios para ejecutarlos. 
La capa de infraestructura contiene implementaciones técnicas, como repositorios PostgreSQL o integraciones externas. 
La capa de presentación expone la API HTTP.

Uso nombres como `repository` y `gateway` en lugar del término genérico `ports` porque expresan mejor la intención del contrato y hacen que el código sea más fácil de navegar para un equipo.

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

Contiene la entrada HTTP: rutas, controladores, validaciones y manejo de errores.

## Repository vs Gateway

Un `repository` representa persistencia propia del dominio de este servicio.

Un `gateway` representa comunicación con un sistema externo o una capacidad fuera del core del dominio.

Ejemplo: consultar o guardar compras es responsabilidad de un repository. Cobrar la primera cuota con un proveedor de pagos sería responsabilidad de un gateway.

## Supuestos iniciales

- Los montos se representan como enteros en unidades menores de la moneda, por ejemplo centavos.
- Las cuotas permitidas son 3, 6 o 12.
- Una compra consume crédito disponible al momento de confirmarse.
- La primera cuota se paga al momento de crear la compra.
- Las cuotas futuras quedan pendientes con fecha de vencimiento.
- Pagar una cuota pendiente restaura crédito disponible por el monto de esa cuota.
- Las operaciones que modifican dinero o crédito deben ejecutarse dentro de una transacción.
- La API debe rechazar valores inválidos antes de ejecutar reglas de negocio.