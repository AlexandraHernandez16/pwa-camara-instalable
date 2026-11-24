/* ============================================================
   Inspección Visual PWA - JavaScript Vanilla (sin async/await)
   ============================================================ */

/* ---------- Referencias al DOM ---------- */
const visorVideo = document.getElementById('visor-camara');
const contenedorVisor = document.querySelector('.visor-contenedor');
const mensajeEstado = document.getElementById('mensaje-estado');
const avisoPermiso = document.getElementById('aviso-permiso');
const avisoLente = document.getElementById('aviso-lente');
const btnInstalar = document.getElementById('btn-instalar');
const btnPreparar = document.getElementById('btn-preparar-camara');
const btnConfirmar = document.getElementById('btn-confirmar-permiso');
const btnCancelar = document.getElementById('btn-cancelar-permiso');
const btnAlternar = document.getElementById('btn-alternar-camara');
const btnApagar = document.getElementById('btn-apagar-camara');

/* ---------- Utilidades de UI ---------- */
function actualizarMensajeEstado(texto, esError) {
  mensajeEstado.textContent = texto;
  mensajeEstado.classList.toggle('error', Boolean(esError));
}

function nombreLente(modo) {
  return modo === 'environment' ? 'Trasera' : 'Frontal';
}

function actualizarControles(camaraActiva) {
  btnAlternar.disabled = !camaraActiva;
  btnApagar.disabled = !camaraActiva;
  contenedorVisor.classList.toggle('activo', camaraActiva);
}

/* ============================================================
   FASE 1 - Instalabilidad
   ============================================================ */

/* Fragmento B: captura del evento de instalación */
let eventoInstalacionDiferido = null;

window.addEventListener('beforeinstallprompt', (event) => {
  // Evita que el mini-banner automático aparezca antes de tiempo
  event.preventDefault();
  eventoInstalacionDiferido = event;
  btnInstalar.hidden = false;
});

btnInstalar.addEventListener('click', () => {
  if (!eventoInstalacionDiferido) return;

  eventoInstalacionDiferido.prompt();

  eventoInstalacionDiferido.userChoice
    .then((resultado) => {
      if (resultado.outcome === 'accepted') {
        btnInstalar.hidden = true;
      }
    })
    .catch((error) => {
      actualizarMensajeEstado(`No se pudo completar la instalación: ${error.message}`, true);
    })
    .finally(() => {
      // El evento solo puede usarse una vez
      eventoInstalacionDiferido = null;
    });
});

window.addEventListener('appinstalled', () => {
  btnInstalar.hidden = true;
  eventoInstalacionDiferido = null;
});

/* Registro del Service Worker (requisito de instalabilidad) */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then((registro) => {
        console.log('Service Worker registrado. Scope:', registro.scope);
      })
      .catch((error) => {
        console.error('Fallo el registro del Service Worker:', error);
      });
  });
}

/* ============================================================
   FASE 2 - Cámara con consentimiento previo
   ============================================================ */

let streamActual = null;
let modoCamaraActual = 'environment'; // 'environment' = trasera | 'user' = frontal

/* Fragmento C: liberación de hardware */
function detenerCamaraActiva() {
  if (streamActual) {
    streamActual.getTracks().forEach((track) => {
      track.stop();
    });
    streamActual = null;
  }
}

/* Fragmento D: encendido con promesas y diagnóstico de errores */
function iniciarCamara(modo) {
  detenerCamaraActiva();

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    actualizarMensajeEstado('Este navegador no soporta acceso a la cámara (se requiere HTTPS).', true);
    actualizarControles(false);
    return Promise.resolve();
  }

  const restricciones = {
    video: { facingMode: modo },
    audio: false
  };

  return navigator.mediaDevices.getUserMedia(restricciones)
    .then((stream) => {
      streamActual = stream;
      visorVideo.srcObject = stream;
      actualizarControles(true);
      actualizarMensajeEstado(`Cámara activa (${nombreLente(modo)})`);
    })
    .catch((error) => {
      visorVideo.srcObject = null;
      actualizarControles(false);

      if (error.name === 'NotAllowedError') {
        actualizarMensajeEstado('Permiso denegado. Habilita el acceso a la cámara en los ajustes de tu navegador.', true);
      } else if (error.name === 'NotFoundError') {
        actualizarMensajeEstado('No se detectó el sensor de cámara solicitado en este dispositivo.', true);
      } else {
        actualizarMensajeEstado(`Error al acceder al hardware: ${error.message}`, true);
      }
    });
}

/* Fragmento E: flujo de consentimiento previo (pre-permiso) */

// Paso 1: el usuario pulsa "Solicitar Acceso a Cámara" -> aviso explicativo
btnPreparar.addEventListener('click', () => {
  avisoLente.textContent = modoCamaraActual === 'environment' ? 'trasera' : 'frontal';
  avisoPermiso.hidden = false;
});

// Paso 2: el usuario lee el motivo y confirma -> recién ahora se llama al hardware
btnConfirmar.addEventListener('click', () => {
  avisoPermiso.hidden = true;
  iniciarCamara(modoCamaraActual);
});

// El usuario puede declinar sin que el navegador registre un bloqueo
btnCancelar.addEventListener('click', () => {
  avisoPermiso.hidden = true;
  actualizarMensajeEstado('Sin problema. La cámara sigue apagada.');
});

/* Desafío 2 - punto 3: alternar cámara frontal/trasera */
btnAlternar.addEventListener('click', () => {
  modoCamaraActual = modoCamaraActual === 'environment' ? 'user' : 'environment';
  iniciarCamara(modoCamaraActual);
});

/* Desafío 2 - punto 4: apagar cámara */
btnApagar.addEventListener('click', () => {
  detenerCamaraActiva();
  visorVideo.srcObject = null;
  actualizarControles(false);
  actualizarMensajeEstado('Cámara apagada.');
});

/* Libera el sensor si la página se oculta/cierra */
window.addEventListener('pagehide', detenerCamaraActiva);
