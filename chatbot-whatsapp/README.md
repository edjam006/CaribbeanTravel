# Chatbot de WhatsApp — Caribbean Travel

Bot gratuito con menús (listas y botones) sobre la **API oficial de WhatsApp (Cloud API de Meta)**, alojado en **Cloudflare Workers** (plan gratuito).

## Qué hace

- Menú principal: destinos, salidas confirmadas, viaje a medida, formas de pago, preguntas frecuentes y hablar con un asesor.
- Panamá: elige fecha → elige viajeros → muestra el total estimado → botón que abre el chat del asesor con el resumen ya escrito.
- Otros destinos: detalle + botón "Cotizar" que abre el chat del asesor.
- Entiende palabras clave si el cliente escribe en lugar de tocar botones (panamá, fechas, pago, horario, asesor…).
- No guarda datos de clientes: el contexto viaja en el ID de cada botón.

## Archivos

| Archivo | Para qué |
|---|---|
| `src/datos.js` | **Lo único que se edita a diario**: destinos, precios, fechas, horario y textos. |
| `src/index.js` | Lógica del bot y llamadas a la API. |
| `prueba/simular.mjs` | Prueba local sin WhatsApp; además valida los límites de caracteres de WhatsApp. |
| `wrangler.toml` | Configuración de Cloudflare (número del asesor, versión de la API). |
| `.dev.vars.ejemplo` | Plantilla de secretos para probar con `npm run dev`. |

## Paso a paso (resumen)

> La guía completa, con capturas de qué tocar en Meta, está en el PDF `docs/Caribbean_Travel_Chatbot_y_Web.pdf`, páginas 5 y 6.

1. **Instalar** Node.js 20+ y abrir esta carpeta en VS Code.
   ```bash
   npm install
   npm run simular
   ```
2. **Meta**: developers.facebook.com → Crear app (tipo Empresa) → agregar **WhatsApp**. Anotar el token temporal, el *Phone number ID* y agregar tu celular como destinatario de prueba.
3. **Clave secreta**: Configuración de la app → Básica → Clave secreta.
4. **Cloudflare** (cuenta gratuita):
   ```bash
   npx wrangler login
   npx wrangler secret put WHATSAPP_TOKEN
   npx wrangler secret put PHONE_NUMBER_ID
   npx wrangler secret put VERIFY_TOKEN   # inventa una clave
   npx wrangler secret put APP_SECRET
   npm run deploy
   ```
5. **Webhook** en Meta → WhatsApp → Configuración: URL `https://<tu-worker>.workers.dev/webhook`, el mismo `VERIFY_TOKEN`, y suscribirse a `messages`.
6. **Probar**: escribe "Hola" al número de prueba. Ver registros: `npx wrangler tail`.
7. **Número real** en WhatsApp Manager (un chip nuevo para el bot) y actualizar `PHONE_NUMBER_ID`.
8. **Token permanente** con un *Usuario del sistema* (permisos `whatsapp_business_messaging` y `whatsapp_business_management`) y poner la app en modo **En vivo**.
9. Cambiar el número del sitio (`sitio-web/js/datos.js`) y de Instagram por el del bot.

## Cambiar contenido

1. Editar `src/datos.js`.
2. `npm run simular` (verifica que nada supere los límites de WhatsApp).
3. `npm run deploy`.

## Costos

- Las respuestas del bot dentro de las 24 h desde que el cliente escribe son **gratis hasta 1.000 mensajes al mes por número**; desde el 1.001 Meta cobra por mensaje. Revisa la tarifa vigente para Ecuador antes de lanzar.
- Cloudflare Workers gratis: 100.000 solicitudes al día.
- El bot no envía plantillas ni promociones (esos sí se pagan).

## No usar

Librerías "no oficiales" que conectan WhatsApp escaneando un QR (whatsapp-web.js, Baileys, etc.): violan los términos de WhatsApp y pueden bloquear el número.
