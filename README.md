# Bingo Control

Proyecto en HTML, CSS y TypeScript para controlar numeros cantados y validar cartones ganadores.

## Requisitos

- Node.js 18+ (recomendado 20+)
- npm

## Comandos

- `npm install`: instala dependencias
- `npm run dev`: inicia entorno local (Vite)
- `npm run build`: compila TypeScript y genera `dist/`
- `npm run preview`: sirve el build generado
- `npm run db:local:init`: crea/actualiza el esquema de D1 local.
- `npm run db:local:seed`: valida `public/tickets.json` y genera el seed local transaccional.
- `npx wrangler d1 execute bingo_control_db --local --file=./worker/seed.local.sql`: carga el seed local generado.
- `npm run dev:worker`: compila el frontend y ejecuta el Worker con assets y D1 local.
- `npm test`: ejecuta las pruebas unitarias y las pruebas de integracion del Worker (login, sesion, CRUD, import, borrado, rate limiting).

## Entorno local del Worker (variables y secretos)

`wrangler dev --local` necesita `ADMIN_USERNAME`, `ADMIN_PASSWORD` y `SESSION_SECRET` para que el
login funcione. En local se resuelven con un archivo `.dev.vars` (no se commitea):

1. Copiar `.dev.vars.example` a `.dev.vars`.
2. Completar `ADMIN_PASSWORD` y `SESSION_SECRET` con valores propios para desarrollo.
3. Ejecutar `npm run db:local:init` y luego `npm run dev:worker`.

El login queda protegido con un limite de 5 intentos fallidos cada 15 minutos por IP (`429` al
superarlo), y las altas, ediciones, borrados e importaciones de cartones quedan registradas en la
tabla `audit_logs`.

## Despliegue

Este proyecto usa un Worker de Cloudflare para autenticacion y ABM seguro de cartones.

Para build de frontend se sigue generando `dist/`, pero en produccion se sirve junto al Worker.

Runbook completo (creacion de D1, secretos, deploy, migracion de cartones y verificacion
post-deploy): `docs/04-despliegue-cloudflare.md`.

## Estructura

- `src/main.ts`: orquestacion principal y binding de eventos
- `src/config.ts`: constantes y validaciones compartidas
- `src/bingo.ts`: logica de dominio del bingo (rango, toggle, limpieza)
- `src/tickets.ts`: validacion/carga de cartones y calculos de aciertos
- `src/ui/template.ts`: plantilla HTML base de la interfaz
- `src/ui/grid.ts`: renderizado de la grilla principal
- `src/ui/status.ts`: render del resumen de canto
- `src/ui/tickets.ts`: render y estados de la matriz de cartones
- `src/ui/dom.ts`: utilidades de seleccion segura del DOM
- `src/api.ts`: cliente de la API del Worker (auth, CRUD e importacion de cartones)
- `src/management.ts`: parseo de carga masiva (JSON/CSV) para la pestaña Gestion
- `src/icons.ts`: configuracion centralizada de iconos (FontAwesome)
- `src/style.css`: estilos globales y responsive
- `public/tickets.json`: cartones iniciales, usados como semilla local (`npm run db:local:seed`)
- `worker/index.ts`: API segura para auth y ABM de cartones
- `worker/schema.sql`: esquema de base D1
- `docs/`: documentacion funcional y tecnica (ver `docs/README.md` para el indice)

## Flujo funcional actual

1. En la pestana **Control**, se canta manualmente del 1 al 90.
2. El tablero principal usa columnas 1..10 y filas base 1, 11, 21... 81.
3. En la pestana **Cartones**, cada fila representa un carton (ID + Nombre opcional + 15 numeros ordenados).
4. Cuando un numero se canta, se ilumina en todos los cartones que lo contienen.
5. Cada carton muestra su progreso de aciertos y se resalta visualmente al completar 15/15.
6. La franja superior de Cartones muestra: cargados, invalidos y completos actuales.
7. El acceso a **Cartones** y **Gestion** requiere login valido.
8. En **Gestion**, alta individual y carga masiva se hacen en modales (icono-only en mobile);
   guardar con exito cierra el modal y muestra un toast; carga masiva suma cartones nuevos a los
   existentes, no reemplaza. Detalle completo de reglas y UI: `docs/03-abm-seguridad.md`.

## Formato de cartones JSON

`public/tickets.json` (semilla local) acepta:

```json
{
	"tickets": [
		{
			"id": 1001,
			"name": "Mesa Norte",
			"numbers": [1, 4, 7, 12, 18, 23, 29, 34, 39, 45, 52, 60, 66, 73, 88]
		}
	]
}
```

Reglas por carton (mismas reglas que valida la app en alta individual y carga masiva, ver
`docs/03-abm-seguridad.md`):

- `id` entero positivo y unico (acepta ceros a la izquierda, se normaliza sin ellos).
- `name` opcional, hasta 60 caracteres.
- `numbers` con exactamente 15 enteros entre 1 y 90, sin repetidos.
