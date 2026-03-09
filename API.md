# Pinarkive Backend API – Referencia

**Documento único de referencia del backend** para frontend, api-logger, SDK, otros agentes y clientes. Aquí se concentra toda la documentación relevante: rutas, códigos, cold storage, workers, logs, variables de entorno y migraciones.

Base URL: `https://api.pinarkive.com` (prod) o la configurada en `BASE_URL`.

Prefijo base: **`/api/v3`**. Todas las rutas salvo las marcadas como *Público* requieren **Bearer token** (header `Authorization: Bearer <token>`) o **API Key** (header `X-API-Key`) cuando aplique.

**Idioma de respuestas**: Todos los mensajes de error y textos que devuelve la API (campos `error`, `message` en JSON) están en **inglés**. El frontend, los correos y las notificaciones deben usar el locale del usuario (i18n) para mostrar textos al usuario.

**Versiones deprecadas**: `/api/v1` y `/api/v2` responden **410 Gone** con JSON (`error: api_version_deprecated`, `currentApiBase: /api/v3`). Clientes y librerías deben migrar a `/api/v3`.

---

## Autenticación

- **Login**: `POST /api/v3/auth/login` → devuelve token JWT. Si el usuario no ha verificado el email: **403** `code: email_not_verified`. Si la cuenta está deshabilitada por admin: **403** `code: account_disabled` (contactar soporte). Si deshabilitada por no verificar/inactividad: **403** `canResendVerification: true`.
- **Registro**: `POST /api/v3/auth/signup`. El usuario debe **verificar el email** (enlace 48 h) antes de poder usar la app; se envía correo de verificación en el idioma del usuario (locale).
- **Verificar email**: `POST /api/v3/auth/verify-email` (body: `{ token }`). Valida el token del correo, marca email verificado y envía **correo de bienvenida** (en el idioma del usuario).
- **Reenviar verificación**: `POST /api/v3/auth/resend-verification` (body: `{ email }`). Reenvía el correo de verificación (mismo enlace, 48 h). No requiere auth. Si la cuenta está deshabilitada por admin, responde **403**.
- **Logout**: `POST /api/v3/auth/logout` (token en body o header).
- **Olvidé contraseña**: `POST /api/v3/auth/forgot-password` (body: `{ email }`). Encola email con enlace (válido **1 hora**); idioma según usuario. Respuesta genérica.
- **Restablecer contraseña**: `POST /api/v3/auth/reset-password` (body: `{ token, newPassword }`).
- **2FA (opcional):** Si el usuario tiene 2FA activo, el login devuelve `requires2FA: true` y `temporaryToken`; completar con **POST /api/v3/auth/2fa/verify-login** (body: `{ temporaryToken, code }`). Ver sección **2FA / TOTP**.
- Rutas con `auth(true)` = obligatorio estar autenticado **y** email verificado; `auth(false)` = opcional (si hay token, se usa el usuario).
- Las rutas que aceptan **Bearer o X-API-Key** usan el middleware unificado; los **API tokens** (X-API-Key o Bearer con token almacenado) tienen **scopes** granulares; el JWT de sesión (login web) tiene todos los permisos del usuario.

---

## API Scopes (permisos por token)

Cada API token tiene un conjunto de **scopes**. Al crear un token (`POST /api/v3/tokens/generate`) se puede enviar en el body un array **`scopes`**; si no se envía, se aplica el conjunto mínimo por defecto (`user:read`, `files:read`). En cada endpoint protegido por token se comprueba que el token tenga el scope que autoriza la acción; si no lo tiene, la API responde **403** con `code: missing_scope` y mensaje tipo "Missing scope: \<scope\>".

**Lista oficial de scopes:**

