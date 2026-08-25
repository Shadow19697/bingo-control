# Documentacion del Proyecto

Esta carpeta sirve para documentar decisiones, flujos y tareas tecnicas del sistema de control de bingo.

## Archivos

- `01-creacion-archivos.md`: checklist para nuevos archivos
- `02-logica-bingo.md`: reglas y flujo de la logica de juego (control + cartones)
- `03-abm-seguridad.md`: reglas de ABM de cartones, autenticacion, seguridad y convenciones de la UI de Gestion
- `04-despliegue-cloudflare.md`: runbook para desplegar/redesplegar en Cloudflare (Worker + D1)
- `05-tema-claro-oscuro.md`: sistema de tokens de color, tema claro/oscuro y reglas al tocar estilos

## Sugerencia de uso

Cada vez que agregues una funcionalidad:

1. Define objetivo en `01-creacion-archivos.md`.
2. Especifica reglas y casos borde en `02-logica-bingo.md`.
3. Implementa en codigo.
4. Actualiza la documentacion con lo aprendido.
