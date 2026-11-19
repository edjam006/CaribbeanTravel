/* =========================================================
   Caribbean Travel · sitemap.xml automático desde Supabase
   Ruta: /sitemap.xml
   Cada destino publicado en el panel admin entra solo al sitemap.
   ========================================================= */

// Copia estos dos valores de sitio-web/js/config.js (la clave "anon/publishable", NUNCA la secret)
const SUPABASE_URL = "https://wcfzdopvncxjluxjfavg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_dyPSlVnPN5mbUDuldMHhVA_LPN_fo5a";

const SITIO = "https://caribbeantravelvacaciones.com";

// Páginas fijas del sitio. Agrega aquí cualquier página nueva (ej. "/blog/requisitos-panama").
const PAGINAS_FIJAS = ["/"];

function esc(t) {
  return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function onRequest(context) {
  const env = context.env;
  const key = env.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  let destinos = [];
  try {
    const r = await fetch(
      (env.SUPABASE_URL || SUPABASE_URL) +
      "/rest/v1/destinos?select=slug,actualizado_en&publicado=eq.true&order=orden.asc",
      { headers: { apikey: key, Authorization: "Bearer " + key } }
    );
    if (r.ok) destinos = await r.json();
  } catch (e) { destinos = []; }

  const urls = PAGINAS_FIJAS.map(p => "  <url><loc>" + esc(SITIO + p) + "</loc></url>")
    .concat(destinos.map(d =>
      "  <url><loc>" + esc(SITIO + "/destino?d=" + d.slug) + "</loc>" +
      (d.actualizado_en ? "<lastmod>" + String(d.actualizado_en).slice(0, 10) + "</lastmod>" : "") +
      "</url>"));

  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.join("\n") + "\n</urlset>\n";

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600"
    }
  });
}
