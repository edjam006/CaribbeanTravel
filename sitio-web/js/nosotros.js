/* =========================================================
   QUIÉNES SOMOS — Caribbean Travel
   Franja azul (como Salidas confirmadas) justo encima del
   pie de página: logo a la izquierda; descripción, misión
   y visión a la derecha.

   Se monta sola. Para cambiar los textos, edita TEXTOS.
   Uso: <script src="js/nosotros.js" defer></script>
   ========================================================= */
(function () {
  "use strict";

  var TEXTOS = {
    titulo: "Viajes pensados contigo, desde Quito.",
    descripcion:
      "Somos Caribbean Travel, una agencia de viajes en Quito que arma paquetes, tours, boletos aéreos, seguros y traslados para personas, familias, grupos y empresas. Te acompañamos antes, durante y después del viaje, con precios competitivos y cortesías que hacen la diferencia.",
    mision:
      "Hacer que viajar sea fácil y accesible, con asesoría cercana, precios justos y beneficios reales en cada paquete, para que cada cliente viaje tranquilo y vuelva con ganas de repetir.",
    vision:
      "Ser la agencia de viajes de mayor confianza en Ecuador, reconocida por su atención personalizada y por convertir cada viaje en una experiencia que nuestros clientes recomiendan."
  };

  var footer = document.querySelector("footer");
  if (!footer || document.getElementById("nosotros")) return;

  var s = document.createElement("section");
  s.className = "nosotros";
  s.id = "nosotros";
  s.setAttribute("aria-labelledby", "nosotros-titulo");
  s.innerHTML =
    '<div class="contenedor nosotros-grid">' +
      '<div class="nosotros-marca">' +
        '<div class="nosotros-sello"><img src="img/logo.png" alt="Caribbean Travel" width="132" height="132"></div>' +
        '<p class="nosotros-nombre">CARIBBEAN<br>TRAVEL</p>' +
        '<p class="nosotros-lugar">Quito · Ecuador</p>' +
      "</div>" +
      '<div class="nosotros-texto">' +
        '<p class="eyebrow">Quiénes somos</p>' +
        '<h2 class="titulo t-l" id="nosotros-titulo">' + TEXTOS.titulo + "</h2>" +
        '<p class="nosotros-desc">' + TEXTOS.descripcion + "</p>" +
        '<div class="nosotros-mv">' +
          '<div><h3>Misión</h3><p>' + TEXTOS.mision + "</p></div>" +
          '<div><h3>Visión</h3><p>' + TEXTOS.vision + "</p></div>" +
        "</div>" +
      "</div>" +
    "</div>";

  footer.parentNode.insertBefore(s, footer);

  // Si hay un enlace a "#nosotros" en algún lugar, ya funciona solo.
})();
