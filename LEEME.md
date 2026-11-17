# Cuaderno de Foco

App de estudio que funciona sin internet y sin cuenta: plan semanal según tus créditos, temporizador contra la procrastinación, rachas, transporte, actividades extracurriculares y reels de estudio con un motor propio. Es una app web instalable (PWA): el mismo código funciona en el computador y en el celular.

Tus datos se guardan solo en el dispositivo donde usas la app. Nada se envía a ningún servidor.

## Qué hay en esta carpeta

- **LEEME.md**: estas instrucciones.
- **Abrir Cuaderno de Foco.bat**: abre la app en este computador.
- **mis-datos-cuaderno.json**: tu plan, tu racha y tu mazo de la versión que usabas en Claude. Es personal: no lo subas a internet.
- **app**: los archivos de la app. Es la única carpeta que se publica para usarla en el celular.

## Primer paso: trae tus datos

Cuando abras la app por primera vez, toca **Guardado en este dispositivo** (arriba a la derecha) → **Importar copia** → **Elegir archivo** y elige `mis-datos-cuaderno.json`. Haz lo mismo en cada dispositivo donde instales la app.

## Usarla en el computador (Windows)

1. Haz doble clic en **Abrir Cuaderno de Foco.bat**. Se abre una ventana negra (el servidor local) y la app en tu navegador.
2. En Chrome o Edge, pulsa el ícono de **Instalar** en la barra de direcciones (o el botón **Instalar** de la app).
3. Listo: queda como programa, con su propio ícono y su propia ventana. Desde ahí abre sin el servidor y sin internet.

Si prefieres no instalarla, deja la ventana negra abierta mientras usas la app en el navegador y ciérrala con Ctrl+C al terminar.

## Usarla en el celular

Los celulares solo instalan apps web que vienen de una dirección `https://`. Hay que publicar la carpeta **app** una vez en un hosting gratuito. Por ejemplo, con GitHub Pages:

1. Crea una cuenta en github.com (si no tienes) y un repositorio nuevo, por ejemplo `cuaderno-de-foco`, público.
2. En el repositorio: **Add file → Upload files** y arrastra **todo lo que está dentro de la carpeta app** (index.html, sw.js, manifest.webmanifest y las carpetas css, js e icons). No subas `mis-datos-cuaderno.json`, que está afuera de esa carpeta a propósito.
3. **Settings → Pages → Branch: main → Save**. En un par de minutos te da una dirección como `https://tu-usuario.github.io/cuaderno-de-foco/`.
4. Abre esa dirección en el celular:
   - **Android (Chrome):** menú ⋮ → **Instalar app**.
   - **iPhone (Safari):** botón **Compartir** → **Agregar a inicio**.

Publicar la app no publica tus datos: cada persona que la abre tiene sus propios datos en su propio dispositivo. Sirve igual para compartirla con tus amigos.

Netlify o Cloudflare Pages también sirven: subes la carpeta **app** y te dan una dirección https.

Después de instalarla en el celular, importa ahí tu copia de datos (pásate `mis-datos-cuaderno.json` por WhatsApp, correo o Drive).

## Pasar tus datos entre dispositivos

Toca **Guardado en este dispositivo** (arriba a la derecha) para abrir **Tus datos**:

- **Exportar copia** descarga un archivo `.json` con tu plan, racha y mazos.
- **Importar copia** lo carga en otro dispositivo (reemplaza lo que haya allí).

La app no sincroniza sola entre dispositivos (no tiene servidor). Si estudias en los dos, exporta desde el que usaste último e importa en el otro.

## Reels de estudio: cómo funciona el algoritmo

Todo está en `js/reels-engine.js` y corre en el dispositivo, sin inteligencia artificial:

1. **Lee tu material**: PDF con texto, TXT o Markdown (también puedes pegar el texto).
2. **Busca tarjetas explícitas**: preguntas que ya escribiste (`P:` / `R:` o una línea que termina en `?`), glosarios (`Término: definición`), definiciones (`se denomina…`, `se define como…`, `X es un…`), listas y clasificaciones, y fórmulas.
3. **Tarjetas para completar**: elige las frases más importantes con palabras clave (algoritmo RAKE) y quita la palabra clave. Las opciones de respuesta salen del mismo material.
4. **Problemas**: cada fórmula que encuentra (`F = m·a`, `σ = P/A`, `Ec = ½·m·v²`…) se vuelve un problema con datos nuevos en cada repaso, y también pide despejar otras variables.
5. **Repaso espaciado SM-2** (el método de Anki): "Otra vez" la trae en 10 minutos y otra vez en esta sesión; "Bien" la manda a días o semanas según cómo te ha ido.
6. **Orden del feed**: primero lo que estás por olvidar, 3 repasos por cada tarjeta nueva, máximo 2 seguidas de la misma materia y prioridad para tu materia a concentrar.

Antes de guardar un mazo puedes quitar las tarjetas que no sirvan y agregar otras a mano.

### Problemas con variables

Escribe el enunciado con variables entre llaves y la fórmula de la respuesta en una línea que empiece con `=`:

```
Una viga simplemente apoyada de {L:4-8} m tiene una carga de {P:5-20} kN en el centro. ¿Cuál es el momento máximo?
= P*L/4
unidad: kN·m
pista: En el centro, M = P·L/4.
```

- `{L:4-8}`: un número entero entre 4 y 8. `{m:2-10:0.5}`: pasos de 0,5. `{n:2,5,10}`: uno de esa lista.
- En la fórmula: `* / + - ^`, `sqrt()`, `sin()`, `cos()`, `tan()` (en grados), `pi`.
- Opcional: `unidad:`, `pista:`, `solución:` (puedes usar `{=P/2}` para mostrar un cálculo) y `tolerancia: 2%`.

## Importar el horario

En **Horario → Importa tu horario**: copia la tabla del portal de tu universidad y pégala, o sube un PDF del horario (en el portal: Imprimir → Guardar como PDF), un CSV o un TXT. La app reconoce días, horas (también en formato AM/PM), materias, salones y laboratorios (salón LL…).

## Límites

- **Avisos:** suenan cuando termina una sesión o empieza un bloque de estudio, con la app abierta o minimizada. Para avisos con la app cerrada, usa los recordatorios de Google Calendar en Horario.
- **Fotos y PDF escaneados:** no se pueden leer sin internet. Usa PDF con texto o pega el texto.
- **Lector de PDF y fuentes tipográficas:** se descargan la primera vez que abres la app con internet; después funcionan sin conexión.

## Si cambias el código

Cada vez que modifiques un archivo, sube el número de `VERSION` en `app/sw.js` (por ejemplo `cuaderno-v1.0.1`). Así los dispositivos que ya tienen la app instalada reciben el aviso **Hay una versión nueva → Actualizar**. Si la publicaste en GitHub Pages, vuelve a subir los archivos cambiados.

## Archivos de la carpeta app

- `index.html`: estructura de la app.
- `css/app.css`: diseño (tema claro y oscuro).
- `js/app.js`: horario, enfoque, rachas, transporte, actividades, recordatorios y pantallas.
- `js/reels-engine.js`: motor de los reels (lectura, generación de tarjetas y problemas, SM-2 y orden del feed).
- `sw.js`: guarda la app para que funcione sin internet.
- `manifest.webmanifest` e `icons/`: nombre, colores e íconos para instalarla.
- `servidor.ps1`: servidor local para Windows (lo abre `Abrir Cuaderno de Foco.bat`).
