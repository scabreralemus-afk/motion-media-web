// ==========================================================
// CONFIGURACIÓN DE SUPABASE
// Reemplaza estos dos valores con los de tu proyecto:
// Supabase → Project Settings → API → Project URL / anon public key
// Usa los MISMOS valores en script.js y admin.html
//
// IMPORTANTE: si dejas los valores de ejemplo, el sitio sigue
// funcionando (navegación, formularios, pago simulado) — solo no
// se guardará nada en la base de datos hasta que pongas tus
// credenciales reales aquí abajo.
// ==========================================================
const SUPABASE_URL = "https://owxgqgunbiiwtivjxkii.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "sb_publishable_ZDdHIwRMv22j08rdzZHt4w_vKC0JyIk";

let supabaseClient = null;
try {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (err) {
  console.warn(
    "Supabase todavía no está configurado (SUPABASE_URL/SUPABASE_ANON_KEY tienen valores de ejemplo). " +
    "El sitio funciona igual, pero nada se guardará hasta que pongas tus credenciales reales en script.js.",
    err.message
  );
}

if (window.AOS) {
  window.AOS.init({ duration: 550, once: true, offset: 40 });
}
// Salvaguarda: si la librería de animaciones (AOS) no cargó por algún motivo
// (CDN caído, sin internet, bloqueador de contenido), esto evita que el
// contenido quede invisible para siempre — lo muestra igual tras 2.5s.
setTimeout(() => {
  document.querySelectorAll("[data-aos]:not(.aos-animate)").forEach((el) => el.classList.add("aos-animate"));
}, 2500);

// ----------------------------------------------------------
// Registro de eventos/interacciones en la tabla "eventos"
// tipoEvento: qué pasó · pagina: en qué archivo · detalle: info extra
// (ej. qué botón, qué paquete) · duracionSeg: solo para tiempo_en_vista
// ----------------------------------------------------------
async function registrarEvento(tipoEvento, pagina, detalle, duracionSeg) {
  if (!supabaseClient) return;
  try {
    await supabaseClient.from("eventos").insert([{
      tipo_evento: tipoEvento,
      pagina,
      detalle: detalle ?? null,
      duracion_seg: duracionSeg ?? null,
    }]);
  } catch (err) {
    console.error("No se pudo registrar el evento:", err);
  }
}

const paginaActual = location.pathname.split("/").pop() || "index.html";
registrarEvento("visita", paginaActual);

// Registrar clics en enlaces marcados con data-track-click (botones de detalle → registro)
document.querySelectorAll("[data-track-click]").forEach((el) => {
  el.addEventListener("click", () => registrarEvento(el.dataset.trackClick, paginaActual));
});

// Registrar clics en cualquier botón/link marcado con data-track-generic="nombre"
document.querySelectorAll("[data-track-generic]").forEach((el) => {
  el.addEventListener("click", () => registrarEvento(el.dataset.trackGeneric, paginaActual));
});

// ==========================================================
// TIEMPO EN CADA VISTA/PÁGINA (aproximado)
// ==========================================================
let vistaActualNombre = "home";
let tiempoInicioVista = Date.now();

function cerrarTiempoVista() {
  const segundos = Math.round((Date.now() - tiempoInicioVista) / 1000);
  if (segundos > 0) registrarEvento("tiempo_en_vista", paginaActual, vistaActualNombre, segundos);
}

function iniciarTiempoVista(nombre) {
  vistaActualNombre = nombre;
  tiempoInicioVista = Date.now();
}

// Al salir de la página/pestaña (mejor esfuerzo, no siempre es exacto)
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") cerrarTiempoVista();
  else tiempoInicioVista = Date.now();
});
window.addEventListener("pagehide", cerrarTiempoVista);

// ==========================================================
// PAQUETE SELECCIONADO — se comparte entre home, detalle y
// registro-pyme.html a través de localStorage
// ==========================================================
const PAQUETE_KEY = "motion-media-paquete";

function guardarPaquete(paquete) {
  localStorage.setItem(PAQUETE_KEY, JSON.stringify(paquete));
}
function leerPaquete() {
  try {
    return JSON.parse(localStorage.getItem(PAQUETE_KEY)) || { nombre: "Mes", precio: 99 };
  } catch {
    return { nombre: "Mes", precio: 99 };
  }
}

