# Logica de Bingo (Base)

## Objetivo

Llevar control de numeros cantados en una partida y visualizar estado en tiempo real.

## Reglas iniciales

- Rango permitido: 0 a 90.
- Un numero puede estar en 2 estados: marcado o sin marcar.
- Marcar un numero ya marcado lo desmarca (toggle).
- Debe existir accion para limpiar la partida completa.
- Debe mostrarse cantidad de marcados y faltantes.
- La lista de salida se muestra en orden cronologico de marcado.

## Flujo funcional

1. Mostrar grilla de numeros 0..90.
2. Usuario marca/desmarca con click.
3. Sistema actualiza contador y listado de numeros marcados.
4. Usuario puede ingresar un numero manualmente para marcar/desmarcar.
5. Usuario puede limpiar toda la partida.

## Estructura actual (resumen)

- `src/bingo.ts`: funciones puras de dominio.
- `src/ui/grid.ts`: construccion y estado visual de la grilla.
- `src/ui/status.ts`: resumen inferior (marcados/faltantes/salida).
- `src/ui/template.ts`: composicion HTML base.
- `src/main.ts`: orquestacion de eventos y estado en memoria.

## Casos borde

- Ignorar valores fuera de rango.
- Ignorar valores no enteros.
- Evitar que errores de UI rompan el estado interno.

## Ideas para siguientes iteraciones

- Historial de partidas con fecha/hora.
- Sorteo aleatorio sin repeticion.
- Modo pantalla grande para TV.
- Exportar e importar estado de partida.
