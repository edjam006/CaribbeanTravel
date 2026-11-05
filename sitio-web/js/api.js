/* =========================================================
   Caribbean Travel — Capa de datos
   Lee los destinos desde Supabase. Si no está configurado o
   falla, usa los destinos de js/datos.js como respaldo.
   ========================================================= */
(function () {
  "use strict";
  var C = window.CT_CONFIG || {};

  function configurado() {
    return !!(C.supabaseUrl && C.supabaseClave && window.supabase && window.supabase.createClient);
  }

  var _publico = null;
  function clientePublico() {
    if (!configurado()) return null;
    if (!_publico) {
      // Sin sesión: el sitio público nunca usa la sesión del admin
      _publico = window.supabase.createClient(C.supabaseUrl, C.supabaseClave, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });
    }
    return _publico;
  }

  /* ---------- Fechas ---------- */
  var DIAS = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  function aFecha(iso) {
    var p = String(iso).slice(0, 10).split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function hoy() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function infoFecha(iso) {
    var f = aFecha(iso);
    return { iso: String(iso).slice(0, 10), dia: f.getDate(), semana: DIAS[f.getDay()], mes: MESES[f.getMonth()], mesCorto: MESES[f.getMonth()].slice(0, 3), anio: f.getFullYear() };
  }

  /* ---------- Normalización: todo sale con la misma forma ---------- */
  function normalizar(d, origen) {
    var fotos = (d.fotos || d.destino_fotos || []).slice()
      .sort(function (a, b) { return (a.orden || 0) - (b.orden || 0); })
      .map(function (f) { return { id: f.id, url: f.url, alt: f.alt || d.nombre, ruta_storage: f.ruta_storage || null }; });
    var salidas = (d.salidas || []).map(function (s) { return typeof s === "string" ? s : s.fecha; })
      .filter(Boolean).sort();
    var precio = d.precio != null ? d.precio : d.precio_desde;
    function num(v) { return v == null || v === "" ? null : Number(v); }
    var precioNino = num(d.precioNino != null ? d.precioNino : d.precio_nino);
    var precioMayor = num(d.precioMayor != null ? d.precioMayor : d.precio_adulto_mayor);
    return {
      id: d.id || null,
      slug: d.slug,
      nombre: d.nombre,
      pais: d.pais || "",
      frase: d.frase || "",
      descripcion: d.descripcion || "",
      categorias: d.categorias || [],
      precio: precio == null || precio === "" ? null : Number(precio),   // adulto
      precioNino: precioNino,       // null = mismo que adulto
      precioMayor: precioMayor,     // null = mismo que adulto
      etiqueta: d.etiqueta || "",
      ruta: d.ruta || "",
      aerolinea: d.aerolinea || "",
      incluye: d.incluye || [],
      itinerario: d.itinerario || [],
      fotos: fotos,
      salidas: salidas,
      destacado: !!d.destacado,
      publicado: d.publicado !== false,
      orden: d.orden || 0,
      origen: origen
    };
  }

  function salidasFuturas(destino) {
    var h = hoy();
    return destino.salidas.filter(function (s) { return aFecha(s) >= h; }).map(infoFecha);
  }

  function locales() {
    return ((window.CT_DATOS && window.CT_DATOS.destinos) || []).map(function (d, i) {
      var n = normalizar(d, "local"); n.orden = i; return n;
    });
  }

  var SELECT = "*, destino_fotos(id,url,alt,orden,ruta_storage), salidas(fecha)";

  /* ---------- Consultas públicas ---------- */
  function listar() {
    var sb = clientePublico();
    if (!sb) return Promise.resolve(locales());
    return sb.from("destinos").select(SELECT).eq("publicado", true)
      .order("orden", { ascending: true }).order("nombre", { ascending: true })
      .then(function (r) {
        if (r.error) throw r.error;
        return r.data.map(function (d) { return normalizar(d, "nube"); });
      })
      .catch(function (e) {
        console.warn("[Caribbean Travel] No se pudo leer la base de datos; uso los destinos locales.", e);
        return locales();
      });
  }

  function obtener(slug) {
    return listar().then(function (lista) {
      return lista.filter(function (d) { return d.slug === slug; })[0] || null;
    });
  }

  /* ---------- Utilidades compartidas ---------- */
  function linkWhatsApp(texto) {
    return "https://wa.me/" + (C.whatsapp || "593987620947") + "?text=" + encodeURIComponent(texto);
  }
  function escapar(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function dinero(n) { return "USD " + Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 }); }
  function slugificar(t) {
    return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  }

  window.CT_API = {
    configurado: configurado,
    listar: listar,
    obtener: obtener,
    normalizar: normalizar,
    locales: locales,
    salidasFuturas: salidasFuturas,
    infoFecha: infoFecha,
    linkWhatsApp: linkWhatsApp,
    escapar: escapar,
    dinero: dinero,
    slugificar: slugificar,
    SELECT: SELECT,
    // Tipos de viajero de la tarjeta de reserva
    PASAJEROS: [
      { id: "adultos", nombre: "Adultos", detalle: "", uno: "adulto", varios: "adultos", inicial: 2 },
      { id: "ninos", nombre: "Niños", detalle: "Menores de 11 años", uno: "niño menor de 11 años", varios: "niños menores de 11 años", inicial: 0 },
      { id: "mayores", nombre: "Adultos mayores", detalle: "", uno: "adulto mayor", varios: "adultos mayores", inicial: 0 }
    ],
    precioPasajero: function (d, tipo) {
      if (d.precio == null) return null;
      if (tipo === "ninos" && d.precioNino != null) return d.precioNino;
      if (tipo === "mayores" && d.precioMayor != null) return d.precioMayor;
      return d.precio;
    },
    CATEGORIAS: [
      { id: "playa", nombre: "Playa" },
      { id: "ciudad", nombre: "Ciudad" },
      { id: "naturaleza", nombre: "Naturaleza" },
      { id: "sabores", nombre: "Gastronomía" },
      { id: "cerca", nombre: "A pocas horas" }
    ]
  };
})();
