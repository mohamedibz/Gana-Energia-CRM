# Gana-Energia-CRM

Gestión de leads comerciales con asignación a agentes y puntuación ponderada configurable.

| Proyecto | Descripción |
|---|---|
| [backend-leads-api](backend-leads-api/README.md) | API REST (NestJS + PostgreSQL + Prisma). Instalación, Docker, datos de ejemplo, endpoints, reglas de pesos y concurrencia |
| [frontend-leads-app](frontend-leads-app/README.md) | Aplicación web (React + TypeScript + Vite) |

## Inicio rápido

### Con Docker (todo orquestado)

Requisito: Docker Desktop.

```bash
docker compose up -d --build
```

Levanta PostgreSQL, aplica las migraciones, carga los datos de ejemplo si la base está vacía y arranca la API (<http://localhost:3000>) y la interfaz (<http://localhost:5173>). Los valores por defecto sirven para desarrollo; para cambiarlos copia `.env.example` a `.env` (contraseñas, `JWT_SECRET`, URLs, límite de paginación `PAGINATION_MAX_LIMIT` / `PAGINATION_DEFAULT_LIMIT`). Si cambias `VITE_API_URL`, reconstruye con `--build`. Para parar: `docker compose down` (añade `-v` para borrar también los datos).

### Sin Docker para la API y el frontend

Requisitos: Node.js 24 o superior y Docker Desktop (para la base de datos).

```bash
# Terminal 1: base de datos (desde la raíz) y API
docker compose up -d db
cd backend-leads-api
npm install
cp .env.example .env              # y ajusta las contraseñas
npx prisma generate
npx prisma migrate deploy
npm run seed                      # 500 leads, 3 agentes y pesos iniciales
npm run start:dev                 # http://localhost:3000

# Terminal 2: interfaz
cd frontend-leads-app
npm install
npm run dev                       # http://localhost:5173
```

Abre <http://localhost:5173> y entra con un usuario de demo:

| Teléfono | Contraseña | Rol |
|---|---|---|
| `600000001` | `Admin-2026` | Administrador (puede cambiar los pesos) |
| `600000002` | `Agente2-2026` | Agente |
| `600000003` | `Agente3-2026` | Agente |

## Pruebas

```bash
cd backend-leads-api  && npm test && npm run test:e2e && npm run test:postman   # (los dos últimos necesitan la API y el seed)
cd frontend-leads-app && npm test
```