function activarSelectorPaquetes(gridSelector) {
  document.querySelectorAll(gridSelector).forEach((grid) => {
    const cards = grid.querySelectorAll(".pricing-card");
    cards.forEach((card) => {
      card.addEventListener("click", () => {
        cards.forEach((c) => c.classList.remove("pricing-card--selected"));
        card.classList.remove("pricing-card--pop");
        // forzar reflow para poder re-disparar la animación de selección
        void card.offsetWidth;
        card.classList.add("pricing-card--selected", "pricing-card--pop");
        guardarPaquete({ nombre: card.dataset.paquete, precio: Number(card.dataset.precio) });
        registrarEvento("seleccion_paquete", paginaActual, card.dataset.paquete);
      });
    });
    // Marcar visualmente el paquete ya guardado (si existe)
    const actual = leerPaquete();
    grid.querySelectorAll(".pricing-card").forEach((card) => {
      if (card.dataset.paquete === actual.nombre) card.classList.add("pricing-card--selected");
    });
  });
}

activarSelectorPaquetes(".pricing-grid");

// ==========================================================
// VISTAS DENTRO DE index.html (home / detalle conductor / detalle pyme)
// con transición de crossfade
// ==========================================================
function mostrarVista(id, nombreTracking) {
  const current = document.querySelector(".view.is-active");
  const target = document.getElementById(id);
  if (!target || current === target) return;

  cerrarTiempoVista();

  if (current) {
    current.classList.add("view--saliendo");
    setTimeout(() => {
      current.classList.remove("is-active", "view--saliendo");
    }, 180);
  }

  setTimeout(() => {
    target.classList.add("is-active", "view--entrando");
    window.scrollTo({ top: 0, behavior: "auto" });
    setTimeout(() => target.classList.remove("view--entrando"), 350);
  }, current ? 160 : 0);

  iniciarTiempoVista(nombreTracking || id);
}

document.querySelectorAll("[data-open-detail]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const tipo = btn.dataset.openDetail; // "pyme" o "conductor"
    registrarEvento(tipo === "pyme" ? "clic_publicidad" : "clic_pantalla", paginaActual);
    mostrarVista(tipo === "pyme" ? "view-pyme" : "view-conductor", tipo === "pyme" ? "detalle-pyme" : "detalle-conductor");
  });
});

document.querySelectorAll("[data-back-home]").forEach((btn) => {
  btn.addEventListener("click", () => {
    registrarEvento("clic_volver", paginaActual);
    mostrarVista("view-home", "home");
  });
});

// Los enlaces de la navbar deben regresar a home y luego bajar a la sección
document.querySelectorAll("[data-nav-section]").forEach((link) => {
  link.addEventListener("click", (e) => {
    const id = link.dataset.navSection;
    registrarEvento("clic_nav", paginaActual, id);
    const homeActive = document.getElementById("view-home")?.classList.contains("is-active");
    if (!homeActive) {
      e.preventDefault();
      mostrarVista("view-home", "home");
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 220);
    }
  });
});

// ==========================================================
// POP-UP DE CONFIRMACIÓN ("revisa tu correo") — simulado
// Se usa en registro-conductor.html y registro-pyme.html
// ==========================================================
function mostrarConfirmacion(correo, alTerminar) {
  const overlay = document.getElementById("modal-confirmacion");
  if (!overlay) {
    alTerminar();
    return;
  }
  document.getElementById("conf-correo").textContent = correo || "tu correo";
  overlay.classList.add("is-open");
  registrarEvento("apertura_confirmacion", paginaActual);

  const reenviarCorreo = document.getElementById("reenviar-correo");
  const reenviarSms = document.getElementById("reenviar-sms");
  const feedback = document.getElementById("conf-feedback");

  const marcarReenviado = (texto, tipoEvento) => (e) => {
    e.preventDefault();
    feedback.textContent = texto;
    feedback.hidden = false;
    registrarEvento(tipoEvento, paginaActual);
  };
  if (reenviarCorreo) reenviarCorreo.onclick = marcarReenviado("Correo reenviado ✓ (simulación)", "clic_reenviar_correo");
  if (reenviarSms) reenviarSms.onclick = marcarReenviado("SMS enviado ✓ (simulación)", "clic_reenviar_sms");

  document.getElementById("cerrar-confirmacion").onclick = () => {
    overlay.classList.remove("is-open");
    if (feedback) feedback.hidden = true;
    registrarEvento("cierre_confirmacion", paginaActual);
    alTerminar();
  };
}

