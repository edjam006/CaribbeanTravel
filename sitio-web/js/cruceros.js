/* =========================================================
   CRUCEROS — Caribbean Travel
   Franja del MSC Opera (sin visa), con la misma dinámica de
   "Salidas confirmadas":
   • un botón por ruta (Catalina Island, Road Town…)
   • el recorrido de la ruta elegida
   • fechas en carril horizontal; al tocar una se agranda y
     pide cabina Interior o Exterior → WhatsApp con todo.
   Las rutas y fechas salen de la tabla "cruceros" (admin).
   Las fechas pasadas se ocultan solas.

   Se monta solo debajo de "Nuestros tours".
   Uso: <script src="js/cruceros.js"></script> (después de api.js)
   ========================================================= */
(function () {
  "use strict";
  var API = window.CT_API;
  if (!API) return;
  var esc = API.escapar;

  var DIAS_LARGOS = { DOM: "domingo", LUN: "lunes", MAR: "martes", "MIÉ": "miércoles", JUE: "jueves", VIE: "viernes", "SÁB": "sábado" };
  var CABINAS = [
    { id: "Interior", detalle: "Sin ventana", ico: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 13h16M8 13v-2.5a1.5 1.5 0 0 1 1.5-1.5h5a1.5 1.5 0 0 1 1.5 1.5V13"/></svg>' },
    { id: "Exterior", detalle: "Con ventana al mar", ico: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="5"/><path d="M7.5 13.5c1.2-.9 2.3-.9 3.5 0s2.3.9 3.5 0 1.6-.6 2-.4"/></svg>' }
  ];
  var ICO_ANCLA = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2"/><path d="M12 7v14M8 11h8M5 14a7 7 0 0 0 14 0"/></svg>';
  var ICO_CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

  /* ---------- 1. Sección ---------- */
  var seccion = document.createElement("section");
  seccion.className = "cruceros";
  seccion.id = "cruceros";
  seccion.hidden = true;
  seccion.setAttribute("aria-labelledby", "cruceros-titulo");
  seccion.innerHTML =
    '<div class="contenedor">' +
      '<div class="cr-texto">' +
        '<p class="eyebrow">Cruceros · Caribe</p>' +
        '<h2 class="titulo t-l cr-titulo" id="cruceros-titulo">MSC Crucero <span class="cr-sinvisa">Sin visa</span></h2>' +
        '<div class="cr-linea">' +
          '<p class="cr-sub">a bordo del <strong id="cr-barco">MSC Opera</strong></p>' +
          '<div class="cr-meta"><span class="cr-pill" id="cr-duracion"></span><span class="cr-pill cr-pill-borde">Desde La Romana, Rep. Dominicana</span></div>' +
        "</div>" +
        '<div class="salidas-botones cr-botones" id="cr-botones" role="tablist" aria-label="Elige la ruta del crucero"></div>' +
      "</div>" +
      '<div class="cr-ruta" aria-live="polite">' +
        '<p class="cr-ruta-tit"><span class="cr-etq" id="cr-etiqueta"></span>Recorrido</p>' +
        '<ol class="cr-puertos" id="cr-puertos"></ol>' +
      "</div>" +
      '<div class="cr-barra">' +
        '<p class="cr-pista">Toca una fecha y elige tu cabina.</p>' +
        '<button type="button" class="cr-incluye-btn" aria-expanded="false" aria-controls="cr-incluye">Qué incluye tu crucero</button>' +
      "</div>" +
      '<ul class="cr-incluye" id="cr-incluye" hidden>' +
        API.CRUCERO_INCLUYE.map(function (t) { return "<li>" + ICO_CHECK + "<span>" + esc(t) + "</span></li>"; }).join("") +
      "</ul>" +
      '<div class="carril cr-carril" id="cr-carril"></div>' +
    "</div>";

  // Va debajo de "Nuestros tours" (#destinos); si no existe, debajo de "Salidas confirmadas"
  var ancla = document.getElementById("destinos") || document.getElementById("salidas");
  if (!ancla) return;
  ancla.parentNode.insertBefore(seccion, ancla.nextSibling);

  var $ = function (s) { return seccion.querySelector(s); };
  var rutas = [];
  var activa = 0;

  /* ---------- 2. Pintar ---------- */
  function pintar(lista) {
    rutas = lista;
    var hay = !!lista.length;
    seccion.hidden = !hay;
    // El enlace "Cruceros" del menú (y su copia en "Menú") solo se ve si hay rutas
    Array.prototype.forEach.call(document.querySelectorAll('a[href="#cruceros"]'), function (a) {
      a.hidden = !hay;
      a.style.display = hay ? "" : "none";
    });
    if (!hay) return;
    $("#cr-botones").innerHTML = lista.map(function (c, i) {
      return '<button type="button" class="chip" role="tab" data-ruta="' + i + '">' + esc(c.nombre) + "</button>";
    }).join("");
    elegir(0);
    // Si llegaron con el enlace #cruceros, bajar a la sección ya pintada
    if (location.hash === "#cruceros") seccion.scrollIntoView();
  }

  function elegir(i) {
    var c = rutas[i];
    if (!c) return;
    activa = i;
    Array.prototype.forEach.call(seccion.querySelectorAll("[data-ruta]"), function (b) {
      b.setAttribute("aria-selected", String(+b.getAttribute("data-ruta") === i));
    });
    $("#cr-barco").textContent = c.barco;
    $("#cr-duracion").textContent = c.duracion;
    $("#cr-etiqueta").textContent = c.etiqueta;
    $("#cr-etiqueta").hidden = !c.etiqueta;

    var n = c.recorrido.length;
    $("#cr-puertos").innerHTML = c.recorrido.map(function (p, k) {
      var extremo = k === 0 || k === n - 1;
      return '<li class="' + (extremo ? "extremo" : "") + '">' +
        (extremo ? '<span class="cr-ancla">' + ICO_ANCLA + "</span>" : '<span class="cr-punto"></span>') +
        "<span>" + esc(p) + "</span></li>";
    }).join("");
    $("#cr-puertos").parentNode.hidden = !n;

    $("#cr-carril").innerHTML = API.fechasFuturas(c.fechas).map(function (f) {
      var largo = (DIAS_LARGOS[f.semana] || f.semana.toLowerCase()) + " " + f.dia + " de " + f.mes + " de " + f.anio;
      return '<div class="cr-fecha">' +
        '<button type="button" class="cr-fecha-btn" aria-expanded="false" aria-label="' + esc(c.nombre + ", " + largo) + '. Elegir cabina">' +
          "<small>" + f.semana + '</small><span class="dia">' + f.dia + "</span><small>" + f.mesCorto + " " + f.anio + "</small>" +
        "</button>" +
        '<div class="cr-cabinas" hidden>' +
          "<p>¿Qué cabina prefieres?</p>" +
          CABINAS.map(function (cab) {
            return '<a class="cr-cab" href="' + esc(API.linkWhatsApp(mensaje(c, largo, cab.id))) + '" target="_blank" rel="noopener">' +
              cab.ico + "<span><strong>" + cab.id + "</strong><small>" + cab.detalle + "</small></span></a>";
          }).join("") +
        "</div>" +
      "</div>";
    }).join("");
    $("#cr-carril").scrollLeft = 0;
  }

  function mensaje(c, fechaLarga, cabina) {
    var l = [
      "Hola, quiero reservar el *MSC Crucero* 🚢 (sin visa)",
      "",
      "• Barco: " + c.barco,
      "• Ruta: " + c.nombre + (c.etiqueta ? " (" + c.etiqueta + ")" : "")
    ];
    if (c.recorrido.length) l.push("• Recorrido: " + c.recorrido.join(" → "));
    l.push(
      "• Salida: *" + fechaLarga + "*",
      "• Duración: " + c.duracion,
      "• Cabina: *" + cabina + "*",
      "",
      "¿Me ayudan con la disponibilidad y el precio?"
    );
    return l.join("\n");
  }

  /* ---------- 3. Interacción ---------- */
  function cerrarTodas(excepto) {
    Array.prototype.forEach.call(seccion.querySelectorAll(".cr-fecha.abierta"), function (el) {
      if (el === excepto) return;
      el.classList.remove("abierta");
      el.querySelector(".cr-fecha-btn").setAttribute("aria-expanded", "false");
      el.querySelector(".cr-cabinas").hidden = true;
    });
  }

  seccion.addEventListener("click", function (e) {
    var inc = e.target.closest(".cr-incluye-btn");
    if (inc) {
      var abierto = inc.getAttribute("aria-expanded") !== "true";
      inc.setAttribute("aria-expanded", String(abierto));
      $("#cr-incluye").hidden = !abierto;
      return;
    }
    var b = e.target.closest("[data-ruta]");
    if (b) { elegir(+b.getAttribute("data-ruta")); return; }

    var f = e.target.closest(".cr-fecha-btn");
    if (f) {
      var tarjeta = f.parentNode;
      var abrir = !tarjeta.classList.contains("abierta");
      cerrarTodas(tarjeta);
      tarjeta.classList.toggle("abierta", abrir);
      f.setAttribute("aria-expanded", String(abrir));
      tarjeta.querySelector(".cr-cabinas").hidden = !abrir;
      if (abrir) {
        // que la tarjeta agrandada quede a la vista dentro del carril
        var carril = $("#cr-carril");
        setTimeout(function () {
          var izq = tarjeta.offsetLeft - carril.offsetLeft;
          var der = izq + tarjeta.offsetWidth;
          if (izq < carril.scrollLeft) carril.scrollTo({ left: izq, behavior: "smooth" });
          else if (der > carril.scrollLeft + carril.clientWidth) carril.scrollTo({ left: der - carril.clientWidth, behavior: "smooth" });
        }, 260);
      }
      return;
    }
    // Después de elegir cabina se cierra la tarjeta
    if (e.target.closest(".cr-cab")) setTimeout(function () { cerrarTodas(null); }, 300);
  });

  document.addEventListener("click", function (e) { if (!seccion.contains(e.target)) cerrarTodas(null); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") cerrarTodas(null); });

  API.listarCruceros().then(pintar);
})();
