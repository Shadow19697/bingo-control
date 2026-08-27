# ABM de cartones, seguridad y convenciones de Gestion

Referencia del estado actual: como funciona el acceso, el ABM de cartones y la interfaz de la
pestaña Gestion, y que reglas hay que mantener si se toca este codigo.

## Autenticacion y sesion

- Un unico usuario administrador (`ADMIN_USERNAME`, por defecto `admin`) con clave en
  `ADMIN_PASSWORD`. Multiusuario no esta implementado.
- El login (`POST /api/auth/login`) entrega una cookie de sesion firmada
  (`HttpOnly`, `Secure`, `SameSite=Strict`).
- La sesion caduca por **inactividad**, no en un plazo fijo desde el login: `SESSION_TTL_MINUTES`
  (por defecto 30) es la ventana de inactividad tolerada. Toda request autenticada re-emite la cookie
  con un `exp` nuevo y el TTL completo (`withRefreshedSession` en `worker/index.ts`, aplicado en
  `handleTickets` y en la rama autenticada de `GET /api/auth/session`). Un `401` sale antes del
  wrapper, asi que nunca renueva. No hay tope maximo absoluto de duracion.
- `GET /api/auth/session` y el login exitoso informan `{ authenticated, username?, ttlMinutes? }`
  (`ttlMinutes` no es informacion sensible: ya esta documentada en
  `docs/04-despliegue-cloudflare.md`, y el frontend la guarda en `sessionTtlMinutes` para programar el
  cierre proactivo, ver mas abajo). El frontend usa el endpoint al iniciar
  (`initializeSession` en `src/main.ts`) para decidir si mostrar el estado logueado, y tambien como
  **keepalive**: llenar el formulario de un carton no genera ninguna request, asi que
  `initializeSessionKeepalive` (`src/main.ts`) escucha `pointerdown`/`keydown`/`visibilitychange` y
  pinguea el endpoint como maximo una vez cada 5 minutos (`SESSION_KEEPALIVE_THROTTLE_MS`). Se
  descarta `mousemove` a proposito: solo cuenta la interaccion intencional. La ventana efectiva de
  inactividad queda entonces entre 25 y 30 minutos. Un fallo de red en el ping **no** cierra sesion.
- Las pestañas **Cartones** y **Gestion** quedan ocultas sin sesion valida.
- Rate limiting de login: **5 intentos fallidos cada 15 minutos por IP** (tabla `login_attempts`,
  `worker/index.ts`); al superarlo, `429`. Un `401` en login es credencial incorrecta; un `404`
  significa que el Worker no esta atendiendo la ruta (por ejemplo, correr solo `npm run dev` sin
  Worker).

### Sesion vencida durante el uso

Hay dos vias de deteccion, y las dos terminan en el mismo lugar (`forceSessionExpired` en
`src/main.ts`): guardar el motivo en `sessionStorage` y forzar un `window.location.reload()` — no se
intenta manejar el estado "a medias". Como el reload borra la memoria de JS, el aviso de "por que se
recargo" se lee despues del boot y se muestra como un toast rojo (`checkSessionExpiredNotice`).

1. **`401` en una accion protegida** de cartones (`handleUnauthorized`).
2. **El ping de keepalive** recibe `authenticated: false`. Ojo: el endpoint de sesion responde `200`
   con ese campo en `false` cuando la cookie vencio, **no** un `401`, asi que ahi la deteccion va por
   el campo y no por `ApiError`. Al volver a una pestaña que estuvo inactiva, el ping de
   `visibilitychange` corta la sesion antes de que el usuario tipee un carton entero y lo pierda en
   el reload del Guardar.
