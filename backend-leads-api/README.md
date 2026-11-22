# Leads API (backend)

API REST para gestionar leads comerciales: crearlos, asignarlos a agentes y priorizarlos con una **puntuación ponderada y configurable**.

**Stack:** Node.js 24 · NestJS 12 · TypeScript · PostgreSQL 17 · Prisma · Zod · Vitest

## Índice

1. [Requisitos](#1-requisitos)
2. [Inicio rápido](#2-inicio-rápido)
3. [Guía paso a paso](#3-guía-paso-a-paso)
4. [Probar la API](#4-probar-la-api)
5. [Usar otra base de datos (sin Docker, Neon…)](#5-usar-otra-base-de-datos-sin-docker-neon)
6. [Pruebas automatizadas](#6-pruebas-automatizadas)
7. [Comandos útiles](#7-comandos-útiles)
8. [Referencia de la API](#8-referencia-de-la-api)
9. [Arquitectura y modelo de datos](#9-arquitectura-y-modelo-de-datos)
10. [Sistema de pesos y puntuación](#10-sistema-de-pesos-y-puntuación)
11. [Concurrencia y consistencia](#11-concurrencia-y-consistencia)
12. [Problemas frecuentes](#12-problemas-frecuentes)
13. [Limitaciones conocidas y mejoras](#13-limitaciones-conocidas-y-mejoras)

---

## 1. Requisitos

| Herramienta | Versión | Para qué |
|---|---|---|
| [Node.js](https://nodejs.org) | 24 o superior | Ejecutar la API |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | cualquiera reciente | Levantar PostgreSQL sin instalarlo |

Si no quieres usar Docker, puedes usar cualquier PostgreSQL (local o [Neon](https://neon.com)): mira la [sección 5](#5-usar-otra-base-de-datos-sin-docker-neon).

## 2. Inicio rápido

Con Docker Desktop abierto, primero la base de datos desde la **raíz del repositorio** (`docker compose up -d db`) y luego, desde la carpeta `backend-leads-api`:

```bash
npm install                  # 1. dependencias
cp .env.example .env         # 2. configuración (en Windows PowerShell también funciona `cp`)
# 3. base de datos PostgreSQL en Docker: `docker compose up -d db` en la raíz del repo
npx prisma generate          # 4. cliente de base de datos
npx prisma migrate deploy    # 5. crea las tablas
npm run seed                 # 6. datos de ejemplo (500 leads, 3 agentes, pesos iniciales)
npm run start:dev            # 7. API en http://localhost:3000
```

Comprueba que funciona: inicia sesión con un usuario de demo (ver [4.1](#41-autenticación-y-usuarios-de-demo)):

```bash
curl.exe -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d "{\"telefono\":\"600000001\",\"password\":\"Admin-2026\"}"
```

Debe devolver un `token` y los datos del agente.

## 3. Guía paso a paso

### 3.1 Instalar dependencias

```bash
npm install
```

### 3.2 Configurar las variables de entorno

Copia la plantilla y edítala:

```bash
cp .env.example .env
```

El archivo `.env` **no se sube al repositorio** (está en `.gitignore`). La plantilla `.env.example` no contiene credenciales reales: cambia la contraseña por la tuya **en las dos líneas donde aparece** (`POSTGRES_PASSWORD` y dentro de `DATABASE_URL`).

| Variable | Obligatoria | Descripción |
|---|---|---|
| `POSTGRES_USER` | Sí (Docker) | Usuario que crea el contenedor de PostgreSQL |
| `POSTGRES_PASSWORD` | Sí (Docker) | Contraseña de ese usuario |
| `POSTGRES_DB` | Sí (Docker) | Nombre de la base de datos |
| `DATABASE_URL` | Sí | Cadena de conexión. Formato: `postgresql://USUARIO:PASSWORD@HOST:PUERTO/BASE_DE_DATOS` |
| `PORT` | No | Puerto de la API (por defecto `3000`) |
| `CORS_ORIGIN` | No | Dirección del frontend autorizada (por defecto `http://localhost:5173`) |
| `JWT_SECRET` | Sí | Secreto con el que se firman los tokens de sesión (mínimo 16 caracteres). La API **no arranca** sin él. Genera uno con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `PAGINATION_MAX_LIMIT` | No | Máximo permitido en `?limit=` del listado de leads (por defecto `100`). Un valor mayor se rechaza con `400` |
| `PAGINATION_DEFAULT_LIMIT` | No | Tamaño de página cuando no se envía `limit` (por defecto `20`; nunca supera el máximo) |

> Las tres variables `POSTGRES_*` solo las usa Docker al crear la base de datos por primera vez. Si luego cambias la contraseña en `.env`, el contenedor ya creado **no** la actualiza: borra el volumen (ver [3.3](#33-levantar-la-base-de-datos-con-docker)) y vuelve a crearlo.
> Evita caracteres especiales (`@`, `:`, `/`, `#`, `?`) en la contraseña, o tendrás que codificarlos en la URL.

### 3.3 Levantar la base de datos con Docker

El archivo [`docker-compose.yml`](../docker-compose.yml) de la raíz del repositorio define el servicio `db` (PostgreSQL 17), que lee las variables `POSTGRES_*` del `.env` de la raíz (si no existe, usa valores por defecto: `leads` / `leads_password` / `leads_db`; ajusta `DATABASE_URL` de tu `.env` para que coincida). Ejecuta estos comandos **desde la raíz del repositorio**:

```bash
docker compose up -d db   # crear y arrancar solo la base de datos
docker compose ps         # comprobar: debe aparecer "Up"
```

Otros comandos que te pueden hacer falta:

| Comando | Qué hace |
|---|---|
| `docker compose logs -f db` | Ver los logs de la base de datos |
| `docker compose stop` | Pararla (los datos se conservan) |
| `docker compose start` | Volver a arrancarla |
| `docker compose down` | Borrar el contenedor (los datos se conservan en el volumen) |
| `docker compose down -v` | Borrar contenedor **y todos los datos**. Empieza de cero |
| `docker compose exec db psql -U <POSTGRES_USER> -d <POSTGRES_DB>` | Abrir una consola SQL |

Los datos viven en el volumen de Docker `leads-db`, por lo que sobreviven a reinicios del ordenador.

### 3.4 Crear las tablas (migraciones)

```bash
npx prisma generate         # genera el cliente de base de datos (una vez tras instalar)
npx prisma migrate deploy   # aplica las migraciones de src/database/migrations
```

Las migraciones crean las tablas `Agente`, `Lead`, `Pesos` y `Puntuacion`, con sus restricciones (indicadores entre 0 y 100, una sola configuración de pesos activa) e índices.

> `npx prisma migrate dev` solo es necesario si **modificas** [`schema.prisma`](src/database/schema.prisma): crea una migración nueva.

### 3.5 Cargar los datos de ejemplo (seed)

```bash
npm run seed
```

Ejecuta [`src/database/seed.sql`](src/database/seed.sql), que **borra todos los datos existentes** y crea:

| Dato | Detalle |
|---|---|
| **Agentes** | 3 agentes con teléfono y contraseña de demo (ver [4.1](#41-autenticación-y-usuarios-de-demo)); el `1` es **ADMIN** |
| **Pesos** | Versión 1 activa: Cliente nuevo 40 % · Interés comercial 30 % · Origen 20 % · Antigüedad 10 % |
| **Leads** | 500 leads con nombre, teléfono, estado y los 4 indicadores (0–100) **aleatorios**; aproximadamente un tercio sin agente asignado |
| **Puntuaciones** | Calculadas para cada lead con los pesos iniciales |

Es **reproducible**: puedes ejecutarlo tantas veces como quieras y siempre vuelves a un estado limpio (los datos son aleatorios, pero la estructura y la cantidad son siempre las mismas). Para generar más o menos leads, cambia el `500` de `generate_series(1, 500)` en `seed.sql`.

> ⚠️ **Nunca lo ejecutes contra una base de datos con datos reales.**

### 3.6 Arrancar la API

```bash
npm run start:dev     # desarrollo: se reinicia solo al guardar cambios
```

o, para una ejecución "de producción":

```bash
npm run build
npm run start:prod
```

La API queda en <http://localhost:3000>. Verás en la consola el listado de rutas y `Nest application successfully started`.

> Es normal el aviso `Observe is installed but not connected yet`: es una herramienta de monitorización opcional del esqueleto de Nest y no afecta al funcionamiento.

## 4. Probar la API

### 4.1 Autenticación y usuarios de demo

Se entra con **teléfono y contraseña**. `POST /auth/login` devuelve un **token** (JWT, caduca a las 8 horas) que se envía en el resto de peticiones:

```
Authorization: Bearer <token>
```

**Usuarios de demo** (los crea `npm run seed`; son datos de prueba, no secretos reales):

| Agente | Teléfono | Contraseña | Rol |
|---|---|---|---|
| Agente 01 (id 1) | `600000001` | `Admin-2026` | **ADMIN** |
| Agente 02 (id 2) | `600000002` | `Agente2-2026` | AGENTE |
| Agente 03 (id 3) | `600000003` | `Agente3-2026` | AGENTE |

Cómo funciona y por qué es seguro:

- Las contraseñas **no se guardan en claro**: se guarda un hash `scrypt` con sal aleatoria (`src/auth/password.ts`).
- Si el teléfono no existe o la contraseña falla, la respuesta es la misma (`401 Teléfono o contraseña incorrectos`), para no revelar qué teléfonos están registrados.
- En **cada petición** el backend verifica la firma del token y vuelve a leer el agente de la base de datos: su **identidad y su rol salen siempre de ahí**, nunca del cuerpo de la petición. Un agente borrado deja de tener acceso aunque conserve un token.
- Solo el agente `ADMIN` puede cambiar los pesos (`403` si no).
- Un lead **solo lo modifica su agente asignado** (datos y estado). Si está libre, primero hay que asignárselo; un administrador tampoco puede editar leads ajenos (puede desasignarlos).
- Rutas: `POST /auth/login` es la única pública. `GET /auth/me` devuelve el agente de la sesión y `GET /agents` la lista de agentes (sin teléfonos ni hashes).

### 4.2 Ejemplos

Con `curl` (en Windows PowerShell usa `curl.exe`, no `curl`). Primero, el login:

```bash
curl.exe -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d "{\"telefono\":\"600000002\",\"password\":\"Agente2-2026\"}"
```

Copia el valor de `token` y úsalo en las demás peticiones (sustituye `TOKEN`):

```bash
# Quién soy
curl.exe -H "Authorization: Bearer TOKEN" http://localhost:3000/auth/me

# Primeros 3 leads, ordenados por puntuación
curl.exe -H "Authorization: Bearer TOKEN" "http://localhost:3000/leads?limit=3"

# Filtrar y buscar: leads NUEVOS del agente 2 cuyo nombre o teléfono contenga "an"
curl.exe -H "Authorization: Bearer TOKEN" "http://localhost:3000/leads?status=NUEVO&agentId=2&search=an"

# Detalle con puntuación, prioridad y desglose
curl.exe -H "Authorization: Bearer TOKEN" http://localhost:3000/leads/1

# Pesos vigentes
curl.exe -H "Authorization: Bearer TOKEN" http://localhost:3000/weights

# Asignarte el lead 1. Si ya lo tiene otro agente → 409
curl.exe -X POST -H "Authorization: Bearer TOKEN" http://localhost:3000/leads/1/assign
```

En PowerShell, `Invoke-RestMethod` guarda el token en una variable y gestiona mejor el JSON:

```powershell
# Iniciar sesión como administrador y guardar el token
$login = Invoke-RestMethod -Method Post -Uri http://localhost:3000/auth/login `
  -ContentType 'application/json' -Body '{"telefono":"600000001","password":"Admin-2026"}'
$headers = @{ Authorization = "Bearer $($login.token)" }

# Crear un lead
Invoke-RestMethod -Method Post -Uri http://localhost:3000/leads -Headers $headers `
  -ContentType 'application/json' `
  -Body '{"nombre":"Ana Torres","telefono":"600111222","clienteNuevo":100,"interesComercial":50,"origen":20,"antiguedad":0}'

# Cambiar los pesos (solo admin; la suma debe ser 100)
Invoke-RestMethod -Method Put -Uri http://localhost:3000/weights -Headers $headers `
  -ContentType 'application/json' `
  -Body '{"clienteNuevo":25,"interesComercial":25,"origen":25,"antiguedad":25}'
```

Tras cambiar los pesos, vuelve a pedir `GET /leads`: las puntuaciones, prioridades y el orden ya reflejan la nueva configuración.

También puedes usar Postman, Insomnia o la extensión REST Client de VS Code: haz el login, copia el token y añádelo como `Authorization: Bearer <token>` (en Postman, pestaña *Authorization* → *Bearer Token*).

## 5. Usar otra base de datos (sin Docker, Neon…)

No hace falta `docker compose`. Solo necesitas un PostgreSQL vacío y su cadena de conexión:

1. Crea la base de datos (en local, o gratis en [Neon](https://neon.com)).
2. En `.env`, pon su cadena en `DATABASE_URL`. Neon exige SSL:
   ```
   DATABASE_URL=postgresql://usuario:password@host.neon.tech/neondb?sslmode=require
   ```
   Las variables `POSTGRES_*` no se usan en este caso.
3. Sigue desde el paso `npx prisma generate` del [inicio rápido](#2-inicio-rápido).

> En Neon usa la conexión **directa** (sin `-pooler`) para las migraciones.
> No subas nunca tu `DATABASE_URL` al repositorio.

## 6. Pruebas automatizadas

```bash
npm test            # unitarias: no necesitan base de datos
npm run test:e2e    # integración (Vitest): necesitan la base de datos arrancada y con el seed aplicado
npm run test:postman  # integración HTTP (colección Postman): necesita la API en marcha y el seed aplicado
```

| Fichero | Qué cubre |
|---|---|
| [`score.spec.ts`](src/leads/domain/score.spec.ts) | Fórmula de puntuación, desglose, límites de prioridad (40 y 75), valores inválidos |
| [`weights.spec.ts`](src/weights/domain/weights.spec.ts) | Pesos negativos, suma distinta de 100, valores no enteros |
| [`leads.service.spec.ts`](src/leads/leads.service.spec.ts) | Reglas de asignación, desasignación y permisos, solo el agente asignado modifica (datos y estado), asignación al crear, conflicto de versión, falta de pesos |
| [`leads.schemas.spec.ts`](src/leads/leads.schemas.spec.ts) | Límite de página configurable por entorno (máximo y valor por defecto) |
| [`auth.service.spec.ts`](src/auth/auth.service.spec.ts) | Hash de contraseñas (sal, no se guarda en claro), login correcto, mismo error para teléfono y contraseña incorrectos, tokens manipulados o caducados |
| [`http-exception.filter.spec.ts`](src/common/http-exception.filter.spec.ts) | Cada tipo de error produce el estado y formato correctos; no se filtra información interna |
| [`leads.e2e-spec.ts`](test/leads.e2e-spec.ts) | Autenticación; puntuación no manipulable; **dos asignaciones simultáneas**; **dos ediciones con la misma versión**; cambio de pesos que recalcula y reordena; pesos inválidos y permisos |

Las pruebas de integración crean sus propios leads y dejan los pesos como estaban, pero usan la base de datos configurada en `.env`. Si fallan, comprueba que Docker está arrancado y que ejecutaste `npm run seed`.

### 6.1 Colección de Postman

[`postman/leads-api.postman_collection.json`](postman/leads-api.postman_collection.json) contiene **87 peticiones y 203 aserciones** que prueban la API real por HTTP, de principio a fin. Sirve de dos formas:

**Como test automático (terminal).** Con la API arrancada (`npm run start:dev` en otra terminal) y el seed aplicado:

```bash
npm run test:postman
```

Usa [Newman](https://github.com/postmanlabs/newman), el ejecutor oficial de colecciones, que va incluido en `devDependencies` y no necesita cuenta. Termina con código de salida distinto de 0 si falla cualquier aserción, así que vale para CI. Para apuntar a otra URL: `npm run test:postman -- --env-var baseUrl=http://otra-url:3000`.

Si prefieres [Postman CLI](https://learning.postman.com/docs/postman-cli/postman-cli-overview/) (requiere iniciar sesión con `postman login`): `postman collection run postman/leads-api.postman_collection.json`.

**Como colección interactiva.** En Postman: *Import* → selecciona el archivo. Para ejecutarla entera usa *Run collection*. Las variables (`baseUrl` y las credenciales de demo) están en la pestaña *Variables* de la colección. Cada petición lleva sus tests en la pestaña *Scripts* y el token (`Authorization: Bearer`) en *Authorization*.

| Carpeta | Peticiones | Qué comprueba |
|---|---|---|
| 1. Autenticación | 13 | Login de los 3 agentes; contraseña incorrecta y teléfono inexistente dan el **mismo** mensaje; sin token, token inventado y cabecera antigua → 401; `/auth/me`; `/agents` sin datos sensibles |
| 2. Pesos: validación y permisos | 10 | Un agente no puede cambiar pesos (403); suma ≠ 100, negativos, decimales, > 100, criterio que falta o desconocido → 400; tras los intentos inválidos la configuración sigue intacta |
| 3. Leads: crear, consultar y modificar | 25 | Creación con puntuación calculada por el servidor; rechazo de `puntuacion`, estado o agente enviados por el cliente; indicadores inválidos o ausentes; desglose que suma la puntuación; 404 y 400; **solo el agente asignado puede modificar** (lead libre, otro agente o administrador → 403); **conflicto de versión (409)** sin modificar el lead; cambio de estado |
| 4. Asignación | 11 | Un solo agente por lead (**409** al segundo, incluido quien ya lo tiene); permisos al desasignar (403); un administrador puede desasignar; reasignación |
| 5. Listado | 17 | Paginación (sin solapes ni huecos, total estable); orden por puntuación desc/asc con **desempate por id**; filtros por estado y agente, combinados; búsqueda por nombre y teléfono; límites (`limit` > 100, `page` < 1, parámetros desconocidos) |
| 6. Cambio de pesos y consistencia | 8 | Tras cambiar los pesos: detalle, desglose y **todo el listado** usan la nueva versión y el orden es coherente; un lead creado o modificado después se puntúa con los pesos vigentes; al restaurar, cada puntuación coincide con la fórmula |
| 7. Errores de la API | 3 | Ruta inexistente y JSON mal formado: mismo formato de error y sin información interna |

Cosas a tener en cuenta:

- **Orden de ejecución:** las carpetas dependen unas de otras (la 1 guarda los tokens y la 3 crea el lead que usan la 4, 5 y 6). Ejecútala completa y en orden.
- **Se puede repetir sin volver a cargar el seed:** los leads de la prueba llevan un nombre y un teléfono únicos por ejecución. Eso sí, cada ejecución deja 2 leads nuevos (no hay endpoint de borrado); `npm run seed` los elimina.
- **Cambia temporalmente los pesos** (carpeta 6) y los restaura al final. Si se interrumpe a mitad, `npm run seed` los restablece.
- **Carreras reales:** Postman envía las peticiones una a una, así que aquí solo se comprueban las reglas de forma secuencial (el segundo intento recibe 409). Las dos carreras simultáneas reales (asignación y edición) las prueban los tests de integración de Vitest.

## 7. Comandos útiles

| Comando | Descripción |
|---|---|
| `npm run start:dev` | Arranca la API en modo desarrollo (recarga automática) |
| `npm run build` | Compila a `dist/` |
| `npm run start:prod` | Ejecuta la versión compilada |
| `npm run seed` | Borra y recrea los datos de ejemplo |
| `npm test` | Pruebas unitarias |
| `npm run test:e2e` | Pruebas de integración (Vitest) |
| `npm run test:postman` | Pruebas de integración HTTP con la colección de Postman (la API debe estar arrancada) |
| `npm run lint` | Análisis estático del código |
| `npm run format` | Formatea el código con Prettier |
| `npx prisma migrate deploy` | Aplica las migraciones pendientes |
| `npx prisma studio` | Interfaz web para ver y editar la base de datos |

## 8. Referencia de la API

### Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/login` | Iniciar sesión con `telefono` y `password`. Devuelve `{ token, agente }` (público) |
| GET | `/auth/me` | Agente de la sesión actual |
| GET | `/agents` | Lista de agentes |
| POST | `/leads` | Crear lead. Estado inicial `NUEVO`; con `asignarme: true` queda asignado al agente que lo crea, si no (por defecto) queda libre |
| GET | `/leads` | Listado paginado (ver parámetros abajo) |
| GET | `/leads/:id` | Detalle con puntuación, prioridad y `desglose` por criterio |
| PUT | `/leads/:id` | Modificar datos. Solo el **agente asignado** (`403` si está libre o es de otro). Requiere `version` (control de conflictos) |
| PATCH | `/leads/:id/status` | Cambiar estado (`NUEVO`, `EN_GESTION`, `CONTACTADO`, `CERRADO`). Solo el agente asignado |
| POST | `/leads/:id/assign` | El agente autenticado se asigna el lead |
| DELETE | `/leads/:id/assign` | Desasignar (solo el agente asignado o un administrador) |
| GET | `/weights` | Pesos vigentes, con fechas y agente que los creó y modificó |
| PUT | `/weights` | Cambiar pesos (solo administrador) |

**Parámetros de `GET /leads`**

| Parámetro | Descripción |
|---|---|
| `status` | Filtra por estado |
| `agentId` | Filtra por agente asignado |
| `search` | Busca en nombre o teléfono |
| `sort` | `desc` (por defecto) o `asc`, por puntuación |
| `page` | Página, desde 1 (por defecto 1) |
| `limit` | Resultados por página, de 1 a `PAGINATION_MAX_LIMIT` (por defecto `PAGINATION_DEFAULT_LIMIT`; 100 y 20 si no se configuran) |

Respuesta: `{ "items": [...], "total": 500, "page": 1, "limit": 20 }`. Los ids se envían y reciben como **texto** (JSON no admite enteros tan grandes).

**Cuerpo de `POST /leads` y `PUT /leads/:id`:** `nombre`, `telefono`, `clienteNuevo`, `interesComercial`, `origen`, `antiguedad` (los cuatro últimos, enteros 0–100). `POST` admite además `asignarme` (booleano, por defecto `false`). El `PUT` añade `version`: la que tenía el lead cuando se cargó. No se acepta ningún otro campo.

**Respuesta de `GET /weights` y `PUT /weights`:** `version`, los 4 pesos, `createdAt`, `updatedAt`, `creadoPorId` y `modificadoPorId` (ids de agente como texto, `null` en versiones anteriores a la auditoría). Cada cambio de pesos crea una versión nueva; la versión que deja de estar activa queda marcada como modificada por el agente que la sustituye.

### Formato de errores

Todos los errores tienen la misma forma, generada por un único filtro global ([`http-exception.filter.ts`](src/common/http-exception.filter.ts)):

```json
{
  "statusCode": 409,
  "error": "CONFLICT",
  "message": "El lead ya está asignado a un agente",
  "details": [],
  "path": "/leads/5/assign",
  "timestamp": "2026-11-22T13:42:51.160Z"
}
```

En errores de validación, `details` indica cada campo y su motivo: `[{ "campo": "origen", "mensaje": "..." }]`.

| `error` | HTTP | Cuándo |
|---|---|---|
| `VALIDATION` | 400 | Datos inválidos |
| `UNAUTHORIZED` | 401 | Login incorrecto, o falta el token / es inválido / ha caducado |
| `FORBIDDEN` | 403 | Sin permiso (no es admin, desasignar el lead de otro agente, o modificar un lead que no tienes asignado) |
| `NOT_FOUND` | 404 | El recurso o la ruta no existen |
| `CONFLICT` | 409 | Lead ya asignado, o edición sobre datos desactualizados |
| `WEIGHTS_NOT_CONFIGURED` | 503 | No hay una configuración de pesos activa |
| `INTERNAL_ERROR` | 500 | Error inesperado (el detalle solo se escribe en el log del servidor) |

## 9. Arquitectura y modelo de datos

```
src/
  common/     AppError y filtro global de excepciones
  auth/       login con teléfono y contraseña (JWT), guard y hash de contraseñas
  leads/      controller → service → repository; domain, mapper, schemas
  weights/    misma estructura que leads
  database/   schema.prisma, migraciones, seed.sql, PrismaService
test/         pruebas de integración
```

- **Controller:** recibe la petición, valida con Zod y devuelve DTOs.
- **Service:** reglas de negocio. Lanza `AppError`; no conoce HTTP.
- **Domain:** `Lead`, `Weights`, `Score` y las funciones de puntuación, sin dependencias de framework.
- **Repository:** único sitio que habla con la base de datos. Los *mappers* convierten entre dominio y Prisma.

**Modelo de datos**

- `Agente(id, nombre, rol)`
- `Lead(id, nombre, telefono, estado, agente_id?, cliente_nuevo, interes_comercial, origen, antiguedad, version, created_at, updated_at)`. Los 4 indicadores son enteros de 0 a 100 (restricción `CHECK` en la base de datos).
- `Pesos(version, activo, cliente_nuevo, interes_comercial, origen, antiguedad, created_at, updated_at, creado_por_id?, modificado_por_id?)`. Un índice único garantiza que solo hay **una** configuración activa. Las columnas de auditoría guardan cuándo y qué agente creó y modificó cada versión.
- `Puntuacion(lead_id, version, puntuacion)`: la puntuación de cada lead para cada versión de pesos. Su índice `(version, puntuacion DESC, lead_id)` permite ordenar y paginar sin calcular nada en la consulta.

## 10. Sistema de pesos y puntuación

- Cada criterio es una **valoración entera de 0 a 100** guardada en el lead: cliente nuevo, interés comercial, origen y antigüedad.
- **Pesos:** 4 enteros entre 0 y 100 cuya suma debe ser **exactamente 100**. No se admiten negativos, decimales ni campos desconocidos. Los criterios son fijos, por lo que no puede haber duplicados.
- **Fórmula:** `puntuación = Σ (valoración × peso) / 100`, siempre entre 0 y 100. Se calcula con enteros y una sola división, así que el resultado es exacto.
- **Prioridad:** `ALTA` ≥ 75 · `MEDIA` ≥ 40 y < 75 · `BAJA` < 40.
- **Valores ausentes o inválidos:** nunca se asume un valor. Si falta un indicador o está fuera de 0–100, se rechaza con `400`. Si no hay pesos activos, la API responde `503 WEIGHTS_NOT_CONFIGURED`.
- **La puntuación no es manipulable:** el cuerpo de las peticiones rechaza cualquier campo no esperado (incluido `puntuacion`). Solo el servidor la calcula.
- **Empates:** se ordena por puntuación y después por `id` ascendente: el orden es siempre el mismo.

## 11. Concurrencia y consistencia

1. **Dos agentes se asignan el mismo lead a la vez.** La asignación es un único `UPDATE ... WHERE id = ? AND agente_id IS NULL`. PostgreSQL serializa los intentos: uno modifica 1 fila y el resto 0 (→ `409`).
2. **Dos usuarios editan datos desactualizados.** Bloqueo optimista: el `PUT` debe enviar la `version` que leyó, y solo se aplica si sigue coincidiendo (`WHERE id = ? AND version = ?`), incrementándola. Si no → `409` y el cliente debe recargar. Asignar y cambiar de estado son operaciones atómicas sobre campos independientes y no tocan `version`.
3. **El administrador cambia los pesos mientras otros consultan o editan.**
   - El cambio es **una transacción**: desactiva los pesos anteriores, crea los nuevos y recalcula la puntuación de **todos** los leads con un único `INSERT ... SELECT`. O todo o nada.
   - Las lecturas unen siempre `Puntuacion` con los pesos **activos** en una sola consulta: nunca mezclan versiones; ven la configuración antigua o la nueva completa, nunca una intermedia.
   - Crear/editar leads y cambiar pesos se coordinan con un bloqueo de PostgreSQL (`pg_advisory_xact_lock`): las escrituras de leads van en paralelo entre sí, pero esperan si hay un cambio de pesos en curso. Así ningún lead se queda sin puntuación de la versión nueva.
   - El detalle desglosa con los pesos de la versión con la que se calculó la puntuación mostrada, así que el desglose siempre suma lo que se ve. Cada respuesta incluye `pesosVersion`.
4. **Pesos inválidos o sin datos.** La validación rechaza la petición (`400`) sin tocar lo guardado. Si no hay pesos activos: `503` con mensaje claro.

## 12. Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| `Cannot connect to the Docker daemon` / `docker compose` falla | Docker Desktop no está abierto. Ábrelo y espera a que esté en marcha |
| `Can't reach database server at localhost:5432` | La base de datos no está arrancada (`docker compose up -d`) o `DATABASE_URL` no coincide con `POSTGRES_*` |
| `port is already allocated` al hacer `docker compose up` | Ya hay un PostgreSQL usando el puerto 5432. Páralo, o cambia `"5432:5432"` en `docker-compose.yml` por `"5433:5432"` (o define `DB_PORT=5433`) y usa `5433` en `DATABASE_URL` |
| `password authentication failed` | Cambiaste la contraseña en `.env` después de crear el contenedor. Ejecuta `docker compose down -v` y vuelve a empezar (se pierden los datos) |
| `Environment variable not found: DATABASE_URL` | No existe `.env` en `backend-leads-api/`. Cópialo desde `.env.example` |
| `relation "Lead" does not exist` | Faltan las tablas: `npx prisma migrate deploy` |
| La API devuelve `503 WEIGHTS_NOT_CONFIGURED` | No hay pesos activos: ejecuta `npm run seed` |
| `401` en todas las peticiones | Falta `Authorization: Bearer <token>`, el token caducó (8 h) o el agente ya no existe. Vuelve a hacer login (si borraste la base de datos, `npm run seed`) |
| La API no arranca: `Falta JWT_SECRET` | Añade `JWT_SECRET` (mínimo 16 caracteres) a tu `.env`; está en `.env.example` |
| `EADDRINUSE: address already in use :::3000` | Otro programa usa el puerto 3000: ciérralo o cambia `PORT` en `.env` |
| Las pruebas e2e fallan | Docker arrancado + `npm run seed` ejecutado. Para ver el motivo: `npm run test:e2e` |

## 13. Limitaciones conocidas y mejoras

- **Paginación por `OFFSET`:** con millones de leads y páginas muy profundas sería mejor paginación por cursor.
- **Búsqueda con `ILIKE '%texto%'`:** para volúmenes muy grandes convendría un índice `pg_trgm`.
- **Historial de puntuaciones:** se conserva una fila de `Puntuacion` por lead y versión de pesos; habría que purgar versiones antiguas si los pesos cambian a menudo.
- **Recálculo síncrono:** tras cambiar los pesos se recalcula en la misma petición; con muchísimos leads habría que hacerlo en segundo plano.
- **Autenticación sencilla:** login con teléfono y contraseña y un único token JWT de 8 horas. En producción faltarían: límite de intentos de login (por ejemplo `@nestjs/throttler`), *refresh token*, cierre de sesión en el servidor (hoy basta con borrar el token en el cliente) y HTTPS. El frontend debe decidir dónde guarda el token (`localStorage` es cómodo pero expuesto a XSS).
- **Usuarios de demo:** sus contraseñas están publicadas en este README; en un entorno real habría que cambiarlas.
- **Indicadores introducidos a mano:** una mejora sería derivarlos de datos de negocio (por ejemplo, la antigüedad a partir de la fecha de alta).
- **Pruebas e2e:** comparten la base de datos de desarrollo; lo ideal sería una base de datos de pruebas aparte.
- **La API no está en Docker:** solo la base de datos. Containerizar la API sería el siguiente paso para un despliegue.
