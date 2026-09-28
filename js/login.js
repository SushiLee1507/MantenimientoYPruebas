/* ==========================================================================
   Universidad Social — Inicio de sesión (RF-02)
   - Validación de campos
   - Autenticación y redirección según el rol (estudiante / profesor)
   - "Recordarme" (sesión persistente 7 días) y bloqueo tras 5 intentos fallidos
   ========================================================================== */
(function () {
  'use strict';

  // Si ya hay una sesión activa, ir directo al panel correspondiente.
  const s = US.sesion();
  if (s && US.usuario(s.id)) {
    window.location.replace(US.paginaDeRol(s.rol));
    return;
  }

  const MAX_INTENTOS = 5;
  const BLOQUEO_MS = 60 * 1000;
  const CLAVE_INTENTOS = 'universidadSocial.intentos';

  const form = document.getElementById('form-login');
  const correo = document.getElementById('correo');
  const pass = document.getElementById('password');
  const recordar = document.getElementById('recordar');
  const alerta = document.getElementById('alerta');
  const btnEntrar = document.getElementById('btn-entrar');
  const btnVer = document.getElementById('btn-ver');

  const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function leerIntentos() {
    try { return JSON.parse(sessionStorage.getItem(CLAVE_INTENTOS)) || { n: 0, hasta: 0 }; }
    catch (e) { return { n: 0, hasta: 0 }; }
  }
  function guardarIntentos(v) {
    try { sessionStorage.setItem(CLAVE_INTENTOS, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ }
  }

  function mostrarAlerta(msg) { alerta.textContent = msg; alerta.hidden = false; }
  function ocultarAlerta() { alerta.hidden = true; }

  function errorCampo(input, msg) {
    const el = document.getElementById('err-' + input.id);
    el.textContent = msg || '';
    input.classList.toggle('invalido', !!msg);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }

  function validar() {
    let ok = true;
    const c = correo.value.trim();
    if (!c) { errorCampo(correo, 'Ingresa tu correo electrónico.'); ok = false; }
    else if (!REGEX_CORREO.test(c)) { errorCampo(correo, 'El formato del correo no es válido.'); ok = false; }
    else errorCampo(correo, '');

    if (!pass.value) { errorCampo(pass, 'Ingresa tu contraseña.'); ok = false; }
    else if (pass.value.length < 8) { errorCampo(pass, 'La contraseña tiene al menos 8 caracteres.'); ok = false; }
    else errorCampo(pass, '');
    return ok;
  }

  let temporizador = null;
  function revisarBloqueo() {
    const it = leerIntentos();
    const resta = it.hasta - Date.now();
    if (resta > 0) {
      btnEntrar.disabled = true;
      mostrarAlerta('Demasiados intentos fallidos. Intenta de nuevo en ' + Math.ceil(resta / 1000) + ' s.');
      clearTimeout(temporizador);
      temporizador = setTimeout(revisarBloqueo, 1000);
      return true;
    }
    if (btnEntrar.disabled) { btnEntrar.disabled = false; ocultarAlerta(); guardarIntentos({ n: 0, hasta: 0 }); }
    return false;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    ocultarAlerta();
    if (revisarBloqueo() || !validar()) return;

    const usuario = US.autenticar(correo.value, pass.value);
    if (!usuario) {
      const it = leerIntentos();
      it.n += 1;
      if (it.n >= MAX_INTENTOS) { it.hasta = Date.now() + BLOQUEO_MS; guardarIntentos(it); revisarBloqueo(); return; }
      guardarIntentos(it);
      mostrarAlerta('Correo o contraseña incorrectos. Te quedan ' + (MAX_INTENTOS - it.n) + ' intento(s).');
      pass.value = '';
      pass.focus();
      return;
    }

    guardarIntentos({ n: 0, hasta: 0 });
    US.iniciarSesion(usuario, recordar.checked);
    window.location.href = US.paginaDeRol(usuario.rol);
  });

  // Validación al salir de cada campo
  correo.addEventListener('blur', () => { if (correo.value) validar(); });
  [correo, pass].forEach((i) => i.addEventListener('input', () => errorCampo(i, '')));

  // Mostrar / ocultar contraseña
  btnVer.addEventListener('click', () => {
    const visible = pass.type === 'text';
    pass.type = visible ? 'password' : 'text';
    btnVer.textContent = visible ? 'Ver' : 'Ocultar';
    btnVer.setAttribute('aria-pressed', String(!visible));
    btnVer.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
  });

  // Rellenar usuarios de prueba
  document.querySelectorAll('.demo-btn').forEach((b) => b.addEventListener('click', () => {
    correo.value = b.dataset.correo;
    pass.value = b.dataset.pass;
    errorCampo(correo, ''); errorCampo(pass, '');
    btnEntrar.focus();
  }));

  document.getElementById('btn-reset').addEventListener('click', async () => {
    const ok = await US.confirmar('Restablecer datos', '<p>Se borrarán las inscripciones, notas, avisos y mensajes creados durante la demostración y se cargarán los datos originales.</p>', 'Restablecer', 'btn-pri');
    if (ok) { US.restablecer(); US.toast('Datos de demostración restablecidos.'); }
  });

  revisarBloqueo();
})();