3. **El timer local de inactividad** (`scheduleIdleExpiry`/`cancelIdleExpiry` en `src/main.ts`). A
   diferencia de las otras dos vias, esta no espera ninguna interaccion: cada `pointerdown`/`keydown`/
   vuelta a la pestaña (`onUserActivity`) reprograma un `setTimeout` a `sessionTtlMinutes` desde ese
   instante; si nadie lo reprograma antes de que venza, dispara el reload por su cuenta. Existe para
   no dejar cartones (datos sensibles) visibles en una pantalla desatendida — sin este timer, la
   pantalla queda expuesta indefinidamente hasta que alguien vuelve a tocarla. `setAuthUi(false)`
   cancela el timer en un logout manual, para que no dispare un reload fantasma despues. Es
   deliberadamente best-effort: los navegadores pueden pausar `setTimeout` en pestañas en segundo
   plano, por eso las otras dos vias (sobre todo el ping de `visibilitychange`) siguen siendo el
   respaldo que confirma contra el servidor.

## Auditoria

Toda alta, edicion, borrado e importacion queda registrada en `audit_logs` (`worker/schema.sql`):
`action`, `actor` (usuario), `ticket_id` cuando aplica, `details_json` y `created_at`. Acciones
usadas hoy: `ticket_created`, `ticket_updated`, `ticket_deleted`, `tickets_deleted_all`,
`tickets_imported`.

## Reglas de validacion de cartones

Compartidas por la carga individual y la carga masiva a traves de una sola funcion
(`parseTicketsPayload` en `src/tickets.ts`), para que ambos flujos se comporten igual:

- **ID**: entero positivo. Acepta ceros a la izquierda y los normaliza (`"007"` se guarda como
  `"7"`) — igual que ya se hace con los numeros del carton. No acepta letras ni otros caracteres.
- **Nombre**: opcional, hasta 60 caracteres (`TICKET_NAME_MAX_LENGTH`), acepta cualquier
  puntuacion.
- **Numeros**: exactamente 15, enteros entre 1 y 90, sin repetidos entre si. No hace falta orden
  ascendente al ingresarlos (se normalizan y ordenan al guardar). `"01"` se toma como `1`.
  En el alta individual, `parseTicketNumbersInput` (`src/management.ts`) separa por coma, espacio,
  salto de linea, punto y coma o punto: como los valores validos son enteros de 1 a 90, ningun
  separador puede formar parte de un numero. Esto es lo que permite que el campo use
  `inputmode="decimal"` y funcione con cualquier tecla de separador del teclado numerico del
  celular. El parser de CSV de la carga masiva **no** comparte esta logica: ahi la coma sigue
  siendo el separador de celdas.
- Un cartón puede fallar por **mas de un motivo a la vez** (por ejemplo, ID ya usado y numeros
  invalidos simultaneamente): la validacion no corta en el primer error, acumula todos los que
  encuentra para ese cartón y los muestra juntos — tanto en el modal individual
  (`showTicketFormErrors`) como en la carga masiva (`showBulkFieldErrors`).
- El chequeo de "ID ya cargado" (contra los cartones que ya existen, no solo contra el resto del
  lote) se hace pasando el set de IDs existentes a `parseTicketsPayload` — asi se evalua junto con
  el resto de los campos del mismo cartón, no como un paso aparte despues.

## Carga masiva: suma, no reemplaza

`POST /api/tickets/import` **agrega** los cartones del lote a los que ya existen — no borra nada
antes de insertar. Si algun ID del lote ya existe, el servidor rechaza toda la importacion con
`409` (`ID duplicado (...)`) sin tocar la base; el cliente ya filtra este caso antes de llegar a
pedirlo (ver validacion compartida arriba). Acepta JSON (`{"tickets": [...]}`) o CSV por linea
(`id,nombre,n1..n15`).

Al presionar "Cargar cartones" en el modal de carga masiva, si el bloque es valido se aplica en el
mismo click — no hay un paso intermedio de vista previa/confirmacion.

## Borrado

