// Simulador local: prueba el bot SIN WhatsApp ni Meta.
// Uso:  node prueba/simular.mjs
// Muestra en consola lo que el bot respondería a cada mensaje.
import worker from "../src/index.js";

const env = { VERIFY_TOKEN: "prueba123", WHATSAPP_TOKEN: "x", PHONE_NUMBER_ID: "000", ASESOR_WHATSAPP: "593987620947" };
const enviados = [];
globalThis.fetch = async (url, opts) => {
  const body = JSON.parse(opts.body);
  if (!body.status) enviados.push(body);
  return new Response("{}", { status: 200 });
};

function resumen(m) {
  const i = m.interactive;
  if (!i) return m.text?.body;
  const base = i.body.text.replace(/\n/g, " ⏎ ").slice(0, 110);
  if (i.type === "list") return `[LISTA "${i.action.button}"] ${base}\n      → ` + i.action.sections[0].rows.map((r) => `${r.title} (${r.id})`).join(" | ");
  if (i.type === "button") return `[BOTONES] ${base}\n      → ` + i.action.buttons.map((b) => `${b.reply.title} (${b.reply.id})`).join(" | ");
  return `[ENLACE "${i.action.parameters.display_text}"] ${base}\n      → ${decodeURIComponent(i.action.parameters.url)}`;
}

async function simular(etiqueta, mensaje) {
  enviados.length = 0;
  const payload = { entry: [{ changes: [{ value: { contacts: [{ profile: { name: "María López" } }], messages: [{ from: "593999999999", id: "wamid.1", ...mensaje }] } }] }] };
  const pendientes = [];
  await worker.fetch(new Request("https://bot.test/webhook", { method: "POST", body: JSON.stringify(payload) }), env, { waitUntil: (p) => pendientes.push(p) });
  await Promise.all(pendientes);
  console.log(`\n👤 ${etiqueta}`);
  enviados.forEach((m) => console.log("🤖 " + resumen(m)));
}

const texto = (t) => ({ type: "text", text: { body: t } });
const toque = (id) => ({ type: "interactive", interactive: { type: "list_reply", list_reply: { id } } });

// Verificación del webhook
const v = await worker.fetch(new Request("https://bot.test/webhook?hub.mode=subscribe&hub.verify_token=prueba123&hub.challenge=OK123"), env, {});
console.log("Verificación webhook:", v.status, await v.text());

await simular('"Hola"', texto("Hola"));
await simular("toca: Ver destinos", toque("destinos"));
await simular("toca: Panamá", toque("dest:panama"));
await simular("toca: Ver fechas", toque("fechas:panama"));
await simular("toca: viernes 18", toque("fecha:18"));
await simular("toca: 2 personas", toque("pax:18:2"));
await simular('"quiero ir a cartagena"', texto("quiero ir a cartagena"));
await simular("toca: Cotizar Cartagena", toque("cotizar:cartagena"));
await simular('"cómo pago?"', texto("cómo pago?"));
await simular('"qué horario tienen"', texto("qué horario tienen"));
await simular("envía una foto", { type: "image", image: {} });

// Validación de límites de WhatsApp en todos los menús
import { responder } from "../src/index.js";
const ids = ["saludo", "destinos", "dest:panama", "dest:lima", "fechas:panama", "fecha:2", "pax:2:3", "cotizar:lima", "medida", "pagos", "faq", "asesor"];
const errores = [];
for (const id of ids) for (const m of responder(id)) {
  const i = m.interactive;
  if (i.body.text.length > 1024) errores.push(`${id}: cuerpo > 1024`);
  if (i.type === "list") {
    if (i.action.button.length > 20) errores.push(`${id}: botón de lista > 20`);
    const filas = i.action.sections.flatMap((s) => s.rows);
    if (filas.length > 10) errores.push(`${id}: > 10 filas`);
    filas.forEach((r) => { if (r.title.length > 24) errores.push(`${id}: título "${r.title}" > 24`); if ((r.description || "").length > 72) errores.push(`${id}: descripción > 72`); });
  }
  if (i.type === "button") i.action.buttons.forEach((b) => { if (b.reply.title.length > 20) errores.push(`${id}: botón "${b.reply.title}" > 20`); });
  if (i.type === "cta_url" && i.action.parameters.display_text.length > 20) errores.push(`${id}: texto CTA > 20`);
}
console.log("\nValidación de límites:", errores.length ? errores : "todo dentro de los límites ✅");
