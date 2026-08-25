# Despliegue a Cloudflare

Runbook para publicar (o repetir el despliegue de) `bingo-control` como Worker de Cloudflare con
assets estaticos y base D1 persistente. El Worker y el frontend ya estan implementados — esto no
cambia la interfaz ni los endpoints, solo los pone en produccion.

## Archivos relevantes

- `wrangler.jsonc`: configuracion del Worker y binding D1.
- `worker/index.ts`: Worker y API.
- `worker/schema.sql`: esquema D1.
- `public/tickets.json`: cartones historicos, solo se usan para el seed inicial (local o de
  produccion la primera vez).

El binding `ASSETS` (`wrangler.jsonc`, `env.ASSETS` en `worker/index.ts`) es lo que permite al Worker
delegar a `dist/index.html` cualquier ruta que no empiece con `/api/` — asi el `not_found_handling:
"single-page-application"` declarado en `wrangler.jsonc` se cumple de verdad. El frontend hoy no usa
routing por URL (los tabs se manejan por JS/CSS, la URL siempre es `/`), pero el binding evita que una
ruta no reconocida devuelva un 404 JSON en vez de la app.

## API implementada

- `GET /api/auth/session`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/tickets`
- `POST /api/tickets`
- `PUT /api/tickets/:id`
- `DELETE /api/tickets/:id`
- `DELETE /api/tickets` con `{ "confirm": "BORRAR TODO" }`
- `POST /api/tickets/import` (suma cartones nuevos a los existentes, rechaza con `409` si algun ID
  ya esta cargado — ver `docs/03-abm-seguridad.md`)

El login usa cookies `HttpOnly`, `Secure` y `SameSite=Strict`. Una credencial invalida responde
`401`; un `404` indica que el Worker/API no esta atendiendo la ruta.

## Pasos

1. Crear la base D1 de produccion:

   ```bash
   npx wrangler d1 create bingo_control_db
   ```

2. Copiar el ID devuelto en `wrangler.jsonc`, reemplazando:

   ```json
   "database_id": "REEMPLAZAR_CON_DATABASE_ID"
   ```

3. Aplicar el esquema de produccion:

   ```bash
   npx wrangler d1 execute bingo_control_db --remote --file=./worker/schema.sql
   ```

4. Configurar secretos (no incluir sus valores en archivos, commits ni logs):

   ```bash
   npx wrangler secret put SESSION_SECRET
   npx wrangler secret put ADMIN_PASSWORD
   ```

   `SESSION_SECRET` debe ser un valor aleatorio, largo y unico. `ADMIN_PASSWORD` debe ser una clave
   robusta.

5. Confirmar o ajustar variables no secretas en `wrangler.jsonc`:

   - `ADMIN_USERNAME` (por defecto `admin`)
   - `SESSION_TTL_MINUTES` (por defecto `30`)

6. Compilar y desplegar:

   ```bash
   npm run build
   npx wrangler deploy
   ```

## Migracion inicial de cartones

La base D1 nueva inicia vacia. Migrar los datos de `public/tickets.json` recien despues de aplicar
el esquema, y antes de habilitar el uso operativo (o en cualquier momento despues, ya que
`POST /api/tickets/import` suma en vez de reemplazar — no hace falta que la tabla este vacia).

Usar el endpoint protegido `POST /api/tickets/import`, enviando el contenido de
`public/tickets.json` autenticado como administrador:

```json
{ "tickets": [] }
```

Antes de ejecutar la importacion, confirmar:

- que se esta apuntando a la base D1 de produccion correcta;
- que el usuario administrador puede iniciar sesion;
- la cantidad esperada de cartones y sus IDs (si alguno ya existe en produccion, el import entero
  se rechaza con `409` — revisar el mensaje de error para saber cual).

Despues de importar, verificar desde la aplicacion que los cartones se listan y que se puede crear,
editar y borrar uno de prueba.

## Verificacion posterior al despliegue

1. Abrir la URL publicada por Cloudflare.
2. Confirmar que `GET /api/auth/session` responde JSON y no una pagina HTML.
3. Probar una credencial incorrecta: debe mostrar rechazo, no `404`.
4. Probar login correcto, listado de cartones y logout.
5. Probar alta, edicion, borrado e importacion con datos de prueba.
6. Probar en un viewport angosto (375-412px) que la tabla de Gestion se vea sin scroll horizontal.

## Restricciones

- No exponer secretos ni agregarlos a `wrangler.jsonc`.
- No desplegar con el `database_id` de marcador.
- No borrar cartones de produccion sin confirmar el origen, destino y cantidad de registros (el
  import ya no borra por si solo, pero "Borrar todos" en Gestion si lo hace).
- Informar los comandos con impacto remoto antes de ejecutarlos.
