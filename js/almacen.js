/* ==========================================================================
   Universidad Social — Núcleo: almacenamiento, sesión, reglas y utilidades UI
   Expone el objeto global `US`.
   ========================================================================== */
    /*.*/
(function () {
  'use strict';

  const CLAVE_DB = 'universidadSocial.db';
  const CLAVE_SESION = 'universidadSocial.sesion';
  const memoria = {}; // respaldo si el navegador bloquea localStorage

  /* ---------- Acceso seguro a Storage ---------- */
  function leer(store, k) {
    try { return window[store].getItem(k); } catch (e) { return memoria[store + k] ?? null; }
  }
  function escribir(store, k, v) {
    try { window[store].setItem(k, v); } catch (e) { memoria[store + k] = v; }
  }
  function borrar(store, k) {
    try { window[store].removeItem(k); } catch (e) { delete memoria[store + k]; }
  }
  const clonar = (o) => JSON.parse(JSON.stringify(o));

  const US = (window.US = {});

  /* ---------- Base de datos local ---------- */
  function cargar() {
    const raw = leer('localStorage', CLAVE_DB);
    if (raw) {
      try {
        const d = JSON.parse(raw);
        if (d && d.version === window.US_SEED.version) return d;
      } catch (e) { /* datos corruptos: se regeneran */ }
    }
    const d = clonar(window.US_SEED);
    escribir('localStorage', CLAVE_DB, JSON.stringify(d));
    return d;
  }
  US.db = cargar();
  US.guardar = () => escribir('localStorage', CLAVE_DB, JSON.stringify(US.db));
  US.restablecer = () => {
    US.db = clonar(window.US_SEED);
    US.guardar();
  };

  /* ---------- Sesión ---------- */
  US.iniciarSesion = (usuario, recordar) => {
    const s = JSON.stringify({ id: usuario.id, rol: usuario.rol, inicio: Date.now(),
      expira: recordar ? Date.now() + 7 * 24 * 3600 * 1000 : null });
    borrar('localStorage', CLAVE_SESION);
    borrar('sessionStorage', CLAVE_SESION);
    escribir(recordar ? 'localStorage' : 'sessionStorage', CLAVE_SESION, s);
  };
  US.sesion = () => {
    const raw = leer('sessionStorage', CLAVE_SESION) || leer('localStorage', CLAVE_SESION);
    if (!raw) return null;
    try {
      const s = JSON.parse(raw);
      if (s.expira && Date.now() > s.expira) { US.cerrarSesion(); return null; }
      return s;
    } catch (e) { return null; }
  };
  US.cerrarSesion = () => {
    borrar('localStorage', CLAVE_SESION);
    borrar('sessionStorage', CLAVE_SESION);
  };
  US.PAGINAS = { estudiante: 'estudiante.html', profesor: 'profesor.html', administrador: 'admin.html' };
  US.ROLES = { estudiante: 'Estudiante', profesor: 'Profesor(a)', administrador: 'Admin. de eventos sociales' };
  US.paginaDeRol = (rol) => US.PAGINAS[rol] || 'index.html';

  /** Control de acceso por rol: si no hay sesión válida, vuelve al login. */
  US.requerirRol = (rol) => {
    const s = US.sesion();
    const u = s && US.usuario(s.id);
    if (!u) { window.location.replace('index.html'); return null; }
    if (u.rol !== rol) { window.location.replace(US.paginaDeRol(u.rol)); return null; }
    return u;
  };

  US.autenticar = (correo, password) => {
    const c = String(correo).trim().toLowerCase();
    return US.db.usuarios.find((u) => u.correo.toLowerCase() === c && u.password === password) || null;
  };

  /* ---------- Consultas ---------- */
  US.cfg = () => US.db.config;
  US.usuario = (id) => US.db.usuarios.find((u) => u.id === id) || null;
  US.nombreUsuario = (id) => (id === 'sistema' ? 'Secretaría Académica' : (US.usuario(id)?.nombre ?? 'Usuario'));
  US.grupo = (id) => US.db.grupos.find((g) => g.id === id) || null;
  US.gruposDePeriodo = (periodo) => US.db.grupos.filter((g) => g.periodo === periodo);
  US.inscritosEn = (grupoId) => US.db.inscripciones.filter((i) => i.grupoId === grupoId).map((i) => US.usuario(i.estudianteId)).filter(Boolean);
  US.cuposDisponibles = (g) => g.cupo - US.db.inscripciones.filter((i) => i.grupoId === g.id).length;
  US.gruposDeEstudiante = (estId, periodo) => US.db.inscripciones
    .filter((i) => i.estudianteId === estId).map((i) => US.grupo(i.grupoId))
    .filter((g) => g && (!periodo || g.periodo === periodo));
  US.gruposDeProfesor = (profId, periodo) => US.db.grupos.filter((g) => g.profesorId === profId && (!periodo || g.periodo === periodo));
  US.creditos = (grupos) => grupos.reduce((t, g) => t + g.creditos, 0);

  /* ---------- Calificaciones ---------- */
  US.EVALUACIONES = [
    { k: 'p1', nombre: 'Parcial 1' },
    { k: 'p2', nombre: 'Parcial 2' },
    { k: 'proyecto', nombre: 'Proyecto' },
    { k: 'semestral', nombre: 'Semestral' }
  ];
  US.notas = (estId, grupoId) => US.db.calificaciones[estId + '|' + grupoId] || { p1: null, p2: null, proyecto: null, semestral: null };
  US.guardarNotas = (estId, grupoId, notas) => { US.db.calificaciones[estId + '|' + grupoId] = notas; };

  /** Escala UTP: A 91-100, B 81-90, C 71-80, D 61-70, F 0-60 */
  US.letra = (v) => (v == null ? '—' : v >= 91 ? 'A' : v >= 81 ? 'B' : v >= 71 ? 'C' : v >= 61 ? 'D' : 'F');
  US.puntos = { A: 3, B: 2, C: 1, D: 0, F: 0 };

  /** Devuelve { valor, completo }. Si faltan notas, calcula el promedio parcial ponderado. */
  US.notaFinal = (n) => {
    const pond = US.db.ponderacion || window.US_SEED.ponderacion;
    let suma = 0, peso = 0;
    for (const k of Object.keys(pond)) {
      if (n[k] != null && n[k] !== '') { suma += Number(n[k]) * pond[k]; peso += pond[k]; }
    }
    if (peso === 0) return { valor: null, completo: false };
    const completo = Math.abs(peso - 1) < 1e-9;
    return { valor: Math.round(completo ? suma : suma / peso), completo };
  };

  /** Índice académico (escala 0–3) ponderado por créditos, solo con materias cerradas. */
  US.indice = (estId, periodo) => {
    let pts = 0, cred = 0;
    for (const g of US.gruposDeEstudiante(estId, periodo)) {
      const f = US.notaFinal(US.notas(estId, g.id));
      if (!f.completo) continue;
      pts += US.puntos[US.letra(f.valor)] * g.creditos;
      cred += g.creditos;
    }
    return cred ? pts / cred : null;
  };

  /* ---------- Reglas de inscripción ---------- */
  const aMin = (h) => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
  US.aMin = aMin;
  US.chocan = (g1, g2) => g1.sesiones.some((s1) => g2.sesiones.some((s2) =>
    s1.dia === s2.dia && aMin(s1.inicio) < aMin(s2.fin) && aMin(s2.inicio) < aMin(s1.fin)));

  /** Valida si el estudiante puede inscribir el grupo. Devuelve { ok, motivo, tipo }. */
  US.validarInscripcion = (estId, grupoId) => {
    const cfg = US.cfg();
    const g = US.grupo(grupoId);
    if (!g) return { ok: false, motivo: 'La materia no existe.', tipo: 'error' };
    if (!cfg.inscripcionAbierta) return { ok: false, motivo: 'El periodo de inscripción está cerrado.', tipo: 'cerrado' };
    if (g.periodo !== cfg.periodoActual) return { ok: false, motivo: 'La materia no pertenece al periodo actual.', tipo: 'error' };
    const actuales = US.gruposDeEstudiante(estId, cfg.periodoActual);
    if (actuales.some((x) => x.id === g.id)) return { ok: false, motivo: 'Ya estás inscrito en esta materia.', tipo: 'inscrita' };
    if (actuales.some((x) => x.codigo === g.codigo)) return { ok: false, motivo: 'Ya tienes otro grupo de esta materia.', tipo: 'duplicada' };
    if (US.cuposDisponibles(g) <= 0) return { ok: false, motivo: 'No hay cupos disponibles.', tipo: 'llena' };
    const choque = actuales.find((x) => US.chocan(x, g));
    if (choque) return { ok: false, motivo: 'Choca con ' + choque.codigo + ' ' + choque.nombre + '.', tipo: 'choque' };
    if (US.creditos(actuales) + g.creditos > cfg.maxCreditos) return { ok: false, motivo: 'Superarías el máximo de ' + cfg.maxCreditos + ' créditos.', tipo: 'creditos' };
    return { ok: true };
  };
  US.inscribir = (estId, grupoId) => {
    const v = US.validarInscripcion(estId, grupoId);
    if (!v.ok) return v;
    US.db.inscripciones.push({ estudianteId: estId, grupoId, fecha: US.ahora().slice(0, 10) });
    US.guardar();
    return { ok: true };
  };
  US.retirar = (estId, grupoId) => {
    US.db.inscripciones = US.db.inscripciones.filter((i) => !(i.estudianteId === estId && i.grupoId === grupoId));
    delete US.db.calificaciones[estId + '|' + grupoId];
    US.guardar();
  };

  /* ---------- Mensajes y avisos ---------- */
  US.bandeja = (uid) => US.db.mensajes.filter((m) => m.para === uid && !m.borradoPor.includes(uid)).sort((a, b) => b.fecha.localeCompare(a.fecha));
  US.enviados = (uid) => US.db.mensajes.filter((m) => m.de === uid && !m.borradoPor.includes(uid)).sort((a, b) => b.fecha.localeCompare(a.fecha));
  US.noLeidos = (uid) => US.bandeja(uid).filter((m) => !m.leido).length;
  /** Fecha y hora local en formato ISO sin zona (igual que los datos semilla). */
  US.ahora = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19); };
  US.nuevoId = (pref) => pref + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  /* ---------- Utilidades de formato ---------- */
  US.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  US.DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  US.DIAS_CORTO = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  US.fecha = (iso) => { const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso); return d.getDate() + ' ' + MESES[d.getMonth()] + ' ' + d.getFullYear(); };
  US.fechaHora = (iso) => {
    const d = new Date(iso);
    let h = d.getHours(); const m = String(d.getMinutes()).padStart(2, '0');
    const ap = h >= 12 ? 'p. m.' : 'a. m.'; h = h % 12 || 12;
    return US.fecha(iso) + ', ' + h + ':' + m + ' ' + ap;
  };
  US.hora12 = (hhmm) => { let [h, m] = hhmm.split(':').map(Number); const ap = h >= 12 ? 'p. m.' : 'a. m.'; h = h % 12 || 12; return h + ':' + String(m).padStart(2, '0') + ' ' + ap; };
  US.horarioTexto = (g) => g.sesiones.map((s) => US.DIAS_CORTO[s.dia] + ' ' + s.inicio + '–' + s.fin).join(' · ');
  US.primerNombre = (n) => n.split(' ')[0];
  US.iniciales = (n) => n.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  US.diaHoy = () => { const d = new Date().getDay(); return d === 0 ? 7 : d; };

  /* ---------- Componentes UI ---------- */
  US.toast = (msg, tipo = 'ok') => {
    let cont = document.getElementById('toasts');
    if (!cont) { cont = document.createElement('div'); cont.id = 'toasts'; cont.setAttribute('aria-live', 'polite'); document.body.appendChild(cont); }
    const t = document.createElement('div');
    t.className = 'toast toast-' + tipo;
    t.textContent = msg;
    cont.appendChild(t);
    setTimeout(() => { t.classList.add('saliendo'); setTimeout(() => t.remove(), 300); }, 3200);
  };

  /**
   * Ventana modal. acciones: [{ texto, clase, valor }]. Devuelve una promesa
   * con el `valor` de la acción elegida (o null si se cierra).
   */
  /* validar(valor, fondo): si devuelve un texto, la ventana NO se cierra (sirve para formularios dentro del modal).
     ancho: true para ventanas con más contenido (detalle de eventos). */
  US.modal = ({ titulo, html, acciones = [{ texto: 'Cerrar', clase: 'btn-sec', valor: null }], alAbrir, validar, ancho }) => new Promise((resolve) => {
    const previo = document.activeElement;
    const fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    fondo.innerHTML =
      '<div class="modal' + (ancho ? ' modal-ancho' : '') + '" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">' +
        '<div class="modal-cab"><h2 id="modal-titulo">' + US.esc(titulo) + '</h2>' +
        '<button class="modal-x" aria-label="Cerrar" data-cerrar>×</button></div>' +
        '<div class="modal-cuerpo">' + html + '</div>' +
        '<div class="modal-pie">' + acciones.map((a, i) => '<button class="btn ' + (a.clase || 'btn-sec') + '" data-accion="' + i + '">' + US.esc(a.texto) + '</button>').join('') + '</div>' +
      '</div>';
    document.body.appendChild(fondo);
    document.body.classList.add('sin-scroll');
    const cerrar = (valor) => {
      fondo.remove();
      document.body.classList.remove('sin-scroll');
      document.removeEventListener('keydown', teclas);
      if (previo && previo.focus) previo.focus();
      resolve(valor);
    };
    const teclas = (e) => { if (e.key === 'Escape') cerrar(null); };
    document.addEventListener('keydown', teclas);
    fondo.addEventListener('click', (e) => {
      if (e.target === fondo || e.target.hasAttribute('data-cerrar')) return cerrar(null);
      const b = e.target.closest('[data-accion]');
      if (!b) return;
      const valor = acciones[Number(b.dataset.accion)].valor;
      if (validar && valor !== null && valor !== false && validar(valor, fondo)) return;
      cerrar(valor);
    });
    const foco = fondo.querySelector('.modal-pie .btn:last-child') || fondo.querySelector('.modal-x');
    foco.focus();
    if (alAbrir) alAbrir(fondo);
  });
  US.confirmar = (titulo, html, texto = 'Confirmar', clase = 'btn-pri') =>
    US.modal({ titulo, html, acciones: [{ texto: 'Cancelar', clase: 'btn-sec', valor: false }, { texto, clase, valor: true }] });

  /* ---------- Estructura de página con navegación por hash ---------- */
  /**
   * US.app({ usuario, rutas: { clave: { titulo, render(main, param) } }, inicio })
   * Las rutas se navegan con #clave o #clave/param.
   */
  US.app = ({ usuario, rutas, inicio }) => {
    const nav = document.getElementById('nav');
    const main = document.getElementById('main');
    document.getElementById('usuario-nombre').textContent = 'Hola, ' + US.primerNombre(usuario.nombre);
    document.getElementById('usuario-rol').textContent = US.ROLES[usuario.rol] || usuario.rol;
    document.getElementById('avatar').textContent = US.iniciales(usuario.nombre);
    document.getElementById('btn-salir').addEventListener('click', () => { US.cerrarSesion(); window.location.replace('index.html'); });

    nav.innerHTML = Object.entries(rutas).map(([k, r]) =>
      '<a href="#' + k + '" data-ruta="' + k + '">' + US.esc(r.titulo) +
      (k === 'mensajes' ? ' <span class="badge" id="badge-mensajes" hidden></span>' : '') +
      (r.badge ? ' <span class="badge" data-badge="' + k + '" hidden></span>' : '') + '</a>').join('');

    const actualizarBadge = () => {
      const b = document.getElementById('badge-mensajes');
      if (b) {
        const n = US.noLeidos(usuario.id);
        b.textContent = n; b.hidden = n === 0;
        b.setAttribute('aria-label', n + ' mensajes sin leer');
      }
      // Contadores adicionales definidos por cada ruta (p. ej. propuestas pendientes)
      nav.querySelectorAll('[data-badge]').forEach((el) => {
        const r = rutas[el.dataset.badge];
        const c = r.badge();
        el.textContent = c; el.hidden = c === 0;
        el.setAttribute('aria-label', c + ' ' + (r.badgeTexto || 'pendientes'));
      });
    };
    US.actualizarBadge = actualizarBadge;

    const mostrar = () => {
      const [ruta, ...resto] = (location.hash.slice(1) || inicio).split('/');
      const clave = rutas[ruta] ? ruta : inicio;
      nav.querySelectorAll('a').forEach((a) => a.classList.toggle('activo', a.dataset.ruta === clave));
      const activo = nav.querySelector('a.activo');
      if (activo && activo.scrollIntoView) activo.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      document.title = rutas[clave].titulo + ' · Universidad Social';
      main.innerHTML = '';
      rutas[clave].render(main, resto.join('/'));
      actualizarBadge();
      main.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', mostrar);
    // Si otra pestaña cambia los datos, se recargan.
    window.addEventListener('storage', (e) => { if (e.key === CLAVE_DB) { US.db = cargar(); mostrar(); } });
    mostrar();
  };
})();
