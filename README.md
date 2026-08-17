# Bingo Control

Proyecto base en HTML, CSS y TypeScript para controlar numeros de bingo.

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
- `src/ui/template.ts`: plantilla HTML base de la interfaz
- `src/ui/grid.ts`: renderizado de la grilla y utilidades de estado visual
- `src/ui/status.ts`: render del resumen (marcados, faltantes, salida)
- `src/ui/dom.ts`: utilidades de seleccion segura del DOM
- `src/style.css`: estilos globales y responsive
- `docs/`: documentacion funcional y tecnica
