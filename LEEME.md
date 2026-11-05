# Caribbean Travel — Nuevo sitio web + Chatbot de WhatsApp

Abre esta carpeta en VS Code (Archivo → Abrir carpeta).

> **Nuevo:** base de datos gratuita (Supabase) y panel de administración en `sitio-web/admin/`.
> Sigue **GUIA_BASE_DE_DATOS.md** paso a paso. Los destinos ya no se editan en `js/datos.js`
> (queda como respaldo y fuente de la migración inicial), sino desde el panel.

## 1. Sitio web (`sitio-web/`)

HTML, CSS y JavaScript sin librerías. Para verlo en tu computadora: abre `sitio-web/index.html` en el navegador, o en VS Code instala la extensión **Live Server** → clic derecho en `index.html` → *Open with Live Server*.

- **Editar destinos, precios, fechas o número de WhatsApp:** `sitio-web/js/datos.js` (es el único archivo de contenido).
- **Colores y tipografías:** variables al inicio de `sitio-web/css/estilos.css`.
- **Fotos:** las de Panamá son del boceto conceptual; reemplázalas por fotos reales y autorizadas en `sitio-web/img/` y agrega la ruta de cada destino en `datos.js` (campo `foto`).

### Publicarlo

**Opción A — dentro de LeadConnector (donde está el sitio actual):**
1. Sube `logo.png`, `panama-casco.jpg` y `panama-skyline.jpg` a la Biblioteca de medios y copia la URL de la carpeta.
2. `python3 herramientas/generar_ghl.py URL_DE_LA_CARPETA /home /panama`
3. En la página *home*, agrega un elemento **Código personalizado** a todo el ancho y pega `para-leadconnector/inicio.html`. Crea la página `/panama` y pega `para-leadconnector/panama.html`.
4. Oculta el encabezado y pie propios de la plataforma en esas páginas.

(Los archivos de `para-leadconnector/` ya incluidos tienen un marcador `https://PEGA-AQUI-LA-URL-DE-TUS-IMAGENES/`; regenéralos con el paso 2.)

**Opción B (recomendada) — sitio independiente gratis:** sube la carpeta `sitio-web` a Cloudflare Pages o Netlify y conecta el dominio `caribbeantravelvacaciones.com` desde su panel.

## 2. Chatbot (`chatbot-whatsapp/`)

Ver `chatbot-whatsapp/README.md` y las páginas 5–6 del PDF en `docs/`.

## 3. Antes de lanzar

- Confirmar precios, vigencia de las salidas de diciembre y condiciones del paquete de Panamá.
- Completar el horario real de atención en `chatbot-whatsapp/src/datos.js`.
- Revisar la tarifa de mensajes de WhatsApp para Ecuador.
