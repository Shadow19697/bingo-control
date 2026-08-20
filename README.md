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

## Despliegue

Este proyecto genera archivos estaticos en la carpeta `dist/`, listos para subir a cualquier hosting estatico.

Ejemplos:

- Netlify
- Vercel (modo static)
- GitHub Pages
- Cualquier servidor con Nginx/Apache

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
- `src/style.css`: estilos globales y responsive
- `public/tickets.json`: cartones iniciales (id + 15 numeros)
- `docs/`: documentacion funcional y tecnica

## Flujo funcional actual

1. En la pestana **Control**, se canta manualmente del 1 al 90.
2. El tablero principal usa columnas 1..10 y filas base 1, 11, 21... 81.
3. En la pestana **Cartones**, cada fila representa un carton (ID + Nombre opcional + 15 numeros ordenados).
4. Cuando un numero se canta, se ilumina en todos los cartones que lo contienen.
5. Cada carton muestra su progreso de aciertos y se resalta visualmente al completar 15/15.
6. La franja superior de Cartones muestra: cargados, invalidos y completos actuales.

## Formato de cartones JSON

`public/tickets.json` acepta:

```json
{
	"tickets": [
		{
			"id": "A-001",
			"name": "Mesa Norte",
			"numbers": [1, 4, 7, 12, 18, 23, 29, 34, 39, 45, 52, 60, 66, 73, 88]
		}
	]
}
```

Reglas por carton:

- `id` unico.
- `name` opcional.
- `numbers` con exactamente 15 enteros.
- Cada numero debe estar entre 1 y 90.
- Sin repetidos.
