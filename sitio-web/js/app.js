/* =========================================================
   Caribbean Travel — Interacciones del sitio público
   Los destinos llegan desde la base de datos (js/api.js).
   ========================================================= */
(function () {
  "use strict";
  var API = window.CT_API;
  if (!API) return;
  var esc = API.escapar;

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------- Favoritos (en el navegador del visitante) ---------- */
  var CLAVE = "ct_favoritos";
  function leerFavs() { try { return JSON.parse(localStorage.getItem(CLAVE)) || []; } catch (e) { return []; } }
  function guardarFavs(l) { try { localStorage.setItem(CLAVE, JSON.stringify(l)); } catch (e) { /* modo privado */ } }
  var favs = leerFavs();
  function esFav(id) { return favs.indexOf(id) !== -1; }
  function alternarFav(id) {
    favs = esFav(id) ? favs.filter(function (f) { return f !== id; }) : favs.concat(id);
    guardarFavs(favs);
    pintarContadorFavs();
  }
  function pintarContadorFavs() { $$("[data-contador-favs]").forEach(function (el) { el.textContent = favs.length; }); }

  var CORAZON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>';
  function urlDestino(d, extra) { return "destino.html?d=" + encodeURIComponent(d.slug) + (extra || ""); }
  function textoPrecio(d) { return d.precio != null ? "Desde " + API.dinero(d.precio) : "Consultar precio"; }

  /* =========================================================
     PORTADA
     ========================================================= */
  var grilla = $("#grilla-destinos");
  var destinos = [];
  var filtroActual = "todos";
  var soloFavs = false;

  function pintarDestinos() {
    if (!grilla) return;
    var lista = destinos.filter(function (d) {
      if (soloFavs) return esFav(d.slug);
      return filtroActual === "todos" || d.categorias.indexOf(filtroActual) !== -1;
    });
    var cuenta = $("#cuenta-destinos");
    if (cuenta) cuenta.textContent = soloFavs ? lista.length + " guardados" : lista.length + (lista.length === 1 ? " destino" : " destinos");

    if (!lista.length) {
      grilla.innerHTML = '<p class="vacio">' + (soloFavs
        ? "Aún no guardas destinos. Toca el corazón en los que te gusten."
        : "No hay destinos en esta categoría todavía.") + "</p>";
      return;
    }
    grilla.innerHTML = lista.map(function (d, i) {
      var portada = d.fotos[0];
      var media = portada
        ? '<img src="' + esc(portada.url) + '" alt="' + esc(portada.alt) + '" loading="lazy">'
        : '<div class="sin-foto tono-' + (i % 4) + '">' + esc(d.nombre) + "</div>";
      return (
        '<article class="tarjeta">' +
          '<a class="tarjeta-media" href="' + urlDestino(d) + '" aria-label="Ver ' + esc(d.nombre) + '">' + media +
            (d.etiqueta ? '<span class="etiqueta">' + esc(d.etiqueta) + "</span>" : "") +
          "</a>" +
          '<button type="button" class="corazon" data-fav="' + esc(d.slug) + '" aria-pressed="' + esFav(d.slug) + '" aria-label="Guardar ' + esc(d.nombre) + ' en favoritos">' + CORAZON + "</button>" +
          '<div class="tarjeta-fila"><h3>' + esc(d.nombre) + '</h3><span class="pais">' + esc(d.pais) + "</span></div>" +
          '<p class="frase">' + esc(d.frase) + "</p>" +
          '<div class="tarjeta-pie"><span>' + esc(textoPrecio(d)) + '</span><a href="' + urlDestino(d) + '">Ver destino →</a></div>' +
        "</article>"
      );
    }).join("");
  }

  /* ---------- Salidas confirmadas (tabla salidas_confirmadas, módulo aparte) ---------- */
  var DIAS_LARGOS = { DOM: "domingo", LUN: "lunes", MAR: "martes", "MIÉ": "miércoles", JUE: "jueves", VIE: "viernes", "SÁB": "sábado" };

  var salidasConf = [];
  var salidaActiva = 0;

  function etiquetaSalida(s, lista) {
    // Si dos salidas van al mismo destino, se distinguen por el origen
    var repetido = lista.filter(function (x) { return x.destino.toLowerCase() === s.destino.toLowerCase(); }).length > 1;
    return repetido ? s.destino + " desde " + s.origen : s.destino;
  }

  function pintarSalidasConfirmadas(lista) {
    var seccion = $("#salidas");
    if (!seccion) return;
    salidasConf = lista;
    if (!lista.length) { seccion.hidden = true; return; }

    var meses = [];
    lista.forEach(function (s) {
      API.fechasFuturas(s.fechas).forEach(function (f) { if (meses.indexOf(f.mes) === -1) meses.push(f.mes); });
    });
    $("#salidas-eyebrow").textContent = meses.length === 1 ? meses[0] : "Próximos meses";

    $("#salidas-botones").innerHTML = lista.map(function (s, i) {
      return '<button type="button" class="chip" role="tab" data-salida="' + i + '">' + esc(etiquetaSalida(s, lista)) + "</button>";
    }).join("");
    elegirSalida(0);
    seccion.hidden = false;
  }

  function elegirSalida(i) {
    var s = salidasConf[i];
    if (!s) return;
    salidaActiva = i;
    $$("#salidas-botones [data-salida]").forEach(function (b) {
      b.setAttribute("aria-selected", String(+b.getAttribute("data-salida") === i));
    });

    var inc = s.incluye.map(function (x) { return [x.valor, x.titulo ? x.titulo.toLowerCase() : ""].filter(Boolean).join(" "); }).join(", ");
    $("#salidas-detalle").textContent =
      s.ruta + (s.aerolinea ? " con " + s.aerolinea : "") + "." +
      (inc ? " Incluye: " + inc + "." : "") +
      (s.precio != null ? " Desde " + API.dinero(s.precio) + " por persona." : "");

    // El avión de Aeroregional sale si la aerolínea es Aeroregional o está vacía
    $("#salidas-avion").hidden = !!s.aerolinea && !/aeroregional/i.test(s.aerolinea);

    $("#carril-salidas").innerHTML = API.fechasFuturas(s.fechas).map(function (f) {
      var dia = DIAS_LARGOS[f.semana] || f.semana.toLowerCase();
      var msg = "Hola, quiero reservar la salida confirmada *" + s.ruta + "*" + (s.aerolinea ? " con " + s.aerolinea : "") +
        " del *" + dia + " " + f.dia + " de " + f.mes + " de " + f.anio + "*." +
        (s.precio != null ? " Precio desde " + API.dinero(s.precio) + " por persona." : "") +
        " ¿Hay cupos disponibles?";
      return '<a class="fecha" href="' + esc(API.linkWhatsApp(msg)) + '" target="_blank" rel="noopener" aria-label="Reservar ' +
        esc(s.ruta) + ", " + dia + " " + f.dia + " de " + f.mes + ' por WhatsApp">' +
        "<small>" + f.semana + '</small><span class="dia">' + f.dia + "</span>" +
        "<small>" + f.mesCorto + (s.precio != null ? " · desde " + API.dinero(s.precio) : "") + "</small></a>";
    }).join("");
    $("#carril-salidas").scrollLeft = 0;
  }

  var botonesSalidas = $("#salidas-botones");
  if (botonesSalidas) {
    botonesSalidas.addEventListener("click", function (e) {
      var b = e.target.closest("[data-salida]");
      if (b) elegirSalida(+b.getAttribute("data-salida"));
    });
  }

  if ($("#salidas")) API.listarSalidasConfirmadas().then(pintarSalidasConfirmadas);

  if (grilla) {
    grilla.innerHTML = '<p class="vacio">Cargando destinos…</p>';
    grilla.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-fav]");
      if (!btn) return;
      alternarFav(btn.getAttribute("data-fav"));
      btn.setAttribute("aria-pressed", String(esFav(btn.getAttribute("data-fav"))));
      if (soloFavs) pintarDestinos();
    });
    $$("[data-filtro]").forEach(function (chip) {
      chip.addEventListener("click", function () {
        filtroActual = chip.getAttribute("data-filtro");
        soloFavs = false;
        $$("[data-ver-favs]").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
        $$("[data-filtro]").forEach(function (c) { c.setAttribute("aria-pressed", String(c === chip)); });
        pintarDestinos();
      });
    });
    API.listar().then(function (lista) {
      destinos = lista;
      pintarDestinos();
      var dl = $("#lista-destinos");
      if (dl) dl.innerHTML = lista.map(function (d) { return '<option value="' + esc(d.nombre) + '">'; }).join("");
    });
  }

  $$("[data-ver-favs]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (!grilla) { location.href = "index.html#destinos"; return; }
      soloFavs = !soloFavs;
      btn.setAttribute("aria-pressed", String(soloFavs));
      pintarDestinos();
      $("#destinos").scrollIntoView();
    });
  });

  /* ---------- Buscador ---------- */
  var formBusca = $("#form-buscar");
  var tipoViaje = "Paquete";
  $$("[data-pestana]").forEach(function (tab) {
    tab.addEventListener("click", function () {
      tipoViaje = tab.getAttribute("data-pestana");
      $$("[data-pestana]").forEach(function (t) { t.setAttribute("aria-selected", String(t === tab)); });
      var b = $("#btn-buscar");
      if (b) b.textContent = tipoViaje === "Solo vuelo" ? "Buscar vuelos" : tipoViaje === "Viaje a medida" ? "Cotizar mi viaje" : "Buscar paquetes";
    });
  });
  if (formBusca) {
    formBusca.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = new FormData(formBusca);
      var msg = "Hola, quiero cotizar: " + tipoViaje +
        "\n• Desde: " + (f.get("desde") || "Quito") +
        "\n• Destino: " + (f.get("destino") || "por definir") +
        "\n• Fechas: " + (f.get("fechas") || "flexibles") +
        "\n• Viajeros: " + (f.get("viajeros") || "por definir");
      window.open(API.linkWhatsApp(msg), "_blank", "noopener");
    });
  }

  /* =========================================================
     PÁGINA DE DESTINO (destino.html?d=slug)
     ========================================================= */
  var paginaDestino = $("#pagina-destino");
  if (paginaDestino) {
    var params = new URLSearchParams(location.search);
    var slug = params.get("d") || "";
    API.obtener(slug).then(function (d) {
      if (!d) {
        paginaDestino.innerHTML = '<section class="contenedor seccion"><h1 class="titulo t-l">No encontramos ese destino.</h1>' +
          '<p class="texto-suave">Puede que ya no esté disponible.</p><a class="btn btn-principal" href="index.html#destinos">Ver todos los destinos</a></section>';
        return;
      }
      pintarDestino(d, params.get("salida"));
    });
  }

  function pintarDestino(d, salidaPedida) {
    document.title = d.nombre + " desde Quito · Caribbean Travel";
    $("#d-ruta").textContent = d.ruta || d.pais;
    $("#d-nombre").textContent = d.nombre + ".";
    $("#d-frase").textContent = d.frase;

    // Galería
    var gal = $("#d-galeria");
    gal.innerHTML = d.fotos.length
      ? d.fotos.slice(0, 4).map(function (f) { return '<img src="' + esc(f.url) + '" alt="' + esc(f.alt) + '">'; }).join("")
      : '<div class="sin-foto tono-0" style="height:clamp(260px,32vw,460px);border-radius:16px">' + esc(d.nombre) + "</div>";
    gal.classList.toggle("galeria-1", d.fotos.length <= 1);

    // Incluye
    var inc = d.incluye.slice();
    if (d.aerolinea) inc.push({ titulo: "Aerolínea", valor: d.aerolinea });
    $("#d-incluye").innerHTML = inc.map(function (x) {
      return "<div><small>" + esc(String(x.titulo || "").toUpperCase()) + "</small><strong>" + esc(x.valor) + "</strong></div>";
    }).join("");
    $("#d-incluye").hidden = !inc.length;

    // Descripción e itinerario
    $("#d-descripcion").textContent = d.descripcion || "Un asesor te prepara opciones de vuelo y hotel según tus fechas.";
    $("#d-itinerario-bloque").hidden = !d.itinerario.length;
    $("#d-itinerario").innerHTML = d.itinerario.map(function (x, i) {
      return '<div class="dia-itin"><span>DÍA ' + (i + 1) + "</span><div><h3>" + esc(x.titulo) + "</h3>" + (x.detalle ? "<p>" + esc(x.detalle) + "</p>" : "") + "</div></div>";
    }).join("");

    // Favorito
    var favBtn = $("[data-fav-pagina]");
    if (favBtn) {
      var pintarFavBtn = function () {
        favBtn.setAttribute("aria-pressed", String(esFav(d.slug)));
        $("span", favBtn).textContent = esFav(d.slug) ? "Guardado" : "Guardar";
      };
      favBtn.onclick = function () { alternarFav(d.slug); pintarFavBtn(); };
      pintarFavBtn();
    }

    // Tarjeta de reserva
    var fechas = API.salidasFuturas(d);
    var reserva = $("#reserva");
    $("#r-precio").textContent = d.precio != null ? API.dinero(d.precio) : "A cotizar";
    $("#r-precio-label").textContent = d.precio != null ? "Desde, por adulto" : "Precio según tus fechas";
    var bloqueFechas = $("#r-fechas-bloque");
    bloqueFechas.hidden = !fechas.length;
    var estado = {
      salida: fechas.some(function (f) { return f.iso === salidaPedida; }) ? salidaPedida : (fechas[0] && fechas[0].iso),
      pax: {}
    };
    API.PASAJEROS.forEach(function (t) { estado.pax[t.id] = t.inicial; });

    // Filas de viajeros: Adultos, Niños (menores de 11), Adultos mayores
    $("#r-pasajeros").innerHTML = API.PASAJEROS.map(function (t) {
      var p = API.precioPasajero(d, t.id);
      var sub = [t.detalle, p != null ? API.dinero(p) + " c/u" : ""].filter(Boolean).join(" · ");
      return '<div class="pasajero"><div class="pasajero-info"><strong id="lbl-' + t.id + '">' + t.nombre + "</strong>" +
        (sub ? "<small>" + esc(sub) + "</small>" : "") + "</div>" +
        '<div class="contador" role="group" aria-labelledby="lbl-' + t.id + '">' +
          '<button type="button" data-pax="' + t.id + '" data-delta="-1" aria-label="Quitar ' + t.uno + '">−</button>' +
          '<output data-cuenta="' + t.id + '" aria-live="polite">' + t.inicial + "</output>" +
          '<button type="button" data-pax="' + t.id + '" data-delta="1" aria-label="Agregar ' + t.uno + '">+</button>' +
        "</div></div>";
    }).join("");

    $("#r-pasajeros").onclick = function (e) {
      var b = e.target.closest("[data-pax]");
      if (!b || b.disabled) return;
      var tipo = b.getAttribute("data-pax");
      estado.pax[tipo] = Math.max(0, Math.min(10, estado.pax[tipo] + parseInt(b.getAttribute("data-delta"), 10)));
      pintarReserva();
    };

    function textoPasajeros() {
      var partes = API.PASAJEROS.filter(function (t) { return estado.pax[t.id] > 0; }).map(function (t) {
        var n = estado.pax[t.id];
        return n + " " + (n === 1 ? t.uno : t.varios);
      });
      if (partes.length <= 1) return partes[0] || "";
      return partes.slice(0, -1).join(", ") + " y " + partes[partes.length - 1];
    }
    if (fechas.length) {
      var meses = fechas.map(function (f) { return f.mes; }).filter(function (m, i, a) { return a.indexOf(m) === i; });
      $("#r-fechas-titulo").textContent = "ELIGE TU SALIDA" + (meses.length === 1 ? " · " + meses[0].toUpperCase() : "");
      $("#fechas").innerHTML = fechas.map(function (f) {
        return '<button type="button" data-dia="' + f.iso + '" aria-label="' + f.semana + " " + f.dia + " de " + f.mes + '"><small>' + f.semana + "</small><strong>" + f.dia + "</strong>" +
          (meses.length > 1 ? "<small>" + f.mesCorto + "</small>" : "") + "</button>";
      }).join("");
      $("#fechas").onclick = function (e) {
        var b = e.target.closest("[data-dia]");
        if (b) { estado.salida = b.getAttribute("data-dia"); pintarReserva(); }
      };
    }
    $("#fila-total").hidden = d.precio == null;

    function pintarReserva() {
      $$("[data-dia]", reserva).forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-dia") === estado.salida)); });
      var P = estado.pax;
      var responsables = P.adultos + P.mayores;
      API.PASAJEROS.forEach(function (t) {
        $('[data-cuenta="' + t.id + '"]', reserva).textContent = P[t.id];
        var menos = $('[data-pax="' + t.id + '"][data-delta="-1"]', reserva);
        // No se puede dejar el viaje sin al menos un adulto o adulto mayor
        var ultimo = t.id !== "ninos" && responsables === 1 && P[t.id] === 1;
        menos.disabled = P[t.id] === 0 || ultimo;
        menos.title = ultimo ? "Debe viajar al menos un adulto o adulto mayor" : "";
        $('[data-pax="' + t.id + '"][data-delta="1"]', reserva).disabled = P[t.id] >= 10;
      });
      if (d.precio != null) {
        var total = API.PASAJEROS.reduce(function (s, t) { return s + API.precioPasajero(d, t.id) * P[t.id]; }, 0);
        $("#total", reserva).textContent = API.dinero(total);
      }
      var cta = $("#cta-reservar", reserva);
      var personas = textoPasajeros();
      if (estado.salida) {
        var f = API.infoFecha(estado.salida);
        cta.textContent = "Reservar salida del " + f.dia + " de " + f.mesCorto;
        cta.href = API.linkWhatsApp("Hola, quiero reservar el paquete a " + d.nombre + " con salida el " + f.dia + " de " + f.mes + " para " + personas + ".");
      } else {
        cta.textContent = "Cotizar por WhatsApp";
        cta.href = API.linkWhatsApp("Hola, quiero cotizar un viaje a " + d.nombre + " para " + personas + ".");
      }
    }
    pintarReserva();
    paginaDestino.removeAttribute("aria-busy");
  }

  /* ---------- Enlaces genéricos a WhatsApp ---------- */
  $$("[data-wa]").forEach(function (a) {
    a.href = API.linkWhatsApp(a.getAttribute("data-wa"));
    a.target = "_blank";
    a.rel = "noopener";
  });

  pintarContadorFavs();
})();