// ==========================================================
// FORMULARIO: registro-conductor.html
// ==========================================================
const formConductor = document.getElementById("form-conductor");
if (formConductor) {
  iniciarTiempoVista("registro-conductor");

  formConductor.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = formConductor.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Enviando...";
    registrarEvento("envio_formulario_conductor", paginaActual);

    const fd = new FormData(formConductor);
    const lead = {
      tipo: "pantalla",
      nombre: fd.get("nombre"),
      correo: fd.get("correo"),
      telefono: fd.get("telefono"),
      dui: fd.get("dui"),
      licencia: fd.get("licencia"),
      placa: fd.get("placa"),
      plataforma: fd.get("plataforma"),
      vehiculo: fd.get("vehiculo"),
      zona: fd.get("zona"),
      horario: fd.get("horario"),
      direccion: fd.get("direccion"),
      referencia: fd.get("referencia"),
      mensaje: fd.get("mensaje") || null,
    };

    if (supabaseClient) {
      try {
        await supabaseClient.from("leads").insert([lead]);
      } catch (err) {
        console.error("Error guardando la solicitud de conductor:", err);
      }
    }

    btn.disabled = false;
    btn.textContent = "Enviar solicitud";

    mostrarConfirmacion(lead.correo, () => {
      document.getElementById("registro-intro").hidden = true;
      document.getElementById("registro-exito").hidden = false;
      document.getElementById("registro-exito").classList.add("view--entrando");
    });
  });
}

// ==========================================================
// FORMULARIO: registro-pyme.html (tres pasos: datos + arte + pago simbólico)
// ==========================================================
const formPublicidad = document.getElementById("form-publicidad");
const formPago = document.getElementById("form-pago");

const arteInput = document.getElementById("arte-archivo");
if (arteInput) {
  arteInput.addEventListener("change", () => {
    const nombre = arteInput.files[0]?.name;
    document.getElementById("arte-nombre-archivo").textContent = nombre ? `Archivo seleccionado: ${nombre}` : "";
    if (nombre) registrarEvento("subida_arte", paginaActual, nombre);
  });
}

if (formPublicidad) {
  iniciarTiempoVista("registro-pyme-datos");
  let datosPymePendiente = null;

  formPublicidad.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = formPublicidad.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Guardando...";
    registrarEvento("envio_formulario_pyme_datos", paginaActual);

    const fd = new FormData(formPublicidad);
    const paquete = leerPaquete();

    datosPymePendiente = {
      tipo: "publicidad",
      nombre: fd.get("nombre"),
      correo: fd.get("correo"),
      telefono: fd.get("telefono"),
      empresa: fd.get("empresa"),
      rubro: fd.get("rubro"),
      tipo_negocio: fd.get("tipo_negocio"),
      nit_dui: fd.get("nit_dui") || null,
      redes: fd.get("redes") || null,
      zona: fd.get("zona"),
      horario: fd.get("horario"),
      paquete: paquete.nombre,
      precio: paquete.precio,
      mensaje: fd.get("mensaje") || null,
      arte_url: null,
    };

    // Subir el arte (opcional) a Supabase Storage, si el usuario adjuntó un archivo
    const archivoInput = document.getElementById("arte-archivo");
    const archivo = archivoInput && archivoInput.files[0];
    if (archivo && supabaseClient) {
      try {
        const nombreArchivo = `${Date.now()}-${archivo.name}`.replace(/\s+/g, "-");
        const { error } = await supabaseClient.storage.from("artes-pyme").upload(nombreArchivo, archivo);
        if (!error) {
          const { data } = supabaseClient.storage.from("artes-pyme").getPublicUrl(nombreArchivo);
          datosPymePendiente.arte_url = data?.publicUrl || null;
        } else {
          console.error("Error subiendo el arte:", error);
        }
      } catch (err) {
        console.error("Error subiendo el arte:", err);
      }
    }

    btn.disabled = false;
    btn.textContent = "Continuar a pago";

    document.getElementById("pago-negocio-nombre").textContent = datosPymePendiente.empresa;
    document.getElementById("pago-paquete-nombre").textContent = paquete.nombre;
    document.getElementById("pago-paquete-precio").textContent = `$${paquete.precio}`;

    document.getElementById("registro-step-form").hidden = true;
    const stepPago = document.getElementById("registro-step-pago");
    stepPago.hidden = false;
    stepPago.classList.add("view--entrando");
    setTimeout(() => stepPago.classList.remove("view--entrando"), 350);
    window.scrollTo({ top: 0, behavior: "auto" });
    iniciarTiempoVista("registro-pyme-pago");
  });

  formPago.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = formPago.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Procesando pago...";
    registrarEvento("envio_formulario_pyme_pago", paginaActual);

    // Simulación: una pequeña pausa para que se sienta como un pago real
    await new Promise((r) => setTimeout(r, 900));

    if (supabaseClient) {
      try {
        await supabaseClient.from("leads").insert([datosPymePendiente]);
      } catch (err) {
        console.error("Error guardando el lead de publicidad:", err);
      }
    }

    btn.disabled = false;
    btn.textContent = "Pagar y confirmar";

    document.getElementById("registro-step-pago").hidden = true;

    mostrarConfirmacion(datosPymePendiente.correo, () => {
      const exito = document.getElementById("registro-exito");
      exito.hidden = false;
      exito.classList.add("view--entrando");
    });
  });
}

