/* =========================================================
   Caribbean Travel — Seguro de viaje
   Abre la ventana con cualquier botón que tenga data-abrir-seguro
   ("normal" o "estudiantil") y arma el mensaje para WhatsApp.
   Para cambiar precios o coberturas, edita PLANES.
   ========================================================= */
(function () {
  "use strict";

  // Número de WhatsApp de la agencia (con código de país, sin + ni espacios)
  var NUMERO_WA = "593987620947";

  // edad: "0-75" o "76-85" · precio: USD por día
  var PLANES = [
    { cobertura: 22000, edad: "0-75",  precio: 3 },
    { cobertura: 35000, edad: "0-75",  precio: 4 },
    { cobertura: 55000, edad: "0-75",  precio: 5 },
    { cobertura: 70000, edad: "0-75",  precio: 6 },
    { cobertura: 35000, edad: "76-85", precio: 6 }
  ];

  var EDADES = { "0-75": "0 a 75 años", "76-85": "76 a 85 años" };

  var modal = document.getElementById("modal-seguro");
  var form = document.getElementById("form-seguro");
  if (!modal || !form) return;

  var cajaPlanes = document.getElementById("seguro-planes");
  var inputDias = document.getElementById("seguro-dias");
  var cajaTotal = document.getElementById("seguro-total");
  var cajaError = document.getElementById("seguro-error");
  var etiquetaTipo = document.getElementById("seguro-modal-tipo");
  var tituloModal = document.getElementById("seguro-modal-titulo");

  function miles(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
  function dinero(n) {
    return n.toFixed(2).replace(".", ",");
  }
  function valor(nombre) {
    var el = form.querySelector('input[name="' + nombre + '"]:checked');
    return el ? el.value : "";
  }
  function dias() {
    var d = parseInt(inputDias.value, 10);
    return isNaN(d) ? 0 : d;
  }
  function planElegido() {
    var i = valor("plan");
    return i === "" ? null : PLANES[Number(i)];
  }

  // Muestra solo las coberturas disponibles para la edad elegida
  function pintarPlanes() {
    var edad = valor("edad") || "0-75";
    var anterior = planElegido();
    cajaPlanes.innerHTML = "";

    PLANES.forEach(function (p, i) {
      if (p.edad !== edad) return;
      var label = document.createElement("label");
      label.className = "seguro-plan";
      label.innerHTML =
        '<input type="radio" name="plan" value="' + i + '">' +
        "<span><strong>USD " + miles(p.cobertura) + "</strong>" +
        "<small>USD " + dinero(p.precio) + " por día</small></span>";
      cajaPlanes.appendChild(label);
      if (anterior && anterior.cobertura === p.cobertura) {
        label.querySelector("input").checked = true;
      }
    });

    // Si solo hay una opción (76 a 85 años), la marcamos sola
    var opciones = cajaPlanes.querySelectorAll('input[name="plan"]');
    if (opciones.length === 1) opciones[0].checked = true;
  }

  function actualizarTipo() {
    var estudiantil = valor("tipo") === "estudiantil";
    etiquetaTipo.textContent = estudiantil ? "Seguro estudiantil" : "Seguro de viaje";
    tituloModal.textContent = estudiantil ? "Arma tu seguro estudiantil" : "Arma tu seguro";
  }

  function actualizarTotal() {
    var p = planElegido();
    var d = dias();
    if (!p || d < 1) {
      cajaTotal.innerHTML = "<span>Elige cobertura y días para ver el valor.</span>";
      return;
    }
    if (valor("tipo") === "estudiantil") {
      cajaTotal.innerHTML =
        "<span>Tarifa estudiantil</span><strong>Te la confirma un asesor</strong>";
      return;
    }
    cajaTotal.innerHTML =
      "<span>Valor referencial · " + d + (d === 1 ? " día" : " días") + "</span>" +
      "<strong>USD " + dinero(p.precio * d) + "</strong>";
  }

  function refrescar() {
    cajaError.textContent = "";
    actualizarTipo();
    actualizarTotal();
  }

  function abrir(tipo) {
    var radio = form.querySelector('input[name="tipo"][value="' + tipo + '"]');
    if (radio) radio.checked = true;
    pintarPlanes();
    refrescar();
    if (typeof modal.showModal === "function") modal.showModal();
    else modal.setAttribute("open", "");
    document.body.style.overflow = "hidden";
  }

  function cerrar() {
    if (typeof modal.close === "function") modal.close();
    else modal.removeAttribute("open");
  }

  modal.addEventListener("close", function () {
    document.body.style.overflow = "";
  });

  // Botones que abren la ventana
  document.querySelectorAll("[data-abrir-seguro]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      abrir(btn.getAttribute("data-abrir-seguro") || "normal");
    });
  });

  // Cerrar con la X o tocando fuera
  modal.querySelectorAll("[data-cerrar-seguro]").forEach(function (b) {
    b.addEventListener("click", cerrar);
  });
  modal.addEventListener("click", function (e) {
    if (e.target === modal) cerrar();
  });

  // Botones − / + de días
  form.querySelectorAll("[data-dias]").forEach(function (b) {
    b.addEventListener("click", function () {
      var d = Math.min(365, Math.max(1, dias() + Number(b.getAttribute("data-dias"))));
      inputDias.value = d;
      refrescar();
    });
  });

  form.addEventListener("change", function (e) {
    if (e.target.name === "edad") pintarPlanes();
    refrescar();
  });
  inputDias.addEventListener("input", refrescar);

  // Enviar: arma el mensaje y abre WhatsApp
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var continente = valor("continente");
    var edad = valor("edad");
    var p = planElegido();
    var d = dias();

    var falta = !continente ? "el continente"
      : !edad ? "la edad del viajero"
      : !p ? "la cobertura"
      : d < 1 || d > 365 ? "los días (de 1 a 365)"
      : "";
    if (falta) {
      cajaError.textContent = "Te falta elegir " + falta + ".";
      return;
    }

    var estudiantil = valor("tipo") === "estudiantil";
    var lineas = [
      "Hola, quiero adquirir un *seguro de viaje" + (estudiantil ? " estudiantil" : "") + "*.",
      "",
      "• Tipo: " + (estudiantil ? "Estudiantil" : "Normal"),
      "• Cobertura: USD " + miles(p.cobertura),
      "• Continente: " + continente,
      "• Edad: " + EDADES[edad],
      "• Días: " + d
    ];
    if (!estudiantil) {
      lineas.push("• Valor referencial: USD " + dinero(p.precio * d) +
        " (USD " + dinero(p.precio) + " por día)");
    }
    lineas.push("", "¿Me ayudan con el proceso?");

    var url = "https://wa.me/" + NUMERO_WA + "?text=" + encodeURIComponent(lineas.join("\n"));
    window.open(url, "_blank", "noopener");
    cerrar();
  });
})();