| Scope | Descripción | Ejemplos de endpoints |
|-------|-------------|------------------------|
| `files:read` | Listar uploads del usuario | GET /users/me/uploads, GET /users/me/uploads/dag/:cidDag |
| `files:write` | Subir archivos, pin de CIDs | POST /files/*, POST /files/pin/:cid |
| `files:delete` | Eliminar/despinnar | DELETE /files/remove/:cid, DELETE /users/me/uploads/:cid |
| `files:rename` | Renombrar | PUT /files/rename/:uploadId |
| `user:read` | Ver perfil y datos de usuario | GET /users/me, GET /users/me/preferences |
| `user:write` | Editar perfil, preferencias | PUT /users/me, PUT /users/me/preferences |
| `tokens:read` | Listar tokens del usuario | GET /tokens/list |
| `tokens:write` | Crear/generar tokens | POST /tokens/generate |
| `tokens:delete` | Revocar tokens | DELETE /tokens/revoke/:name |
| `plans:read` | Ver planes, plan actual | GET /users/me/plan, GET /users/me/plans, GET /plans/my-plan, GET /plans/all |
| `plans:write` | Cambiar de plan, flujos de pago | PUT /users/me/plan, PUT /plans/change |
| `referrals:read` | Ver referidos y estadísticas | GET /users/me/referrals |
| `logs:read` | Ver logs del usuario | GET /users/me/logs |
| `cluster:read` | Ver clusters permitidos, status/allocations de CID | GET /users/me/clusters, GET /status/:cid, GET /status/allocations/:cid, GET /allocations/:cid |

Los requests con **JWT de sesión** (login desde la web) tienen todos los permisos; los scopes solo se aplican a los **API tokens** (X-API-Key o Bearer con token de larga duración generado por el usuario).

**Crear token con scopes:** `POST /api/v3/tokens/generate` body: `{ name, label?, expiresInDays?, scopes? }`. Si `scopes` es un array válido de los anteriores, se guarda; si no se envía, se usan los scopes por defecto mínimos.

---

## Rate limiting

La API aplica **rate limiting** global a `/api/v3` y límites más estrictos a los endpoints de autenticación.

- **Global (toda la API):** límite por **minuto** y por **segundo** por IP/usuario/API key. Configurable con `RATE_LIMIT_REQ_PER_MINUTE` (default 100) y `RATE_LIMIT_REQ_PER_SECOND` (default 10).
- **Auth (login, signup, forgot-password, reset-password):** límite más estricto por IP (ventana 15 min, default 10 intentos). Configurable con `AUTH_RATE_WINDOW_MS` y `AUTH_RATE_MAX_REQUESTS`.

Cuando se supera el límite, la API responde **429 Too Many Requests** con cuerpo JSON (`error`, `message`, `retryAfter`, `limit`, `remaining`, `resetTime`) y cabecera **`Retry-After`** (segundos hasta poder reintentar).

---

## 2FA / TOTP (opcional)

La autenticación en dos factores por TOTP (app autenticador) es **opcional**: el usuario puede activarla y desactivarla. Si está activa:

- **Login:** Tras validar email y contraseña, la API devuelve `{ requires2FA: true, temporaryToken }` en lugar del JWT. El cliente debe pedir el código de 6 dígitos y llamar a **POST /api/v3/auth/2fa/verify-login** con `{ temporaryToken, code }` para obtener el token JWT final.
- **Acciones sensibles (tokens):** Generar o revocar un API token requiere enviar en el body **`totpCode`** (o **`twoFactorCode`**) con el código actual. Si falta o es inválido: **400** con `code: 2fa_required` o `code: 2fa_invalid`.

**Endpoints 2FA:**

| Método | Ruta | Auth | Body | Descripción |
|--------|------|------|------|-------------|
| GET    | `/auth/2fa/status` | Sí | — | Devuelve `{ twoFactorEnabled }`. |
| POST   | `/auth/2fa/setup` | Sí | — | Genera secreto TOTP y devuelve `secret`, `qrUrl`, `qrDataUrl`. Llamar después a `/auth/2fa/enable` con el código para activar. |
| POST   | `/auth/2fa/enable` | Sí | `{ code }` | Verifica el código de 6 dígitos y activa 2FA. |
| POST   | `/auth/2fa/disable` | Sí | `{ password, code }` | Desactiva 2FA. Requiere contraseña y código TOTP actual. |
| POST   | `/auth/2fa/verify-login` | No | `{ temporaryToken, code }` | Completa el login tras 2FA; devuelve `{ token }` (JWT). |

Variable de entorno opcional: **`TWO_FACTOR_ISSUER`** (nombre que aparece en la app autenticador; default `Pinarkive`). No es obligatorio tener 2FA para todos los usuarios; si en el futuro se exige 2FA para poder crear/revocar tokens, puede activarse por configuración.

---

## Resumen de rutas por módulo

| Módulo   | Prefijo           | Descripción        |
|----------|-------------------|--------------------|
| Público  | `/api/v3`         | Info API           |
| Auth     | `/api/v3/auth`    | Login, signup, logout |
| Users    | `/api/v3/users`   | Perfil, preferencias, uploads, clusters |
| Files    | `/api/v3/files`   | Upload, pin, remove, directorios |
| Status   | `/api/v3/status`  | Estado/allocations de un CID |
| Allocations | `/api/v3/allocations` | Allocations por CID |
| Plans    | `/api/v3/plans`   | Planes públicos y cambio de plan |
| Tokens   | `/api/v3/tokens`  | API tokens (generar, listar, revocar) |
| Payments | `/api/v3/payments`| CoinGate / MultiSafepay (si habilitados) |
| Health   | `/api/v3/health`  | Health check       |
| Admin    | `/api/v3/admin`   | Usuarios, uploads, logs, stats (admin o superadmin) |
| Superadmin | `/api/v3/superadmin` | Clusters CRUD, migraciones (solo superadmin) |
| Cluster  | `/api/v3/cluster` | Check, health, peers (admin o superadmin) |
| Docs     | `/api/v3/docs`    | Documentación y OpenAPI |
| Locales  | `/api/v3/locales` | Idiomas y países   |
| Peers    | `/api/v3/peers`   | Peers (cluster)    |

---

## Lista de rutas: públicas/usuario vs admin/superadmin

**Rutas públicas o de usuario** (acceso sin auth o con token/API key de cualquier usuario):

- `GET /`, `GET /api/v3` – Info API
- `POST /api/v3/auth/login`, `POST /api/v3/auth/signup`, `POST /api/v3/auth/logout`
- `GET /api/v3/plans/` – Planes públicos
- `GET /api/v3/health`, `GET /api/v3/peers/`
- `GET /api/v3/locales/languages`, `GET /api/v3/locales/countries`
- `GET /api/v3/docs/openapi.yaml`, `openapi.json`, `swagger`, `swagger-v2`, `health`
- Todas las de **Users** (`/api/v3/users/me*`), **Files** (`/api/v3/files/*`), **Status**, **Allocations**, **Plans** (my-plan, change), **Tokens** (generate, list, revoke), **Payments** (create, status, webhooks según config)

**Rutas privadas** (requieren rol; si no, 403):

- **Admin** (o superadmin): `/api/v3/admin/*` (users, uploads, logs, stats, plans, rewards, tokens) y `/api/v3/cluster/*` (check, health, peers). El rol admin no puede acceder a rutas superadmin.
- **Solo superadmin**: `/api/v3/superadmin/*` (clusters CRUD y migraciones). Cualquier otro rol (admin, user) o sin token recibe **403** (o **401** si no hay Authorization). El superadmin puede usar también todas las rutas de admin.

Para tests: ver sección **Códigos de error** más abajo; cada ruta debe devolver el código documentado según el caso.

---

## Rutas detalladas

### Raíz y público

| Método | Ruta        | Auth | Descripción |
|--------|-------------|------|-------------|
| GET    | `/`         | No   | Status API (raíz) |
| GET    | `/api/v3`   | No   | Info API, enlaces a health, plans, docs |

---

### Auth – `/api/v3/auth`

| Método | Ruta    | Auth | Body / Params | Descripción |
|--------|---------|------|----------------|-------------|
| POST   | `/login`  | No | `{ email, password }` | Login; devuelve token JWT. 403 si email no verificado o cuenta deshabilitada. |
| POST   | `/signup` | No | `{ name, email, password, language?, ... }` | Registro; envía correo de verificación (48 h). Opcional **language** (ej. `en`, `es`) en body para idioma del usuario y de los correos. Si no se envía, se usa locale de la URL o default. Los correos incluyen logo en `{FRONTEND_URL}/logo.png`. |
| POST   | `/verify-email` | No | `{ token }` | Valida token del correo, marca verificado y envía correo de bienvenida. |
| POST   | `/resend-verification` | No | `{ email }` | Reenvía correo de verificación (48 h). 403 si cuenta deshabilitada por admin. |
| POST   | `/logout` | Opcional | `{ token }` o header Authorization | Invalida token |
| POST   | `/forgot-password` | No | `{ email }` | Inicia reset: envía email con enlace (válido 1 h), en idioma del usuario. Respuesta genérica si el email no existe. |
| POST   | `/reset-password` | No | `{ token, newPassword }` | Restablece contraseña con el token del email. Misma regla de fortaleza que signup. |
| GET    | `/2fa/status` | Sí | — | Estado 2FA: `{ twoFactorEnabled }`. |
| POST   | `/2fa/setup` | Sí | — | Genera secreto y QR para activar 2FA. Luego llamar a `/2fa/enable` con el código. |
| POST   | `/2fa/enable` | Sí | `{ code }` | Activa 2FA tras verificar código de 6 dígitos. |
| POST   | `/2fa/disable` | Sí | `{ password, code }` | Desactiva 2FA (contraseña + código actual). |
| POST   | `/2fa/verify-login` | No | `{ temporaryToken, code }` | Completa login tras 2FA; devuelve JWT. |

---

### Users – `/api/v3/users`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET    | `/me` | Sí | Perfil del usuario |
| PUT    | `/me` | Sí | Actualizar perfil |
| GET    | `/me/preferences` | Sí | Preferencias |
| PUT    | `/me/preferences` | Sí | Actualizar preferencias |
| GET    | `/me/plans` | Sí | Planes disponibles para el usuario |
| GET    | `/me/uploads` | Sí | Lista de uploads (paginada). Query: `page`, `limit`, `parentCid`, `hasExpiration=true`. Cada ítem incluye `clusterId` (dónde está pinnado), `bk` (0=sin backup, 1=backup SFTP hecho), `expiresAt`. refCount (copy refs) solo en admin. |
| PUT    | `/me/plan` | Sí | Cambiar plan (body: `planId`) |
| GET    | `/me/plan` | Sí | Plan actual |
| DELETE  | `/me/uploads/:cid` | Sí | Eliminar upload por CID |
| GET    | `/me/uploads/dag/:cidDag` | Sí | Detalle de un DAG (archivos internos) |
| GET    | `/me/referrals` | Sí | Referidos del usuario. Respuesta incluye `referredUsers`: array con `name`, `email`, `joinedAt`, `lastActivity`, `mbEarned`, `hasPlan`, `isActive`, etc. |
| GET    | `/me/clusters` | Sí | Clusters permitidos según plan; cada ítem incluye `gateways: [ { publicUrl?, url?, label?, order } ]` solo con **forPublicView** (para "ver fichero"); se usa `publicUrl` si existe, si no `url`. |
| GET    | `/me/logs` | Sí | Logs del usuario (solo los suyos). Query: `page` (default 1), `limit` (default 20, máx. 100), `type` (INFO \| WARNING \| CRITICAL), `action`, `source`. Respuesta: `{ logs, totalPages, total }`; cada ítem: `userId`, `action`, `details`, `ip`, `type`, `source`, `createdAt` (opc. `userEmail`). |

---

### Files – `/api/v3/files`

Todas las rutas de upload/pin aceptan **cluster** por body, query o header `X-Cluster` (`cl`) cuando hay multi-cluster. Requieren auth y, si aplica, API Key.

**Colección de ficheros (uploads):** Cada documento tiene **clusterId** (en qué cluster está pinnado; necesario para borrar con `removeFromCluster`) y **bk** (0 = sin backup, 1 = backup SFTP/remoto hecho). Opcionalmente **expiresAt** (caducidad). La UI debe mostrar `clusterId` para saber dónde está cada archivo; el borrado usa siempre `upload.clusterId` para llamar al cluster correcto. El job `worker:expire` busca uploads con `expiresAt <= now`, los despinna del cluster indicado por `clusterId`, resta usedStorage y los elimina.

**Timelock (solo planes premium):** En **todos** los endpoints de upload y pin se puede enviar **`timelock`** (body o formData). Formato: **ISO 8601 date-time** (ej. `2026-12-31T23:59:59Z`). Es un **instante en el tiempo (UTC)**: cuando el reloj del servidor llega a ese momento, el job de limpieza despinna y borra el registro. Se guarda en el modelo como `expiresAt` (tipo Date en MongoDB, UTC). Recomendado usar sufijo `Z` u offset explícito para evitar ambigüedad. Plan free no puede usar timelock (403). Endpoints con timelock: `POST /`, `POST /directory`, `POST /directory-dag`, `POST /directory-cluster`, `POST /directory-cluster-files`, `POST /directory-files`, `POST /pin/:cid`.

| Método | Ruta | Auth | Body / Tipo | Descripción |
|--------|------|------|-------------|-------------|
| POST   | `/` | Sí | multipart `file` (+ opc. `cl`, `timelock` solo premium) | Subir un archivo (va al cluster) |
| POST   | `/directory` | Sí | `{ dirPath }` (+ opc. `cl`, `timelock` solo premium) | Subir directorio (path en servidor) |
| POST   | `/directory-dag` | Sí | multipart `files[]` (+ opc. `cl`, `timelock` solo premium) | Subir varios archivos como DAG (nodo IPFS + pin cluster) |
| POST   | `/directory-cluster` | Sí | `{ dirPath }` (+ opc. `cl`, `timelock` solo premium) | Subir directorio al cluster (archivo a archivo) |
| POST   | `/directory-cluster-files` | Sí | multipart `file` (+ opc. `cl`, `timelock` solo premium) | Un archivo para flujo directory-cluster |
| POST   | `/directory-files` | Sí | multipart `file` (+ opc. `cl`, `timelock` solo premium) | Un archivo para flujo directory |
| POST   | `/pin/:cid` | Sí | `{ originalName?, customName?, cl?, timelock? }` (timelock solo premium) | Pin de un CID existente (file o DAG) |
| DELETE | `/remove/:cid` | Sí | — | Quitar pin y registro del usuario (backend usa `upload.clusterId`) |
| PUT    | `/rename/:uploadId` | Sí | `{ newName }` | Renombrar (solo en BD) |

---

### Status – `/api/v3/status`

El cluster se selecciona por query **`cl`** (id); si no se envía, se usa el por defecto. Config desde DB (clusters), no desde env.

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET    | `/allocations/:cid` | Sí | Allocations del CID en el cluster (query: `?cl=`) |
| GET    | `/:cid` | Sí | Estado completo del CID (peers, status) |

---

### Allocations – `/api/v3/allocations`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET    | `/:cid` | Sí | Allocations del CID (peer_map, allocations) |

---

### Plans – `/api/v3/plans`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET    | `/` | No | Planes activos y públicos. Cada plan incluye **descriptions** (objeto por idioma: `en`, `es`, `ca`, etc.), `allowedClusterIds`, `timelockAllowed`, `maxFileSizeBytes`, `maxDirectorySizeBytes`. |
| GET    | `/my-plan` | Sí | Plan actual: `currentPlan`, `planDefault`, `planFallback`, `planExpiry`, `isEarlyBird`, `isUserDefault`; cada plan incluye las mismas features |
| GET    | `/all` | Sí | Todos los planes (incl. no públicos si aplica) |
| PUT    | `/change` | Sí | Cambiar plan (body: `{ planId }`). Si se elige el plan free global, se asigna `user.planDefault` si existe, si no el global `isDefault` |

`GET /api/v3/users/me/plans` devuelve planes públicos más los privados relevantes del usuario (planDefault, planFallback, plan actual si es privado), con features por plan. Cada plan tiene **descriptions** (objeto por idioma), no `description`.

---

### Tokens – `/api/v3/tokens`

Los tokens son únicos por **(usuario, name)**. Si se repite el nombre para el mismo usuario, la API devuelve **409**.

| Método | Ruta | Auth | Body | Descripción |
|--------|------|------|------|-------------|
| POST   | `/generate` | Sí | `{ name, label?, expiresInDays?, scopes? }` | Generar API token. `name` obligatorio; `label` opcional (default `cli-access`); `scopes` array opcional (ver sección API Scopes); si no se envía, se aplican scopes mínimos por defecto. Respuesta incluye `scopes`. |
| GET    | `/list` | Sí | — | Listar tokens del usuario (incluye `scopes` por token). Requiere scope `tokens:read`. |
| DELETE | `/revoke/:name` | Sí | — | Revocar token por nombre. Requiere scope `tokens:delete`. |

---

### Payments – `/api/v3/payments`

Disponibles solo si `ENABLE_COINGATE` o `ENABLE_MULTISAFEPAY` están habilitados.

**MultiSafepay**

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST   | `/multisafepay/create` | Sí | Crear orden (body: `planId`) |
| POST   | `/multisafepay/recurring` | Admin | Recurring (body: `userId`, `planId`) |
| GET    | `/multisafepay/status/:orderId` | Sí | Estado de la orden |
| GET    | `/webhooks/multisafepay/payment/success` | No | Redirect éxito |
| POST/GET | `/webhooks/multisafepay/payment/cancel` | No | Cancelación |
| POST/GET | `/webhooks/multisafepay/notification` | No | Webhook notificaciones |

**CoinGate**

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST   | `/coingate/create` | Sí | Crear orden (body: `planId`, opcional `receiveCurrency`) |
| GET    | `/coingate/status/:orderId` | Sí | Estado de la orden |
| POST   | `/webhooks/coingate/notification` | No | Webhook notificaciones |
| GET    | `/webhooks/coingate/payment/cancel` | No | Cancelación |

---

### Health – `/api/v3/health`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET    | `/` | No | Health check (usado por Docker/orquestación) |

---

### Admin – `/api/v3/admin`

Todas las rutas requieren rol **admin** o **superadmin**. El frontend puede usar este prefijo para el panel de administración (usuarios, logs, stats, etc.); las rutas de clusters y migraciones están en **Superadmin**.

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET    | `/users` | admin | Listar usuarios. Si el caller es **admin** solo devuelve usuarios con `role === 'user'`; si es **superadmin** devuelve todos. |
| GET    | `/users/:id` | admin | Usuario por ID. Incluye `name`, `lastname`, `email`, `plan`, **planDefault**, **planFallback** (cada uno con `_id`, `name`, `code`). |
| PUT    | `/users/:id/role` | **solo superadmin** | Cambiar rol (user, admin, superadmin). Si el caller es admin devuelve **403**. |
| PUT    | `/users/:id/status` | admin | Activar/desactivar |
| PUT    | `/users/:id/plan` | admin | Asignar plan |
| PUT    | `/users/:id/plan-defaults` | **solo superadmin** | Actualizar plan por defecto y fallback. Body: `{ planDefaultId?, planFallbackId? }` (null/vacío para quitar). |
| GET    | `/users/:userId/referrals` | admin | Referidos de un usuario |
| GET    | `/users/:id/stats` | admin | Stats de un usuario |
| GET    | `/users/:id/tokens` | admin | Tokens de un usuario |
| DELETE  | `/users/:id/tokens/:tokenId` | admin | Revocar token |
| GET    | `/uploads` | admin | Listar uploads (incluye `clusterId`, `bk`, `type`, `refCount` por ítem; `refCount` solo visible para admin/superadmin) |
| GET    | `/cold-storage/stats` | admin | Estadísticas cold storage: `logicalSize`, `physicalSize`, `deduplicationFactor`, `totalUniqueCids`, `cidsWithBackup`, `jobsPending`, `jobsFailed`, **jobsDone**, **workerEnabled** |
| GET    | `/cold-storage/jobs/pending` | admin | Lista de jobs **pendientes y en ejecución** (query `?limit=100`). `jobs[]`: `id`, `cid`, `type`, `clusterId`, `status`, `attempts`, `nextRunAt`, `createdAt` |
| GET    | `/cold-storage/jobs/failed` | admin | Lista de jobs fallidos ordenada por **createdAt descendente** (query `?limit=100`). `jobs[]`: `id`, `cid`, `type`, `clusterId`, `attempts`, `lastError`, `createdAt`, `updatedAt` |
| DELETE  | `/cold-storage/jobs/failed/:jobId` | **solo superadmin** | Eliminar un job fallido de cold storage |
| DELETE  | `/cold-storage/jobs/failed` | **solo superadmin** | Vaciar todos los jobs fallidos (sin body). Tras borrarlos, usar **POST reconcile** para reencolar uploads con bk=0. |
| POST   | `/cold-storage/reconcile` | **solo superadmin** | Re-escanear uploads con bk=0 y encolar jobs de backup (y deletes si refCount=0, bk=1). Query `?limit=500`. Respuesta: `{ enqueuedBackups, enqueuedDeletes }`. No hace falta reiniciar el backend. |
| GET    | `/cold-storage/objects/:cid` | admin | Detalle por CID: `refCount`, `bk`, `uploadsCount`, `clusters[]` con `status` (`backed_up` \| `pending` \| `error`), `backedUpAt`, `lastError` |
| GET    | `/email-worker/stats` | admin | Estado worker email: `workerEnabled`, `pendingCount`, `failedCount`, **processedCount** (enviados), `failedJobs: [{ id, to, subject, error, createdAt }]` orden desc por fecha (query `?limit=50`) |
| DELETE  | `/email-worker/jobs/failed/:jobId` | **solo superadmin** | Eliminar un job fallido del email worker |
| DELETE  | `/email-worker/jobs/failed` | **solo superadmin** | Vaciar todos los jobs fallidos del email worker (sin body) |
| DELETE  | `/uploads/:cid` | admin | Eliminar upload (admin) |
| GET    | `/logs` | admin | Logs (filtros) |
| GET    | `/user/logs` | admin | Logs del usuario actual |
| POST   | `/logs/prune` | **solo superadmin** | Podar logs. Body opcional: `{ olderThan?: "all" | "1h" | "12h" | "24h" | "7d", userId?, userEmail?, source? }`. Sin body: borra logs de más de 15 días. |
| DELETE  | `/logs/:logId` | **solo superadmin** | Eliminar un log por su `_id` |
| GET    | `/stats` | admin | Estadísticas |
| GET    | `/stats/historical` | admin | Stats históricas |
| GET    | `/tokens` | admin | Todos los tokens (admin) |
| GET    | `/plans` | admin | Listar planes (lectura admin y superadmin). Cada plan incluye **descriptions** (objeto por idioma: `en`, `es`, `ca`, `eu`, `de`, `fr`, `it`, `pt`, `ru`). |
| POST   | `/plans` | **solo superadmin** | Crear plan (403 para admin). Body: `name`, `code`, `storageLimit`, `pricePerMonth`; **descriptions** (objeto por idioma) o **description** (string → se guarda en `descriptions.en`). |
| PUT    | `/plans/:id` | **solo superadmin** | Actualizar plan (403 para admin). Body: igual que POST; **descriptions** (objeto) o **description** (string). |
| GET    | `/rewards` | admin | Recompensas referidos |

---

### Superadmin – `/api/v3/superadmin`

Solo rol **superadmin**. Admin, user o sin token reciben 403 (o 401 sin Authorization). El frontend debe usar este prefijo para clusters y migraciones cuando el usuario sea superadmin.

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/clusters` | Listar todos los clusters. Respuesta: `{ clusters: [...] }` (incluye `fqdn`, `port`, `clusterApiEndpoints`). |
| POST   | `/clusters` | Crear cluster. Body: `{ id?, label, region?, country?, fqdn?, port? }`. Respuesta: `{ cluster }`. |
| POST   | `/clusters/cache-clear` | Vacía la caché de clusters y de clientes HTTP (útil tras cambiar endpoints/protocol en la DB a mano). Respuesta: `{ message }`. |
| PUT    | `/clusters/:id` | Actualizar cluster por id (MongoDB `_id` o string `id`). Body: `{ id?, label?, region?, country?, fqdn?, port?, clusterApiEndpoints?, ipfsGateways? }`. |
| DELETE | `/clusters/:id` | Eliminar cluster por id. Respuesta: 200 + `{ success: true }`. |
| GET    | `/ipfs-nodes` | Listar nodos IPFS (opcional `?clusterId=cl0-global`). Respuesta: `{ ipfsNodes: [ { _id, clusterId, host, port, protocol, order, label, enabled } ] }` ordenados por clusterId y order. |
| GET    | `/ipfs-nodes/:id` | Obtener un nodo por `_id`. |
| POST   | `/ipfs-nodes` | Crear nodo. Body: `{ clusterId, host, port?, order?, label?, protocol?, enabled? }`. |
| PUT    | `/ipfs-nodes/:id` | Actualizar nodo por `_id`. Body: `{ clusterId?, host?, port?, order?, label?, protocol?, enabled? }`. |
| DELETE | `/ipfs-nodes/:id` | Eliminar nodo por `_id`. |
| GET    | `/gateways` | Listar gateways IPFS (opcional `?clusterId=cl0-global`). Respuesta: `{ gateways: [ { _id, clusterId, url, order, label, enabled, publicUrl?, forBackup, forPublicView, createdAt, updatedAt } ] }`. |
| GET    | `/gateways/:id` | Obtener un gateway por `_id`. Respuesta: `{ gateway }` (incluye `publicUrl`, `forBackup`, `forPublicView`). |
| POST   | `/gateways` | Crear gateway. Body: `{ clusterId, url, order?, label?, enabled?, publicUrl?, forBackup?, forPublicView? }`. **forBackup** (default true): cold storage usa esta URL para backup. **forPublicView** (default false): el usuario ve "ver fichero" (usar `publicUrl` o `url`). Respuesta: 201 + `{ gateway }`. |
| PUT    | `/gateways/:id` | Actualizar gateway. Body: `{ clusterId?, url?, order?, label?, enabled?, publicUrl?, forBackup?, forPublicView? }`. |
| DELETE | `/gateways/:id` | Eliminar gateway. Respuesta: 200 + `{ success: true }`. |
| GET    | `/migrations` | Listar migraciones aplicadas. Respuesta: `{ migrations: [ { id, name, appliedAt } ] }`. |

---

### Cluster – `/api/v3/cluster`

El cluster se elige por query **`cl`** (id del cluster); si no se envía, se usa el cluster por defecto.

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET    | `/check` | admin | Comprobar conectividad (query: `?cl=<clusterId>`) |
| GET    | `/health` | admin | Health del cluster |
| GET    | `/peers` | admin | Peers del cluster |
| GET    | `/gateways` | user | Gateways IPFS del cluster (query: `?cl=<clusterId>`). Solo gateways con **forPublicView** (para "ver fichero"). Respuesta: `{ clusterId, gateways: [ { publicUrl?, url?, label?, order } ] }`. |

---

### Docs – `/api/v3/docs`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET    | `/` | Sí | Documentación |
| GET    | `/v2` | Sí | Docs v2 |
| GET    | `/openapi.yaml` | No | OpenAPI YAML |
| GET    | `/openapi.json` | No | OpenAPI JSON |
| GET    | `/openapi-v2.yaml` | No | OpenAPI v2 YAML |
| GET    | `/swagger` | No | UI Swagger |
| GET    | `/swagger-v2` | No | UI Swagger v2 |
| GET    | `/health` | No | Health desde docs |
| GET    | `/endpoints` | Sí | Listado de endpoints |

---

### Locales – `/api/v3/locales`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET    | `/languages` | No | Lista de idiomas |
| GET    | `/countries` | No | Lista de países |

---

### Peers – `/api/v3/peers`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET    | `/` | No | Peers del cluster |

---

## Headers comunes

- **Authorization**: `Bearer <JWT>` para rutas que requieren usuario.
- **X-API-Key**: API key (alternativa o adicional al Bearer en rutas de files).
- **X-Cluster** / **cl** (body o query): ID de cluster en entornos multi-cluster.
- **Content-Type**: `application/json` para JSON; `multipart/form-data` para uploads.

---

## Códigos HTTP (referencia para tests)

Documentación de cuándo el backend devuelve cada código, para implementar tests que lo verifiquen.

| Código | Cuándo se devuelve | Ejemplos |
|--------|--------------------|----------|
| **200** | OK, lectura o actualización correcta | GET /me, GET /me/uploads, PUT /me, DELETE /remove/:cid |
| **201** | Recurso creado | POST /auth/signup, POST /files (upload), POST /pin/:cid, POST /tokens/generate |
| **400** | Bad request: validación, body incorrecto, formato inválido | timelock inválido o pasado, body mal formado, planId inexistente en change |
| **401** | No autenticado: falta token o API key donde es obligatorio; credenciales inválidas | Llamar a /me sin Authorization; token expirado o inválido; login con email/password incorrectos |
| **403** | Prohibido: no tienes permiso para esta acción | Plan free enviando timelock; plan free usando cluster no permitido (cl); cuenta desactivada (login, cualquier ruta); usuario sin rol admin en /admin/*; usuario sin rol superadmin en /superadmin/*; plan no disponible en change; cuota de almacenamiento superada (upload/pin); user-agent bloqueado por validación |
| **404** | Recurso no encontrado | GET /me/uploads/:cid cuando el CID no es del usuario; usuario/plan/cid inexistente |
| **413** | Payload demasiado grande | Archivo o directorio que supera MAX_FILE_SIZE / cuota del plan |
| **409** | Conflicto | Recurso que ya existe: email ya registrado (signup), nombre de token duplicado, cluster con ese id ya existe |
| **429** | Too many requests | Rate limit superado |
| **500** | Error interno del servidor | Excepción no controlada, fallo de BD o de IPFS/cluster |
| **503** | Servicio no disponible | Gateway de pago deshabilitado; cluster no alcanzable (ECONNREFUSED/ETIMEDOUT en status, allocations, cluster/check, cluster/health, cluster/peers) |

En los tests, comprobar que cada situación produce el código indicado (p. ej. free + timelock → 403, token inválido → 401).

---

## Migraciones (DB)

- **Colección**: `migrations` (id, name, appliedAt). La primera migración (`00000_init_migrations_collection.js`) crea la colección si no existe.
- **Ejecución (recomendada en producción)**: Dentro del contenedor del backend: `docker compose exec backend node src/migrations/run-migrations.js`. Requiere `MONGO_URI` (o `MONGO_PROD_URI`). Las migraciones en `src/migrations/*.js` (excl. `run-migrations.js`) se ejecutan en orden alfabético por nombre de fichero. Alternativamente, fuera del contenedor, se puede usar `pnpm run migrate` apuntando al mismo `MONGO_URI`.
- **Arranque**: Al iniciar el backend **no** se ejecutan migraciones; sí se comprueba si hay pendientes y se escribe un aviso en consola (visible en `docker compose logs`) para ejecutarlas manualmente si procede. El mensaje tiene este formato: `[migrations] ⚠️  Pending migrations: 00000_init_migrations_collection.js, 001_backfill_upload_cluster_id.js — Run inside backend container: node src/migrations/run-migrations.js`.
- **Superadmin**: `GET /api/v3/superadmin/migrations` devuelve `{ migrations: [ { id, name, appliedAt } ] }`. Clusters CRUD en `GET|POST|PUT|DELETE /api/v3/superadmin/clusters`.

---

## Cold storage (MinIO/S3)

Backups en cold storage con deduplicación por CID. La API encola jobs; un worker los procesa.

**Variables de entorno (resumen):**

- `ENABLE_COLD_STORAGE=true` (o `ENABLE_BACKUP=true`): **obligatorio** para que al subir o pinnar un fichero se encole un job de backup. Si está en `false` o no definido, no se crea ninguna tarea al subir; en ese caso hay que usar **POST /admin/cold-storage/reconcile** (superadmin) para re-escanear uploads con bk=0 y encolarlos.
- `ENABLE_COLD_STORAGE_WORKER=true`: arranca el worker dentro del proceso del backend. Si es `false`, los jobs quedan en pending hasta que el worker esté activo. Al arrancar debe verse en log: `[worker-cold-storage] Started (using existing MongoDB connection), interval N ms`.
- `COLD_STORAGE_INTERVAL_MS=60000` (60 s = 1 min; 3600000 = 1 h), `COLD_STORAGE_BATCH_SIZE=20`, `COLD_STORAGE_RECONCILE_ON_START=true`, `COLD_STORAGE_RECONCILE_UPLOADS_LIMIT=500`.
- **Descarga desde gateway:** `COLD_STORAGE_DOWNLOAD_TIMEOUT_MS=120000` (2 min por defecto; para ficheros muy grandes subir, p. ej. 600000 = 10 min). `COLD_STORAGE_HEAD_CHECK=true` (por defecto): hace HEAD a la URL antes del GET para comprobar si el gateway responde; si no responde en `COLD_STORAGE_HEAD_CHECK_TIMEOUT_MS=15000` (15 s) se prueba el siguiente gateway. Así se distingue "gateway no responde" (timeout HEAD) de "timeout durante la descarga" (el GET superó DOWNLOAD_TIMEOUT_MS). Los errores en logs/job incluyen "Gateway timeout (no response within Xms)" o "Gateway connection refused" según el caso.
- MinIO/S3: `MINIO_ENDPOINT`, `MINIO_BUCKET`, `MINIO_USE_SSL`, `MINIO_REGION`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `S3_FORCE_PATH_STYLE=true` (recomendado para MinIO).
- Gateways IPFS: solo en DB (colección `gateways`, CRUD en Superadmin → Gateways). **forBackup** (default true): cold storage usa solo estos para descargar y hacer backup. **forPublicView** (default false): solo estos se devuelven al usuario para "ver fichero" (con `publicUrl` o `url`). Sin fallback a .env.

**Modelos:** `coldobjects` (por CID: refCount, bk, clusters.{clusterId}.status/backedUpAt/lastError), `coldstoragejobs` (cola: type backup|delete, status pending|running|done|failed, attempts, lastError).

**Flujo del backup:** El job tiene `clusterId` (dónde está pinnado el fichero). El worker obtiene la lista de gateways con **forBackup** para ese cluster, descarga el CID desde `url + CID` (p. ej. `http://nodo:9094/ipfs/Qm...`) y sube el contenido a MinIO/S3. Si un gateway falla (403, timeout), prueba el siguiente. La lista de clusters/gateways viene solo de la colección `gateways` en DB (por `clusterId`).

**Formato de URLs en gateways:** Tanto `url` (backup) como `publicUrl` (ver fichero) deben ser la **base** terminada en **`/ipfs/`**. El backend y el frontend añaden el CID: `base + CID` → p. ej. `http://ip_o_fqdn:9094/ipfs/Qm...` o `https://gateway.pinarkive.com/ipfs/Qm...`. Ejemplos válidos: `http://host:9094/ipfs/` (host = IP o FQDN del nodo), `https://gateway.pinarkive.com/ipfs/` (con o sin barra final; el código normaliza).

**Flujo:** En upload/pin se incrementa refCount y se encola job backup. En delete se decrementa refCount; si llega a 0 se encola job delete. El worker procesa backup (sube data+metadata a S3 o marca ya existente) o delete (borra en S3 si refCount sigue en 0).

**Admin endpoints:** Ver tabla Admin más arriba: `GET /admin/cold-storage/stats`, `GET /admin/cold-storage/jobs/pending`, `GET /admin/cold-storage/jobs/failed`, `POST /admin/cold-storage/reconcile` (superadmin), `DELETE /admin/cold-storage/jobs/failed`, `GET /admin/cold-storage/objects/:cid`.

**Flujo de tareas:** Al subir o pinnar un fichero (con `ENABLE_COLD_STORAGE=true`) se crea una tarea de backup (pending). Si falla 10 veces pasa a **failed** y deja de reintentarse; sigue apareciendo en la lista de fallidos y en logs. Para "reintentar": (1) **Borrar** los jobs fallidos (`DELETE /admin/cold-storage/jobs/failed` o por id). (2) **Re-escanear** con `POST /admin/cold-storage/reconcile` (superadmin): busca uploads con bk=0 que no tengan ya un job pending/running y crea nuevas tareas. No hace falta reiniciar el backend. Las nuevas tareas salen en **GET /admin/cold-storage/jobs/pending**.

**Borrar jobs fallidos sin UI (superadmin):** Listar: `GET /api/v3/admin/cold-storage/jobs/failed?limit=100`. Borrar uno: `DELETE .../cold-storage/jobs/failed/:jobId`. Borrar todos: `DELETE .../cold-storage/jobs/failed`. Luego llamar **POST .../cold-storage/reconcile** para reencolar.

**Logs (colección `logs`, source `COLD_STORAGE`):** `cold_storage_backup` (copy uploaded / already exists), `cold_storage_deleted`, `cold_storage_delete_skipped`, `cold_storage_job_failed` (details: CID, type, cluster, attempt N/M y mensaje de error; type WARNING o CRITICAL). Filtrar por `source: 'COLD_STORAGE'` o `action` para el panel.

**Worker en solitario:** `pnpm run worker:cold-storage` (requiere `MONGO_URI`).

---

## Email worker

Cola de correos: la API encola jobs (`EmailJob`); el worker los envía por SMTP.

**Variables de entorno:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`. `ENABLE_EMAIL_WORKER=true` arranca el worker dentro del backend. `EMAIL_WORKER_INTERVAL_MS=60000` (intervalo entre pasadas).

**Admin endpoint:** `GET /api/v3/admin/email-worker/stats` → `workerEnabled` (si el worker está activo en este proceso), `pendingCount`, `failedCount`, `failedJobs: [{ to, subject, error, createdAt }]` (query `?limit=50`, máx 200). Sirve para el panel: ver si el worker está habilitado, cuántos hay en cola y fallidos con el motivo (`error`).

**Logs (colección `logs`, source `EMAIL_WORKER`):** `email_job_failed` — details: "To: ..., subject: ... – \<mensaje de error\>". Filtrar por `source: 'EMAIL_WORKER'` o `action: 'email_job_failed'`.

**Worker en solitario:** `pnpm run worker:email` (requiere `MONGO_URI`).

---

## Workers (resumen)

El backend puede arrancar workers internos en el mismo proceso; se activan con variables de entorno y su estado se expone para el panel:

- **Email:** `ENABLE_EMAIL_WORKER=true`. Estado: `GET /admin/email-worker/stats` (workerEnabled, pendingCount, failedCount, failedJobs).
- **Expire (timelock):** `ENABLE_EXPIRE_WORKER=true`. No hay endpoint de estado en admin.
- **Cold storage:** `ENABLE_COLD_STORAGE_WORKER=true`. Estado: `GET /admin/cold-storage/stats` (jobsPending, jobsFailed) y `GET /admin/cold-storage/jobs/failed` para el detalle de fallos con `lastError`.

En arranque se guarda en `app.locals.workers` si cada worker está habilitado (`email`, `expire`, `coldStorage`); el endpoint de email-worker/stats usa `workers.email` para `workerEnabled`.

---

## Colección Logs (panel / api-logger)

Todos los eventos que el backend escribe en la colección `logs` usan campos: `userId`, `action`, `details`, `ip`, `type` (INFO, WARNING, CRITICAL), `source`, `createdAt`. El panel puede filtrar por `source` o `action`.

**Sources habituales:** `WEB`, `API`, `COLD_STORAGE`, `EMAIL_WORKER`. **Acciones de cold storage:** `cold_storage_backup`, `cold_storage_deleted`, `cold_storage_delete_skipped`, `cold_storage_job_failed`. **Acciones de email worker:** `email_job_failed`.

Admin: `GET /api/v3/admin/logs` con filtros para listar y mostrar en el panel.

---

## Variables de entorno (referencia)

Resumen de las que afectan al comportamiento de la API y workers (detalle en `.env.example`):

- **Servidor:** `PORT`, `NODE_ENV`, `TRUST_PROXY`, `BASE_URL`, `FRONTEND_URL`, `CORS_ORIGINS`.
- **Base de datos:** `MONGO_URI` (o `MONGO_PROD_URI` para scripts/workers).
- **Auth:** `JWT_SECRET`, `JWT_EXPIRES_IN`.
- **IPFS/Cluster:** `IPFS_API_HOST`, `IPFS_API_PORT`, `IPFS_API_PROTOCOL`, `IPFS_API_PATH`; cluster por DB (clusters), no por env para producción.
- **Límites:** `DEFAULT_STORAGE_LIMIT_MB`, `MAX_FILE_SIZE_BYTES`, `MAX_DIR_SIZE_BYTES`, `METADATA_OVERHEAD_BYTES`, `PREMIUM_MAX_*`.
- **Pagos:** `ENABLE_COINGATE`, `ENABLE_MULTISAFEPAY` y variables específicas de cada gateway.
- **Cold storage:** véase sección Cold storage más arriba.
- **Email:** `SMTP_*`, `MAIL_FROM`, `ENABLE_EMAIL_WORKER`, `EMAIL_WORKER_INTERVAL_MS`.
- **Expire:** `ENABLE_EXPIRE_WORKER`, `EXPIRE_UPLOADS_INTERVAL_MS`, etc.

---

## Cambios recientes (referencia para integradores)

- **API Scopes:** Los API tokens (X-API-Key o Bearer con token almacenado) tienen scopes granulares. Al crear un token (`POST /tokens/generate`) se puede enviar `scopes` (array); si no se envía, se aplican `user:read` y `files:read`. Cada endpoint protegido comprueba el scope; sin el scope adecuado → 403 `missing_scope`. Las rutas de files, users, tokens, plans, status y allocations aceptan **Bearer o X-API-Key** mediante el middleware unificado y aplican requireScope. Ver sección **API Scopes**.
- **Rate limiting:** Límite global por minuto y por segundo en `/api/v3` (env `RATE_LIMIT_REQ_PER_MINUTE`, `RATE_LIMIT_REQ_PER_SECOND`). Límite estricto en login, signup, forgot-password, reset-password (env `AUTH_RATE_WINDOW_MS`, `AUTH_RATE_MAX_REQUESTS`). Respuesta 429 con cabecera `Retry-After`. Ver sección **Rate limiting**.
- **2FA TOTP:** Opcional. Endpoints `/auth/2fa/status`, `/auth/2fa/setup`, `/auth/2fa/enable`, `/auth/2fa/disable`, `/auth/2fa/verify-login`. Si el usuario tiene 2FA activo, el login devuelve `requires2FA` y `temporaryToken`; generar y revocar tokens requiere `totpCode` en el body. Ver sección **2FA / TOTP**.
- **Timelock**: En upload (multipart) y en pin (body) se puede enviar `timelock` (fecha ISO 8601). Solo **planes premium** (storageLimit > 100MB). Plan free recibe 403 si envía timelock. El backend elimina el contenido a esa fecha (job de limpieza).
- **Tokens**: `POST /tokens/generate` requiere `name`; opcional `label` (default `cli-access`) y `expiresInDays`. Unicidad por (usuario, name); nombre duplicado → 409.
- **Referrals**: `GET /users/me/referrals` devuelve `referredUsers` con `name`, `email`, `joinedAt`, `lastActivity`, `mbEarned`, `hasPlan`, `isActive`, etc.
- **Clusters**: Modelo con `fqdn` y `port` opcionales; CRUD admin acepta y devuelve `fqdn` y `port`. Rutas `/cluster/*` y `/status/*` usan cluster por query `?cl=` y configuración en DB (sin fallback a localhost/env).
- **Admin vs Superadmin**: `/api/v3/admin/*` (users, logs, stats, plans, etc.) requiere **admin** o **superadmin**. `/api/v3/superadmin/*` (clusters, migrations) requiere **solo superadmin**; admin no puede acceder.
- **Workers**: Email, expire (timelock) y cold storage en el mismo proceso; se activan con `ENABLE_EMAIL_WORKER=true`, `ENABLE_EXPIRE_WORKER=true`, `ENABLE_COLD_STORAGE_WORKER=true`. Estado email: `GET /admin/email-worker/stats`; jobs fallidos cold storage: `GET /admin/cold-storage/jobs/failed`. Los fallos se registran en `logs` (cold_storage_job_failed, email_job_failed).
- **Migraciones**: Colección `migrations`; ejecución recomendada dentro del contenedor con `docker compose exec backend node src/migrations/run-migrations.js`; al arrancar se avisa por consola si hay migraciones pendientes (sin ejecutarlas). Listado aplicadas: `GET /api/v3/superadmin/migrations` (solo superadmin). Incluyen: `002_init_cold_objects_refcount.js` (coldobjects desde uploads.bk), `003_backfill_plan_default.js` (planDefault en usuarios).
- **CI**: El workflow de GitHub Actions solo corre en **push de tags** (no en push a main); una sola construcción por tag. Imágenes en Harbor.
- **Solo entorno prod** en `.env` / `envs/env.prod`; dev futuro será otro despliegue (ej. api.dev.pinarkive.com).
- **CoinGate y MultiSafepay** deshabilitados por defecto; habilitar con variables de entorno.
- **Volúmenes** en host: `/data/pinarkive-prod/config`, `/data/pinarkive-prod/uploads`, `/data/pinarkive-prod/logs`.
- **Un solo `docker-compose.yml`** para el backend; build/push vía **GitHub Actions** (Harbor).
- **Rutas de files**: DAG se sube al nodo IPFS y luego se hace pin al cluster; pin por CID solo hace pin en cluster.
- Documentación OpenAPI/Swagger disponible en `/api/v3/docs/*`.

Para más detalle por endpoint (parámetros, ejemplos), usar `/api/v3/docs` o los ficheros OpenAPI en `/api/v3/docs/openapi*.yaml` y `/api/v3/docs/openapi.json`.