// ==========================================================
// RESEÑAS (estrellas + comentario) — burbuja en index.html,
// o link "Dejar una reseña" dentro del pop-up de confirmación
// en registro-conductor.html / registro-pyme.html
// ==========================================================
const modalReview = document.getElementById("modal-review");

if (modalReview) {
  const formReview = document.getElementById("form-review");
  const tipoFijo = modalReview.dataset.tipoFijo || null; // "PYME" / "Conductor" en páginas de registro
  const selectTipo = document.getElementById("review-tipo");
  const valoresEstrellas = { experiencia: 0, interes: 0 };

  function abrirModalReview() {
    modalReview.classList.add("is-open");
    registrarEvento("apertura_review", paginaActual);
  }
  function cerrarModalReview() {
    modalReview.classList.remove("is-open");
  }

  const fab = document.getElementById("review-fab");
  if (fab) fab.addEventListener("click", abrirModalReview);

  const abrirDesdeConfirmacion = document.getElementById("abrir-review");
  if (abrirDesdeConfirmacion) {
    abrirDesdeConfirmacion.addEventListener("click", (e) => {
      e.preventDefault();
      const overlayConfirmacion = document.getElementById("modal-confirmacion");
      if (overlayConfirmacion) overlayConfirmacion.classList.remove("is-open");
      abrirModalReview();
    });
  }

  modalReview.querySelectorAll("[data-close-review]").forEach((btn) => {
    btn.addEventListener("click", cerrarModalReview);
  });
  modalReview.addEventListener("click", (e) => {
    if (e.target === modalReview) cerrarModalReview();
  });

  // Estrellas clicables: resaltan del 1 hasta la seleccionada
  modalReview.querySelectorAll(".star-rating").forEach((grupo) => {
    const nombreGrupo = grupo.dataset.starGroup;
    const estrellas = [...grupo.querySelectorAll("[data-star]")];
    estrellas.forEach((estrella) => {
      estrella.addEventListener("click", () => {
        const valor = Number(estrella.dataset.star);
        valoresEstrellas[nombreGrupo] = valor;
        estrellas.forEach((e2) => e2.classList.toggle("is-filled", Number(e2.dataset.star) <= valor));
      });
    });
  });

  formReview.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorMsg = document.getElementById("review-error");

    if (!valoresEstrellas.experiencia || !valoresEstrellas.interes) {
      errorMsg.hidden = false;
      return;
    }
    errorMsg.hidden = true;

    const fd = new FormData(formReview);
    const tipoPersona = tipoFijo || fd.get("tipo_persona");
    if (!tipoFijo && !tipoPersona) return; // el <select> ya es required en ese caso

    const btn = formReview.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Enviando...";

    const review = {
      tipo_persona: tipoPersona,
      nombre: fd.get("nombre") || null,
      estrellas_experiencia: valoresEstrellas.experiencia,
      estrellas_interes: valoresEstrellas.interes,
      comentario: fd.get("comentario") || null,
    };

    if (supabaseClient) {
      try {
        await supabaseClient.from("reviews").insert([review]);
      } catch (err) {
        console.error("Error guardando la reseña:", err);
      }
    }
    registrarEvento("envio_review", paginaActual, tipoPersona);

    btn.disabled = false;
    btn.textContent = "Enviar reseña";

    document.getElementById("review-form-wrap").hidden = true;
    document.getElementById("review-exito").hidden = false;
  });
}
