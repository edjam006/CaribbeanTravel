// =========================================================
// Chatbot de WhatsApp — Caribbean Travel
// Cloudflare Worker (plan gratuito) + WhatsApp Cloud API de Meta.
//
// Cómo funciona: Meta envía cada mensaje del cliente a este
// webhook; el bot responde con menús (listas y botones).
// No guarda datos de los clientes: el "estado" de la
// conversación viaja dentro del ID de cada botón
// (ej. "pax:18:2" = salida del 18, 2 viajeros).
// =========================================================
import { AGENCIA, DESTINOS, PANAMA, TEXTOS } from "./datos.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname !== "/webhook") {
      return new Response("Chatbot Caribbean Travel activo ✅", { status: 200 });
    }

    // 1) Verificación del webhook (Meta la hace una sola vez al configurarlo)
    if (request.method === "GET") {
      const modo = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const reto = url.searchParams.get("hub.challenge");
      if (modo === "subscribe" && token === env.VERIFY_TOKEN) {
        return new Response(reto, { status: 200 });
      }
      return new Response("Token inválido", { status: 403 });
    }

    // 2) Mensajes entrantes
    if (request.method === "POST") {
      const cuerpo = await request.text();

      const firmaOk = await verificarFirma(cuerpo, request.headers.get("x-hub-signature-256"), env.APP_SECRET);
      if (!firmaOk) return new Response("Firma inválida", { status: 401 });

      let datos;
      try { datos = JSON.parse(cuerpo); } catch { return new Response("JSON inválido", { status: 400 }); }

      // Respondemos 200 de inmediato y procesamos en segundo plano
      ctx.waitUntil(procesar(datos, env).catch((e) => console.error("Error procesando:", e)));
      return new Response("OK", { status: 200 });
    }

    return new Response("Método no permitido", { status: 405 });
  },

  // Tarea diaria (gratis): consulta la base de datos para que el plan
  // gratuito de Supabase no pause el proyecto por inactividad.
  async scheduled(evento, env, ctx) {
    if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return;
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/destinos?select=id&limit=1`, {
      headers: { apikey: env.SUPABASE_KEY, Authorization: `Bearer ${env.SUPABASE_KEY}` },
    });
    console.log("Supabase despierto:", r.status);
  },
};

// ---------------------------------------------------------
// Seguridad: confirma que el mensaje viene realmente de Meta
// ---------------------------------------------------------
async function verificarFirma(cuerpo, cabecera, secreto) {
  if (!secreto) return true; // permite pruebas locales sin secreto (¡configúralo en producción!)
  if (!cabecera || !cabecera.startsWith("sha256=")) return false;
  const clave = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const firma = await crypto.subtle.sign("HMAC", clave, new TextEncoder().encode(cuerpo));
  const hex = [...new Uint8Array(firma)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const recibida = cabecera.slice(7);
  if (hex.length !== recibida.length) return false;
  let dif = 0;
  for (let i = 0; i < hex.length; i++) dif |= hex.charCodeAt(i) ^ recibida.charCodeAt(i);
  return dif === 0;
}

// ---------------------------------------------------------
// Procesamiento
// ---------------------------------------------------------
async function procesar(datos, env) {
  const valor = datos?.entry?.[0]?.changes?.[0]?.value;
  const mensaje = valor?.messages?.[0];
  if (!mensaje) return; // notificaciones de estado (entregado, leído…): se ignoran

  const para = mensaje.from;
  const nombre = valor?.contacts?.[0]?.profile?.name?.split(" ")[0] || "";

  await marcarLeido(env, mensaje.id);

  // ID del botón o fila elegida, o el texto escrito
  let entrada = "";
  if (mensaje.type === "interactive") {
    entrada = mensaje.interactive?.button_reply?.id || mensaje.interactive?.list_reply?.id || "";
  } else if (mensaje.type === "text") {
    entrada = interpretarTexto(mensaje.text?.body || "");
  } else {
    entrada = "menu"; // audios, fotos, stickers…
  }

  const respuestas = responder(entrada, { nombre, env });
  for (const r of respuestas) await enviar(env, para, r);
}

// Palabras clave para quien escribe en vez de tocar botones
function interpretarTexto(texto) {
  const t = texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (/(horario|atienden|abierto|direccion|ubicacion|donde estan|oficina)/.test(t)) return "contacto";
  if (/(asesor|humano|persona|agente|llamar)/.test(t)) return "asesor";
  if (/(pago|pagar|transferencia|deposito|tarjeta)/.test(t)) return "pagos";
  if (/(fecha|salida|diciembre)/.test(t)) return "fechas:panama";
  if (/(medida|personalizado|cotiza)/.test(t)) return "medida";
  if (/(destino|paquete|viaje)/.test(t)) return "destinos";
  for (const d of DESTINOS) {
    const n = d.nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(" ")[0];
    if (new RegExp("\\b" + n + "\\b").test(t)) return "dest:" + d.id;
  }
  if (/\b(hola|buenas|buenos|info|menu|inicio)\b/.test(t)) return "saludo";
  return "desconocido";
}

// ---------------------------------------------------------
// Lógica de respuestas (devuelve una lista de mensajes)
// ---------------------------------------------------------
export function responder(entrada, { nombre = "", env = {} } = {}) {
  const [accion, a, b] = entrada.split(":");
  const asesor = env.ASESOR_WHATSAPP || "593987620947";
  const linkAsesor = (texto) => `https://wa.me/${asesor}?text=${encodeURIComponent(texto)}`;

  switch (accion) {
    case "saludo":
      return [menuPrincipal(nombre ? `¡Hola, ${nombre}! 👋 Soy el asistente de *${AGENCIA.nombre}*.\nTe ayudo a encontrar tu próximo viaje en segundos. ¿Qué te gustaría hacer?` : TEXTOS.bienvenida)];

    case "menu":
      return [menuPrincipal("¿En qué más te ayudo?")];

    case "desconocido":
      return [menuPrincipal(TEXTOS.noEntendi)];

    case "destinos":
      return [lista(
        "🌴 Estos son nuestros destinos favoritos. Elige uno para ver detalles:",
        "Ver destinos",
        [{ title: "Destinos", rows: DESTINOS.map((d) => ({ id: "dest:" + d.id, title: d.nombre, description: d.desc })) }]
      )];

    case "dest": {
      const d = DESTINOS.find((x) => x.id === a);
      if (!d) return [menuPrincipal(TEXTOS.noEntendi)];
      const botonesDest = d.conFechas
        ? [{ id: "fechas:" + d.id, title: "Ver fechas" }, { id: "asesor", title: "Hablar con asesor" }, { id: "menu", title: "Menú" }]
        : [{ id: "cotizar:" + d.id, title: "Cotizar" }, { id: "destinos", title: "Otros destinos" }, { id: "menu", title: "Menú" }];
      return [botones(`*${d.nombre}*\n\n${d.info}`, botonesDest)];
    }

    case "fechas":
      return [lista(
        `📅 *Salidas confirmadas a Panamá · ${PANAMA.mes}*\nDesde USD ${PANAMA.precio} por persona. Elige tu fecha:`,
        "Elegir fecha",
        [{ title: "Diciembre", rows: PANAMA.salidas.map((s) => ({ id: "fecha:" + s.dia, title: `${s.semana} ${s.dia}`, description: `Quito — Panamá — Quito · USD ${PANAMA.precio}` })) }]
      )];

    case "fecha": {
      const dia = parseInt(a, 10);
      if (!PANAMA.salidas.some((s) => s.dia === dia)) return [menuPrincipal(TEXTOS.noEntendi)];
      return [botones(`Perfecto, salida del *${dia} de ${PANAMA.mes}* ✈️\n¿Cuántas personas viajan?`, [
        { id: `pax:${dia}:1`, title: "1 persona" },
        { id: `pax:${dia}:2`, title: "2 personas" },
        { id: `pax:${dia}:3`, title: "3 o más" },
      ])];
    }

    case "pax": {
      const dia = parseInt(a, 10);
      const n = parseInt(b, 10);
      if (!PANAMA.salidas.some((s) => s.dia === dia) || !(n >= 1 && n <= 3)) return [menuPrincipal(TEXTOS.noEntendi)];
      const viajeros = n === 3 ? "3 o más personas" : n === 1 ? "1 persona" : "2 personas";
      const total = n === 3 ? `desde USD ${(PANAMA.precio * 3).toLocaleString("en-US")}` : `USD ${(PANAMA.precio * n).toLocaleString("en-US")}`;
      const resumen = `Hola, quiero reservar el paquete a Panamá con salida el ${dia} de ${PANAMA.mes} para ${viajeros}.`;
      return [ctaUrl(
        `📝 *Tu resumen*\n\n• Destino: Panamá\n• Salida: ${dia} de ${PANAMA.mes}\n• Viajeros: ${viajeros}\n• Total estimado: *${total}*\n\nToca el botón para enviar este resumen a un asesor. Él confirma disponibilidad, impuestos y forma de pago.`,
        "Reservar con asesor",
        linkAsesor(resumen)
      )];
    }

    case "cotizar": {
      const d = DESTINOS.find((x) => x.id === a);
      const nombreDestino = d ? d.nombre : "un destino";
      return [ctaUrl(
        `Para cotizar *${nombreDestino}* un asesor necesita tus fechas aproximadas y el número de viajeros. Toca el botón y cuéntale 👇`,
        "Cotizar con asesor",
        linkAsesor(`Hola, quiero cotizar un viaje a ${nombreDestino}.`)
      )];
    }

    case "medida":
      return [ctaUrl(TEXTOS.medida, "Hablar con asesor", linkAsesor("Hola, quiero cotizar un viaje a medida."))];

    case "pagos":
      return [botones(TEXTOS.pagos, [{ id: "asesor", title: "Hablar con asesor" }, { id: "menu", title: "Menú" }])];

    case "faq":
      return [botones(TEXTOS.faq, [{ id: "asesor", title: "Hablar con asesor" }, { id: "menu", title: "Menú" }])];

    case "contacto":
      return [botones(
        `📍 *${AGENCIA.nombre}*\n${AGENCIA.direccion}\n\n🕘 Atendemos ${AGENCIA.horario}.\n🌐 ${AGENCIA.web}`,
        [{ id: "asesor", title: "Hablar con asesor" }, { id: "menu", title: "Menú" }]
      )];

    case "asesor":
      return [ctaUrl(
        `👩‍💼 Un asesor te atiende en horario de ${AGENCIA.horario}.\nToca el botón para escribirle directamente.`,
        "Escribir al asesor",
        linkAsesor("Hola, quiero hablar con un asesor de Caribbean Travel.")
      )];

    default:
      return [menuPrincipal(TEXTOS.noEntendi)];
  }
}

