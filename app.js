// app.js - Instalabilidad + Pre-Permiso UX + Control de camara

// ---------- Referencias del DOM ----------
const btnInstalar = document.getElementById('btn-instalar');
const instruccionesIOS = document.getElementById('instrucciones-ios');
const visorVideo = document.getElementById('visor-camara');
const estadoCamara = document.getElementById('estado-camara');
const btnPreparar = document.getElementById('btn-preparar-camara');
const avisoPermiso = document.getElementById('aviso-permiso');
const btnConfirmarPermiso = document.getElementById('btn-confirmar-permiso');
const btnCancelarPermiso = document.getElementById('btn-cancelar-permiso');
const btnAlternar = document.getElementById('btn-alternar-camara');
const btnApagar = document.getElementById('btn-apagar-camara');

// ---------- Variables de estado ----------
let eventoInstalacionDiferido = null;
let flujoActual = null;
let modoCamaraActual = 'environment'; // 'environment' = trasera, 'user' = frontal

// ---------- Registro del Service Worker ----------
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then((reg) => {
      console.log('[SW] Registrado con scope:', reg.scope);
    })
    .catch((error) => {
      console.error('[SW] Error al registrar:', error);
    });
}

// =====================================================
// FASE 1: INSTALACION
// =====================================================

// Chrome/Android: guardar el evento para usarlo con nuestro boton
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  eventoInstalacionDiferido = event;
  btnInstalar.hidden = false;
  console.log('[Instalación] La app se puede instalar');
});

btnInstalar.addEventListener('click', () => {
  if (!eventoInstalacionDiferido) return;

  eventoInstalacionDiferido.prompt();

  eventoInstalacionDiferido.userChoice
    .then((resultado) => {
      if (resultado.outcome === 'accepted') {
        console.log('[Instalación] El usuario aceptó instalar');
        btnInstalar.hidden = true;
      } else {
        console.log('[Instalación] El usuario canceló la instalación');
      }
    })
    .catch((error) => {
      console.error('[Instalación] Error:', error);
    })
    .finally(() => {
      // El evento solo se puede usar una vez
      eventoInstalacionDiferido = null;
    });
});

window.addEventListener('appinstalled', () => {
  console.log('[Instalación] App instalada correctamente');
  btnInstalar.hidden = true;
});

// iOS: no existe beforeinstallprompt, mostramos instrucciones manuales
const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPad moderno

const estaInstalada = window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

if (esIOS && !estaInstalada) {
  instruccionesIOS.hidden = false;
}

// =====================================================
// FASE 2: CAMARA
// =====================================================

function actualizarEstado(mensaje, esError) {
  estadoCamara.textContent = mensaje;
  if (esError) {
    estadoCamara.classList.add('error');
  } else {
    estadoCamara.classList.remove('error');
  }
}

// Liberar el sensor: detener todas las pistas activas
function detenerCamaraActiva() {
  if (flujoActual) {
    flujoActual.getTracks().forEach((track) => {
      track.stop();
    });
    flujoActual = null;
  }
}

// Encender la camara con el lente indicado
function iniciarCamara(modo) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    actualizarEstado('Tu navegador no soporta la cámara o la página no está en HTTPS.', true);
    return Promise.resolve();
  }

  // Siempre liberar el sensor anterior antes de pedir otro
  detenerCamaraActiva();
  actualizarEstado('Encendiendo cámara...');
  btnAlternar.disabled = true;
  btnApagar.disabled = true;

  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: modo },
    audio: false
  })
    .then((flujo) => {
      flujoActual = flujo;
      visorVideo.srcObject = flujo;

      // La frontal se muestra como espejo
      if (modo === 'user') {
        visorVideo.classList.add('espejo');
        actualizarEstado('Cámara frontal encendida.');
      } else {
        visorVideo.classList.remove('espejo');
        actualizarEstado('Cámara trasera encendida.');
      }

      btnPreparar.hidden = true;
    })
    .catch((error) => {
      console.error('[Cámara] Error:', error.name, error);

      if (error.name === 'NotAllowedError') {
        actualizarEstado('Permiso denegado. Actívalo en la configuración del navegador para usar la cámara.', true);
      } else if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
        actualizarEstado('Este dispositivo no tiene la cámara solicitada.', true);
      } else if (error.name === 'NotReadableError') {
        actualizarEstado('La cámara está ocupada por otra app o no se liberó correctamente.', true);
      } else {
        actualizarEstado('No se pudo encender la cámara: ' + error.message, true);
      }

      btnPreparar.hidden = false;
    })
    .finally(() => {
      // Los botones solo se habilitan si hay un flujo activo
      btnAlternar.disabled = !flujoActual;
      btnApagar.disabled = !flujoActual;
    });
}

// Pre-Permiso: el primer clic solo muestra el aviso
btnPreparar.addEventListener('click', () => {
  avisoPermiso.hidden = false;
  btnPreparar.hidden = true;
});

// Segundo clic: el usuario confirma y ahora si pedimos el permiso nativo
btnConfirmarPermiso.addEventListener('click', () => {
  avisoPermiso.hidden = true;
  iniciarCamara(modoCamaraActual);
});

btnCancelarPermiso.addEventListener('click', () => {
  avisoPermiso.hidden = true;
  btnPreparar.hidden = false;
  actualizarEstado('Cámara apagada.');
});

// Alternar entre trasera y frontal
btnAlternar.addEventListener('click', () => {
  if (modoCamaraActual === 'environment') {
    modoCamaraActual = 'user';
  } else {
    modoCamaraActual = 'environment';
  }
  iniciarCamara(modoCamaraActual);
});

// Apagar la camara
btnApagar.addEventListener('click', () => {
  detenerCamaraActiva();
  visorVideo.srcObject = null;
  actualizarEstado('Cámara apagada.');
  btnAlternar.disabled = true;
  btnApagar.disabled = true;
  btnPreparar.hidden = false;
});
