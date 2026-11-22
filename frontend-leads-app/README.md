# Frontend de Leads (React + TypeScript)

Aplicación web ligera para gestionar leads comerciales: listado con filtros, detalle con la puntuación explicada, asignación a agentes y administración de pesos. Consume la API de [`backend-leads-api`](../backend-leads-api/README.md).

**Stack:** React 19 · TypeScript (estricto) · Vite · React Router · Vitest + Testing Library. Sin librerías de UI ni de estado: solo React y CSS.

## Puesta en marcha

Necesitas Node.js 24 o superior y la API del backend en marcha (con sus datos de ejemplo).

```bash
# 1. Backend (en otra terminal): ver su README. Base de datos desde la raíz del repo:
docker compose up -d db
# y desde backend-leads-api:
npx prisma migrate deploy && npm run seed
npm run start:dev                 # http://localhost:3000

# 2. Frontend (desde frontend-leads-app)
npm install
npm run dev                       # http://localhost:5173
```

Abre <http://localhost:5173> e inicia sesión con un usuario de demo (la pantalla de login tiene un botón **Usar** para rellenarlo):

| Agente | Teléfono | Contraseña | Rol |
|---|---|---|---|
| Agente 01 | `600000001` | `Admin-2026` | Administrador |
| Agente 02 | `600000002` | `Agente2-2026` | Agente |
| Agente 03 | `600000003` | `Agente3-2026` | Agente |

### Configuración

| Variable | Por defecto | Uso |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` | Dirección de la API. Copia `.env.example` a `.env` para cambiarla |

El frontend arranca siempre en el puerto **5173** (`strictPort`): es el único origen que el backend permite por defecto (`CORS_ORIGIN`). Si cambias el puerto, cambia también esa variable en el backend.

### Comandos

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga automática |
| `npm run build` | Comprueba los tipos y genera la versión de producción en `dist/` |
| `npm run preview` | Sirve la versión compilada |
| `npm run typecheck` | Solo comprueba los tipos |
| `npm test` | Pruebas automatizadas (no necesitan backend) |

## Qué permite hacer

- **Iniciar y cerrar sesión** con teléfono y contraseña. La sesión se conserva al recargar y se cierra sola si el token caduca.
- **Listado** (`/leads`): búsqueda por nombre o teléfono, filtro por estado y por agente, ordenación por puntuación (clic en la cabecera) y paginación de 20 en 20. Los filtros viven en la URL: se pueden compartir y se conservan al volver desde un detalle.
- **Detalle** (`/leads/:id`): datos, puntuación, prioridad y **desglose por criterio** (valoración × peso = aporte) con la versión de pesos usada. Desde aquí se cambia el estado, se asigna o desasigna, y se edita. **Solo el agente asignado puede editar el lead o cambiar su estado**: si está libre, el botón *Asignarme y editar* se lo asigna y abre el formulario. El formulario de edición muestra las **ponderaciones vigentes** y quién y cuándo las creó y modificó.
- **Nuevo lead** (`/leads/new`): formulario con los datos y las 4 valoraciones (0–100), las ponderaciones vigentes y la opción de **asignármelo o dejarlo libre**.
- **Pesos** (`/weights`, solo administrador): edición de los 4 pesos con el total en vivo (sin columna de valoración); no deja guardar si no suman exactamente 100 ni si hay valores negativos o decimales. Muestra la versión vigente con su fecha y el agente que la creó/modificó. Al guardar, las puntuaciones se recalculan en el servidor.
- **Validación en React, no nativa:** los formularios llevan `noValidate` y la app muestra un mensaje bajo cada campo inválido (tras intentar enviar y actualizándose al corregir), con el foco en el primer error. Las reglas están en `src/validation.ts` y coinciden con las del backend.
- **Tooltips** (`?` junto a etiquetas y al pasar el ratón / enfocar botones) que explican criterios, pesos, puntuación, versión y por qué una acción está deshabilitada.
- **Avisos (toasts) con SweetAlert2** al iniciar/cerrar sesión, crear o editar leads, cambiar estado, asignar/desasignar, guardar pesos y cuando caduca la sesión.
- **Estados de carga y errores:** indicador de carga, datos anteriores visibles mientras llegan los nuevos, mensajes de error del servidor con el detalle por campo y botón de reintento.
- **Responsive:** en pantallas pequeñas se ocultan columnas secundarias y la tabla se desplaza horizontalmente.

## Estructura

```
src/
  api/          cliente HTTP (fetch), tipos de la API y manejo de errores
  auth/         contexto de sesión (login, logout, agente actual)
  hooks/        useApi: carga de datos con estados loading/error
  components/   Layout, formulario de lead, campos validados, tooltips, desglose, paginación, avisos, insignias
  pages/        Login, Leads, LeadDetail, NewLead, Weights
  constants.ts  estados, criterios y etiquetas
  validation.ts reglas de validación de formularios (React)
  toast.ts      avisos (toasts) con SweetAlert2
  styles.css    estilos
