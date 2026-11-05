/* =========================================================
   BUSCADOR — Caribbean Travel
   Un solo formulario para las tres pestañas, que envía la
   cotización en UN solo mensaje de WhatsApp:
   • Paquetes:       ida y vuelta / solo ida, ruta, viajeros.
   • Solo vuelos:    ida y vuelta / solo ida, ruta, pasajeros y clase.
   • Viaje a medida: además multidestino, calendario y extras.

   Se conecta solo: oculta #form-buscar y muestra este
   formulario según la pestaña elegida. No hay que tocar app.js.
   Uso: <script src="js/viaje-medida.js" defer></script>
   ========================================================= */
(function () {
  "use strict";

  var WA_NUMERO = "593987620947";   // respaldo si API.linkWhatsApp no existe
  var MAX_TRAMOS = 5;
  var MAX_PASAJEROS = 9;            // sin contar bebés
  var MESES_ADELANTE = 18;

  var buscador = document.querySelector(".buscador");
  var formBase = document.getElementById("form-buscar");
  var pestanas = buscador && buscador.querySelector(".pestanas");
  if (!buscador || !formBase || !pestanas) return;

  /* ---------- Utilidades ---------- */
  var DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  var DIAS_CAB = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
  var MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  var MESES_L = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function hoy() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function clave(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function mismaFecha(a, b) { return !!a && !!b && clave(a) === clave(b); }
  function fCorta(d) { return DIAS[d.getDay()] + " " + d.getDate() + " " + MESES[d.getMonth()]; }
  function fLarga(d) { return fCorta(d) + " " + d.getFullYear(); }
  function esMovil() { return window.matchMedia("(max-width: 700px)").matches; }

  var ICO = {
    cal: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    swap: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5"/></svg>',
    mas: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    menos: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    persona: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20.5c.8-4 3.8-6 7.5-6s6.7 2 7.5 6"/></svg>',
    izq: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    der: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
    origen: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/></svg>',
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-6.1-6.5-11a6.5 6.5 0 0 1 13 0c0 4.9-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/></svg>'
  };

  /* ---------- Modos (una por pestaña) ---------- */
  var MODOS = {
    paquete: {
      tipos: ["ida-vuelta", "solo-ida"], fechas: false, clase: false, extras: false,
      boton: "Cotizar paquete", etqPax: "Viajeros",
      saludo: "Hola, quiero cotizar un *paquete* 🌴"
    },
    vuelo: {
      tipos: ["ida-vuelta", "solo-ida"], fechas: false, clase: true, extras: false,
      boton: "Cotizar vuelo", etqPax: "Pasajeros y clase",
      saludo: "Hola, quiero cotizar *solo vuelo* ✈️"
    },
    medida: {
      tipos: ["ida-vuelta", "solo-ida", "multi"], fechas: true, clase: true, extras: true,
      boton: "Cotizar mi viaje", etqPax: "Pasajeros y clase",
      saludo: "Hola, quiero cotizar un *viaje a medida* ✈️"
    }
  };
  var PESTANA_MODO = { "Paquete": "paquete", "Solo vuelo": "vuelo", "Viaje a medida": "medida" };

  /* ---------- Estado ---------- */
  var estado = {
    modo: "paquete",
    tipo: "ida-vuelta",              // ida-vuelta | solo-ida | multi
    origen: "Quito (UIO)",
    destino: "",
    ida: null,
    vuelta: null,
    tramos: [],
    pax: { adultos: 2, mayores: 0, ninos: 0, bebes: 0 },
    discapacidad: false,
    clase: "Económica",
    extras: { "Hotel": true, "Traslados": false, "Tours": false, "Seguro de viaje": false },
    notas: ""
  };
  var TIPOS = { "ida-vuelta": "Ida y vuelta", "solo-ida": "Solo ida", "multi": "Multidestino" };
  var CLASES = ["Económica", "Premium economy", "Ejecutiva / Business", "Primera clase"];
  var PAX = [
    { k: "adultos", t: "Adultos", s: "De 18 a 64 años", uno: "adulto", varios: "adultos" },
    { k: "mayores", t: "Adultos mayores", s: "Desde 65 años", uno: "adulto mayor", varios: "adultos mayores" },
    { k: "ninos", t: "Niños", s: "De 2 a 17 años", uno: "niño", varios: "niños" },
    { k: "bebes", t: "Bebés", s: "Menores de 2 años", uno: "bebé", varios: "bebés" }
  ];

  function nuevoTramo(origen) { return { origen: origen || "", destino: "", fecha: null, origenAuto: !!origen }; }

  /* ---------- Lugares sugeridos ---------- */
  var lugares = ["Quito (UIO)", "Guayaquil (GYE)", "Cuenca (CUE)", "Manta (MEC)"];
  var listaSitio = document.getElementById("lista-destinos");
  if (listaSitio) {
    Array.prototype.forEach.call(listaSitio.options, function (o) {
      if (o.value && lugares.indexOf(o.value) < 0) lugares.push(o.value);
    });
  }

  /* ---------- Estructura del formulario ---------- */
  inyectarEstilos();

  var form = document.createElement("form");
  form.id = "form-medida";
  form.className = "vm";
  form.hidden = true;
  form.noValidate = true;
  form.setAttribute("aria-label", "Cotizar viaje");
  form.innerHTML =
    '<div class="vm-barra">' +
      '<label class="vm-sr" for="vm-tipo">Tipo de viaje</label>' +
      '<select id="vm-tipo" class="vm-select"></select>' +
      '<button type="button" class="vm-pax-btn" id="vm-pax-btn" aria-haspopup="dialog" aria-expanded="false">' +
        ICO.persona + '<span><small id="vm-pax-etq">Pasajeros y clase</small><b id="vm-pax-txt"></b></span>' +
      "</button>" +
    "</div>" +
    '<div class="vm-rutas" id="vm-rutas"></div>' +
    '<div class="vm-pie">' +
      '<div class="vm-extras" id="vm-extras-caja"><span class="vm-etq">¿Qué incluimos?</span><div class="vm-chips" id="vm-extras"></div></div>' +
      '<label class="vm-campo vm-notas"><span class="vm-etq">Comentarios (opcional)</span>' +
        '<input type="text" id="vm-notas" maxlength="200" placeholder="Presupuesto, fechas tentativas, celebración…"></label>' +
      '<button type="submit" class="btn btn-principal vm-enviar" id="vm-enviar">Cotizar mi viaje</button>' +
    "</div>" +
    '<p class="vm-error" id="vm-error" role="alert" hidden></p>' +
    '<datalist id="vm-lugares">' + lugares.map(function (l) { return '<option value="' + esc(l) + '">'; }).join("") + "</datalist>" +
    '<div class="vm-velo" id="vm-velo"></div>' +
    '<div class="vm-pop vm-cal" id="vm-cal" role="dialog" aria-label="Elegir fechas" hidden></div>' +
    '<div class="vm-pop vm-pax" id="vm-pax" role="dialog" aria-label="Pasajeros y clase" hidden></div>';
  formBase.parentNode.insertBefore(form, formBase.nextSibling);

  function $(s) { return form.querySelector(s); }
  var selTipo = $("#vm-tipo"), rutasEl = $("#vm-rutas"), paxBtn = $("#vm-pax-btn"),
      calPop = $("#vm-cal"), paxPop = $("#vm-pax"), errorEl = $("#vm-error");

  /* ---------- Pestañas del buscador ---------- */
  function conf() { return MODOS[estado.modo]; }

  function setModo(modo) {
    if (!MODOS[modo]) modo = "paquete";
    estado.modo = modo;
    var c = conf();
    // Solo "Viaje a medida" admite multidestino
    if (c.tipos.indexOf(estado.tipo) < 0) cambiarTipo("ida-vuelta");
    selTipo.innerHTML = c.tipos.map(function (k) {
      return '<option value="' + k + '"' + (k === estado.tipo ? " selected" : "") + ">" + TIPOS[k] + "</option>";
    }).join("");
    $("#vm-pax-etq").textContent = c.etqPax;
    $("#vm-extras-caja").hidden = !c.extras;
    $("#vm-enviar").textContent = c.boton;
    form.setAttribute("data-modo", modo);
    cerrarPops();
    limpiarError();
    actualizarPaxBtn();
    pintarRutas();
  }

  pestanas.addEventListener("click", function (e) {
    var b = e.target.closest("[data-pestana]");
    if (b) setModo(PESTANA_MODO[b.getAttribute("data-pestana")]);
  });

  /* ---------- Pintar rutas ---------- */
  function campoTexto(etq, ico, valor, attrs, ph) {
    return '<label class="vm-campo"><span class="vm-etq">' + etq + "</span>" +
      '<span class="vm-input">' + ico + '<input type="text" list="vm-lugares" autocomplete="off" value="' + esc(valor) +
      '" placeholder="' + ph + '" ' + attrs + "></span></label>";
  }
  function textoFecha(d, ph) {
    return d ? "<b>" + fCorta(d) + "</b>" : '<span class="vm-ph">' + ph + "</span>";
  }

  function pintarRutas() {
    var html = "";
    if (estado.tipo === "multi") {
      var puedeQuitar = estado.tramos.length > 2;
      estado.tramos.forEach(function (t, i) {
        html += '<div class="vm-tramo' + (puedeQuitar ? " con-quitar" : "") + '">' +
          '<p class="vm-num">Tramo ' + (i + 1) + "</p>" +
          '<div class="vm-o">' + campoTexto("Origen", ICO.origen, t.origen, 'data-tramo="' + i + '" data-campo="origen"', "¿Desde dónde?") + "</div>" +
          '<button type="button" class="vm-swap" data-swap="' + i + '" aria-label="Intercambiar origen y destino del tramo ' + (i + 1) + '">' + ICO.swap + "</button>" +
          '<div class="vm-d">' + campoTexto("Destino", ICO.pin, t.destino, 'data-tramo="' + i + '" data-campo="destino"', "¿A dónde?") + "</div>" +
          '<div class="vm-f"><span class="vm-etq">Fecha</span>' +
            '<button type="button" class="vm-fecha-btn" data-cal="' + i + '" aria-haspopup="dialog">' +
              '<span class="vm-fecha-parte">' + ICO.cal + textoFecha(t.fecha, "Ida") + "</span></button></div>" +
          (puedeQuitar ? '<button type="button" class="vm-quitar" data-quitar="' + i + '" aria-label="Quitar tramo ' + (i + 1) + '">' + ICO.x + "</button>" : "") +
        "</div>";
      });
      if (estado.tramos.length < MAX_TRAMOS) {
        html += '<button type="button" class="vm-agregar" id="vm-agregar">' + ICO.mas + "Agregar tramo</button>";
      }
    } else {
      var rango = estado.tipo === "ida-vuelta", conFecha = conf().fechas;
      html = '<div class="vm-tramo ' + (conFecha ? "simple" : "sin-fecha") + '">' +
        '<div class="vm-o">' + campoTexto("Desde", ICO.origen, estado.origen, 'data-campo="origen"', "¿Desde dónde?") + "</div>" +
        '<button type="button" class="vm-swap" data-swap="principal" aria-label="Intercambiar origen y destino">' + ICO.swap + "</button>" +
        '<div class="vm-d">' + campoTexto("¿A dónde?", ICO.pin, estado.destino, 'data-campo="destino"', "Panamá, Cartagena, Galápagos…") + "</div>" +
        (conFecha
          ? '<div class="vm-f"><span class="vm-etq">' + (rango ? "Fechas" : "Fecha") + "</span>" +
              '<button type="button" class="vm-fecha-btn" data-cal="principal" aria-haspopup="dialog">' +
                '<span class="vm-fecha-parte">' + ICO.cal + textoFecha(estado.ida, "Ida") + "</span>" +
                (rango ? '<span class="vm-fecha-sep"></span><span class="vm-fecha-parte">' + ICO.cal + textoFecha(estado.vuelta, "Vuelta") + "</span>" : "") +
              "</button></div>"
          : "") +
      "</div>";
    }
    rutasEl.innerHTML = html;
  }

  /* ---------- Cambio de tipo de viaje ---------- */
  function cambiarTipo(ahora) {
    var antes = estado.tipo;
    if (ahora === "multi" && antes !== "multi") {
      if (!estado.tramos.length) {
        var t1 = nuevoTramo(estado.origen); t1.origenAuto = false;
        t1.destino = estado.destino; t1.fecha = estado.ida;
        var t2 = nuevoTramo(estado.destino); t2.origenAuto = true;
        estado.tramos = [t1, t2];
      }
    } else if (antes === "multi" && ahora !== "multi" && estado.tramos[0]) {
      estado.origen = estado.tramos[0].origen || estado.origen;
      estado.destino = estado.tramos[0].destino || estado.destino;
      estado.ida = estado.tramos[0].fecha || estado.ida;
    }
    if (ahora === "solo-ida") estado.vuelta = null;
    estado.tipo = ahora;
  }

  selTipo.addEventListener("change", function () {
    cambiarTipo(selTipo.value);
    limpiarError();
    cerrarPops();
    pintarRutas();
  });

  /* ---------- Escritura en campos ---------- */
  form.addEventListener("input", function (e) {
    var el = e.target, campo = el.getAttribute("data-campo");
    if (el.id === "vm-notas") { estado.notas = el.value; return; }
    if (!campo) return;
    el.classList.remove("vm-invalido");
    var i = el.getAttribute("data-tramo");
    if (i === null) { estado[campo] = el.value; return; }
    i = +i;
    var t = estado.tramos[i];
    t[campo] = el.value;
    if (campo === "origen") t.origenAuto = false;
    // El destino de un tramo propone el origen del siguiente
    if (campo === "destino") {
      var sig = estado.tramos[i + 1];
      if (sig && (sig.origenAuto || !sig.origen)) {
        sig.origen = el.value; sig.origenAuto = true;
        var inp = form.querySelector('[data-tramo="' + (i + 1) + '"][data-campo="origen"]');
        if (inp) inp.value = el.value;
      }
    }
  });

  /* ---------- Clics del formulario ---------- */
  form.addEventListener("click", function (e) {
    var b;
    if ((b = e.target.closest("[data-swap]"))) {
      var k = b.getAttribute("data-swap");
      var obj = k === "principal" ? estado : estado.tramos[+k];
      var tmp = obj.origen; obj.origen = obj.destino; obj.destino = tmp;
      if (obj.origenAuto !== undefined) obj.origenAuto = false;
      pintarRutas();
      return;
    }
    if ((b = e.target.closest("[data-quitar]"))) {
      estado.tramos.splice(+b.getAttribute("data-quitar"), 1);
      corregirFechas();
      pintarRutas();
      return;
    }
    if (e.target.closest("#vm-agregar")) {
      var ult = estado.tramos[estado.tramos.length - 1];
      estado.tramos.push(nuevoTramo(ult ? ult.destino : ""));
      pintarRutas();
      var nuevo = form.querySelector('[data-tramo="' + (estado.tramos.length - 1) + '"][data-campo="destino"]');
      if (nuevo) nuevo.focus();
      return;
    }
    if ((b = e.target.closest("[data-cal]"))) {
      b.classList.remove("vm-invalido");
      abrirCalendario(b.getAttribute("data-cal"), b);
      return;
    }
    if (e.target.closest("#vm-pax-btn")) {
      if (paxPop.hidden) abrirPax(); else cerrarPops();
      return;
    }
    if ((b = e.target.closest("[data-extra]"))) {
      var nom = b.getAttribute("data-extra");
      estado.extras[nom] = !estado.extras[nom];
      b.setAttribute("aria-pressed", String(estado.extras[nom]));
      return;
    }
    if (e.target.closest("#vm-velo")) cerrarPops();
  });

  /* ---------- Extras ---------- */
  $("#vm-extras").innerHTML = Object.keys(estado.extras).map(function (n) {
    return '<button type="button" class="chip vm-chip" data-extra="' + n + '" aria-pressed="' + estado.extras[n] + '">' + n + "</button>";
  }).join("");

  /* =========================================================
     CALENDARIO
     ========================================================= */
  var cal = { objetivo: null, rango: false, ida: null, vuelta: null, base: null, min: null, max: null, ancla: null };

  function abrirCalendario(objetivo, ancla) {
    cerrarPops();
    var h = hoy();
    cal.objetivo = objetivo;
    cal.ancla = ancla;
    cal.max = new Date(h.getFullYear(), h.getMonth() + MESES_ADELANTE, 0);
    if (objetivo === "principal") {
      cal.rango = estado.tipo === "ida-vuelta";
      cal.ida = estado.ida; cal.vuelta = cal.rango ? estado.vuelta : null;
      cal.min = h;
    } else {
      var i = +objetivo, previo = estado.tramos[i - 1];
      cal.rango = false;
      cal.ida = estado.tramos[i].fecha; cal.vuelta = null;
      cal.min = previo && previo.fecha && previo.fecha > h ? previo.fecha : h;
    }
    var ref = cal.ida || cal.min;
    cal.base = new Date(ref.getFullYear(), ref.getMonth(), 1);
    calPop.hidden = false;
    form.classList.add("vm-pop-abierto");
    ancla.setAttribute("aria-expanded", "true");
    pintarCal();
    posicionar(calPop, ancla);
  }

  function mesHtml(año, mes) {
    var primero = new Date(año, mes, 1), dias = new Date(año, mes + 1, 0).getDate(), h = hoy();
    var html = '<div class="vm-mes"><p class="vm-mes-tit">' + MESES_L[mes] + " <span>" + año + "</span></p>" +
      '<div class="vm-sem">' + DIAS_CAB.map(function (d) { return "<span>" + d + "</span>"; }).join("") + "</div>" +
      '<div class="vm-dias">';
    for (var v = 0; v < primero.getDay(); v++) html += "<span></span>";
    for (var d = 1; d <= dias; d++) {
      var f = new Date(año, mes, d), cls = "vm-dia";
      var off = f < cal.min || f > cal.max;
      var esIda = mismaFecha(f, cal.ida), esVuelta = mismaFecha(f, cal.vuelta);
      if (esIda || esVuelta) cls += " sel";
      if (cal.ida && cal.vuelta && f > cal.ida && f < cal.vuelta) cls += " en-rango";
      if (cal.ida && cal.vuelta && !mismaFecha(cal.ida, cal.vuelta)) {
        if (esIda) cls += " ini";
        if (esVuelta) cls += " fin";
      }
      if (f.getDay() === 0 || f.getDay() === 6) cls += " finde";
      html += '<button type="button" class="' + cls + '" data-dia="' + clave(f) + '"' + (off ? " disabled" : "") +
        ' aria-label="' + fLarga(f) + '"' + (esIda || esVuelta ? ' aria-pressed="true"' : "") + ">" + d +
        (mismaFecha(f, h) ? "<small>HOY</small>" : "") + "</button>";
    }
    return html + "</div></div>";
  }

  function pintarCal() {
    var b = cal.base, sig = new Date(b.getFullYear(), b.getMonth() + 1, 1);
    var puedeAtras = b > new Date(cal.min.getFullYear(), cal.min.getMonth(), 1);
    var puedeAdelante = sig <= new Date(cal.max.getFullYear(), cal.max.getMonth() - 1, 1);
    var resumen = cal.rango
      ? '<span><small>Ida</small><b>' + (cal.ida ? fCorta(cal.ida) : "—") + '</b></span><span><small>Vuelta</small><b>' + (cal.vuelta ? fCorta(cal.vuelta) : "—") + "</b></span>"
      : '<span><small>' + (cal.objetivo === "principal" ? "Ida" : "Tramo " + (+cal.objetivo + 1)) + "</small><b>" + (cal.ida ? fCorta(cal.ida) : "—") + "</b></span>";
    var ayuda = cal.rango ? (!cal.ida ? "Elige tu fecha de ida" : !cal.vuelta ? "Ahora elige la vuelta" : "") : (!cal.ida ? "Elige la fecha" : "");
    var listo = cal.rango ? cal.ida && cal.vuelta : !!cal.ida;
    calPop.innerHTML =
      '<div class="vm-cal-cab">' +
        '<button type="button" class="vm-nav" data-nav="-1" aria-label="Mes anterior"' + (puedeAtras ? "" : " disabled") + ">" + ICO.izq + "</button>" +
        '<p class="vm-ayuda">' + ayuda + "</p>" +
        '<button type="button" class="vm-nav" data-nav="1" aria-label="Mes siguiente"' + (puedeAdelante ? "" : " disabled") + ">" + ICO.der + "</button>" +
      "</div>" +
      '<div class="vm-meses">' + mesHtml(b.getFullYear(), b.getMonth()) + mesHtml(sig.getFullYear(), sig.getMonth()) + "</div>" +
      '<div class="vm-cal-pie"><div class="vm-resumen">' + resumen + "</div>" +
        '<div class="vm-acciones"><button type="button" class="vm-borrar" data-accion="borrar">Borrar</button>' +
        '<button type="button" class="btn btn-principal vm-aplicar" data-accion="aplicar"' + (listo ? "" : " disabled") + ">Aplicar</button></div>" +
      "</div>";
  }

  calPop.addEventListener("click", function (e) {
    e.stopPropagation();
    var b;
    if ((b = e.target.closest("[data-nav]"))) {
      cal.base = new Date(cal.base.getFullYear(), cal.base.getMonth() + (+b.getAttribute("data-nav")), 1);
      pintarCal();
      return;
    }
    if ((b = e.target.closest("[data-dia]"))) {
      var p = b.getAttribute("data-dia").split("-"), f = new Date(+p[0], +p[1] - 1, +p[2]);
      if (!cal.rango) cal.ida = f;
      else if (!cal.ida || cal.vuelta || f < cal.ida) { cal.ida = f; cal.vuelta = null; }
      else cal.vuelta = f;
      pintarCal();
      var foco = calPop.querySelector('[data-dia="' + clave(f) + '"]');
      if (foco) foco.focus();
      return;
    }
    if ((b = e.target.closest("[data-accion]"))) {
      if (b.getAttribute("data-accion") === "borrar") { cal.ida = null; cal.vuelta = null; pintarCal(); return; }
      if (cal.objetivo === "principal") { estado.ida = cal.ida; estado.vuelta = cal.rango ? cal.vuelta : null; }
      else { estado.tramos[+cal.objetivo].fecha = cal.ida; corregirFechas(); }
      var obj = cal.objetivo;
      cerrarPops();
      pintarRutas();
      limpiarError();
      var btn = form.querySelector('[data-cal="' + obj + '"]');
      if (btn) btn.focus();
    }
  });

  // Si un tramo queda antes que el anterior, se borra su fecha
  function corregirFechas() {
    for (var i = 1; i < estado.tramos.length; i++) {
      var a = estado.tramos[i - 1].fecha, b = estado.tramos[i].fecha;
      if (a && b && b < a) estado.tramos[i].fecha = null;
    }
  }

  /* =========================================================
     PASAJEROS Y CLASE
     ========================================================= */
  function totalPax() { return estado.pax.adultos + estado.pax.mayores + estado.pax.ninos; }
  function adultosTotal() { return estado.pax.adultos + estado.pax.mayores; }

  function textoPax() {
    var partes = PAX.filter(function (t) { return estado.pax[t.k] > 0; }).map(function (t) {
      var n = estado.pax[t.k]; return n + " " + (n === 1 ? t.uno : t.varios);
    });
    return partes.join(", ");
  }
  function textoPaxCorto() {
    var n = totalPax() + estado.pax.bebes;
    return n + (n === 1 ? " persona" : " personas") + (conf().clase ? ", " + estado.clase : "");
  }
  function actualizarPaxBtn() { $("#vm-pax-txt").textContent = textoPaxCorto(); }

  function puede(k, delta) {
    var v = estado.pax[k] + delta;
    if (v < 0) return false;
    if (delta > 0 && k !== "bebes" && totalPax() >= MAX_PASAJEROS) return false;
    if (delta > 0 && k === "bebes" && estado.pax.bebes >= adultosTotal()) return false;
    if (delta < 0 && (k === "adultos" || k === "mayores") && adultosTotal() <= 1) return false;
    if (delta < 0 && (k === "adultos" || k === "mayores") && estado.pax.bebes > adultosTotal() - 1) return false;
    return true;
  }

  function pintarPax() {
    paxPop.innerHTML =
      PAX.map(function (t) {
        return '<div class="vm-fila-pax"><div><b>' + t.t + "</b><small>" + t.s + "</small></div>" +
          '<div class="vm-stepper">' +
            '<button type="button" data-pax="' + t.k + '" data-d="-1" aria-label="Quitar ' + t.uno + '"' + (puede(t.k, -1) ? "" : " disabled") + ">" + ICO.menos + "</button>" +
            '<output aria-live="polite">' + estado.pax[t.k] + "</output>" +
            '<button type="button" data-pax="' + t.k + '" data-d="1" aria-label="Agregar ' + t.uno + '"' + (puede(t.k, 1) ? "" : " disabled") + ">" + ICO.mas + "</button>" +
          "</div></div>";
      }).join("") +
      '<label class="vm-check"><input type="checkbox" id="vm-disc"' + (estado.discapacidad ? " checked" : "") + "> Viaja una persona con discapacidad</label>" +
      (conf().clase
        ? '<label class="vm-fila-clase"><b>Clase</b><select class="vm-select" id="vm-clase">' +
            CLASES.map(function (c) { return "<option" + (c === estado.clase ? " selected" : "") + ">" + c + "</option>"; }).join("") +
          "</select></label>"
        : "") +
      (totalPax() >= MAX_PASAJEROS ? '<p class="vm-nota">¿Viajan más de ' + MAX_PASAJEROS + '? Cuéntanos en comentarios y te armamos una oferta de grupo.</p>' : "") +
      '<p class="vm-nota">Los bebés viajan en brazos de un adulto.</p>' +
      '<div class="vm-acciones"><button type="button" class="btn btn-principal vm-aplicar" data-accion="listo">Listo</button></div>';
  }

  function abrirPax() {
    cerrarPops();
    paxPop.hidden = false;
    form.classList.add("vm-pop-abierto");
    paxBtn.setAttribute("aria-expanded", "true");
    pintarPax();
    posicionar(paxPop, paxBtn);
  }

  paxPop.addEventListener("click", function (e) {
    e.stopPropagation();
    var b = e.target.closest("[data-pax]");
    if (b) {
      var k = b.getAttribute("data-pax"), d = +b.getAttribute("data-d");
      if (puede(k, d)) estado.pax[k] += d;
      pintarPax();
      actualizarPaxBtn();
      var mismo = paxPop.querySelector('[data-pax="' + k + '"][data-d="' + d + '"]');
      if (mismo && !mismo.disabled) mismo.focus();
      return;
    }
    if (e.target.closest('[data-accion="listo"]')) { cerrarPops(); paxBtn.focus(); }
  });
  paxPop.addEventListener("change", function (e) {
    if (e.target.id === "vm-disc") estado.discapacidad = e.target.checked;
    if (e.target.id === "vm-clase") { estado.clase = e.target.value; actualizarPaxBtn(); }
  });

  /* ---------- Abrir / cerrar ventanas ---------- */
  function posicionar(pop, ancla) {
    if (esMovil()) { pop.style.top = ""; pop.style.left = ""; return; }
    var r = form.getBoundingClientRect(), a = ancla.getBoundingClientRect();
    pop.style.top = (a.bottom - r.top + 8) + "px";
    var w = pop.offsetWidth, izq = a.left - r.left;
    if (izq + w > r.width) izq = Math.max(0, a.right - r.left - w);
    if (izq + w > r.width) izq = Math.max(0, r.width - w);
    pop.style.left = izq + "px";
  }
  function cerrarPops() {
    calPop.hidden = true;
    paxPop.hidden = true;
    form.classList.remove("vm-pop-abierto");
    paxBtn.setAttribute("aria-expanded", "false");
    if (cal.ancla) cal.ancla.setAttribute("aria-expanded", "false");
  }
  document.addEventListener("click", function (e) {
    if (form.hidden) return;
    if (!e.target.closest("#vm-cal, #vm-pax, [data-cal], #vm-pax-btn")) cerrarPops();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && (!calPop.hidden || !paxPop.hidden)) {
      var volver = !paxPop.hidden ? paxBtn : cal.ancla;
      cerrarPops();
      if (volver) volver.focus();
    }
  });
  window.addEventListener("resize", function () {
    if (!calPop.hidden && cal.ancla && document.contains(cal.ancla)) posicionar(calPop, cal.ancla);
    if (!paxPop.hidden) posicionar(paxPop, paxBtn);
  });

  /* =========================================================
     VALIDAR Y ENVIAR A WHATSAPP
     ========================================================= */
  function limpiarError() {
    errorEl.hidden = true;
    errorEl.textContent = "";
  }
  function fallo(msg, sel) {
    var el = sel ? form.querySelector(sel) : null;
    if (el) el.classList.add("vm-invalido");
    return { msg: msg, el: el };
  }

  function validar() {
    if (estado.tipo === "multi") {
      for (var i = 0; i < estado.tramos.length; i++) {
        var t = estado.tramos[i], n = "tramo " + (i + 1);
        if (!t.origen.trim()) return fallo("Indica el origen del " + n + ".", '[data-tramo="' + i + '"][data-campo="origen"]');
        if (!t.destino.trim()) return fallo("Indica el destino del " + n + ".", '[data-tramo="' + i + '"][data-campo="destino"]');
        if (!t.fecha) return fallo("Elige la fecha del " + n + ".", '[data-cal="' + i + '"]');
      }
      return null;
    }
    if (!estado.origen.trim()) return fallo("Indica desde dónde viajas.", '[data-campo="origen"]');
    if (!estado.destino.trim()) return fallo("Cuéntanos a dónde quieres viajar.", '[data-campo="destino"]');
    if (!conf().fechas) return null;
    if (!estado.ida) return fallo("Elige tu fecha de ida.", '[data-cal="principal"]');
    if (estado.tipo === "ida-vuelta" && !estado.vuelta) return fallo("Elige tu fecha de vuelta.", '[data-cal="principal"]');
    return null;
  }

  function mensaje() {
    var c = conf();
    var L = [c.saludo, ""];
    L.push("*Tipo:* " + TIPOS[estado.tipo]);
    if (!c.fechas) {
      L.push("*Ruta:* " + estado.origen.trim() + " → " + estado.destino.trim());
      L.push("*Fechas:* por coordinar con el asesor");
    } else if (estado.tipo === "multi") {
      estado.tramos.forEach(function (t, i) {
        L.push("*Tramo " + (i + 1) + ":* " + t.origen.trim() + " → " + t.destino.trim() + " · " + fLarga(t.fecha));
      });
    } else {
      L.push("*Ruta:* " + estado.origen.trim() + " → " + estado.destino.trim());
      L.push("*Ida:* " + fLarga(estado.ida));
      if (estado.tipo === "ida-vuelta") {
        var noches = Math.round((estado.vuelta - estado.ida) / 86400000);
        L.push("*Vuelta:* " + fLarga(estado.vuelta) + (noches > 0 ? " (" + noches + (noches === 1 ? " noche)" : " noches)") : ""));
      }
    }
    var n = totalPax() + estado.pax.bebes;
    L.push("*Pasajeros:* " + textoPax() + " (total " + n + ")");
    if (estado.discapacidad) L.push("*Asistencia:* viaja una persona con discapacidad");
    if (c.clase) L.push("*Clase:* " + estado.clase);
    if (c.extras) {
      var inc = Object.keys(estado.extras).filter(function (k) { return estado.extras[k]; });
      L.push("*Incluir:* " + (inc.length ? inc.join(", ") : "solo vuelos"));
    }
    if (estado.notas.trim()) L.push("*Comentarios:* " + estado.notas.trim());
    return L.join("\n");
  }

  function linkWA(msg) {
    if (typeof API !== "undefined" && API && typeof API.linkWhatsApp === "function") return API.linkWhatsApp(msg);
    if (typeof linkWhatsApp === "function") return linkWhatsApp(msg);
    return "https://wa.me/" + WA_NUMERO + "?text=" + encodeURIComponent(msg);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    cerrarPops();
    var err = validar();
    if (err) {
      errorEl.textContent = err.msg;
      errorEl.hidden = false;
      if (err.el) err.el.focus();
      return;
    }
    limpiarError();
    window.open(linkWA(mensaje()), "_blank", "noopener");
  });

  /* ---------- Arranque ---------- */
  // El buscador original queda oculto (app.js sigue funcionando igual)
  formBase.style.display = "none";
  form.hidden = false;
  var inicial = pestanas.querySelector('[aria-selected="true"]');
  setModo(inicial ? PESTANA_MODO[inicial.getAttribute("data-pestana")] : "paquete");

  /* =========================================================
     ESTILOS (usan las variables de color del sitio)
     ========================================================= */
  function inyectarEstilos() {
    if (document.getElementById("vm-estilos")) return;
    var css = [
      ".vm{position:relative;display:flex;flex-direction:column;gap:16px}",
      ".vm[hidden]{display:none!important}",
      ".vm svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none}",
      ".vm-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}",
      ".vm-etq{display:block;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--tinta-3,#4E5F67);margin-bottom:6px}",

      /* barra superior */
      ".vm-barra{display:flex;flex-wrap:wrap;gap:10px;align-items:center}",
      ".vm-select{appearance:none;-webkit-appearance:none;min-height:46px;padding:0 42px 0 18px;border-radius:999px;border:1px solid var(--linea-2,#C9BFAE);background:var(--blanco,#fff) url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23172D38' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\") no-repeat right 16px center/16px;font:inherit;font-size:15px;font-weight:600;color:var(--tinta,#172D38);cursor:pointer}",
      ".vm-pax-btn{display:inline-flex;align-items:center;gap:10px;min-height:46px;padding:4px 18px 4px 14px;border-radius:999px;border:1px solid var(--linea-2,#C9BFAE);background:var(--blanco,#fff);font:inherit;color:var(--tinta,#172D38);cursor:pointer;text-align:left}",
      ".vm-pax-btn span{display:flex;flex-direction:column;line-height:1.2}",
      ".vm-pax-btn small{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--tinta-3,#4E5F67)}",
      ".vm-pax-btn b{font-size:15px;font-weight:600}",

      /* rutas */
      ".vm-rutas{display:flex;flex-direction:column;gap:14px}",
      ".vm-tramo{display:grid;gap:8px 8px;align-items:end;grid-template-columns:minmax(0,1fr) 44px minmax(0,1fr) minmax(0,1.25fr);grid-template-areas:'n n n n' 'o s d f'}",
      ".vm-tramo.con-quitar{grid-template-columns:minmax(0,1fr) 44px minmax(0,1fr) minmax(0,1.25fr) 44px;grid-template-areas:'n n n n n' 'o s d f q'}",
      ".vm-num{grid-area:n;margin:0;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:var(--oceano,#1F6FB5);font-weight:700}",
      ".vm-tramo.simple{grid-template-areas:'o s d f'}",
      ".vm-tramo.sin-fecha{grid-template-columns:minmax(0,1fr) 44px minmax(0,1fr);grid-template-areas:'o s d'}",
      ".vm-o{grid-area:o;min-width:0}.vm-d{grid-area:d;min-width:0}.vm-f{grid-area:f;min-width:0}",
      ".vm-campo{display:block;min-width:0}",
      ".vm-input{display:flex;align-items:center;gap:10px;min-height:56px;padding:0 14px;border:1px solid var(--linea,#DDD5C6);border-radius:12px;background:var(--papel,#FBF9F5);color:var(--tinta-3,#4E5F67)}",
      ".vm-input:focus-within{border-color:var(--tinta,#172D38)}",
      ".vm-input input{flex:1;min-width:0;border:0;background:transparent;font:inherit;font-size:17px;color:var(--tinta,#172D38);outline:none;padding:0}",
      ".vm-input input::placeholder{color:#8C8A84}",
      ".vm-swap,.vm-quitar{width:44px;height:44px;margin-bottom:6px;display:grid;place-items:center;border-radius:999px;border:1px solid var(--linea-2,#C9BFAE);background:var(--blanco,#fff);color:var(--tinta,#172D38);cursor:pointer}",
      ".vm-swap{grid-area:s}.vm-quitar{grid-area:q}",
      ".vm-swap:hover,.vm-quitar:hover{background:var(--marfil,#F5F1E9)}",
      ".vm-fecha-btn{display:flex;align-items:center;width:100%;min-height:56px;padding:0 14px;border:1px solid var(--linea,#DDD5C6);border-radius:12px;background:var(--papel,#FBF9F5);font:inherit;color:var(--tinta,#172D38);cursor:pointer;text-align:left}",
      ".vm-fecha-btn[aria-expanded=true]{border-color:var(--tinta,#172D38)}",
      ".vm-fecha-parte{flex:1;display:flex;align-items:center;gap:10px;min-width:0;color:var(--tinta-3,#4E5F67);white-space:nowrap}",
      ".vm-fecha-parte b{font-weight:600;font-size:16px;color:var(--tinta,#172D38);overflow:hidden;text-overflow:ellipsis}",
      ".vm-ph{font-size:17px;color:#8C8A84}",
      ".vm-fecha-sep{width:1px;align-self:stretch;margin:12px 12px;background:var(--linea,#DDD5C6)}",
      ".vm-agregar{align-self:flex-start;display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 4px;border:0;background:none;font:inherit;font-weight:700;color:var(--oceano,#1F6FB5);cursor:pointer}",
      ".vm-invalido,.vm-input:has(.vm-invalido){border-color:#B42318!important;background:#FFF6F4!important}",

      /* pie */
      ".vm-pie{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-end;padding-top:14px;border-top:1px solid var(--linea,#DDD5C6)}",
      ".vm-extras{flex:2 1 340px;min-width:0}",
      ".vm-chips{display:flex;flex-wrap:wrap;gap:8px}",
      ".vm-chip{min-height:40px;font-size:14px}",
      ".vm-notas{flex:1.4 1 240px}",
      ".vm-notas input{width:100%;min-height:48px;padding:0 14px;border:1px solid var(--linea,#DDD5C6);border-radius:12px;background:var(--papel,#FBF9F5);font:inherit;font-size:15px;color:var(--tinta,#172D38)}",
      ".vm-enviar{flex:0 0 auto;min-height:56px;padding:0 32px;font-size:17px;border-radius:12px}",
      ".vm-error{margin:0;color:#B42318;font-weight:600;font-size:15px}",

      /* ventanas */
      ".vm-pop{position:absolute;z-index:40;background:var(--blanco,#fff);border:1px solid var(--linea,#DDD5C6);border-radius:18px;box-shadow:0 22px 60px rgba(23,45,56,.2);padding:20px}",
      ".vm-pop[hidden]{display:none}",
      ".vm-velo{display:none}",
      ".vm-cal{width:min(680px,100%)}",
      ".vm-cal-cab{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px}",
      ".vm-ayuda{margin:0;font-size:14px;color:var(--tinta-2,#3E4F57);font-weight:600}",
      ".vm-nav{width:40px;height:40px;display:grid;place-items:center;border-radius:999px;border:1px solid var(--linea,#DDD5C6);background:var(--blanco,#fff);color:var(--tinta,#172D38);cursor:pointer}",
      ".vm-nav:disabled{opacity:.35;cursor:default}",
      ".vm-meses{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px}",
      ".vm-mes-tit{margin:0 0 10px;text-align:center;font-family:var(--serif,Georgia,serif);font-size:24px;font-weight:600}",
      ".vm-mes-tit span{font-family:var(--sans,system-ui);font-size:15px;font-weight:500;color:var(--tinta-3,#4E5F67)}",
      ".vm-sem,.vm-dias{display:grid;grid-template-columns:repeat(7,1fr)}",
      ".vm-sem span{text-align:center;font-size:11px;letter-spacing:.06em;color:var(--tinta-3,#4E5F67);padding:6px 0}",
      ".vm-dias{row-gap:4px}",
      ".vm-dia{position:relative;height:42px;border:0;background:none;border-radius:999px;font:inherit;font-size:15px;color:var(--tinta,#172D38);cursor:pointer;padding:0}",
      ".vm-dia.finde{font-weight:700}",
      ".vm-dia small{position:absolute;left:0;right:0;bottom:1px;font-size:8px;font-weight:700;letter-spacing:.05em}",
      ".vm-dia:hover:not(:disabled):not(.sel){background:var(--marfil,#F5F1E9)}",
      ".vm-dia:disabled{color:#C3BCB0;cursor:default;font-weight:400}",
      ".vm-dia.en-rango{background:rgba(31,111,181,.12);border-radius:0}",
      ".vm-dia.sel{background:var(--tinta,#172D38);color:#fff}",
      ".vm-dia.ini{border-radius:999px 0 0 999px}",
      ".vm-dia.fin{border-radius:0 999px 999px 0}",
      ".vm-cal-pie{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-top:16px;padding-top:14px;border-top:1px solid var(--linea,#DDD5C6)}",
      ".vm-resumen{display:flex;gap:22px}",
      ".vm-resumen span{display:flex;flex-direction:column;line-height:1.25}",
      ".vm-resumen small{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--tinta-3,#4E5F67)}",
      ".vm-acciones{display:flex;align-items:center;gap:8px;margin-left:auto}",
      ".vm-borrar{min-height:44px;padding:0 16px;border:0;background:none;font:inherit;font-weight:600;color:var(--tinta-2,#3E4F57);cursor:pointer}",
      ".vm-aplicar{min-height:44px;padding:0 26px}",
      ".vm-aplicar:disabled{opacity:.45;cursor:default}",
      ".vm-pax{width:360px}",
      ".vm-fila-pax{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 0;border-bottom:1px solid var(--linea,#DDD5C6)}",
      ".vm-fila-pax b{display:block;font-size:17px}",
      ".vm-fila-pax small{font-size:13px;color:var(--tinta-3,#4E5F67)}",
      ".vm-stepper{display:flex;align-items:center;gap:10px}",
      ".vm-stepper button{width:40px;height:40px;display:grid;place-items:center;border-radius:999px;border:1px solid var(--tinta,#172D38);background:var(--blanco,#fff);color:var(--tinta,#172D38);cursor:pointer}",
      ".vm-stepper button:disabled{border-color:var(--linea,#DDD5C6);color:#C3BCB0;cursor:default}",
      ".vm-stepper output{min-width:20px;text-align:center;font-size:17px;font-weight:600}",
      ".vm-check{display:flex;align-items:center;gap:10px;padding:14px 0 4px;font-size:15px;cursor:pointer}",
      ".vm-check input{width:20px;height:20px;accent-color:var(--tinta,#172D38)}",
      ".vm-fila-clase{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0}",
      ".vm-fila-clase b{font-size:17px}",
      ".vm-nota{margin:4px 0 0;font-size:13px;color:var(--tinta-3,#4E5F67)}",
      ".vm-pax .vm-acciones{margin-top:14px}",

      /* celular */
      "@media (max-width:700px){",
      ".vm-tramo,.vm-tramo.con-quitar{grid-template-columns:minmax(0,1fr) 44px;grid-template-areas:'n n' 'o s' 'd s' 'f f'}",
      ".vm-tramo.con-quitar{grid-template-areas:'n q' 'o s' 'd s' 'f f'}",
      ".vm-tramo.simple{grid-template-columns:minmax(0,1fr) 44px;grid-template-areas:'o s' 'd s' 'f f'}",
      ".vm-tramo.sin-fecha{grid-template-columns:minmax(0,1fr) 44px;grid-template-areas:'o s' 'd s'}",
      ".vm-swap{align-self:center;margin:0;transform:rotate(90deg)}",
      ".vm-quitar{margin:0;justify-self:end;width:36px;height:36px}",
      ".vm-barra>*{flex:1 1 auto}",
      ".vm-enviar{width:100%}",
      ".vm-velo{position:fixed;inset:0;z-index:39;background:rgba(23,45,56,.45)}",
      ".vm.vm-pop-abierto .vm-velo{display:block}",
      ".vm-pop{position:fixed;left:0!important;right:0;bottom:0;top:auto!important;width:auto;max-height:86vh;overflow:auto;border-radius:22px 22px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom))}",
      ".vm-meses{grid-template-columns:1fr;gap:20px}",
      ".vm-cal-pie{position:sticky;bottom:-18px;background:var(--blanco,#fff);padding-bottom:4px}",
      "}"
    ].join("\n");
    var st = document.createElement("style");
    st.id = "vm-estilos";
    st.textContent = css;
    document.head.appendChild(st);
  }
})();
