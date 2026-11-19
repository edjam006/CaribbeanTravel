/* =========================================================
   Caribbean Travel · SEO de cada destino (Cloudflare Pages Function)
   Ruta: /destino?d=slug  (también /destino.html?d=slug)

   Antes de que la página llegue al navegador (o a Google), lee el
   destino en Supabase y le pone al <head>:
   título, descripción, canonical, Open Graph y datos estructurados.
   El resto de la página sigue funcionando igual que antes.
   ========================================================= */

// Copia estos dos valores de sitio-web/js/config.js (la clave "anon/publishable", NUNCA la secret)
const SUPABASE_URL = "https://wcfzdopvncxjluxjfavg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_dyPSlVnPN5mbUDuldMHhVA_LPN_fo5a";

const SITIO = "https://caribbeantravelvacaciones.com";
const MARCA = "Caribbean Travel";

function esc(t) {
  return String(t == null ? "" : t)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function recortar(t, max) {
  t = String(t || "").replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1).replace(/\s+\S*$/, "") + "…" : t;
}

async function leerDestino(env, slug) {
  const url = (env.SUPABASE_URL || SUPABASE_URL) +
    "/rest/v1/destinos?select=slug,nombre,pais,frase,descripcion,precio_desde,ruta,aerolinea,destino_fotos(url,orden)" +
    "&publicado=eq.true&slug=eq." + encodeURIComponent(slug) + "&limit=1";
  const key = env.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  const r = await fetch(url, {
    headers: { apikey: key, Authorization: "Bearer " + key },
    cf: { cacheTtl: 300, cacheEverything: true }
  });
  if (!r.ok) return null;
  const filas = await r.json();
  return filas[0] || null;
}

export async function onRequest(context) {
  const respuesta = await context.next();
  const tipo = respuesta.headers.get("content-type") || "";
  if (!tipo.includes("text/html")) return respuesta;

  const slug = new URL(context.request.url).searchParams.get("d") || "";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return respuesta;

  let d = null;
  try { d = await leerDestino(context.env, slug); } catch (e) { d = null; }
  if (!d) return respuesta;

  const fotos = (d.destino_fotos || []).slice().sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const foto = fotos[0] ? fotos[0].url : SITIO + "/logo-512.png";
  const canonical = SITIO + "/destino?d=" + d.slug;
  const precio = d.precio_desde != null ? Number(d.precio_desde) : null;

  const titulo = d.nombre + " desde Quito · " + MARCA;
  const descripcion = recortar(
    (precio != null ? "Desde $" + precio + ". " : "") +
    (d.frase ? d.frase + ". " : "") +
    (d.descripcion || "Paquete armado por una agencia de viajes en Quito.") +
    " Cotiza por WhatsApp.", 158);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: d.nombre + " desde Quito",
    description: recortar(d.descripcion || d.frase || "", 500),
    image: fotos.map(f => f.url),
    url: canonical,
    touristType: "Viajeros desde Ecuador",
    itinerary: d.ruta ? { "@type": "ItemList", name: d.ruta } : undefined,
    provider: { "@type": "TravelAgency", name: MARCA, url: SITIO + "/" },
    offers: precio != null ? {
      "@type": "Offer",
      price: precio,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: canonical,
      seller: { "@type": "TravelAgency", name: MARCA }
    } : undefined
  };

  const head =
    '\n<meta name="description" content="' + esc(descripcion) + '">' +
    '\n<link rel="canonical" href="' + esc(canonical) + '">' +
    '\n<meta property="og:type" content="website">' +
    '\n<meta property="og:site_name" content="' + MARCA + '">' +
    '\n<meta property="og:title" content="' + esc(titulo) + '">' +
    '\n<meta property="og:description" content="' + esc(descripcion) + '">' +
    '\n<meta property="og:url" content="' + esc(canonical) + '">' +
    '\n<meta property="og:image" content="' + esc(foto) + '">' +
    '\n<meta name="twitter:card" content="summary_large_image">' +
    '\n<script type="application/ld+json">' +
    JSON.stringify(jsonLd).replace(/</g, "\\u003c") +
    "</script>\n";

  const quitar = { element(e) { e.remove(); } };

  return new HTMLRewriter()
    .on("title", { element(e) { e.setInnerContent(titulo); } })
    .on('meta[name="description"]', quitar)
    .on('link[rel="canonical"]', quitar)
    .on('meta[property^="og:"]', quitar)
    .on('meta[name^="twitter:"]', quitar)
    .on("head", { element(e) { e.append(head, { html: true }); } })
    .transform(respuesta);
}
