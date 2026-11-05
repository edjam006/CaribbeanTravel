/* =========================================================
   Caribbean Travel — Panel de administración
   Iniciar sesión, listar, crear, editar y borrar destinos,
   subir fotos y migrar los destinos iniciales.
   La seguridad real está en la base de datos (RLS):
   aunque alguien abra esta página, sin ser admin no puede
   leer borradores ni modificar nada.
   ========================================================= */
(function () {
  "use strict";
  var API = window.CT_API;
  var C = window.CT_CONFIG || {};
  var BUCKET = C.bucketFotos || "destinos";
  var esc = API.escapar;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var sb = null;
  var usuarioId = null;
  var recuperando = false;
  var destinos = [];
  var ed = null;          // estado del editor
  var sucio = false;      // hay cambios sin guardar
  var MAX_FOTOS = 8;
  var migracionIncompleta = false;

  /* ---------- Utilidades de interfaz ---------- */
  var VISTAS = ["cargando", "config", "login", "nueva-clave", "noadmin", "lista", "editor"];
  function mostrar(v) {
    VISTAS.forEach(function (n) { $("#vista-" + n).hidden = n !== v; });
    window.scrollTo(0, 0);
  }
  var tToast;
  function toast(msg, error) {
    var t = $("#toast");
    t.textContent = msg;
    t.classList.toggle("error", !!error);
    t.hidden = false;
    clearTimeout(tToast);
    tToast = setTimeout(function () { t.hidden = true; }, error ? 6000 : 3000);
  }
  function plural(n, uno, varios) { return n + " " + (n === 1 ? uno : varios); }
  function errorEn(id, msg) { var el = $("#" + id); el.textContent = msg || ""; el.hidden = !msg; }
  function ocupado(btn, si, texto) {
    if (si) { btn.dataset.txt = btn.textContent; btn.textContent = texto || "Guardando…"; btn.disabled = true; }
    else { btn.textContent = btn.dataset.txt || btn.textContent; btn.disabled = false; }
  }
  function mensajeError(e) {
    var m = (e && (e.message || e.error_description)) || String(e);
    if (/row-level security|permission denied|Unauthorized/i.test(m)) return "Supabase rechazó la acción por permisos (" + m + "). Si eres admin, ejecuta supabase/03_parche_fotos.sql.";
    if (/Invalid login credentials/i.test(m)) return "Correo o contraseña incorrectos.";
    if (/Email not confirmed/i.test(m)) return "El correo aún no está confirmado. En Supabase, al crear el usuario marca “Auto Confirm User”.";
    if (/Failed to fetch|NetworkError/i.test(m)) return "Sin conexión con la base de datos. Revisa tu internet o la URL en js/config.js.";
    if (/duplicate key|destinos_slug_key/i.test(m)) return "Ya existe un destino con esa dirección. Cambia la “Dirección de la página”.";
    if (/exceeded the maximum allowed size|Payload too large/i.test(m)) return "Una foto supera 5 MB.";
    return m;
  }

  /* =========================================================
     SESIÓN
     ========================================================= */
  function iniciar() {
    if (!API.configurado()) { mostrar("config"); return; }
    sb = window.supabase.createClient(C.supabaseUrl, C.supabaseClave);
    sb.auth.onAuthStateChange(function (evento, sesion) {
      // No llamar a Supabase dentro del callback: se difiere
      setTimeout(function () {
        if (evento === "PASSWORD_RECOVERY") { recuperando = true; mostrar("nueva-clave"); return; }
        if (recuperando) return;
        if (evento === "TOKEN_REFRESHED" || evento === "USER_UPDATED") return;
        manejarSesion(sesion);
      }, 0);
    });
  }

  async function manejarSesion(sesion) {
    if (!sesion) {
      usuarioId = null;
      $("#barra-sesion").hidden = true;
      mostrar("login");
      return;
    }
    if (usuarioId === sesion.user.id) return; // ya cargado
    usuarioId = sesion.user.id;
    $("#usuario-email").textContent = sesion.user.email || "";
    $("#barra-sesion").hidden = false;
    mostrar("cargando");
    var r = await sb.rpc("es_admin");
    if (r.error || !r.data) { mostrar("noadmin"); return; }
    cargarLista();
  }

  $("#form-login").addEventListener("submit", async function (e) {
    e.preventDefault();
    var f = new FormData(this);
    var btn = $("button[type=submit]", this);
    errorEn("login-error", "");
    if (!f.get("email") || !f.get("password")) { errorEn("login-error", "Escribe tu correo y tu contraseña."); return; }
    ocupado(btn, true, "Entrando…");
    var r = await sb.auth.signInWithPassword({ email: String(f.get("email")).trim(), password: String(f.get("password")) });
    ocupado(btn, false);
    if (r.error) errorEn("login-error", mensajeError(r.error));
  });

  $("#btn-olvide").addEventListener("click", async function () {
    var email = String($("#form-login [name=email]").value || "").trim();
    if (!email) { errorEn("login-error", "Escribe tu correo arriba y vuelve a tocar “¿Olvidaste tu contraseña?”."); return; }
    var r = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.href.split("#")[0] });
    if (r.error) errorEn("login-error", mensajeError(r.error));
    else { errorEn("login-error", ""); toast("Si el correo existe, te llegará un enlace para crear una nueva contraseña."); }
  });

  $("#form-nueva-clave").addEventListener("submit", async function (e) {
    e.preventDefault();
    var pass = String(new FormData(this).get("password") || "");
    if (pass.length < 8) { errorEn("clave-error", "La contraseña debe tener al menos 8 caracteres."); return; }
    var btn = $("button[type=submit]", this);
    ocupado(btn, true);
    var r = await sb.auth.updateUser({ password: pass });
    ocupado(btn, false);
    if (r.error) { errorEn("clave-error", mensajeError(r.error)); return; }
    recuperando = false;
    history.replaceState(null, "", location.pathname);
    toast("Contraseña actualizada ✓");
    var s = await sb.auth.getSession();
    manejarSesion(s.data.session);
  });

  $("#btn-salir").addEventListener("click", async function () {
    if (sucio && !confirm("Tienes cambios sin guardar. ¿Salir de todas formas?")) return;
    sucio = false;
    await sb.auth.signOut();
  });

  /* =========================================================
     LISTA DE DESTINOS
     ========================================================= */
  async function cargarLista() {
    mostrar("lista");
    $("#lista").innerHTML = '<li class="texto-suave">Cargando destinos…</li>';
    var r = await sb.from("destinos").select(API.SELECT)
      .order("orden", { ascending: true }).order("nombre", { ascending: true });
    if (r.error) { $("#lista").innerHTML = ""; toast(mensajeError(r.error), true); return; }
    destinos = r.data.map(function (d) { return API.normalizar(d, "nube"); });
    $("#caja-migrar").hidden = !API.locales().length || (destinos.length > 0 && !migracionIncompleta);
    $("#migrar-texto").textContent = "La base de datos está vacía. Puedes cargar los " + API.locales().length +
      " destinos que ya tiene el sitio, con sus fotos, precios y fechas.";
    pintarLista();
  }

  function pintarLista() {
    var q = API.slugificar($("#buscar").value);
    var lista = destinos.filter(function (d) { return !q || API.slugificar(d.nombre + " " + d.pais).indexOf(q) !== -1; });
    var pub = destinos.filter(function (d) { return d.publicado; }).length;
    $("#lista-resumen").textContent = destinos.length
      ? plural(destinos.length, "destino", "destinos") + " · " + plural(pub, "publicado", "publicados") + " · " + plural(destinos.length - pub, "borrador", "borradores")
      : "";
    if (!lista.length) {
      $("#lista").innerHTML = destinos.length ? '<li class="texto-suave">Ningún destino coincide con la búsqueda.</li>' : "";
      return;
    }
    $("#lista").innerHTML = lista.map(function (d, i) {
      var foto = d.fotos[0];
      var mini = foto ? '<img class="adm-mini" src="' + esc(foto.url) + '" alt="">' : '<div class="adm-mini sin-foto tono-' + (i % 4) + '">' + esc(d.nombre) + "</div>";
      var fechas = API.salidasFuturas(d).length;
      return '<li class="adm-item">' + mini +
        "<div><h3>" + esc(d.nombre) + "</h3><p class=\"adm-meta\">" +
          (d.publicado ? '<span class="adm-badge pub">Publicado</span>' : '<span class="adm-badge borr">Borrador</span>') +
          (d.destacado ? '<span class="adm-badge dest">Destacado</span>' : "") +
          (d.pais ? "<span>" + esc(d.pais) + "</span>" : "") +
          "<span>" + (d.precio != null ? "Desde " + API.dinero(d.precio) : "Sin precio") + "</span>" +
          "<span>" + d.fotos.length + (d.fotos.length === 1 ? " foto" : " fotos") + "</span>" +
          "<span>" + fechas + (fechas === 1 ? " salida" : " salidas") + "</span>" +
        "</p></div>" +
        '<div class="adm-item-acciones">' +
          '<button type="button" class="btn btn-borde" data-accion="editar" data-id="' + d.id + '">Editar</button>' +
          '<a class="btn btn-borde" href="../destino.html?d=' + encodeURIComponent(d.slug) + '" target="_blank" rel="noopener">Ver</a>' +
          '<button type="button" class="btn btn-borde adm-peligro" data-accion="borrar" data-id="' + d.id + '" aria-label="Borrar ' + esc(d.nombre) + '">Borrar</button>' +
        "</div></li>";
    }).join("");
  }

  $("#buscar").addEventListener("input", pintarLista);
  $("#btn-nuevo").addEventListener("click", function () { abrirEditor(null); });
  $("#lista").addEventListener("click", function (e) {
    var b = e.target.closest("[data-accion]");
    if (!b) return;
    var d = destinos.filter(function (x) { return x.id === b.getAttribute("data-id"); })[0];
    if (!d) return;
    if (b.getAttribute("data-accion") === "editar") abrirEditor(d);
    else borrarDestino(d, b);
  });

  async function borrarDestino(d, btn) {
    if (!confirm("¿Borrar «" + d.nombre + "»?\nSe eliminarán también sus fotos y fechas. No se puede deshacer.")) return false;
    if (btn) ocupado(btn, true, "Borrando…");
    var rutas = d.fotos.map(function (f) { return f.ruta_storage; }).filter(Boolean);
    var r = await sb.from("destinos").delete().eq("id", d.id);
    if (btn) ocupado(btn, false);
    if (r.error) { toast(mensajeError(r.error), true); return false; }
    if (rutas.length) {
      var s = await sb.storage.from(BUCKET).remove(rutas);
      if (s.error) console.warn("No se pudieron borrar algunas fotos del almacenamiento", s.error);
    }
    toast("«" + d.nombre + "» borrado");
    await cargarLista();
    return true;
  }

  /* =========================================================
     EDITOR
     ========================================================= */
  var form = $("#form-destino");

  // Categorías
  $("#categorias").innerHTML = API.CATEGORIAS.map(function (c) {
    return '<label><input type="checkbox" name="cat" value="' + c.id + '"><span>' + c.nombre + "</span></label>";
  }).join("");

  function abrirEditor(d) {
    ed = {
      id: d ? d.id : null,
      original: d,
      fotos: d ? d.fotos.map(function (f) { return { url: f.url, alt: f.alt, ruta_storage: f.ruta_storage }; }) : [],
      eliminadas: [],
      salidas: d ? d.salidas.slice() : [],
      slugManual: !!d
    };
    form.reset();
    form.nombre.value = d ? d.nombre : "";
    form.pais.value = d ? d.pais : "";
    form.slug.value = d ? d.slug : "";
    form.frase.value = d ? d.frase : "";
    form.descripcion.value = d ? d.descripcion : "";
    form.precio.value = d && d.precio != null ? d.precio : "";
    form.ruta.value = d ? d.ruta : "";
    form.aerolinea.value = d ? d.aerolinea : "";
    form.etiqueta.value = d ? d.etiqueta : "";
    form.publicado.checked = d ? d.publicado : true;
    form.destacado.checked = d ? d.destacado : false;
    form.orden.value = d ? d.orden : destinos.length;
    $$("[name=cat]", form).forEach(function (c) { c.checked = !!d && d.categorias.indexOf(c.value) !== -1; });

    $("#incluye").innerHTML = "";
    (d && d.incluye.length ? d.incluye : []).forEach(function (x) { agregarIncluye(x); });
    $("#itinerario").innerHTML = "";
    (d && d.itinerario.length ? d.itinerario : []).forEach(function (x) { agregarDia(x); });

    $("#editor-titulo").textContent = d ? "Editar · " + d.nombre : "Nuevo destino";
    $("#btn-borrar-editor").hidden = !d;
    errorEn("editor-error", "");
    pintarFotos();
    pintarSalidas();
    sucio = false;
    mostrar("editor");
    if (!d) setTimeout(function () { form.nombre.focus(); }, 50);
  }

  form.addEventListener("input", function (e) {
    sucio = true;
    if (e.target.name === "nombre" && !ed.slugManual) form.slug.value = API.slugificar(form.nombre.value);
    if (e.target.name === "slug") { ed.slugManual = true; }
  });
  form.slug.addEventListener("blur", function () { form.slug.value = API.slugificar(form.slug.value); });

  $("#btn-volver").addEventListener("click", function () {
    if (sucio && !confirm("Tienes cambios sin guardar. ¿Salir sin guardar?")) return;
    sucio = false;
    liberarPrevias();
    mostrar("lista");
  });
  $("#btn-borrar-editor").addEventListener("click", async function () {
    if (!ed || !ed.original) return;
    sucio = false;
    await borrarDestino(ed.original, this);
  });
  window.addEventListener("beforeunload", function (e) {
    if (sucio && !$("#vista-editor").hidden) { e.preventDefault(); e.returnValue = ""; }
  });

  /* ---------- Filas: incluye e itinerario ---------- */
  function filaHTML(p1, p2, v1, v2, extraClase) {
    var div = document.createElement("div");
    div.className = "adm-fila-item " + (extraClase || "");
    div.innerHTML = (extraClase === "dia" ? '<span class="num"></span>' : "") +
      '<input type="text" maxlength="80" placeholder="' + p1 + '" aria-label="' + p1 + '">' +
      '<input type="text" maxlength="240" placeholder="' + p2 + '" aria-label="' + p2 + '">' +
      '<button type="button" class="adm-x" aria-label="Quitar">✕</button>';
    var ins = $$("input", div);
    ins[0].value = v1 || ""; ins[1].value = v2 || "";
    return div;
  }
  function agregarIncluye(x) {
    $("#incluye").appendChild(filaHTML("Ej. Bodega", "Ej. 23 kg", x && x.titulo, x && x.valor));
  }
  function agregarDia(x) {
    $("#itinerario").appendChild(filaHTML("Título del día", "Detalle (opcional)", x && x.titulo, x && x.detalle, "dia"));
    numerarDias();
  }
  function numerarDias() { $$("#itinerario .num").forEach(function (n, i) { n.textContent = "DÍA " + (i + 1); }); }
  $("#btn-add-incluye").addEventListener("click", function () { agregarIncluye(); sucio = true; $("#incluye").lastChild.querySelector("input").focus(); });
  $("#btn-add-dia").addEventListener("click", function () { agregarDia(); sucio = true; $("#itinerario").lastChild.querySelector("input").focus(); });
  ["#incluye", "#itinerario"].forEach(function (sel) {
    $(sel).addEventListener("click", function (e) {
      if (!e.target.classList.contains("adm-x")) return;
      e.target.parentNode.remove(); numerarDias(); sucio = true;
    });
  });
  function leerFilas(sel, k1, k2) {
    return $$(sel + " .adm-fila-item").map(function (f) {
      var i = $$("input", f); var o = {};
      o[k1] = i[0].value.trim(); o[k2] = i[1].value.trim();
      return o;
    }).filter(function (o) { return o[k1] || o[k2]; });
  }

  /* ---------- Fotos ---------- */
  function comprimir(archivo) {
    return new Promise(function (ok, mal) {
      var img = new Image();
      var u = URL.createObjectURL(archivo);
      img.onload = function () {
        var max = 1600, w = img.naturalWidth, h = img.naturalHeight;
        var k = Math.min(1, max / Math.max(w, h));
        w = Math.round(w * k); h = Math.round(h * k);
        var c = document.createElement("canvas"); c.width = w; c.height = h;
        var ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(u);
        c.toBlob(function (b) { b ? ok(b) : mal(new Error("No se pudo procesar la imagen.")); }, "image/jpeg", 0.82);
      };
      img.onerror = function () { URL.revokeObjectURL(u); mal(new Error("«" + archivo.name + "» no es una imagen válida (usa JPG, PNG o WebP).")); };
      img.src = u;
    });
  }

  $("#input-fotos").addEventListener("change", async function () {
    var archivos = Array.prototype.slice.call(this.files || []);
    this.value = "";
    var libres = MAX_FOTOS - ed.fotos.length;
    if (archivos.length > libres) { toast("Máximo " + MAX_FOTOS + " fotos por destino.", true); archivos = archivos.slice(0, Math.max(0, libres)); }
    for (var i = 0; i < archivos.length; i++) {
      try {
        var blob = await comprimir(archivos[i]);
        ed.fotos.push({ nuevo: true, blob: blob, url: URL.createObjectURL(blob), alt: "" });
        sucio = true;
        pintarFotos();
      } catch (err) { toast(err.message, true); }
    }
  });

  function pintarFotos() {
    $("#fotos").innerHTML = ed.fotos.map(function (f, i) {
      return '<div class="adm-foto"><img src="' + esc(f.url) + '" alt="Foto ' + (i + 1) + '">' +
        (i === 0 ? '<span class="portada">PORTADA</span>' : "") + (f.nuevo ? '<span class="nueva">Sin guardar</span>' : "") +
        '<div class="adm-foto-acciones">' +
          '<button type="button" data-f="izq" data-i="' + i + '" aria-label="Mover a la izquierda"' + (i === 0 ? " disabled" : "") + ">←</button>" +
          '<button type="button" data-f="der" data-i="' + i + '" aria-label="Mover a la derecha"' + (i === ed.fotos.length - 1 ? " disabled" : "") + ">→</button>" +
          '<button type="button" class="quitar" data-f="quitar" data-i="' + i + '" aria-label="Quitar foto">✕</button>' +
        "</div></div>";
    }).join("");
  }
  $("#fotos").addEventListener("click", function (e) {
    var b = e.target.closest("[data-f]");
    if (!b) return;
    var i = +b.getAttribute("data-i"), a = b.getAttribute("data-f"), F = ed.fotos;
    if (a === "izq" && i > 0) { var t = F[i - 1]; F[i - 1] = F[i]; F[i] = t; }
    if (a === "der" && i < F.length - 1) { var t2 = F[i + 1]; F[i + 1] = F[i]; F[i] = t2; }
    if (a === "quitar") {
      var q = F.splice(i, 1)[0];
      if (q.nuevo) URL.revokeObjectURL(q.url);
      else if (q.ruta_storage) ed.eliminadas.push(q.ruta_storage);
    }
    sucio = true;
    pintarFotos();
  });
  function liberarPrevias() {
    if (ed) ed.fotos.forEach(function (f) { if (f.nuevo) URL.revokeObjectURL(f.url); });
  }

  /* ---------- Salidas ---------- */
  function pintarSalidas() {
    var hoyISO = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    $("#salidas").innerHTML = ed.salidas.length ? ed.salidas.map(function (s) {
      var f = API.infoFecha(s);
      return '<li class="' + (s < hoyISO ? "pasada" : "") + '">' + f.semana.charAt(0) + f.semana.slice(1).toLowerCase() + " " + f.dia + " " + f.mesCorto + " " + f.anio +
        '<button type="button" data-s="' + s + '" aria-label="Quitar ' + f.dia + " de " + f.mes + '">✕</button></li>';
    }).join("") : '<li class="texto-suave" style="background:none;border:0;padding:0">Sin fechas: el sitio mostrará “Cotizar por WhatsApp”.</li>';
  }
  $("#btn-add-fecha").addEventListener("click", function () {
    var v = $("#input-fecha").value;
    if (!v) { toast("Elige una fecha primero.", true); return; }
    if (ed.salidas.indexOf(v) === -1) { ed.salidas.push(v); ed.salidas.sort(); sucio = true; }
    $("#input-fecha").value = "";
    pintarSalidas();
  });
  $("#salidas").addEventListener("click", function (e) {
    var b = e.target.closest("[data-s]");
    if (!b) return;
    ed.salidas = ed.salidas.filter(function (s) { return s !== b.getAttribute("data-s"); });
    sucio = true;
    pintarSalidas();
  });

  /* ---------- Guardar ---------- */
  function datosDelFormulario() {
    var precio = String(form.precio.value).trim();
    return {
      nombre: form.nombre.value.trim(),
      slug: API.slugificar(form.slug.value || form.nombre.value),
      pais: form.pais.value.trim() || null,
      frase: form.frase.value.trim() || null,
      descripcion: form.descripcion.value.trim() || null,
      categorias: $$("[name=cat]:checked", form).map(function (c) { return c.value; }),
      precio_desde: precio === "" ? null : Math.max(0, Number(precio)),
      etiqueta: form.etiqueta.value.trim() || null,
      ruta: form.ruta.value.trim() || null,
      aerolinea: form.aerolinea.value.trim() || null,
      incluye: leerFilas("#incluye", "titulo", "valor"),
      itinerario: leerFilas("#itinerario", "titulo", "detalle"),
      publicado: form.publicado.checked,
      destacado: form.destacado.checked,
      orden: parseInt(form.orden.value, 10) || 0
    };
  }

  async function subirFoto(destinoId, blob, nombreBase) {
    var ext = (blob.type === "image/png") ? "png" : (blob.type === "image/webp") ? "webp" : "jpg";
    // Nombre único: así no hace falta reemplazar archivos (upsert) al subir fotos nuevas
    var ruta = destinoId + "/" + (nombreBase || "foto") + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
    var up = await sb.storage.from(BUCKET).upload(ruta, blob, { contentType: blob.type || "image/jpeg", cacheControl: "31536000", upsert: false });
    if (up.error) throw up.error;
    return { ruta_storage: ruta, url: sb.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl };
  }

  async function reemplazarHijos(destinoId, fotos, salidas, nombre) {
    var r1 = await sb.from("destino_fotos").delete().eq("destino_id", destinoId);
    if (r1.error) throw r1.error;
    if (fotos.length) {
      var r2 = await sb.from("destino_fotos").insert(fotos.map(function (f, i) {
        return { destino_id: destinoId, url: f.url, ruta_storage: f.ruta_storage || null, alt: f.alt || nombre, orden: i };
      }));
      if (r2.error) throw r2.error;
    }
    var r3 = await sb.from("salidas").delete().eq("destino_id", destinoId);
    if (r3.error) throw r3.error;
    if (salidas.length) {
      var r4 = await sb.from("salidas").insert(salidas.map(function (s) { return { destino_id: destinoId, fecha: s }; }));
      if (r4.error) throw r4.error;
    }
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    errorEn("editor-error", "");
    var datos = datosDelFormulario();
    if (datos.nombre.length < 2) { errorEn("editor-error", "Escribe el nombre del destino."); form.nombre.focus(); return; }
    if (!datos.slug) { errorEn("editor-error", "La dirección de la página no es válida."); form.slug.focus(); return; }
    form.slug.value = datos.slug;
    var btn = $("#btn-guardar");
    ocupado(btn, true);
    try {
      var r = ed.id
        ? await sb.from("destinos").update(datos).eq("id", ed.id).select("id").single()
        : await sb.from("destinos").insert(datos).select("id").single();
      if (r.error) throw r.error;
      ed.id = r.data.id;

      for (var i = 0; i < ed.fotos.length; i++) {
        var f = ed.fotos[i];
        if (!f.nuevo) continue;
        btn.textContent = "Subiendo foto " + (i + 1) + "…";
        var sub = await subirFoto(ed.id, f.blob);
        URL.revokeObjectURL(f.url);
        f.url = sub.url; f.ruta_storage = sub.ruta_storage; f.nuevo = false; f.blob = null;
      }
      await reemplazarHijos(ed.id, ed.fotos, ed.salidas, datos.nombre);

      if (ed.eliminadas.length) {
        var s = await sb.storage.from(BUCKET).remove(ed.eliminadas);
        if (s.error) console.warn("No se pudieron borrar fotos antiguas", s.error);
        ed.eliminadas = [];
      }
      sucio = false;
      toast("«" + datos.nombre + "» guardado ✓");
      await cargarLista();
    } catch (err) {
      errorEn("editor-error", mensajeError(err));
      toast("No se pudo guardar: " + mensajeError(err), true);
      pintarFotos();
    } finally {
      ocupado(btn, false);
    }
  });

  /* =========================================================
     MIGRACIÓN DE LOS DESTINOS INICIALES (js/datos.js)
     ========================================================= */
  $("#btn-migrar").addEventListener("click", async function () {
    var locales = API.locales();
    if (!confirm("Se importarán " + locales.length + " destinos con sus fotos y fechas. ¿Continuar?")) return;
    var btn = this;
    ocupado(btn, true, "Importando…");
    var existentes = destinos.map(function (d) { return d.slug; });
    var hechos = 0;
    try {
      for (var i = 0; i < locales.length; i++) {
        var d = locales[i];
        if (existentes.indexOf(d.slug) !== -1) continue;
        $("#migrar-texto").textContent = "Importando " + (i + 1) + " de " + locales.length + ": " + d.nombre + "…";
        var ins = await sb.from("destinos").insert({
          slug: d.slug, nombre: d.nombre, pais: d.pais || null, frase: d.frase || null, descripcion: d.descripcion || null,
          categorias: d.categorias, precio_desde: d.precio, etiqueta: d.etiqueta || null, ruta: d.ruta || null,
          aerolinea: d.aerolinea || null, incluye: d.incluye, itinerario: d.itinerario,
          publicado: true, destacado: d.destacado, orden: i
        }).select("id").single();
        if (ins.error) throw ins.error;
        var id = ins.data.id;
        var fotos = [];
        for (var j = 0; j < d.fotos.length; j++) {
          var f = d.fotos[j];
          if (/^https?:/i.test(f.url)) { fotos.push(f); continue; }
          var resp = await fetch("../" + f.url);
          if (!resp.ok) throw new Error("No se encontró la foto " + f.url);
          var sub = await subirFoto(id, await resp.blob(), "inicial-" + (j + 1));
          fotos.push({ url: sub.url, ruta_storage: sub.ruta_storage, alt: f.alt });
        }
        await reemplazarHijos(id, fotos, d.salidas, d.nombre);
        hechos++;
      }
      migracionIncompleta = false;
      toast(hechos + " destinos importados ✓");
    } catch (err) {
      migracionIncompleta = true;
      toast("La importación se detuvo: " + mensajeError(err) + " Puedes volver a intentarlo; los ya importados no se duplican.", true);
    } finally {
      ocupado(btn, false);
      await cargarLista();
    }
  });

  iniciar();
})();
