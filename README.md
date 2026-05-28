# CrispCut — Eliminador de fondo 100% local (versión simple)

Solo **4 archivos**. Sin build. Sin npm. Sin servidor. Sin API.

```
crispcut-simple/
├── index.html   ← estructura
├── style.css    ← estilos (modo claro + oscuro)
├── app.js       ← lógica + integración del motor
└── README.md    ← este archivo
```

## Cómo usarlo

1. Extrae el ZIP.
2. Abre `index.html` con cualquier navegador moderno (Chrome, Edge, Firefox, Safari).
3. Sube una imagen, espera unos segundos (la primera vez descarga el motor
   neuronal, ~40 MB, que queda cacheado para siempre).
4. Clic en el fondo (o en cualquier swatch) para añadir un color sólido.
5. Botón **Descargar PNG**.

> **Importante:** el motor `@imgly/background-removal` se carga desde
> `https://esm.sh` (CDN). Solo se necesita internet la PRIMERA vez para
> descargar el motor; después funciona offline gracias al caché del navegador.
> Si quieres 100% offline desde el primer uso, instala localmente las
> dependencias (ver más abajo).

## Modificar la web

Todo está en 3 archivos legibles:
- **`index.html`** — añade/quita secciones, cambia textos
- **`style.css`** — modifica colores en `:root` (light) y `html.dark` (dark)
- **`app.js`** — cambia presets de color, lógica, etc.

Edita y vuelve a abrir `index.html`. No hay build, no hay nada que compilar.

## Funcionalidades

- Eliminación automática de fondo (cabello, pelaje, transparencias)
- Click en el fondo → selector de color rápido
- 10 presets + selector de color personalizado
- Descarga PNG (transparente o con color de fondo)
- Modo claro / oscuro persistente (localStorage)
- Drag & drop de imágenes
- Diseño Swiss High-Contrast con fuentes Outfit + IBM Plex Sans

## ¿100% offline desde cero?

Si quieres que ni siquiera la primera vez necesite internet, descarga
manualmente el bundle de `@imgly/background-removal` desde npm y reemplaza
la primera línea de `app.js`:

```js
// antes:
import { removeBackground } from "https://esm.sh/@imgly/background-removal@1.4.5";
// después:
import { removeBackground } from "./vendor/imgly.js";
```

## Servir con un servidor local (opcional)

Por temas de CORS de ES Modules, algunos navegadores requieren un servidor.
Lo más rápido:

```bash
# Python
python3 -m http.server 5500

# o Node
npx serve .
```

Y abre `http://localhost:5500`.

## Licencia

Código del proyecto: MIT.
Motor `@imgly/background-removal`: licencia del autor (consultar su repo).
