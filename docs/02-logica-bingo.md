# Logica de Bingo (Control + Cartones)

## Objetivo

Llevar control de numeros cantados en una partida y cruzarlos contra cartones cargados para tener seguimiento visual de aciertos y cartones completos.

## Reglas iniciales

- Rango permitido: 1 a 90.
- Un numero puede estar en 2 estados: marcado o sin marcar.
- Marcar un numero ya marcado lo desmarca (toggle).
- Debe existir accion para limpiar la partida completa.
- Debe mostrarse cantidad de marcados y faltantes.
- La lista de salida se muestra en orden cronologico de marcado.
- Los cartones se cargan desde `public/tickets.json`.
- Cada carton debe tener: `id` unico + `numbers` con 15 enteros unicos entre 1 y 90.
- `name` es opcional para identificar dueno o reserva del carton.
- Un carton se considera completo cuando alcanza 15/15 aciertos.
- El sistema muestra contador de cartones completos activos en la pestana Cartones.

## Flujo funcional

1. Mostrar grilla principal de control (columnas 1..10 y filas base 1..81).
2. Usuario marca/desmarca con click.
3. Sistema actualiza contador y listado de numeros marcados.
4. Sistema marca automaticamente en la matriz de cartones todas las celdas que contienen el numero cantado.
5. Sistema recalcula aciertos por carton y detecta cartones completos (15/15).
6. Usuario puede ingresar un numero manualmente para marcar/desmarcar.
7. La pestana Cartones refleja en tiempo real: cargados, invalidos y completos.

## Estructura actual (resumen)

- `src/bingo.ts`: funciones puras de dominio para canto.
- `src/tickets.ts`: parseo/validacion de cartones, ordenamiento y calculos de aciertos/completado.
- `src/ui/grid.ts`: construccion y estado visual de la grilla principal.
- `src/ui/tickets.ts`: matriz de cartones y estado visual por celda/fila.
- `src/ui/status.ts`: resumen inferior de canto.
- `src/ui/template.ts`: composicion HTML base + pestañas.
- `src/main.ts`: orquestacion de eventos y sincronizacion entre canto y cartones.

## Casos borde

- Ignorar valores fuera de rango.
- Ignorar valores no enteros.
- Evitar que errores de UI rompan el estado interno.
- Si el JSON tiene filas invalidas, seguir operando con cartones validos y reportar invalidos.
- Soportar cartones sin `name` (campo opcional).

## Ideas para siguientes iteraciones

- Persistencia de cartones desde backend/API.
- Alta/Baja/Edicion de cartones desde la UI.
- Exportar estado de partida (cantados + cartones completos).
