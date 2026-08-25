# Tema claro/oscuro

Como funciona el sistema de temas y que reglas hay que mantener al tocar estilos.

## Regla principal: nada de colores hardcodeados

Todo color de `src/style.css` sale de una variable CSS definida en `:root`. **No agregar literales
hex ni `rgb()` fuera de los dos bloques de paleta**: un color hardcodeado se ve bien en claro y
queda ilegible en oscuro, y no hay forma de detectarlo automaticamente.

Si hace falta un color que ningun token cubre, agregar el token nuevo a **los dos** bloques
(`:root` y `:root[data-theme="dark"]`) antes de usarlo.

Unica excepcion, deliberada: los blancos translucidos (`rgba(255, 255, 255, ...)`) y los
`color: white` de `.hero`, `.hero-icon-btn`, `.help-btn`, `.btn`, `.tab-alert-label`. Todos viven
sobre el degrade de marca o sobre fondos saturados (`--brand`, `--danger`, `--alert`) que siguen
siendo oscuros en ambos temas, asi que el blanco es correcto en los dos.

## Los dos bloques de paleta

- `:root` — tema claro. Sus valores son exactamente los colores historicos de la app, asi que el
  tema claro se ve igual que antes de que existiera el modo oscuro.
- `:root[data-theme="dark"]` — solo redefine tokens, no agrega reglas.

Cada bloque declara tambien `color-scheme` (`light` / `dark`), que es lo que hace que scrollbars,
controles nativos y el fondo por defecto de los inputs acompañen al tema.

Los tokens estan agrupados por rol (superficies, texto, marca, bordes, tabs, estados semanticos,
estados de juego, sombras). Elegir el token por **rol**, no por parecido de color: un borde de
formulario va en `--line-form` aunque en claro coincida con otro token.

Los inputs llevan `background` y `color` explicitos (`--surface-raised` / `--ink`). Sin eso quedan
al criterio del user-agent y en oscuro aparecen blancos.

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
