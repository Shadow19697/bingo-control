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

- `src/main.ts`: inicializa UI y eventos
- `src/bingo.ts`: logica de dominio de bingo
- `src/style.css`: estilos de la interfaz
- `docs/`: documentacion funcional y tecnica
