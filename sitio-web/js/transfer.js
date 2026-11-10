/* =========================================================
   TRANSFER — Caribbean Travel
   Traslados aeropuerto – hotel – aeropuerto.
   Igual que el seguro: una sección con botones que abren
   un formulario y envían todo en UN mensaje de WhatsApp.

   Se monta solo, no hay que pegar HTML:
   • agrega "Transfer" en el menú, al lado de "Seguro de viaje"
   • agrega la sección #transfer debajo del seguro
   • agrega la ventana del formulario
   Uso: <script src="js/transfer.js" defer></script>
   ========================================================= */
   (function () {
    "use strict";
  
    /* ---------- Ajustes ---------- */
    var NUMERO_WA = "593987620947";      // mismo número del pie de página
    var MAX_PERSONAS = 30;
    var LUGARES = [                      // sugerencias al escribir origen o destino
      "Aeropuerto de Quito (UIO)",
      "Aeropuerto de Guayaquil (GYE)",
      "Aeropuerto de Punta Cana (PUJ)",
      "Aeropuerto de Cartagena (CTG)",
      "Aeropuerto de San Andrés (ADZ)",
      "Aeropuerto de Panamá (PTY)",
      "Aeropuerto de Cancún (CUN)",
      "Hotel"
    ];
  
    var DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
    var MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  
    function esc(s) {
      return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    }
    function pad(n) { return n < 10 ? "0" + n : "" + n; }
    function hoyISO() { var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
    // "2026-11-14" → "sáb 14 nov 2026" (sin desfase de zona horaria)
    function fechaLarga(iso) {
      var p = iso.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2]);
      return DIAS[d.getDay()] + " " + d.getDate() + " " + MESES[d.getMonth()] + " " + d.getFullYear();
    }
  
    var ICO = {
      swap: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v14l-3.5-3.5M17 20V6l3.5 3.5"/></svg>',
      x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
      mas: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
      menos: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
      avion: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 13.5 4 11l1.5-1.5 7 1 4-4c.8-.8 2.2-.8 3 0s.8 2.2 0 3l-4 4 1 7L15 22l-2.5-6.5L9 19v2.5L7.5 23 6 19l-4-1.5L3.5 16H6z"/></svg>',
      hotel: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5V21M16 11h2.5A1.5 1.5 0 0 1 20 12.5V21M2.5 21h19M8 8h1M11 8h1M8 12h1M11 12h1M9 21v-4h2v4"/></svg>'
    };
  
    /* ---------- 1. Enlace en el menú ---------- */
    var enlacesSeguro = document.querySelectorAll('header a[href="#seguro"]');
    if (enlacesSeguro.length) {
      Array.prototype.forEach.call(enlacesSeguro, function (a) {
        var nuevo = a.cloneNode(false);
        nuevo.setAttribute("href", "#transfer");
        nuevo.removeAttribute("aria-current");
        nuevo.textContent = "Transfer";
        // si el enlace está dentro de un <li>, se clona el <li> para respetar la lista
        var li = a.parentElement && a.parentElement.tagName === "LI" ? a.parentElement : null;
        if (li) {
          var liNuevo = li.cloneNode(false);
          liNuevo.appendChild(nuevo);
          li.parentNode.insertBefore(liNuevo, li.nextSibling);
        } else {
          a.parentNode.insertBefore(nuevo, a.nextSibling);
        }
      });
    }
  
    /* ---------- 2. Sección ---------- */
    var seccion = document.createElement("section");
    seccion.className = "contenedor seccion transfer";
    seccion.id = "transfer";
    seccion.setAttribute("aria-labelledby", "transfer-titulo");
    seccion.innerHTML =
      '<div class="transfer-texto">' +
        '<p class="eyebrow">Transfer</p>' +
        '<h2 class="titulo t-l" id="transfer-titulo">Del aeropuerto a tu hotel,<br>sin preocuparte.</h2>' +
        '<p class="texto-suave">Coordinamos tu traslado aeropuerto – hotel – aeropuerto para que al aterrizar no tengas que buscar taxi ni negociar precios en un lugar que no conoces. Nos dices desde dónde, hacia dónde, cuándo y cuántos viajan, y un asesor te confirma todo por WhatsApp.</p>' +
        '<div class="transfer-acciones">' +
          '<button type="button" class="btn btn-principal" data-abrir-transfer="ida">Reserva tu transfer</button>' +
          '<button type="button" class="btn btn-borde" data-abrir-transfer="regreso">Ida y regreso</button>' +
        "</div>" +
      "</div>" +
      '<div class="transfer-panel">' +
        '<p class="transfer-panel-titulo">El recorrido</p>' +
        '<ol class="transfer-ruta">' +
          '<li><span class="tr-ico">' + ICO.avion + '</span><span><b>Aeropuerto</b><small>Te recogemos al llegar</small></span></li>' +
          '<li><span class="tr-ico">' + ICO.hotel + '</span><span><b>Hotel</b><small>Directo a tu alojamiento</small></span></li>' +
          '<li><span class="tr-ico">' + ICO.avion + '</span><span><b>Aeropuerto</b><small>A tiempo para tu vuelo de regreso</small></span></li>' +
        "</ol>" +
        '<p class="transfer-nota">Para 1 persona o para grupos · cotización por WhatsApp</p>' +
      "</div>";
  
    var seguro = document.getElementById("seguro");
    var como = document.getElementById("como");
    if (seguro) seguro.parentNode.insertBefore(seccion, seguro.nextSibling);
    else if (como) como.parentNode.insertBefore(seccion, como);
    else (document.querySelector("main") || document.body).appendChild(seccion);
  
    /* ---------- 3. Ventana con el formulario ---------- */
    var dlg = document.createElement("dialog");
    dlg.className = "tf-modal";
    dlg.setAttribute("aria-labelledby", "tf-titulo");
    dlg.innerHTML =
      '<form class="tf-form" id="tf-form" novalidate>' +
        '<button type="button" class="tf-cerrar" data-cerrar-transfer aria-label="Cerrar">' + ICO.x + "</button>" +
        '<img class="tf-logo" src="img/logo.png" alt="Caribbean Travel" width="56" height="56">' +
        '<p class="eyebrow">Transfer</p>' +
        '<h2 class="titulo t-m" id="tf-titulo">Reserva tu traslado</h2>' +
        '<p class="tf-sub">Completa los datos y te escribimos por WhatsApp con la cotización.</p>' +
  
        '<label class="tf-campo"><span>Nombre</span>' +
          '<input type="text" id="tf-nombre" autocomplete="name" maxlength="80" placeholder="Nombre y apellido"></label>' +
  
        '<div class="tf-rapido" role="group" aria-label="Recorrido rápido">' +
          '<button type="button" class="tf-chip" data-ruta="aeropuerto-hotel">Aeropuerto → Hotel</button>' +
          '<button type="button" class="tf-chip" data-ruta="hotel-aeropuerto">Hotel → Aeropuerto</button>' +
        "</div>" +
  
        '<div class="tf-ruta">' +
          '<label class="tf-campo"><span>Origen</span>' +
            '<input type="text" id="tf-origen" list="tf-lugares" maxlength="120" placeholder="Ej. Aeropuerto de Punta Cana"></label>' +
          '<button type="button" class="tf-swap" id="tf-swap" aria-label="Intercambiar origen y destino">' + ICO.swap + "</button>" +
          '<label class="tf-campo"><span>Destino</span>' +
            '<input type="text" id="tf-destino" list="tf-lugares" maxlength="120" placeholder="Ej. Hotel Riu Palace"></label>' +
        "</div>" +
  
        '<div class="tf-fila">' +
          '<div class="tf-campo"><span id="tf-pers-etq">Personas</span>' +
            '<div class="tf-stepper" role="group" aria-labelledby="tf-pers-etq">' +
              '<button type="button" id="tf-menos" aria-label="Una persona menos">' + ICO.menos + "</button>" +
              '<output id="tf-personas" aria-live="polite">2</output>' +
              '<button type="button" id="tf-mas" aria-label="Una persona más">' + ICO.mas + "</button>" +
            "</div>" +
          "</div>" +
          '<label class="tf-campo"><span>Fecha</span><input type="date" id="tf-fecha"></label>' +
          '<label class="tf-campo"><span>Hora <em>(opcional)</em></span><input type="time" id="tf-hora"></label>' +
        "</div>" +
  
        '<label class="tf-check"><input type="checkbox" id="tf-con-regreso"> También necesito el regreso</label>' +
        '<div class="tf-fila tf-regreso" id="tf-regreso" hidden>' +
          '<label class="tf-campo"><span>Fecha de regreso</span><input type="date" id="tf-fecha-regreso"></label>' +
          '<label class="tf-campo"><span>Hora <em>(opcional)</em></span><input type="time" id="tf-hora-regreso"></label>' +
        "</div>" +
  
        '<p class="tf-error" id="tf-error" role="alert" hidden></p>' +
        '<button type="submit" class="btn btn-principal tf-enviar">Cotizar por WhatsApp</button>' +
        '<datalist id="tf-lugares">' + LUGARES.map(function (l) { return '<option value="' + esc(l) + '">'; }).join("") + "</datalist>" +
      "</form>";
    document.body.appendChild(dlg);
  
    function $(id) { return dlg.querySelector("#" + id); }
    var form = $("tf-form"), nombre = $("tf-nombre"), origen = $("tf-origen"), destino = $("tf-destino"),
        personasEl = $("tf-personas"), fecha = $("tf-fecha"), hora = $("tf-hora"),
        conRegreso = $("tf-con-regreso"), bloqueRegreso = $("tf-regreso"),
        fechaReg = $("tf-fecha-regreso"), horaReg = $("tf-hora-regreso"), errorEl = $("tf-error");
  
    var personas = 2;
    function pintarPersonas() {
      personasEl.textContent = personas;
      $("tf-menos").disabled = personas <= 1;
      $("tf-mas").disabled = personas >= MAX_PERSONAS;
    }
    $("tf-menos").addEventListener("click", function () { if (personas > 1) { personas--; pintarPersonas(); } });
    $("tf-mas").addEventListener("click", function () { if (personas < MAX_PERSONAS) { personas++; pintarPersonas(); } });
  
    $("tf-swap").addEventListener("click", function () {
      var t = origen.value; origen.value = destino.value; destino.value = t;
    });
  
    Array.prototype.forEach.call(dlg.querySelectorAll("[data-ruta]"), function (b) {
      b.addEventListener("click", function () {
        var aHotel = b.getAttribute("data-ruta") === "aeropuerto-hotel";
        origen.value = aHotel ? "Aeropuerto" : "Hotel";
        destino.value = aHotel ? "Hotel" : "Aeropuerto";
        (aHotel ? origen : destino).focus();
        (aHotel ? origen : destino).select();
      });
    });
  
    function mostrarRegreso(si) {
      conRegreso.checked = si;
      bloqueRegreso.hidden = !si;
    }
    conRegreso.addEventListener("change", function () { mostrarRegreso(conRegreso.checked); });
    fecha.addEventListener("change", function () {
      fechaReg.min = fecha.value || hoyISO();
      if (fechaReg.value && fecha.value && fechaReg.value < fecha.value) fechaReg.value = "";
    });
  
    /* ---------- Abrir / cerrar ---------- */
    function abrir(modo) {
      var h = hoyISO();
      fecha.min = h;
      fechaReg.min = fecha.value || h;
      mostrarRegreso(modo === "regreso");
      errorEl.hidden = true;
      pintarPersonas();
      if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
      document.documentElement.classList.add("tf-abierto");
      setTimeout(function () { nombre.focus(); }, 30);
    }
    function cerrar() {
      if (typeof dlg.close === "function") dlg.close(); else dlg.removeAttribute("open");
    }
    dlg.addEventListener("close", function () { document.documentElement.classList.remove("tf-abierto"); });
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg || e.target.closest("[data-cerrar-transfer]")) cerrar();
    });
    document.addEventListener("click", function (e) {
      var b = e.target.closest("[data-abrir-transfer]");
      if (b) { e.preventDefault(); abrir(b.getAttribute("data-abrir-transfer")); }
    });
    window.abrirTransfer = abrir;   // por si quieres abrirlo desde otro botón
  
    /* ---------- 4. Encabezado que se ajusta solo ----------
       Con "Transfer" el menú ya no entra en pantallas de laptop.
       Se prueba de menos a más hasta que no choque con la marca:
       1 menos espacio · 2 sin letras de la marca · 3 botón "Menú". */
    var nav = document.querySelector(".cabecera .nav");
    var marca = nav && nav.querySelector(".marca");
    var links = nav && nav.querySelector(".nav-links");
    if (nav && marca && links) {
      var origenLinks = links.querySelectorAll(":scope > .solo-escritorio");
      var menu = document.createElement("div");
      menu.className = "menu-cab";
      menu.innerHTML =
        '<button type="button" class="menu-cab-btn" aria-expanded="false" aria-controls="menu-cab-lista">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg><span>Menú</span>' +
        "</button>" +
        '<div class="menu-cab-lista" id="menu-cab-lista" hidden></div>';
      var lista = menu.querySelector(".menu-cab-lista");
      var btnMenu = menu.querySelector(".menu-cab-btn");
      Array.prototype.forEach.call(origenLinks, function (a) {
        var c = document.createElement("a");
        c.href = a.getAttribute("href");
        c.textContent = a.textContent;
        lista.appendChild(c);
      });
      var ultimoLink = origenLinks[origenLinks.length - 1];
      links.insertBefore(menu, ultimoLink ? ultimoLink.nextSibling : links.firstChild);
  
      function abrirMenu(si) {
        lista.hidden = !si;
        btnMenu.setAttribute("aria-expanded", si ? "true" : "false");
      }
      btnMenu.addEventListener("click", function (e) { e.stopPropagation(); abrirMenu(lista.hidden); });
      lista.addEventListener("click", function (e) { if (e.target.closest("a")) abrirMenu(false); });
      document.addEventListener("click", function (e) { if (!menu.contains(e.target)) abrirMenu(false); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") abrirMenu(false); });
  
      function cabe() {
        var finMarca = marca.getBoundingClientRect().right;
        var visibles = Array.prototype.filter.call(links.children, function (el) {
          return el.getClientRects().length > 0;
        });
        if (!visibles.length) return true;
        return visibles[0].getBoundingClientRect().left >= finMarca + 20;
      }
      function ajustar() {
        var nivel = 0;
        nav.removeAttribute("data-ajuste");
        // en celular (≤ 860 px) tu CSS ya oculta los enlaces: ahí va directo el botón Menú
        if (window.matchMedia("(max-width: 860px)").matches) nivel = 3;
        else while (!cabe() && nivel < 3) { nivel++; nav.setAttribute("data-ajuste", nivel); }
        if (nivel) nav.setAttribute("data-ajuste", nivel);
        if (nivel < 3) abrirMenu(false);
      }
      var pendiente = 0;
      window.addEventListener("resize", function () {
        cancelAnimationFrame(pendiente);
        pendiente = requestAnimationFrame(ajustar);
      });
      ajustar();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajustar);
      window.addEventListener("load", ajustar);
    }
  
    /* ---------- Enviar ---------- */
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var faltan = [];
      var n = nombre.value.trim(), o = origen.value.trim(), d = destino.value.trim();
      if (!n) faltan.push("tu nombre");
      if (!o) faltan.push("el origen");
      if (!d) faltan.push("el destino");
      if (!fecha.value) faltan.push("la fecha");
      if (conRegreso.checked && !fechaReg.value) faltan.push("la fecha de regreso");
  
      var error = "";
      if (faltan.length) {
        error = "Falta " + (faltan.length > 1 ? faltan.slice(0, -1).join(", ") + " y " + faltan[faltan.length - 1] : faltan[0]) + ".";
      } else if (o.toLowerCase() === d.toLowerCase()) {
        error = "El origen y el destino no pueden ser el mismo.";
      } else if (fecha.value < hoyISO()) {
        error = "La fecha no puede ser anterior a hoy.";
      } else if (conRegreso.checked && fechaReg.value < fecha.value) {
        error = "El regreso no puede ser antes de la fecha de ida.";
      }
      if (error) {
        errorEl.textContent = error;
        errorEl.hidden = false;
        return;
      }
      errorEl.hidden = true;
  
      var lineas = [
        "Hola, quiero reservar un *transfer* 🚐",
        "",
        "• Nombre: " + n,
        "• Origen: " + o,
        "• Destino: " + d,
        "• Personas: " + personas,
        "• Fecha: " + fechaLarga(fecha.value) + (hora.value ? " · " + hora.value : "")
      ];
      if (conRegreso.checked) {
        lineas.push("• Regreso (" + d + " → " + o + "): " + fechaLarga(fechaReg.value) + (horaReg.value ? " · " + horaReg.value : ""));
      }
      lineas.push("", "¿Me ayudan con la cotización?");
  
      window.open("https://wa.me/" + NUMERO_WA + "?text=" + encodeURIComponent(lineas.join("\n")), "_blank", "noopener");
      cerrar();
    });
  })();