// ---------------------------------------------------------
// Constructores de mensajes de WhatsApp
// ---------------------------------------------------------
function menuPrincipal(texto) {
  return lista(texto, "Ver opciones", [{
    title: "Menú",
    rows: [
      { id: "destinos", title: "🌴 Ver destinos", description: "Panamá, Cartagena, Punta Cana y más" },
      { id: "fechas:panama", title: "📅 Salidas confirmadas", description: "Panamá en diciembre desde USD 450" },
      { id: "medida", title: "✈️ Viaje a medida", description: "Cuéntanos tu idea y la cotizamos" },
      { id: "pagos", title: "💳 Formas de pago", description: "Transferencia, depósito o link" },
      { id: "faq", title: "❓ Preguntas frecuentes", description: "Grupos, cambios y soporte" },
      { id: "asesor", title: "💬 Hablar con asesor", description: "Te atiende una persona" },
    ],
  }]);
}

function lista(cuerpo, textoBoton, secciones) {
  return { type: "interactive", interactive: { type: "list", body: { text: cuerpo }, action: { button: textoBoton, sections: secciones } } };
}

function botones(cuerpo, lista) {
  return {
    type: "interactive",
    interactive: { type: "button", body: { text: cuerpo }, action: { buttons: lista.slice(0, 3).map((b) => ({ type: "reply", reply: b })) } },
  };
}

function ctaUrl(cuerpo, textoBoton, url) {
  return {
    type: "interactive",
    interactive: { type: "cta_url", body: { text: cuerpo }, action: { name: "cta_url", parameters: { display_text: textoBoton, url } } },
  };
}

// ---------------------------------------------------------
// Llamadas a la API de WhatsApp
// ---------------------------------------------------------
function apiUrl(env) {
  const version = env.GRAPH_VERSION || "v23.0";
  return `https://graph.facebook.com/${version}/${env.PHONE_NUMBER_ID}/messages`;
}

async function enviar(env, para, mensaje) {
  const res = await fetch(apiUrl(env), {
    method: "POST",
    headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: para, ...mensaje }),
  });
  if (!res.ok) console.error("Error al enviar:", res.status, await res.text());
}

async function marcarLeido(env, idMensaje) {
  await fetch(apiUrl(env), {
    method: "POST",
    headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", status: "read", message_id: idMensaje }),
  }).catch(() => {});
}