```

## Decisiones de diseño

- **La puntuación nunca se envía desde el navegador.** El formulario solo manda los datos del lead; la calcula el servidor. La UI únicamente la muestra.
- **Sesión con token.** El login devuelve un token que se guarda en `localStorage` y se envía en cada petición (`Authorization: Bearer`). Si cualquier petición recibe un `401`, el cliente cierra la sesión y vuelve al login. El rol (`ADMIN`/`AGENTE`) decide qué se muestra, pero **la seguridad real está en el backend**: ocultar el menú de pesos es solo comodidad.
- **Conflictos de edición (409).** Al abrir un lead se guarda su `version`, y se envía al modificarlo. Si otra persona lo cambió mientras tanto, el servidor responde `409`: se avisa, se ofrece **Recargar datos del lead** y no se pisa el trabajo ajeno.
- **Asignaciones simultáneas.** Si otro agente se queda el lead antes que tú, el servidor devuelve `409`; la pantalla muestra el aviso y **recarga siempre** para enseñar quién lo tiene realmente.
- **Coherencia al cambiar pesos.** Listado y detalle se piden al servidor cada vez; nunca se recalcula nada en el navegador. El detalle muestra el desglose con la versión de pesos con la que se calculó la puntuación.
- **Pocas piezas.** Un hook de datos (`useApi`), un contexto de sesión y un cliente HTTP de ~100 líneas. Sin Redux ni librería de peticiones; la única dependencia de interfaz es SweetAlert2 para los toasts.

## Pruebas

```bash
npm test
```

52 pruebas con Vitest y Testing Library, sin necesidad del backend (la API se simula):

| Fichero | Qué cubre |
|---|---|
| `api/index.test.ts` | Cabecera `Authorization`, conversión de errores del servidor, fallo de red, sesión caducada (401) frente a login fallido, construcción de la consulta del listado, envío de `version` sin `puntuacion` |
| `validation.test.ts` | Reglas de validación (porcentajes, teléfono, login, suma de pesos) |
| `pages/LoginPage.test.tsx` | Login correcto, validación en React, error de credenciales, usuarios de demo |
| `pages/LeadsPage.test.tsx` | Listado con estado/agente/puntuación, orden y su inversión, filtros leídos de la URL, error con reintento, paginación |
| `pages/WeightsPage.test.tsx` | Total en vivo, sin columna de valoración, auditoría de la versión, bloqueo si no suma 100 / negativos / decimales, guardado como enteros con toast |
| `components/LeadForm.test.tsx` | Tipos de los datos enviados, sin campo de puntuación, validación por campo sin validación nativa, asignarme/libre al crear, ponderaciones y auditoría, conflicto de versión con recarga, campos rechazados por el servidor |

Además se probó a mano contra la API real: login, listado, detalle, asignación con carrera entre dos agentes, edición con conflicto, cambio de pesos y recálculo, permisos del agente no administrador y token caducado.

## Limitaciones conocidas y mejoras

- **Token en `localStorage`:** es cómodo pero accesible por scripts (riesgo XSS). Una alternativa más segura sería una cookie `HttpOnly` emitida por el backend.
- **Sin refresco automático de datos:** el listado no se actualiza solo si otro usuario cambia algo; se actualiza al navegar, filtrar o reintentar. Se podría añadir sondeo o WebSockets.
- **Sin caché de peticiones** (por ejemplo, TanStack Query): cada visita vuelve a pedir los datos. Es deliberado para mantenerlo simple.
- **Accesibilidad básica:** etiquetas, `aria-live` en errores y foco visible, pero sin una auditoría completa.
- **Tabla en móvil:** se desplaza horizontalmente; un diseño de tarjetas sería más cómodo.
- **Los textos están en español** y escritos directamente en los componentes (sin sistema de traducciones).
