/* =========================================================
   Caribbean Travel — Panel: SALIDAS CONFIRMADAS
   Módulo aparte de los destinos. Usa la tabla
   public.salidas_confirmadas (supabase/05_salidas_confirmadas.sql).
   Depende de admin.js (window.CT_ADMIN se crea al iniciar sesión).
   ========================================================= */
(function () {
  "use strict";
  var API = window.CT_API;
  var esc = API.escapar;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  function A() { return window.CT_ADMIN; }

  var TABLA = "salidas_confirmadas";
  var salidas = [];
  var ed = null;        // salida en edición
  var sucio = false;
  var form = $("#form-salida");

  function hoyISO() {
    return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }
  function mensajeError(e) {
    var m = (e && (e.message || e.error_description)) || String(e);
    if (/salidas_confirmadas/i.test(m) && /does not exist|schema cache|not find/i.test(m)) {
      return "Falta crear la tabla: ejecuta supabase/05_salidas_confirmadas.sql en el SQL Editor de Supabase.";
    }
    return A().mensajeError(e);
  }

  /* =========================================================
     LISTA
     ========================================================= */
  async function cargar() {
    var X = A();
    X.mostrar("sc-lista");
    $("#sc-lista").innerHTML = '<li class="texto-suave">Cargando salidas…</li>';
    var r = await X.sb.from(TABLA).select("*").order("orden", { ascending: true }).order("creado_en", { ascending: true });
    if (r.error) {
      $("#sc-lista").innerHTML = '<li class="adm-error">' + esc(mensajeError(r.error)) + "</li>";
      return;
    }
    salidas = r.data.map(API.normalizarSalidaConfirmada);
    pintarLista();
  }

  function pintarLista() {
    var X = A();
    var pub = salidas.filter(function (s) { return s.publicado; }).length;
    $("#sc-resumen").textContent = salidas.length
      ? X.plural(salidas.length, "salida", "salidas") + " · " + X.plural(pub, "publicada", "publicadas")
      : "";
    if (!salidas.length) {
      $("#sc-lista").innerHTML = '<li class="texto-suave">Aún no hay salidas confirmadas. Toca “+ Nueva salida confirmada”.</li>';
      return;
    }
    $("#sc-lista").innerHTML = salidas.map(function (s) {
      var futuras = API.fechasFuturas(s.fechas);
      var proxima = futuras[0];
      return '<li class="adm-item adm-item-sc">' +
        '<div class="adm-mini adm-mini-sc" aria-hidden="true">✈</div>' +
        "<div><h3>" + esc(s.ruta) + '</h3><p class="adm-meta">' +
          (s.publicado ? '<span class="adm-badge pub">Publicada</span>' : '<span class="adm-badge borr">Borrador</span>') +
          (s.publicado && !futuras.length ? '<span class="adm-badge borr">Sin fechas futuras: no se ve</span>' : "") +
          (s.aerolinea ? "<span>" + esc(s.aerolinea) + "</span>" : "") +
          "<span>" + (s.precio != null ? "Desde " + API.dinero(s.precio) : "Sin precio") + "</span>" +
          "<span>" + futuras.length + (futuras.length === 1 ? " fecha próxima" : " fechas próximas") + "</span>" +
          (proxima ? "<span>Próxima: " + proxima.dia + " " + proxima.mesCorto + " " + proxima.anio + "</span>" : "") +
        "</p></div>" +
        '<div class="adm-item-acciones">' +
          '<button type="button" class="btn btn-borde" data-sc-accion="editar" data-id="' + s.id + '">Editar</button>' +
          '<button type="button" class="btn btn-borde adm-peligro" data-sc-accion="borrar" data-id="' + s.id + '" aria-label="Borrar ' + esc(s.ruta) + '">Borrar</button>' +
        "</div></li>";
    }).join("");
  }

  $("#sc-btn-nuevo").addEventListener("click", function () { abrir(null); });
  $("#sc-lista").addEventListener("click", function (e) {
    var b = e.target.closest("[data-sc-accion]");
    if (!b) return;
    var s = salidas.filter(function (x) { return x.id === b.getAttribute("data-id"); })[0];
    if (!s) return;
    if (b.getAttribute("data-sc-accion") === "editar") abrir(s);
    else borrar(s, b);
  });

  async function borrar(s, btn) {
    var X = A();
    if (!confirm("¿Borrar la salida «" + s.ruta + "»?\nSe eliminan también sus fechas. No se puede deshacer.")) return;
    if (btn) X.ocupado(btn, true, "Borrando…");
    var r = await X.sb.from(TABLA).delete().eq("id", s.id);
    if (btn) X.ocupado(btn, false);
    if (r.error) { X.toast(mensajeError(r.error), true); return; }
    sucio = false;
    X.toast("Salida «" + s.ruta + "» borrada");
    cargar();
  }

  /* =========================================================
     EDITOR
     ========================================================= */
  function abrir(s) {
    ed = { id: s ? s.id : null, original: s, fechas: s ? s.fechas.slice() : [] };
    form.reset();
    form.origen.value = s ? s.origen : "Quito";
    form.destino.value = s ? s.destino : "";
    form.ida_vuelta.checked = s ? s.idaVuelta : true;
    form.titulo.value = s ? s.tituloPropio : "";
    form.aerolinea.value = s ? s.aerolinea : "";
    form.precio.value = s && s.precio != null ? s.precio : "";
    form.publicado.checked = s ? s.publicado : true;
    form.orden.value = s ? s.orden : salidas.length;
    $("#sc-incluye").innerHTML = "";
    var inc = s ? s.incluye : [
      { titulo: "Equipaje de bodega", valor: "23 kg" },
      { titulo: "Equipaje de mano", valor: "10 kg" },
      { titulo: "Artículo personal", valor: "Incluido" }
    ];
    inc.forEach(agregarIncluye);
    $("#sc-editor-titulo").textContent = s ? "Editar · " + s.ruta : "Nueva salida confirmada";
    $("#sc-btn-borrar").hidden = !s;
    A().errorEn("sc-editor-error", "");
    pintarRuta();
    pintarFechas();
    sucio = false;
    A().mostrar("sc-editor");
    if (!s) setTimeout(function () { form.destino.focus(); }, 50);
  }

  function pintarRuta() {
    var o = form.origen.value.trim() || "Origen", d = form.destino.value.trim() || "Destino";
    $("#sc-ruta-vista").textContent = "Se verá así: " + o + " — " + d + (form.ida_vuelta.checked ? " — " + o : "");
    form.titulo.placeholder = "Vacío = “" + (form.destino.value.trim() || "Destino") + ", cuando tú quieras.”";
  }

  form.addEventListener("input", function (e) {
    sucio = true;
    if (["origen", "destino", "ida_vuelta"].indexOf(e.target.name) !== -1) pintarRuta();
  });
  form.addEventListener("change", function (e) { if (e.target.name === "ida_vuelta") { sucio = true; pintarRuta(); } });

  $("#sc-btn-volver").addEventListener("click", function () {
    if (sucio && !confirm("Tienes cambios sin guardar. ¿Salir sin guardar?")) return;
    sucio = false;
    A().mostrar("sc-lista");
  });
  $("#sc-btn-borrar").addEventListener("click", function () { if (ed && ed.original) borrar(ed.original, this); });
  window.addEventListener("beforeunload", function (e) {
    if (sucio && !$("#vista-sc-editor").hidden) { e.preventDefault(); e.returnValue = ""; }
  });

  /* ---------- Qué incluye ---------- */
  function agregarIncluye(x) {
    var div = document.createElement("div");
    div.className = "adm-fila-item";
    div.innerHTML =
      '<input type="text" maxlength="60" placeholder="Ej. Equipaje de bodega" aria-label="Qué incluye">' +
      '<input type="text" maxlength="60" placeholder="Ej. 23 kg" aria-label="Detalle">' +
      '<button type="button" class="adm-x" aria-label="Quitar">✕</button>';
    var ins = $$("input", div);
    ins[0].value = (x && x.titulo) || "";
    ins[1].value = (x && x.valor) || "";
    $("#sc-incluye").appendChild(div);
  }
  $("#sc-btn-add-incluye").addEventListener("click", function () {
    agregarIncluye();
    sucio = true;
    $("#sc-incluye").lastChild.querySelector("input").focus();
  });
  $("#sc-incluye").addEventListener("click", function (e) {
    if (!e.target.classList.contains("adm-x")) return;
    e.target.parentNode.remove();
    sucio = true;
  });
  function leerIncluye() {
    return $$("#sc-incluye .adm-fila-item").map(function (f) {
      var i = $$("input", f);
      return { titulo: i[0].value.trim(), valor: i[1].value.trim() };
    }).filter(function (o) { return o.titulo || o.valor; });
  }

  /* ---------- Fechas ---------- */
  function pintarFechas() {
    var h = hoyISO();
    $("#sc-fechas").innerHTML = ed.fechas.length ? ed.fechas.map(function (iso) {
      var f = API.infoFecha(iso);
      return '<li class="' + (iso < h ? "pasada" : "") + '">' + f.semana.charAt(0) + f.semana.slice(1).toLowerCase() + " " + f.dia + " " + f.mesCorto + " " + f.anio +
        '<button type="button" data-sc-fecha="' + iso + '" aria-label="Quitar ' + f.dia + " de " + f.mes + '">✕</button></li>';
    }).join("") : '<li class="texto-suave" style="background:none;border:0;padding:0">Agrega al menos una fecha.</li>';
  }
  $("#sc-btn-add-fecha").addEventListener("click", function () {
    var v = $("#sc-input-fecha").value;
    if (!v) { A().toast("Elige una fecha primero.", true); return; }
    if (ed.fechas.indexOf(v) === -1) { ed.fechas.push(v); ed.fechas.sort(); sucio = true; }
    A().errorEn("sc-editor-error", "");
    $("#sc-input-fecha").value = "";
    pintarFechas();
  });
  $("#sc-input-fecha").addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); $("#sc-btn-add-fecha").click(); }
  });
  $("#sc-fechas").addEventListener("click", function (e) {
    var b = e.target.closest("[data-sc-fecha]");
    if (!b) return;
    ed.fechas = ed.fechas.filter(function (x) { return x !== b.getAttribute("data-sc-fecha"); });
    sucio = true;
    pintarFechas();
  });

  /* ---------- Guardar ---------- */
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var X = A();
    X.errorEn("sc-editor-error", "");
    var precio = String(form.precio.value).trim();
    var datos = {
      origen: form.origen.value.trim(),
      destino: form.destino.value.trim(),
      ida_vuelta: form.ida_vuelta.checked,
      titulo: form.titulo.value.trim() || null,
      aerolinea: form.aerolinea.value.trim() || null,
      precio_desde: precio === "" ? null : Math.max(0, Number(precio)),
      incluye: leerIncluye(),
      fechas: ed.fechas.slice(),
      publicado: form.publicado.checked,
      orden: parseInt(form.orden.value, 10) || 0
    };
    if (!datos.origen) { X.errorEn("sc-editor-error", "Escribe desde dónde sale el vuelo."); form.origen.focus(); return; }
    if (!datos.destino) { X.errorEn("sc-editor-error", "Escribe el destino."); form.destino.focus(); return; }
    if (!datos.fechas.length) { X.errorEn("sc-editor-error", "Agrega al menos una fecha de salida."); $("#sc-input-fecha").focus(); return; }

    var btn = $("#sc-btn-guardar");
    X.ocupado(btn, true);
    var r = ed.id
      ? await X.sb.from(TABLA).update(datos).eq("id", ed.id).select("id").single()
      : await X.sb.from(TABLA).insert(datos).select("id").single();
    X.ocupado(btn, false);
    if (r.error) {
      X.errorEn("sc-editor-error", mensajeError(r.error));
      X.toast("No se pudo guardar: " + mensajeError(r.error), true);
      return;
    }
    sucio = false;
    X.toast("Salida guardada ✓");
    cargar();
  });

  /* ---------- Para admin.js (pestañas y salir) ---------- */
  window.CT_SALIDAS_ADMIN = {
    cargar: cargar,
    haySinGuardar: function () { return sucio && !$("#vista-sc-editor").hidden; },
    descartar: function () { sucio = false; }
  };
})();
