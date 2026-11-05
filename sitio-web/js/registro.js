/* =========================================================
   Caribbean Travel — Ventana emergente de registro a promociones
   Guarda en la tabla public.clientes de Supabase.
   Se abre con cualquier elemento que tenga data-abrir-registro
   o entrando a la web con #registro al final del enlace.
   ========================================================= */
(function () {
  "use strict";

  var C = window.CT_CONFIG || {};
  var sb = null;

  function cliente() {
    if (sb) return sb;
    if (!(C.supabaseUrl && C.supabaseClave && window.supabase && window.supabase.createClient)) return null;
    sb = window.supabase.createClient(C.supabaseUrl, C.supabaseClave, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    return sb;
  }

  /* ---------- Ventana ---------- */
  var html =
    '<dialog class="reg-modal" id="registro" aria-labelledby="reg-titulo">' +
      '<button class="reg-cerrar" type="button" aria-label="Cerrar" data-cerrar>&times;</button>' +

      '<div class="reg-vista" data-vista="form">' +
        '<p class="reg-eyebrow">Club de viajeros</p>' +
        '<h2 class="reg-titulo" id="reg-titulo">Promociones antes que nadie.</h2>' +
        '<p class="reg-texto">Déjanos tus datos y te enviamos ofertas, salidas confirmadas y tarifas especiales por correo y WhatsApp.</p>' +
        '<form class="reg-form" novalidate>' +
          '<label class="reg-campo"><span>Nombres y apellidos</span>' +
            '<input name="nombres" type="text" autocomplete="name" maxlength="120" placeholder="Ej. María José Pérez López" required></label>' +
          '<label class="reg-campo"><span>Correo electrónico</span>' +
            '<input name="email" type="email" autocomplete="email" inputmode="email" maxlength="160" placeholder="tucorreo@gmail.com" required></label>' +
          '<label class="reg-campo"><span>Celular (WhatsApp)</span>' +
            '<input name="celular" type="tel" autocomplete="tel" inputmode="tel" maxlength="20" placeholder="0987654321" required></label>' +
          '<input class="reg-trampa" name="empresa" type="text" tabindex="-1" autocomplete="off" aria-hidden="true">' +
          '<p class="reg-error" role="alert" hidden></p>' +
          '<button class="reg-enviar" type="submit">Registrarme</button>' +
          '<label class="reg-check"><input name="acepto" type="checkbox" required>' +
            '<span>Acepto recibir promociones por correo y WhatsApp y el tratamiento de mis datos para este fin. Puedo darme de baja cuando quiera.</span></label>' +
        '</form>' +
      '</div>' +

      '<div class="reg-vista" data-vista="ok" hidden>' +
        '<p class="reg-eyebrow">Club de viajeros</p>' +
        '<h2 class="reg-titulo">¡Listo, ya estás dentro! 🌴</h2>' +
        '<p class="reg-texto" data-mensaje-ok>Muy pronto te llegarán nuestras mejores promociones.</p>' +
        '<button class="reg-enviar" type="button" data-cerrar>Seguir viendo destinos</button>' +
      '</div>' +
    '</dialog>';

  document.body.insertAdjacentHTML("beforeend", html);

  var modal = document.getElementById("registro");
  var form = modal.querySelector(".reg-form");
  var error = modal.querySelector(".reg-error");
  var boton = modal.querySelector(".reg-form .reg-enviar");
  var vistaForm = modal.querySelector('[data-vista="form"]');
  var vistaOk = modal.querySelector('[data-vista="ok"]');

  function abrir() {
    vistaForm.hidden = false;
    vistaOk.hidden = true;
    mostrarError("");
    if (typeof modal.showModal === "function") modal.showModal();
    else modal.setAttribute("open", "");
    document.documentElement.classList.add("reg-abierto");
    setTimeout(function () { form.nombres.focus(); }, 50);
  }

  function cerrar() {
    if (typeof modal.close === "function") modal.close();
    else modal.removeAttribute("open");
  }

  modal.addEventListener("close", function () {
    document.documentElement.classList.remove("reg-abierto");
    if (location.hash === "#registro") history.replaceState(null, "", location.pathname + location.search);
  });

  // Botones que abren la ventana
  document.addEventListener("click", function (e) {
    var disparador = e.target.closest("[data-abrir-registro]");
    if (!disparador) return;
    e.preventDefault();
    e.stopPropagation();
    abrir();
  }, true);

  // Cerrar con la X, el botón final o tocando fuera
  modal.addEventListener("click", function (e) {
    if (e.target === modal || e.target.closest("[data-cerrar]")) cerrar();
  });

  // Enlace directo: caribbeantravelvacaciones.com/#registro
  if (location.hash === "#registro") abrir();

  /* ---------- Validación ---------- */
  function mostrarError(texto) {
    error.textContent = texto;
    error.hidden = !texto;
  }

  function normalizarCelular(valor) {
    var crudo = String(valor || "").trim();
    var digitos = crudo.replace(/\D/g, "");
    if (crudo.charAt(0) === "+") return digitos.length >= 10 && digitos.length <= 15 ? "+" + digitos : null;
    if (/^09\d{8}$/.test(digitos)) return "+593" + digitos.slice(1);
    if (/^9\d{8}$/.test(digitos)) return "+593" + digitos;
    if (/^5939\d{8}$/.test(digitos)) return "+" + digitos;
    return null;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    mostrarError("");

    var nombre = form.nombres.value.trim().replace(/\s+/g, " ");
    var email = form.email.value.trim().toLowerCase();
    var celular = normalizarCelular(form.celular.value);

    if (nombre.split(" ").length < 2 || nombre.length < 5) return mostrarError("Escribe tus nombres y apellidos.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return mostrarError("Revisa tu correo electrónico.");
    if (!celular) return mostrarError("Revisa tu celular. Ej. 0987654321, o con código de país si no es de Ecuador (+57…).");
    if (!form.acepto.checked) return mostrarError("Marca la casilla para poder enviarte las promociones.");

    // Si un robot llenó el campo oculto, fingimos éxito y no guardamos nada
    if (form.empresa.value) return listo(false);

    var db = cliente();
    if (!db) return mostrarError("No pudimos conectar en este momento. Escríbenos por WhatsApp y te registramos.");

    boton.disabled = true;
    boton.textContent = "Registrando…";

    var r = await db.from("clientes").insert({
      nombres_apellidos: nombre,
      email: email,
      celular: celular,
      acepta_email: true,
      acepta_whatsapp: true,
      origen: "web"
    });

    boton.disabled = false;
    boton.textContent = "Registrarme";

    if (r.error) {
      if (r.error.code === "23505") return listo(true);
      console.error("Registro:", r.error);
      return mostrarError("No se pudo completar el registro. Inténtalo de nuevo en un momento.");
    }
    listo(false);
  });

  function listo(yaRegistrado) {
    modal.querySelector("[data-mensaje-ok]").textContent = yaRegistrado
      ? "Ese correo ya estaba registrado, así que seguirás recibiendo nuestras promociones 🙌"
      : "Muy pronto te llegarán nuestras mejores promociones por correo y WhatsApp.";
    form.reset();
    vistaForm.hidden = true;
    vistaOk.hidden = false;
    vistaOk.querySelector(".reg-enviar").focus();
  }
})();