- Individual: confirmacion simple (`window.confirm`).
- Total (`DELETE /api/tickets`): doble confirmacion — hay que escribir literalmente `BORRAR TODO`
  en un prompt y despues confirmar de nuevo. Requiere el mismo texto en el body de la request.

## Convenciones de UI en Gestion

- Alta/edicion individual y carga masiva viven en modales (`#ticket-modal`, `#bulk-modal`),
  reutilizando las clases genericas `.modal`/`.modal-backdrop`/`.modal-card`/`.modal-head`. Al
  guardar con exito, el modal se cierra solo y se muestra un **toast** verde
  (`showToast(mensaje)`) — no se deja el modal abierto con un mensaje interno.
- Los errores de validacion se muestran en un unico cartel por modal (debajo de los botones de
  accion), nunca pegados a cada campo por separado — asi conviven varios errores del mismo cartón
  sin romper el layout. El error persiste mientras el usuario escribe; solo se limpia al volver a
  intentar guardar/cargar.
- Los botones de accion por fila de la tabla (editar/borrar) son iconos de FontAwesome
  (`src/icons.ts`, `@fortawesome/free-solid-svg-icons`), con `aria-label`/`title` porque no dejan
  texto visible. En mobile (`max-width: 640px`), los botones de "Cargar carton" / "Cargar
  cartones" / "Borrar todos" del encabezado tambien pasan a solo-icono para ahorrar espacio
  (desktop conserva el texto).
- La tabla "Cartones actuales" es responsive: en mobile usa `table-layout: fixed` con anchos fijos
  por columna, el Nombre hace salto de linea, y los 15 numeros se muestran en una grilla de 5
  columnas x 3 filas (`.mgmt-numbers-grid`) en vez de una lista separada por comas — evita el
  scroll horizontal en 375-412px de ancho. Desktop no cambia (sigue mostrando los numeros como
  texto).
- El encabezado de "Cartones actuales" muestra un contador (`#management-count`): sin filtro es
  solo el numero (`15`), porque va pegado al titulo y no necesita repetir la palabra; con filtro
  activo pasa a `N de Total`. Lleva `aria-label` para que el numero suelto tenga contexto al leerlo. Debajo hay un buscador (`#management-search`) que
  filtra por coincidencia de ID o nombre, ignorando mayusculas y acentos (`normalizeSearchText` en
  `src/main.ts`). El filtro es **local** sobre el array `tickets` ya cargado: no vuelve a consultar
  la API. Como `renderManagementRows` se re-ejecuta entero en cada `reloadTicketsAndViews()`, el
  termino de busqueda vive en el modulo (`managementSearchTerm`) y no en el DOM, para que sobreviva
  al refetch posterior a editar o borrar un carton. Se limpia al cerrar sesion.
- Cuando no hay filas para mostrar, la tabla renderiza una unica fila con `colspan=4`
  (`.management-empty`): "Sin resultados para ..." si hay busqueda activa, o "No hay cartones
  cargados." si la base esta vacia.
- Los botones de accion de cada fila **no** deben ir directo sobre un `<td>` con `display: flex`
  — genera una celda anonima de tabla y con `table-layout: fixed` el ancho declarado deja de
  aplicarse a la celda real (ver el fix en `renderManagementRows`, `src/main.ts`): el flex tiene
  que vivir en un `<div>` interno.

## Si se agrega una accion protegida nueva

- Sumar su validacion a `parseTicketsPayload` si toca campos de cartón, no crear un chequeo
  paralelo.
- Envolver el `catch` con `handleUnauthorized(error)` para que un 401 dispare el reload + toast
  igual que el resto.
- Si la ruta nueva vive **fuera** de `/api/tickets`, pasar su respuesta por `withRefreshedSession`:
  el deslizamiento de la sesion no es automatico por ruta, se aplica en `handleTickets` y en
  `GET /api/auth/session`. Sin eso, usar esa accion no renueva la sesion.
- Registrar la accion en `audit_logs` desde el Worker.
