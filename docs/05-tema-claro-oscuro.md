# Tema claro/oscuro

Como funciona el sistema de temas y que reglas hay que mantener al tocar estilos.

## Regla principal: nada de colores hardcodeados

Todo color de `src/style.css` sale de una variable CSS definida en `:root`. **No agregar literales
hex ni `rgb()` fuera de los dos bloques de paleta**: un color hardcodeado se ve bien en claro y
queda ilegible en oscuro, y no hay forma de detectarlo automaticamente.

Si hace falta un color que ningun token cubre, agregar el token nuevo a **los dos** bloques
(`:root` y `:root[data-theme="dark"]`) antes de usarlo.

Unica excepcion, deliberada: los blancos translucidos (`rgba(255, 255, 255, ...)`) y los
`color: white` de `.hero`, `.app-version`, `.hero-icon-btn`, `.help-btn`, `.btn`,
`.tab-alert-label`. Todos viven sobre el degrade de marca o sobre fondos saturados (`--brand`,
`--danger`, `--alert`) que siguen siendo oscuros en ambos temas, asi que el blanco es correcto en los
dos.

Ojo con los colores dentro de `@keyframes`: son igual de hardcodeados y mas faciles de olvidar. El
halo del punto de alerta usaba un `rgba()` literal que ignoraba el `--alert` del tema oscuro; hoy sale
de `--alert-ring`.

## Los dos bloques de paleta

- `:root` — tema claro. Sus valores son exactamente los colores historicos de la app, asi que el
  tema claro se ve igual que antes de que existiera el modo oscuro.
- `:root[data-theme="dark"]` — solo redefine tokens, no agrega reglas.

Cada bloque declara tambien `color-scheme` (`light` / `dark`), que es lo que hace que scrollbars,
controles nativos y el fondo por defecto de los inputs acompañen al tema.

Los tokens estan agrupados por rol (superficies, texto, marca, bordes, tabs, estados semanticos,
estados de juego, sombras). Elegir el token por **rol**, no por parecido de color: un borde de
formulario va en `--line-form` aunque en claro coincida con otro token.

Un color puede necesitar **dos tokens para dos roles opuestos**. `--danger` es el relleno de un boton
con texto blanco encima (quiere ser oscuro) y antes era tambien la tinta del icono de borrar sobre
`--danger-soft-bg` (quiere ser claro): los dos roles tiran para lados contrarios y en oscuro ninguno
llegaba a AA. Hoy el segundo usa `--danger-soft-ink`. Misma idea en `--on-complete-accent`, que en
claro es blanco y en oscuro casi negro porque `--complete-accent` invierte su luminosidad.

Los inputs llevan `background` y `color` explicitos (`--surface-raised` / `--ink`). Sin eso quedan
al criterio del user-agent y en oscuro aparecen blancos. Lo mismo con `::placeholder`
(`--ink-muted`).

## La rampa de superficies oscura

En claro alcanza con pasos chicos de luminosidad porque el croma calido de la paleta hace la mitad
del trabajo: `--bg` y `--surface-raised` se distinguen con **0.7 L\*** de diferencia. En oscuro eso no
funciona — dos superficies oscuras con menos de **~3 L\*** de diferencia se perciben identicas, sin
importar el tono. Por eso el bloque oscuro define una escalera explicita, monotona y sin escalones
muertos:

```
bg 6.8 -> surface-sunken 10.7 -> bg-soft 11.7 -> id-cell-bg 15.6 -> surface 17.0
        -> surface-raised 20.7 -> table-head-bg 24.8 -> surface-alt 27.3
```

Reglas al tocarla:

- **`--surface-raised` siempre por encima de `--surface`.** Es lo que hace que un input se vea
  elevado dentro de su modal; cuando estaba invertido (16.1 vs 13.2) los campos se leian hundidos.
- **Los bordes van a ~17 L\* sobre su fondo**, el mismo peso relativo que en claro. Con menos, la
  grilla de las tablas y los bordes de panel desaparecen.
- Un contenedor de tabla (`.management-table-scroll`) es una **card** (`--surface`), no un control
  elevado: si usa `--surface-raised` el `thead` sticky queda al mismo nivel que las filas y no se
  separa al scrollear.
- Al agregar una superficie, ubicarla en la escalera y verificar que quede a **>= 3 L\*** de sus dos
  vecinas.

## Estados de juego: la jerarquia importa

Un carton completo tiene los **15 numeros cantados**, asi que las 15 celdas de su fila llevan
`.called` y son opacas: tapan por completo el `background` de la fila. Por eso `.ticket-complete`
necesita override explicito de `.ticket-number-cell.called`, de `.ticket-id-trigger` (el pill del
nombre, tambien opaco) y del chip de aciertos. Esas reglas viven en el CSS comun y no en el bloque
oscuro, que sigue sin agregar reglas.

Los tokens estan elegidos para que la jerarquia sea *ganar > cantar > superficies*:
`--complete-bg` y `--called-bg` quedan a la misma luminosidad (L\*45) pero la fila ganadora es un
bloque verde continuo, y `--complete-accent` (L\*81) le agrega la barra lateral y el chip `15/15`, que
son lo mas brillante de la tabla. Si alguna vez se cambia `--called-bg`, revisar que no vuelva a
pasarle por encima al verde: antes el ambar estaba en L\*53 contra un verde de L\*19 y ganar se veia
**mas apagado** que cantar.

## Como se elige el tema

1. `index.html` tiene un script **inline** en el `<head>`, antes del modulo de la app. Lee
   `localStorage["bingo-theme"]`; si no hay nada guardado, usa
   `matchMedia("(prefers-color-scheme: dark)")`. Estampa el resultado en
   `document.documentElement.dataset.theme`.
2. `src/main.ts` (`initializeTheme`) **lee** ese atributo para sincronizar el icono y el
   `aria-label` del boton — no vuelve a resolver el tema, para no desincronizarse del inline.
3. El click en `#theme-toggle-btn` alterna y persiste en `localStorage` (`applyTheme(theme, true)`).
4. Mientras no haya eleccion guardada, un cambio de tema del sistema se sigue en vivo. Despues de
   la primera eleccion explicita del usuario, se ignora.

El script tiene que seguir siendo **inline y sincrono**: si el tema se resolviera desde el bundle,
la pagina pintaria un frame en claro antes de cambiar. Por eso tambien el atributo se estampa
siempre (nunca se deja ausente), y el CSS necesita un solo selector de override en vez de duplicar
la paleta oscura entre un `@media` y un bloque de atributo.

Los accesos a `localStorage` van dentro de `try/catch`: en modo privado o con storage bloqueado
tiran excepcion, y ahi el tema vale solo para la sesion en curso.

## El boton

Vive en `.hero-actions` junto al de login, dentro del header. El icono muestra el **destino**, no
el estado actual: luna cuando estas en claro (click → oscuro), sol cuando estas en oscuro. El
`aria-label` y el `title` acompañan ("Cambiar a modo oscuro" / "Cambiar a modo claro").

Los dos botones del header comparten la clase `.hero-icon-btn` (pildora translucida sobre el
degrade); `.auth-open-btn` solo agrega su modificador `.is-logout` en rojo. En mobile apaisado
(`max-height: 600px`) se achican a 1.7rem para que entren los dos.
