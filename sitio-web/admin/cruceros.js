/* =========================================================
   PANEL · Cruceros (MSC Opera, sin visa)
   Lista y editor de rutas: nombre del botón, etiqueta,
   recorrido (puertos en orden), barco, duración y fechas.
   Sin precio. "Qué incluye" es fijo (CT_API.CRUCERO_INCLUYE).
   Usa la tabla public.cruceros (supabase/06_cruceros.sql).
   Depende de admin.js (window.CT_ADMIN se crea al iniciar sesión).
   ========================================================= */
(function () {
  "use strict";
  var API = window.CT_API;
  var esc = API.escapar;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  function A() { return window.CT_ADMIN; }

  var TABLA = "cruceros";
  var rutas = [];
  var ed = null;      // ruta en edición
  var sucio = false;
  var form = $("#form-crucero");

  $("#cr-incluye-fijo").innerHTML = API.CRUCERO_INCLUYE.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");

  function hoyISO() {
    return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }
  function mensajeError(e) {
    var m = (e && (e.message || e.error_description)) || String(e);
    if (/cruceros/i.test(m) && /does not exist|schema cache|not find/i.test(m)) {
      return "Falta crear la tabla: ejecuta supabase/06_cruceros.sql en el SQL Editor de Supabase.";
    }
    return A().mensajeError(e);
  }

  /* =========================================================
     LISTA
     ========================================================= */
  async function cargar() {
    var X = A();
    X.mostrar("cr-lista");
    $("#cr-lista").innerHTML = '<li class="texto-suave">Cargando cruceros…</li>';
    var r = await X.sb.from(TABLA).select("*").order("orden", { ascending: true }).order("creado_en", { ascending: true });
    if (r.error) {
      $("#cr-lista").innerHTML = '<li class="adm-error">' + esc(mensajeError(r.error)) + "</li>";
      return;
    }
    rutas = r.data.map(API.normalizarCrucero);
    pintarLista();
  }

  function pintarLista() {
    var X = A();
    var pub = rutas.filter(function (c) { return c.publicado; }).length;
    $("#cr-resumen").textContent = rutas.length
      ? X.plural(rutas.length, "ruta", "rutas") + " · " + X.plural(pub, "publicada", "publicadas")
      : "";
    if (!rutas.length) {
      $("#cr-lista").innerHTML = '<li class="texto-suave">Aún no hay rutas de crucero. Toca “+ Nueva ruta de crucero”.</li>';
      return;
    }
    $("#cr-lista").innerHTML = rutas.map(function (c) {
      var futuras = API.fechasFuturas(c.fechas);
      var proxima = futuras[0];
      return '<li class="adm-item adm-item-sc">' +
        '<div class="adm-mini adm-mini-sc" aria-hidden="true">🚢</div>' +
        "<div><h3>" + esc(c.nombre) + (c.etiqueta ? ' <small class="texto-suave">· ' + esc(c.etiqueta) + "</small>" : "") + "</h3>" +
          (c.recorrido.length ? '<p class="adm-meta cr-adm-ruta">' + esc(c.recorrido.join(" → ")) + "</p>" : "") +
          '<p class="adm-meta">' +
          (c.publicado ? '<span class="adm-badge pub">Publicada</span>' : '<span class="adm-badge borr">Borrador</span>') +
          (c.publicado && !futuras.length ? '<span class="adm-badge borr">Sin fechas futuras: no se ve</span>' : "") +
          "<span>" + esc(c.barco) + "</span>" +
          "<span>" + futuras.length + (futuras.length === 1 ? " fecha próxima" : " fechas próximas") + "</span>" +
          (proxima ? "<span>Próxima: " + proxima.dia + " " + proxima.mesCorto + " " + proxima.anio + "</span>" : "") +
        "</p></div>" +
        '<div class="adm-item-acciones">' +
          '<button type="button" class="btn btn-borde" data-cr-accion="editar" data-id="' + c.id + '">Editar</button>' +
          '<button type="button" class="btn btn-borde adm-peligro" data-cr-accion="borrar" data-id="' + c.id + '" aria-label="Borrar ' + esc(c.nombre) + '">Borrar</button>' +
        "</div></li>";
    }).join("");
  }

  $("#cr-btn-nuevo").addEventListener("click", function () { abrir(null); });
  $("#cr-lista").addEventListener("click", function (e) {
    var b = e.target.closest("[data-cr-accion]");
    if (!b) return;
    var c = rutas.filter(function (x) { return x.id === b.getAttribute("data-id"); })[0];
    if (!c) return;
    if (b.getAttribute("data-cr-accion") === "editar") abrir(c);
    else borrar(c, b);
  });

  async function borrar(c, btn) {
    var X = A();
    if (!confirm("¿Borrar la ruta «" + c.nombre + "»?\nSe eliminan también sus fechas. No se puede deshacer.")) return;
    if (btn) X.ocupado(btn, true, "Borrando…");
    var r = await X.sb.from(TABLA).delete().eq("id", c.id);
    if (btn) X.ocupado(btn, false);
    if (r.error) { X.toast(mensajeError(r.error), true); return; }
    sucio = false;
    X.toast("Ruta «" + c.nombre + "» borrada");
    cargar();
  }

  /* =========================================================
     EDITOR
     ========================================================= */
  function abrir(c) {
    ed = { id: c ? c.id : null, original: c, fechas: c ? c.fechas.slice() : [] };
    form.reset();
    form.nombre.value = c ? c.nombre : "";
    form.etiqueta.value = c ? c.etiqueta : "Ruta " + (rutas.length + 1);
    form.barco.value = c ? c.barco : "MSC Opera";
    form.duracion.value = c ? c.duracion : "8 días / 7 noches";
    form.publicado.checked = c ? c.publicado : true;
    form.orden.value = c ? c.orden : rutas.length;
    $("#cr-recorrido").innerHTML = "";
    (c && c.recorrido.length ? c.recorrido : ["La Romana", "", "La Romana"]).forEach(function (p) { agregarPuerto(p); });
    $("#cr-editor-titulo").textContent = c ? "Editar · " + c.nombre : "Nueva ruta de crucero";
    $("#cr-btn-borrar").hidden = !c;
    A().errorEn("cr-editor-error", "");
    pintarRecorrido();
    pintarFechas();
    sucio = false;
    A().mostrar("cr-editor");
    if (!c) setTimeout(function () { form.nombre.focus(); }, 50);
  }

  form.addEventListener("input", function (e) {
    sucio = true;
    if (e.target.closest("#cr-recorrido")) pintarRecorrido();
  });
  form.addEventListener("change", function () { sucio = true; });

  $("#cr-btn-volver").addEventListener("click", function () {
    if (sucio && !confirm("Tienes cambios sin guardar. ¿Salir sin guardar?")) return;
    sucio = false;
    A().mostrar("cr-lista");
  });
  $("#cr-btn-borrar").addEventListener("click", function () { if (ed && ed.original) borrar(ed.original, this); });
  window.addEventListener("beforeunload", function (e) {
    if (sucio && !$("#vista-cr-editor").hidden) { e.preventDefault(); e.returnValue = ""; }
  });

  /* ---------- Recorrido ---------- */
  function agregarPuerto(valor, antesDe) {
    var li = document.createElement("li");
    li.className = "adm-fila-item cr-adm-puerto";
    li.innerHTML =
      '<span class="num" aria-hidden="true"></span>' +
      '<input type="text" maxlength="60" placeholder="Ej. Road Town (Tórtola)" aria-label="Puerto">' +
      '<button type="button" class="adm-x" data-mover="-1" aria-label="Subir">↑</button>' +
      '<button type="button" class="adm-x" data-mover="1" aria-label="Bajar">↓</button>' +
      '<button type="button" class="adm-x" data-quitar aria-label="Quitar">✕</button>';
    $("input", li).value = valor || "";
    $("#cr-recorrido").insertBefore(li, antesDe || null);
    return li;
  }
  function leerRecorrido() {
    return $$("#cr-recorrido input").map(function (i) { return i.value.trim(); }).filter(Boolean);
  }
  function pintarRecorrido() {
    $$("#cr-recorrido .num").forEach(function (n, k) { n.textContent = k + 1; });
    var r = leerRecorrido();
    $("#cr-recorrido-vista").textContent = r.length ? "Se verá así: " + r.join(" → ") : "";
  }
  $("#cr-btn-add-puerto").addEventListener("click", function () {
    // El puerto nuevo va antes del último (normalmente "La Romana", el regreso)
    var items = $$("#cr-recorrido li");
    var ultimo = items[items.length - 1];
    var li = agregarPuerto("", items.length > 1 ? ultimo : null);
    sucio = true;
    pintarRecorrido();
    $("input", li).focus();
  });
  $("#cr-recorrido").addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    var li = b.closest("li");
    if (b.hasAttribute("data-quitar")) {
      li.remove();
    } else {
      var paso = +b.getAttribute("data-mover");
      var otro = paso < 0 ? li.previousElementSibling : li.nextElementSibling;
      if (!otro) return;
      if (paso < 0) li.parentNode.insertBefore(li, otro);
      else li.parentNode.insertBefore(otro, li);
      b.focus();
    }
    sucio = true;
    pintarRecorrido();
  });

  /* ---------- Fechas ---------- */
  function pintarFechas() {
    var h = hoyISO();
    $("#cr-fechas").innerHTML = ed.fechas.length ? ed.fechas.map(function (iso) {
      var f = API.infoFecha(iso);
      return '<li class="' + (iso < h ? "pasada" : "") + '">' + f.semana.charAt(0) + f.semana.slice(1).toLowerCase() + " " + f.dia + " " + f.mesCorto + " " + f.anio +
        '<button type="button" data-cr-fecha="' + iso + '" aria-label="Quitar ' + f.dia + " de " + f.mes + '">✕</button></li>';
    }).join("") : '<li class="texto-suave" style="background:none;border:0;padding:0">Agrega al menos una fecha.</li>';
  }
  $("#cr-btn-add-fecha").addEventListener("click", function () {
    var v = $("#cr-input-fecha").value;
    if (!v) { A().toast("Elige una fecha primero.", true); return; }
    if (ed.fechas.indexOf(v) === -1) { ed.fechas.push(v); ed.fechas.sort(); sucio = true; }
    A().errorEn("cr-editor-error", "");
    $("#cr-input-fecha").value = "";
    pintarFechas();
  });
  $("#cr-input-fecha").addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); $("#cr-btn-add-fecha").click(); }
  });
  $("#cr-fechas").addEventListener("click", function (e) {
    var b = e.target.closest("[data-cr-fecha]");
    if (!b) return;
    ed.fechas = ed.fechas.filter(function (x) { return x !== b.getAttribute("data-cr-fecha"); });
    sucio = true;
    pintarFechas();
  });

  /* ---------- Guardar ---------- */
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var X = A();
    X.errorEn("cr-editor-error", "");
    var datos = {
      nombre: form.nombre.value.trim(),
      etiqueta: form.etiqueta.value.trim() || null,
      recorrido: leerRecorrido(),
      barco: form.barco.value.trim() || "MSC Opera",
      duracion: form.duracion.value.trim() || "8 días / 7 noches",
      fechas: ed.fechas.slice(),
      publicado: form.publicado.checked,
      orden: parseInt(form.orden.value, 10) || 0
    };
    if (datos.nombre.length < 2) { X.errorEn("cr-editor-error", "Escribe el nombre de la ruta (ej. Catalina Island)."); form.nombre.focus(); return; }
    if (datos.recorrido.length < 2) { X.errorEn("cr-editor-error", "Agrega al menos dos puertos al recorrido."); return; }
    if (!datos.fechas.length) { X.errorEn("cr-editor-error", "Agrega al menos una fecha de salida."); $("#cr-input-fecha").focus(); return; }

    var btn = $("#cr-btn-guardar");
    X.ocupado(btn, true);
    var r = ed.id
      ? await X.sb.from(TABLA).update(datos).eq("id", ed.id).select("id").single()
      : await X.sb.from(TABLA).insert(datos).select("id").single();
    X.ocupado(btn, false);
    if (r.error) {
      X.errorEn("cr-editor-error", mensajeError(r.error));
      X.toast("No se pudo guardar: " + mensajeError(r.error), true);
      return;
    }
    sucio = false;
    X.toast("Ruta guardada ✓");
    cargar();
  });

  /* ---------- Para admin.js (pestañas y salir) ---------- */
  window.CT_CRUCEROS_ADMIN = {
    cargar: cargar,
    haySinGuardar: function () { return sucio && !$("#vista-cr-editor").hidden; },
    descartar: function () { sucio = false; }
  };
})();
