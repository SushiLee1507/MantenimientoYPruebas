/* ==========================================================================
   Universidad Social — Eventos sociales (labor social universitaria)
   Reglas de negocio compartidas + vistas de estudiante y proponente (profesor).

   RF-04  Postulación de actividades sociales (profesor)
   RF-05  Evaluación de propuestas por el administrador
   RF-06  Publicación de actividades aprobadas
   RF-07  Inscripción de estudiantes en actividades publicadas
   RF-08  Validación de inscripción duplicada
   RF-09  Cierre de convocatoria (administrador)
   RF-10  Gestión de estudiantes postulados (administrador)
   RF-16  Visualización de horas sociales acumuladas
   RF-18  Carga y validación de archivos (PDF/JPG/PNG, máx. 2 MB)
   ========================================================================== */
(function () {
  'use strict';
  const esc = US.esc;
  const db = () => US.db;

  /* ======================================================================
     CATÁLOGOS
     ====================================================================== */
  US.TIPOS_EVENTO = ['Ambiental', 'Comunitario', 'Educativo', 'Salud', 'Cultural', 'Tecnológico', 'Deportivo'];
  US.ESTADOS_EVENTO = {
    pendiente: { txt: 'En evaluación', chip: 'chip-aviso' },
    aprobada:  { txt: 'Aprobada · sin publicar', chip: 'chip-pri' },
    publicada: { txt: 'Publicada', chip: 'chip-ok' },
    rechazada: { txt: 'Rechazada', chip: 'chip-mal' },
    cerrada:   { txt: 'Convocatoria cerrada', chip: '' }
  };
  US.ESTADOS_SOLICITUD = {
    pendiente: { txt: 'Pendiente', chip: 'chip-aviso' },
    aceptado:  { txt: 'Aceptado', chip: 'chip-ok' },
    rechazado: { txt: 'Rechazado', chip: 'chip-mal' }
  };
  US.MAX_ARCHIVO = 2 * 1024 * 1024;
  const EXT_OK = ['pdf', 'jpg', 'jpeg', 'png'];
  const MIME_OK = ['application/pdf', 'image/jpeg', 'image/png'];
  const DIAS_ANTICIPACION = 3; // días mínimos entre la postulación y el evento (tiempo para evaluarla)
  const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const FIRMA_ADMIN = '\n\nAdministración de Eventos Sociales\nBienestar Estudiantil · UTP';

  /* ======================================================================
     CONSULTAS
     ====================================================================== */
  US.hoy = () => US.ahora().slice(0, 10);
  US.sumarDias = (iso, n) => {
    const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  US.evento = (id) => db().eventos.find((e) => e.id === id) || null;
  US.eventosDe = (propId) => db().eventos.filter((e) => e.proponenteId === propId)
    .sort((a, b) => b.fechaPostulacion.localeCompare(a.fechaPostulacion));
  US.eventosEn = (...estados) => db().eventos.filter((e) => estados.includes(e.estado));
  US.eventoPasado = (ev) => ev.fecha < US.hoy();
  US.convocatoriasAbiertas = () => US.eventosEn('publicada').filter((e) => !US.eventoPasado(e))
    .sort((a, b) => (a.fecha + a.horaInicio).localeCompare(b.fecha + b.horaInicio));

  US.solicitudes = (evId) => db().eventoInscripciones.filter((i) => i.eventoId === evId);
  US.solicitudDe = (estId, evId) => db().eventoInscripciones.find((i) => i.estudianteId === estId && i.eventoId === evId) || null;
  US.solicitudesDeEstudiante = (estId) => db().eventoInscripciones.filter((i) => i.estudianteId === estId);
  /** Las solicitudes pendientes también reservan cupo; las rechazadas lo liberan. */
  US.ocupados = (ev) => US.solicitudes(ev.id).filter((i) => i.estado !== 'rechazado').length;
  US.cuposEvento = (ev) => ev.cupo - US.ocupados(ev);
  US.contarSolicitudes = (ev) => {
    const c = { pendiente: 0, aceptado: 0, rechazado: 0 };
    US.solicitudes(ev.id).forEach((i) => { c[i.estado]++; });
    return c;
  };
  US.horasDe = (estId) => db().horasSociales.filter((h) => h.estudianteId === estId).reduce((t, h) => t + h.horas, 0);
  US.duracionHoras = (ev) => (US.aMin(ev.horaFin) - US.aMin(ev.horaInicio)) / 60;

  /* ---------- Formato ---------- */
  US.tamano = (b) => (b >= 1024 * 1024 ? (b / 1024 / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
  const diaSemana = (iso) => { const d = new Date(iso + 'T00:00:00').getDay(); return d === 0 ? 7 : d; };
  US.fechaEvento = (ev) => US.DIAS_CORTO[diaSemana(ev.fecha)] + ' ' + US.fecha(ev.fecha);
  US.horarioEvento = (ev) => US.hora12(ev.horaInicio) + ' – ' + US.hora12(ev.horaFin);
  US.chipEvento = (estado) => { const e = US.ESTADOS_EVENTO[estado]; return '<span class="chip ' + e.chip + '">' + e.txt + '</span>'; };
  US.chipSolicitud = (estado, prefijo) => { const e = US.ESTADOS_SOLICITUD[estado]; return '<span class="chip ' + e.chip + '">' + (prefijo || '') + e.txt + '</span>'; };
  US.rolDe = (id) => US.ROLES[US.usuario(id)?.rol] || '';

  /* ======================================================================
     VALIDACIONES
     ====================================================================== */
  /** RF-18: devuelve '' si el archivo es válido o el motivo del error. */
  US.validarArchivo = (file) => {
    if (!file) return 'Adjunta el archivo.';
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!EXT_OK.includes(ext) || (file.type && !MIME_OK.includes(file.type))) return 'Formato no permitido. Solo se aceptan archivos PDF, JPG o PNG.';
    if (file.size === 0) return 'El archivo está vacío.';
    if (file.size > US.MAX_ARCHIVO) return 'El archivo pesa ' + US.tamano(file.size) + '. El máximo permitido es 2 MB.';
    return '';
  };
  const metaArchivo = (f) => ({ nombre: f.name, tamano: f.size, tipo: f.type || '' });

  /** RF-04 / RNF-06: valida los datos de una postulación. Devuelve { campo: mensaje }. */
  US.validarDatosEvento = (d) => {
    const e = {};
    const minFecha = US.sumarDias(US.hoy(), DIAS_ANTICIPACION);
    if (!d.titulo || d.titulo.trim().length < 5) e.titulo = 'Escribe un nombre de al menos 5 caracteres.';
    if (!US.TIPOS_EVENTO.includes(d.tipo)) e.tipo = 'Selecciona el tipo de trabajo social.';
    if (!d.lugar || d.lugar.trim().length < 3) e.lugar = 'Indica el lugar de la actividad.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.fecha || '')) e.fecha = 'Selecciona la fecha del evento.';
    else if (d.fecha < minFecha) e.fecha = 'La fecha debe ser a partir del ' + US.fecha(minFecha) + ' (mínimo ' + DIAS_ANTICIPACION + ' días para evaluarla).';
    if (!d.horaInicio) e.horaInicio = 'Indica la hora de inicio.';
    if (!d.horaFin) e.horaFin = 'Indica la hora de finalización.';
    else if (d.horaInicio && US.aMin(d.horaFin) <= US.aMin(d.horaInicio)) e.horaFin = 'Debe ser posterior a la hora de inicio.';
    const cupo = Number(d.cupo);
    if (!Number.isInteger(cupo) || cupo < 1 || cupo > 200) e.cupo = 'Ingresa un número entero entre 1 y 200.';
    const horas = Number(d.horas);
    if (!Number.isInteger(horas) || horas < 1 || horas > 12) e.horas = 'Ingresa un número entero entre 1 y 12.';
    else if (!e.horaFin && d.horaInicio && horas > Math.ceil((US.aMin(d.horaFin) - US.aMin(d.horaInicio)) / 60)) e.horas = 'No puede superar la duración de la actividad.';
    if (!d.descripcion || d.descripcion.trim().length < 30) e.descripcion = 'Describe la actividad (mínimo 30 caracteres): objetivos, tareas, logística.';
    if (!d.encargadoNombre || d.encargadoNombre.trim().length < 3) e.encargadoNombre = 'Escribe el nombre del encargado.';
    if (d.encargadoTelefono && !/^[0-9+\-\s]{7,15}$/.test(d.encargadoTelefono.trim())) e.encargadoTelefono = 'Formato de teléfono no válido (ej.: 6612-3344).';
    const errDoc = d.documento instanceof File ? US.validarArchivo(d.documento) : (d.documento ? '' : 'Adjunta el documento del encargado.');
    if (errDoc) e.documento = errDoc;
    return e;
  };

  /** RF-07 / RF-08: ¿puede el estudiante inscribirse? Devuelve { ok, motivo, tipo }. */
  US.validarInscripcionEvento = (estId, evId) => {
    const ev = US.evento(evId);
    const est = US.usuario(estId);
    if (!ev) return { ok: false, motivo: 'La actividad no existe.', tipo: 'error' };
    if (!est || est.rol !== 'estudiante') return { ok: false, motivo: 'Solo los estudiantes pueden inscribirse.', tipo: 'error' };
    if (ev.estado === 'cerrada') return { ok: false, motivo: 'La convocatoria ya está cerrada.', tipo: 'cerrada' };
    if (ev.estado !== 'publicada') return { ok: false, motivo: 'La actividad no está publicada.', tipo: 'error' };
    if (US.eventoPasado(ev)) return { ok: false, motivo: 'La actividad ya se realizó.', tipo: 'cerrada' };
    const previa = US.solicitudDe(estId, evId);
    if (previa) {
      return previa.estado === 'rechazado'
        ? { ok: false, motivo: 'Tu solicitud para esta actividad fue rechazada; no puedes volver a inscribirte.', tipo: 'duplicada' }
        : { ok: false, motivo: 'Ya estás inscrito en esta actividad (solicitud ' + US.ESTADOS_SOLICITUD[previa.estado].txt.toLowerCase() + ').', tipo: 'duplicada' };
    }
    if (US.cuposEvento(ev) <= 0) return { ok: false, motivo: 'No quedan cupos disponibles.', tipo: 'llena' };
    const choque = US.solicitudesDeEstudiante(estId)
      .filter((s) => s.estado !== 'rechazado').map((s) => US.evento(s.eventoId))
      .find((o) => o && o.id !== ev.id && o.fecha === ev.fecha &&
        US.aMin(o.horaInicio) < US.aMin(ev.horaFin) && US.aMin(ev.horaInicio) < US.aMin(o.horaFin));
    if (choque) return { ok: false, motivo: 'Coincide en fecha y hora con "' + choque.titulo + '".', tipo: 'choque' };
    return { ok: true };
  };

  /* ======================================================================
     OPERACIONES
     ====================================================================== */
  US.notificar = (de, para, asunto, cuerpo) => {
    db().mensajes.push({ id: US.nuevoId('m'), de, para, asunto, cuerpo, fecha: US.ahora(), leido: false, borradoPor: [] });
  };

  /** RF-04 */
  US.postularEvento = (propId, d) => {
    const err = US.validarDatosEvento(d);
    if (Object.keys(err).length) return { ok: false, errores: err };
    const ev = {
      id: US.nuevoId('ev'), titulo: d.titulo.trim(), tipo: d.tipo, lugar: d.lugar.trim(), fecha: d.fecha,
      horaInicio: d.horaInicio, horaFin: d.horaFin, cupo: Number(d.cupo), horas: Number(d.horas),
      descripcion: d.descripcion.trim(), permisos: (d.permisos || '').trim(),
      encargado: { nombre: d.encargadoNombre.trim(), telefono: (d.encargadoTelefono || '').trim(), documento: metaArchivo(d.documento) },
      proponenteId: propId, fechaPostulacion: US.ahora(), estado: 'pendiente', publicadaEn: null, evaluacion: null
    };
    db().eventos.push(ev);
    US.guardar();
    return { ok: true, evento: ev };
  };

  /** El proponente puede retirar su propuesta mientras no haya sido evaluada. */
  US.retirarPropuesta = (propId, evId) => {
    const ev = US.evento(evId);
    if (!ev || ev.proponenteId !== propId || ev.estado !== 'pendiente') return { ok: false, motivo: 'Solo puedes retirar propuestas en evaluación.' };
    db().eventos = db().eventos.filter((e) => e.id !== evId);
    US.guardar();
    return { ok: true };
  };

  /** RF-05: decision = 'aprobada' | 'rechazada'. Con publicar = true se publica de inmediato (RF-06). */
  US.evaluarEvento = (adminId, evId, decision, comentario, publicar) => {
    const ev = US.evento(evId);
    if (!ev || ev.estado !== 'pendiente') return { ok: false, motivo: 'La propuesta ya fue evaluada.' };
    comentario = (comentario || '').trim();
    if (decision === 'rechazada' && comentario.length < 10) return { ok: false, motivo: 'Indica el motivo del rechazo (mínimo 10 caracteres).' };
    ev.estado = decision;
    ev.evaluacion = { adminId, fecha: US.ahora(), decision, comentario };
    const saludo = 'Hola, ' + US.nombreUsuario(ev.proponenteId) + ':\n\n';
    if (decision === 'rechazada') {
      US.notificar(adminId, ev.proponenteId, 'Propuesta rechazada: ' + ev.titulo,
        saludo + 'Tu propuesta "' + ev.titulo + '" fue rechazada.\n\nObservaciones: ' + comentario + FIRMA_ADMIN);
    } else if (!publicar) {
      US.notificar(adminId, ev.proponenteId, 'Propuesta aprobada: ' + ev.titulo,
        saludo + 'Tu propuesta "' + ev.titulo + '" fue aprobada y se publicará próximamente para los estudiantes.' +
        (comentario ? '\n\nObservaciones: ' + comentario : '') + FIRMA_ADMIN);
    }
    if (decision === 'aprobada' && publicar) return US.publicarEvento(adminId, evId, comentario);
    US.guardar();
    return { ok: true };
  };

  /** RF-06: publica una actividad aprobada y crea un aviso general para los estudiantes. */
  US.publicarEvento = (adminId, evId, comentario) => {
    const ev = US.evento(evId);
    if (!ev || ev.estado !== 'aprobada') return { ok: false, motivo: 'Solo se pueden publicar actividades aprobadas.' };
    if (US.eventoPasado(ev)) return { ok: false, motivo: 'La fecha de la actividad ya pasó; no se puede publicar.' };
    ev.estado = 'publicada';
    ev.publicadaEn = US.ahora();
    db().avisos.push({
      id: US.nuevoId('a'), autorId: adminId, grupoId: null, importante: false, fecha: US.ahora(), eventoId: ev.id,
      titulo: 'Nueva convocatoria: ' + ev.titulo,
      cuerpo: US.fechaEvento(ev) + ', ' + US.horarioEvento(ev) + ', en ' + ev.lugar + '. Otorga ' + ev.horas + ' horas de labor social (' + ev.cupo + ' cupos). Inscríbete en la pestaña Eventos sociales.'
    });
    US.notificar(adminId, ev.proponenteId, 'Actividad publicada: ' + ev.titulo,
      'Hola, ' + US.nombreUsuario(ev.proponenteId) + ':\n\nTu actividad "' + ev.titulo + '" fue aprobada y ya está publicada para que los estudiantes se inscriban.' +
      (comentario ? '\n\nObservaciones: ' + comentario : '') + FIRMA_ADMIN);
    US.guardar();
    return { ok: true };
  };

  /** RF-07 + RF-08. origen 'admin' = agregado manualmente por el administrador (queda aceptado). */
  US.inscribirEvento = (estId, evId, recibo, origen = 'estudiante') => {
    const v = US.validarInscripcionEvento(estId, evId); // se vuelve a validar justo antes de guardar
    if (!v.ok) return v;
    if (origen === 'estudiante' && !recibo) return { ok: false, motivo: 'Adjunta tu recibo de matrícula.', tipo: 'error' };
    db().eventoInscripciones.push({
      id: US.nuevoId('ei'), eventoId: evId, estudianteId: estId, fecha: US.ahora(),
      estado: origen === 'admin' ? 'aceptado' : 'pendiente', origen, motivo: '',
      recibo: recibo ? (recibo instanceof File ? metaArchivo(recibo) : recibo) : null
    });
    US.guardar();
    return { ok: true };
  };

  US.cancelarSolicitud = (estId, evId) => {
    const s = US.solicitudDe(estId, evId);
    const ev = US.evento(evId);
    if (!s || !ev || ev.estado !== 'publicada' || s.estado === 'rechazado') return { ok: false, motivo: 'Esta solicitud ya no se puede cancelar.' };
    db().eventoInscripciones = db().eventoInscripciones.filter((i) => i.id !== s.id);
    US.guardar();
    return { ok: true };
  };

  /** RF-10: aceptar o rechazar a un estudiante postulado. */
  US.resolverSolicitud = (adminId, solId, estado, motivo) => {
    const s = db().eventoInscripciones.find((i) => i.id === solId);
    const ev = s && US.evento(s.eventoId);
    if (!s || !ev) return { ok: false, motivo: 'La solicitud no existe.' };
    if (ev.estado !== 'publicada') return { ok: false, motivo: 'La convocatoria está cerrada.' };
    motivo = (motivo || '').trim();
    if (estado === 'rechazado' && motivo.length < 5) return { ok: false, motivo: 'Indica el motivo del rechazo.' };
    if (estado === 'aceptado' && s.estado === 'rechazado' && US.cuposEvento(ev) <= 0) return { ok: false, motivo: 'No quedan cupos para aceptar a este estudiante.' };
    s.estado = estado;
    s.motivo = estado === 'rechazado' ? motivo : '';
    s.revisadaPor = adminId; s.revisadaEn = US.ahora();
    const nombre = US.primerNombre(US.nombreUsuario(s.estudianteId));
    US.notificar(adminId, s.estudianteId,
      (estado === 'aceptado' ? 'Inscripción aceptada: ' : 'Inscripción rechazada: ') + ev.titulo,
      'Hola, ' + nombre + ':\n\n' + (estado === 'aceptado'
        ? 'Tu inscripción en "' + ev.titulo + '" fue aceptada.\n\nTe esperamos el ' + US.fechaEvento(ev) + ', ' + US.horarioEvento(ev) + ', en ' + ev.lugar + '. Recuerda llegar puntual y seguir las indicaciones del encargado.'
        : 'Tu solicitud para "' + ev.titulo + '" fue rechazada.\n\nMotivo: ' + motivo) + FIRMA_ADMIN);
    US.guardar();
    return { ok: true };
  };

  /** RF-10: quitar a un estudiante de la lista (libera el cupo). */
  US.quitarSolicitud = (adminId, solId, motivo) => {
    const s = db().eventoInscripciones.find((i) => i.id === solId);
    const ev = s && US.evento(s.eventoId);
    if (!s || !ev) return { ok: false, motivo: 'La solicitud no existe.' };
    if (ev.estado !== 'publicada') return { ok: false, motivo: 'La convocatoria está cerrada.' };
    db().eventoInscripciones = db().eventoInscripciones.filter((i) => i.id !== solId);
    US.notificar(adminId, s.estudianteId, 'Fuiste retirado de: ' + ev.titulo,
      'Hola, ' + US.primerNombre(US.nombreUsuario(s.estudianteId)) + ':\n\nFuiste retirado de la lista de "' + ev.titulo + '".' +
      ((motivo || '').trim() ? '\n\nMotivo: ' + motivo.trim() : '') + FIRMA_ADMIN);
    US.guardar();
    return { ok: true };
  };

  /** RF-09: cierra la convocatoria. Es irreversible; las solicitudes pendientes se rechazan. */
  US.cerrarConvocatoria = (adminId, evId) => {
    const ev = US.evento(evId);
    if (!ev || ev.estado !== 'publicada') return { ok: false, motivo: 'Solo se pueden cerrar convocatorias publicadas.' };
    US.solicitudes(evId).filter((s) => s.estado === 'pendiente').forEach((s) => {
      s.estado = 'rechazado';
      s.motivo = 'La convocatoria se cerró antes de confirmar tu solicitud.';
      US.notificar(adminId, s.estudianteId, 'Convocatoria cerrada: ' + ev.titulo,
        'Hola, ' + US.primerNombre(US.nombreUsuario(s.estudianteId)) + ':\n\nLa convocatoria de "' + ev.titulo + '" se cerró y tu solicitud no llegó a confirmarse.' + FIRMA_ADMIN);
    });
    ev.estado = 'cerrada';
    ev.cerradaEn = US.ahora();
    US.guardar();
    return { ok: true };
  };

  /* ======================================================================
     COMPONENTES DE INTERFAZ
     ====================================================================== */
  US.htmlFechaBloque = (ev) => {
    const d = new Date(ev.fecha + 'T00:00:00');
    return '<div class="evento-fecha" aria-hidden="true"><span>' + US.DIAS_CORTO[diaSemana(ev.fecha)] + '</span><b>' + d.getDate() + '</b><span>' + MESES_CORTO[d.getMonth()] + '</span></div>';
  };

  US.htmlBarraCupo = (ev) => {
    const c = US.contarSolicitudes(ev);
    const pa = Math.min(100, (c.aceptado / ev.cupo) * 100);
    const pp = Math.min(100 - pa, (c.pendiente / ev.cupo) * 100);
    return '<div class="barra barra-multi" role="img" aria-label="' + c.aceptado + ' aceptados y ' + c.pendiente + ' pendientes de ' + ev.cupo + ' cupos">' +
      '<i style="width:' + pa + '%"></i><i class="pend" style="width:' + pp + '%"></i></div>';
  };

  /** Tarjeta de convocatoria. */
  US.htmlTarjetaEvento = (ev, pie) => {
    const libres = Math.max(0, US.cuposEvento(ev));
    return '<article class="evento">' +
      '<div class="evento-cab">' + US.htmlFechaBloque(ev) +
        '<div style="min-width:0"><div class="aviso-meta"><span class="chip chip-pri">' + esc(ev.tipo) + '</span><span class="chip chip-info">' + ev.horas + ' h sociales</span></div>' +
        '<h3>' + esc(ev.titulo) + '</h3></div></div>' +
      '<ul class="evento-meta">' +
        '<li><b>Lugar:</b> ' + esc(ev.lugar) + '</li>' +
        '<li><b>Horario:</b> ' + US.fechaEvento(ev) + ' · ' + US.horarioEvento(ev) + '</li>' +
        '<li><b>Propone:</b> ' + esc(US.nombreUsuario(ev.proponenteId)) + '</li>' +
      '</ul>' +
      '<p class="evento-desc">' + esc(ev.descripcion) + '</p>' +
      '<div>' + US.htmlBarraCupo(ev) + '<span class="cupo-txt">' + (libres ? libres + ' de ' + ev.cupo + ' cupos disponibles' : 'Cupo completo (' + ev.cupo + ')') + '</span></div>' +
      '<div class="evento-pie">' + pie + '</div>' +
    '</article>';
  };

  const archivoHtml = (a) => a ? '<span class="archivo">' + esc(a.nombre) + ' <small>(' + US.tamano(a.tamano) + ')</small></span>' : '<span class="muted">—</span>';
  US.htmlArchivo = archivoHtml;

  /** Ficha completa de la actividad (para modales y para la vista del administrador). */
  US.htmlDetalleEvento = (ev, op = {}) => {
    const evl = ev.evaluacion;
    return '<dl class="detalle-lista">' +
      '<dt>Estado</dt><dd>' + US.chipEvento(ev.estado) + '</dd>' +
      '<dt>Tipo</dt><dd>' + esc(ev.tipo) + '</dd>' +
      '<dt>Fecha</dt><dd>' + US.fechaEvento(ev) + '</dd>' +
      '<dt>Horario</dt><dd>' + US.horarioEvento(ev) + '</dd>' +
      '<dt>Lugar</dt><dd>' + esc(ev.lugar) + '</dd>' +
      '<dt>Horas sociales</dt><dd>' + ev.horas + ' h</dd>' +
      '<dt>Cupo</dt><dd>' + ev.cupo + ' estudiantes' + (ev.estado === 'publicada' || ev.estado === 'cerrada' ? ' · ' + US.ocupados(ev) + ' inscritos' : '') + '</dd>' +
      '<dt>Proponente</dt><dd>' + esc(US.nombreUsuario(ev.proponenteId)) + ' <small class="muted">(' + esc(US.rolDe(ev.proponenteId)) + ')</small></dd>' +
      (op.encargado !== false
        ? '<dt>Encargado</dt><dd>' + esc(ev.encargado.nombre) + (ev.encargado.telefono ? ' · ' + esc(ev.encargado.telefono) : '') + '</dd>' +
          (op.documento ? '<dt>Documento</dt><dd>' + archivoHtml(ev.encargado.documento) + '</dd>' : '')
        : '') +
      (op.postulacion ? '<dt>Postulada</dt><dd>' + US.fechaHora(ev.fechaPostulacion) + '</dd>' : '') +
      '</dl>' +
      '<h3 style="margin-top:1rem">Descripción</h3><div class="msj-texto" style="margin-top:.3rem">' + esc(ev.descripcion) + '</div>' +
      (ev.permisos ? '<h3 style="margin-top:1rem">Permisos</h3><p class="muted texto-largo">' + esc(ev.permisos) + '</p>' : '') +
      (op.evaluacion && evl
        ? '<div class="alerta ' + (evl.decision === 'rechazada' ? 'alerta-error' : 'alerta-ok') + '" style="margin:1rem 0 0">' +
            '<b>' + (evl.decision === 'rechazada' ? 'Rechazada' : 'Aprobada') + '</b> por ' + esc(US.nombreUsuario(evl.adminId)) + ' el ' + US.fechaHora(evl.fecha) +
            (evl.comentario ? '<br>' + esc(evl.comentario) : '') + '</div>'
        : '');
  };

  const RESPONSABILIDADES =
    '<ul class="responsabilidades">' +
      '<li>Asistir puntualmente a la actividad y cumplir con las indicaciones del encargado.</li>' +
      '<li>Mantener una conducta adecuada y representar a la universidad con respeto.</li>' +
      '<li>Notificar con antelación si surge alguna imposibilidad real de asistir.</li>' +
    '</ul>' +
    '<p><b>Importante:</b> no asistir luego de inscribirte puede implicar no otorgar horas, limitar futuras inscripciones o un reporte a coordinación.</p>';

  /* ======================================================================
     VISTA DEL ESTUDIANTE — #eventos · #eventos/mis · #eventos/horas · #eventos/inscribir/<id>
     ====================================================================== */
  const filtro = { q: '', tipo: '', conCupo: false };
  let aceptoResponsabilidades = null; // id del evento cuyas responsabilidades aceptó en el modal

  US.vistaEventosEstudiante = (main, yo, sub) => {
    const [vista, param] = (sub || '').split('/');
    if (vista === 'inscribir') return formInscripcion(main, yo, param);
    const v = ['mis', 'horas'].includes(vista) ? vista : 'convocatorias';
    const abiertas = US.convocatoriasAbiertas();
    const mias = US.solicitudesDeEstudiante(yo.id);
    const horas = US.horasDe(yo.id);

    main.innerHTML =
      '<div class="titulo-seccion"><div><h1>Eventos sociales</h1><p>Participa en actividades de labor social universitaria y acumula horas.</p></div>' +
      '<a class="horas-pill" href="#eventos/horas"><b>' + horas + '</b> horas sociales acumuladas</a></div>' +
      '<nav class="pestanas" aria-label="Secciones de eventos sociales">' +
        tabE('', 'Convocatorias abiertas <span class="chip">' + abiertas.length + '</span>', v === 'convocatorias') +
        tabE('mis', 'Mis inscripciones <span class="chip">' + mias.length + '</span>', v === 'mis') +
        tabE('horas', 'Mis horas sociales', v === 'horas') +
      '</nav><div id="ev-contenido"></div>';
    const cont = main.querySelector('#ev-contenido');
    if (v === 'convocatorias') convocatorias(cont, yo, abiertas);
    if (v === 'mis') misInscripciones(cont, yo, mias);
    if (v === 'horas') misHoras(cont, yo);
  };
  function tabE(k, txt, activa) {
    return '<a href="#eventos' + (k ? '/' + k : '') + '" class="' + (activa ? 'activo' : '') + '"' + (activa ? ' aria-current="page"' : '') + '>' + txt + '</a>';
  }

  function convocatorias(cont, yo, abiertas) {
    cont.innerHTML =
      '<div class="eventos-filtros">' +
        '<input class="input buscador" type="search" id="ev-buscar" placeholder="Buscar por actividad, lugar o proponente" aria-label="Buscar actividades" value="' + esc(filtro.q) + '">' +
        '<select class="input" id="ev-tipo" style="width:auto" aria-label="Filtrar por tipo"><option value="">Todos los tipos</option>' +
          US.TIPOS_EVENTO.map((t) => '<option' + (t === filtro.tipo ? ' selected' : '') + '>' + t + '</option>').join('') + '</select>' +
        '<label class="check"><input type="checkbox" id="ev-cupo"' + (filtro.conCupo ? ' checked' : '') + '> Solo con cupos</label>' +
      '</div><div class="eventos-grid" id="ev-grid"></div>';

    const grid = cont.querySelector('#ev-grid');
    const pintar = () => {
      const q = filtro.q.trim().toLowerCase();
      const lista = abiertas.filter((ev) =>
        (!q || (ev.titulo + ' ' + ev.lugar + ' ' + US.nombreUsuario(ev.proponenteId)).toLowerCase().includes(q)) &&
        (!filtro.tipo || ev.tipo === filtro.tipo) &&
        (!filtro.conCupo || US.cuposEvento(ev) > 0));
      grid.innerHTML = lista.length ? lista.map((ev) => {
        const v = US.validarInscripcionEvento(yo.id, ev.id);
        const sol = US.solicitudDe(yo.id, ev.id);
        let accion;
        if (sol) accion = US.chipSolicitud(sol.estado, 'Tu solicitud: ');
        else if (v.ok) accion = '<button class="btn btn-pri btn-sm" data-inscribir="' + ev.id + '">Inscribirme</button>';
        else if (v.tipo === 'llena') accion = '<span class="chip chip-mal">Sin cupos</span>';
        else accion = '<span class="motivo" style="margin:0">' + esc(v.motivo) + '</span>';
        return US.htmlTarjetaEvento(ev, '<button class="btn btn-sec btn-sm" data-ver="' + ev.id + '">Ver detalle</button>' + accion);
      }).join('') : '<div class="tarjeta vacio" style="grid-column:1/-1">' +
        (abiertas.length ? 'No hay actividades que coincidan con los filtros.' : 'No hay convocatorias abiertas en este momento. Revisa los avisos para enterarte de las próximas.') + '</div>';
    };
    pintar();

    cont.querySelector('#ev-buscar').addEventListener('input', (e) => { filtro.q = e.target.value; pintar(); });
    cont.querySelector('#ev-tipo').addEventListener('change', (e) => { filtro.tipo = e.target.value; pintar(); });
    cont.querySelector('#ev-cupo').addEventListener('change', (e) => { filtro.conCupo = e.target.checked; pintar(); });

    grid.addEventListener('click', async (e) => {
      const ver = e.target.closest('[data-ver]');
      if (ver) {
        const ev = US.evento(ver.dataset.ver);
        const puede = US.validarInscripcionEvento(yo.id, ev.id).ok;
        const r = await US.modal({ titulo: ev.titulo, ancho: true, html: US.htmlDetalleEvento(ev),
          acciones: puede ? [{ texto: 'Cerrar', clase: 'btn-sec', valor: null }, { texto: 'Inscribirme', clase: 'btn-pri', valor: 'inscribir' }] : undefined });
        if (r === 'inscribir') pedirResponsabilidades(ev);
        return;
      }
      const b = e.target.closest('[data-inscribir]');
      if (b) pedirResponsabilidades(US.evento(b.dataset.inscribir));
    });
  }

  async function pedirResponsabilidades(ev) {
    const r = await US.modal({
      titulo: 'Confirmar inscripción',
      html: '<h3>' + esc(ev.titulo) + '</h3><p>Al inscribirte, aceptas las siguientes responsabilidades:</p>' + RESPONSABILIDADES +
        '<p class="muted">Para completar la inscripción se te solicitará cargar tu recibo de matrícula.</p>',
      acciones: [{ texto: 'Cancelar', clase: 'btn-sec', valor: null }, { texto: 'Aceptar y continuar', clase: 'btn-pri', valor: true }]
    });
    if (!r) return;
    aceptoResponsabilidades = ev.id;
    location.hash = 'eventos/inscribir/' + ev.id;
  }

  /** Formulario "Registrar en actividades" (prototipo del informe). */
  function formInscripcion(main, yo, evId) {
    const abiertas = US.convocatoriasAbiertas();
    const sel = abiertas.find((e) => e.id === evId) || abiertas[0];
    main.innerHTML =
      '<div class="titulo-seccion"><div><h1>Inscripción a actividad</h1><p>Tu solicitud quedará pendiente hasta que la Administración de Eventos Sociales la revise.</p></div>' +
      '<a class="btn btn-sec" href="#eventos">Volver a convocatorias</a></div>' +
      (!abiertas.length ? '<div class="tarjeta"><p class="vacio">No hay convocatorias abiertas en este momento.</p></div>' :
      '<section class="tarjeta" style="max-width:780px"><form id="form-ins" novalidate>' +
        '<div class="campo"><label for="ins-evento">Selecciona la actividad</label><select class="input" id="ins-evento">' +
          abiertas.map((e) => '<option value="' + e.id + '"' + (e.id === sel.id ? ' selected' : '') + '>' + esc(e.titulo + ' — ' + e.lugar + ' (' + US.fecha(e.fecha) + ')') + '</option>').join('') +
        '</select></div>' +
        '<div id="ins-alerta"></div>' +
        '<div class="caja-detalle" id="ins-detalle"></div>' +
        '<div class="campo" style="margin-top:1.1rem"><label for="ins-recibo">Recibo de matrícula (PDF, JPG o PNG)</label>' +
          '<input class="input input-archivo" type="file" id="ins-recibo" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png">' +
          '<div class="ayuda">Máximo 2 MB. Es necesario para validar que estás matriculado en el periodo actual.</div>' +
          '<div class="error-campo" id="err-ins-recibo"></div></div>' +
        '<div class="caja-detalle"><b>Responsabilidades del participante</b>' + RESPONSABILIDADES +
          '<label class="check"><input type="checkbox" id="ins-acepto"> He leído y acepto las responsabilidades</label>' +
          '<div class="error-campo" id="err-ins-acepto"></div></div>' +
        '<div class="acciones-pie"><a class="btn btn-sec" href="#eventos">Cancelar</a><button class="btn btn-pri" type="submit" id="ins-enviar">Confirmar inscripción</button></div>' +
      '</form></section>');
    if (!abiertas.length) return;

    const form = main.querySelector('#form-ins');
    const selEv = form.querySelector('#ins-evento');
    const recibo = form.querySelector('#ins-recibo');
    const acepto = form.querySelector('#ins-acepto');
    const btn = form.querySelector('#ins-enviar');
    acepto.checked = aceptoResponsabilidades === sel.id;
    aceptoResponsabilidades = null;

    const actualizar = () => {
      const ev = US.evento(selEv.value);
      form.querySelector('#ins-detalle').innerHTML =
        '<h3>Detalle de la actividad</h3><ul class="evento-meta">' +
          '<li><b>' + esc(ev.titulo) + '</b> · ' + esc(ev.tipo) + '</li>' +
          '<li><b>Fecha:</b> ' + US.fechaEvento(ev) + ' · ' + US.horarioEvento(ev) + '</li>' +
          '<li><b>Lugar:</b> ' + esc(ev.lugar) + '</li>' +
          '<li><b>Horas sociales:</b> ' + ev.horas + ' · <b>Cupos disponibles:</b> ' + Math.max(0, US.cuposEvento(ev)) + ' de ' + ev.cupo + '</li>' +
        '</ul><p class="muted" style="margin:.6rem 0 0">' + esc(ev.descripcion) + '</p>';
      const v = US.validarInscripcionEvento(yo.id, ev.id); // RF-08: se avisa antes de enviar
      form.querySelector('#ins-alerta').innerHTML = v.ok ? '' : '<div class="alerta alerta-error" role="alert">' + esc(v.motivo) + '</div>';
      btn.disabled = !v.ok;
    };
    actualizar();
    selEv.addEventListener('change', actualizar);
    recibo.addEventListener('change', () => {
      const err = recibo.files[0] ? US.validarArchivo(recibo.files[0]) : '';
      form.querySelector('#err-ins-recibo').textContent = err;
      recibo.classList.toggle('invalido', !!err);
    });
    acepto.addEventListener('change', () => { form.querySelector('#err-ins-acepto').textContent = ''; });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (btn.disabled) return;
      const f = recibo.files[0];
      const errR = US.validarArchivo(f);
      form.querySelector('#err-ins-recibo').textContent = f ? errR : 'Adjunta tu recibo de matrícula.';
      recibo.classList.toggle('invalido', !!errR);
      form.querySelector('#err-ins-acepto').textContent = acepto.checked ? '' : 'Debes aceptar las responsabilidades para inscribirte.';
      if (errR || !acepto.checked) return;
      btn.disabled = true; // evita el doble envío
      const ev = US.evento(selEv.value);
      const r = US.inscribirEvento(yo.id, ev.id, f);
      if (!r.ok) { US.toast(r.motivo, 'error'); actualizar(); return; }
      US.toast('Solicitud enviada para "' + ev.titulo + '".');
      location.hash = 'eventos/mis';
    });
  }

  function misInscripciones(cont, yo, mias) {
    const filas = mias.map((s) => ({ s, ev: US.evento(s.eventoId) })).filter((x) => x.ev)
      .sort((a, b) => b.ev.fecha.localeCompare(a.ev.fecha));
    const otorgadas = {};
    db().horasSociales.filter((h) => h.estudianteId === yo.id).forEach((h) => { otorgadas[h.eventoId] = h.horas; });
    cont.innerHTML = '<section class="tarjeta"><div class="tabla-env"><table>' +
      '<thead><tr><th>Actividad</th><th>Fecha</th><th>Lugar</th><th class="num">Horas</th><th>Recibo</th><th>Estado</th><th></th></tr></thead><tbody>' +
      (filas.length ? filas.map(({ s, ev }) => {
        const cancelable = ev.estado === 'publicada' && !US.eventoPasado(ev) && s.estado !== 'rechazado';
        return '<tr><td><b>' + esc(ev.titulo) + '</b><br><small>' + esc(ev.tipo) + ' · solicitada el ' + US.fecha(s.fecha.slice(0, 10)) + '</small></td>' +
          '<td>' + US.fechaEvento(ev) + '<br><small>' + US.horarioEvento(ev) + '</small></td>' +
          '<td>' + esc(ev.lugar) + '</td>' +
          '<td class="num">' + (otorgadas[ev.id] != null ? '<b>' + otorgadas[ev.id] + '</b><br><small>otorgadas</small>' : ev.horas) + '</td>' +
          '<td>' + archivoHtml(s.recibo) + (s.origen === 'admin' ? '<br><small class="muted">Agregado por la administración</small>' : '') + '</td>' +
          '<td>' + US.chipSolicitud(s.estado) + (s.motivo ? '<span class="estado-motivo">' + esc(s.motivo) + '</span>' : '') +
            (ev.estado === 'cerrada' ? '<span class="estado-motivo">Convocatoria cerrada</span>' : '') + '</td>' +
          '<td><div class="acciones-celda"><button class="btn btn-sec btn-sm" data-ver="' + ev.id + '">Ver</button>' +
            (cancelable ? '<button class="btn btn-peligro btn-sm" data-cancelar="' + ev.id + '">Cancelar</button>' : '') + '</div></td></tr>';
      }).join('') : '<tr><td colspan="7" class="vacio">Aún no te has inscrito en ninguna actividad. <a href="#eventos">Ver convocatorias</a></td></tr>') +
      '</tbody></table></div></section>';

    cont.addEventListener('click', async (e) => {
      const ver = e.target.closest('[data-ver]');
      if (ver) { const ev = US.evento(ver.dataset.ver); US.modal({ titulo: ev.titulo, ancho: true, html: US.htmlDetalleEvento(ev) }); return; }
      const c = e.target.closest('[data-cancelar]');
      if (!c) return;
      const ev = US.evento(c.dataset.cancelar);
      if (!(await US.confirmar('Cancelar inscripción', '<p>¿Seguro que deseas cancelar tu inscripción en <b>' + esc(ev.titulo) + '</b>? Tu cupo quedará disponible para otro estudiante.</p>', 'Cancelar inscripción', 'btn-peligro'))) return;
      const r = US.cancelarSolicitud(yo.id, ev.id);
      US.toast(r.ok ? 'Cancelaste tu inscripción.' : r.motivo, r.ok ? 'ok' : 'error');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
  }

  function misHoras(cont, yo) {
    const registros = db().horasSociales.filter((h) => h.estudianteId === yo.id).sort((a, b) => b.fecha.localeCompare(a.fecha));
    const activas = US.solicitudesDeEstudiante(yo.id).filter((s) => s.estado !== 'rechazado')
      .map((s) => US.evento(s.eventoId)).filter((ev) => ev && ev.estado === 'publicada' && !US.eventoPasado(ev))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
    const proxima = activas[0];
    cont.innerHTML =
      '<div class="stats">' +
        stat('Horas acumuladas', US.horasDe(yo.id), 'Labor social validada') +
        stat('Actividades completadas', registros.length, 'Con asistencia firmada') +
        stat('Inscripciones activas', activas.length, 'Pendientes o aceptadas') +
        stat('Próxima actividad', proxima ? US.fecha(proxima.fecha).split(' ').slice(0, 2).join(' ') : '—', proxima ? esc(proxima.titulo) : 'Sin actividades próximas') +
      '</div>' +
      '<section class="tarjeta"><h2>Historial de horas</h2><div class="tabla-env"><table>' +
        '<thead><tr><th>Actividad</th><th>Fecha</th><th>Responsable</th><th class="num">Horas</th></tr></thead><tbody>' +
        (registros.length ? registros.map((h) => {
          const ev = US.evento(h.eventoId);
          return '<tr><td>' + esc(ev ? ev.titulo : 'Actividad') + '</td><td>' + US.fecha(h.fecha) + '</td>' +
            '<td>' + esc(ev ? US.nombreUsuario(ev.proponenteId) : '—') + '</td><td class="num"><b>' + h.horas + '</b></td></tr>';
        }).join('') : '<tr><td colspan="4" class="vacio">Todavía no tienes horas registradas.</td></tr>') +
      '</tbody></table></div>' +
      '<p class="muted" style="margin:.9rem 0 0;font-size:.82rem">Las horas se asignan automáticamente cuando el responsable de la actividad envía la lista de asistencia firmada.</p></section>';
  }

  function stat(lbl, val, sub) {
    return '<div class="stat"><div class="stat-lbl">' + lbl + '</div><div class="stat-val">' + val + '</div><div class="stat-sub">' + sub + '</div></div>';
  }
  US.stat = stat;

  /* ======================================================================
     VISTA DEL PROPONENTE (profesor) — #eventos · #eventos/postular
     ====================================================================== */
  let borradorEvento = null; // datos para "Postular de nuevo"

  US.vistaEventosProponente = (main, yo, sub) => {
    const v = sub === 'postular' ? 'postular' : 'propuestas';
    const mias = US.eventosDe(yo.id);
    main.innerHTML =
      '<div class="titulo-seccion"><div><h1>Eventos sociales</h1><p>Postula actividades de labor social y da seguimiento a su evaluación.</p></div>' +
      (v === 'propuestas' ? '<a class="btn btn-pri" href="#eventos/postular">+ Postular actividad</a>' : '') + '</div>' +
      '<nav class="pestanas" aria-label="Secciones de eventos sociales">' +
        tabE('', 'Mis propuestas <span class="chip">' + mias.length + '</span>', v === 'propuestas') +
        tabE('postular', 'Postular actividad', v === 'postular') +
      '</nav><div id="ev-contenido"></div>';
    const cont = main.querySelector('#ev-contenido');
    if (v === 'propuestas') misPropuestas(cont, yo, mias);
    else formPostular(cont, yo);
  };

  function misPropuestas(cont, yo, mias) {
    const cuenta = (est) => mias.filter((e) => e.estado === est).length;
    const inscritos = mias.filter((e) => e.estado === 'publicada' || e.estado === 'cerrada').reduce((t, e) => t + US.ocupados(e), 0);
    cont.innerHTML =
      '<div class="stats">' +
        stat('Propuestas', mias.length, 'Postuladas en total') +
        stat('En evaluación', cuenta('pendiente'), 'Esperando decisión') +
        stat('Publicadas', cuenta('publicada') + cuenta('aprobada'), cuenta('aprobada') ? cuenta('aprobada') + ' aprobada(s) por publicar' : 'Visibles para estudiantes') +
        stat('Estudiantes inscritos', inscritos, 'En tus actividades') +
      '</div>' +
      '<section class="tarjeta"><div class="tabla-env"><table>' +
        '<thead><tr><th>Actividad</th><th>Fecha del evento</th><th>Postulada</th><th>Estado</th><th class="num">Inscritos</th><th></th></tr></thead><tbody>' +
        (mias.length ? mias.map((ev) => {
          const conLista = ev.estado === 'publicada' || ev.estado === 'cerrada';
          return '<tr><td><b>' + esc(ev.titulo) + '</b><br><small>' + esc(ev.tipo) + ' · ' + esc(ev.lugar) + '</small></td>' +
            '<td>' + US.fechaEvento(ev) + '<br><small>' + US.horarioEvento(ev) + '</small></td>' +
            '<td>' + US.fecha(ev.fechaPostulacion.slice(0, 10)) + '</td>' +
            '<td>' + US.chipEvento(ev.estado) + (ev.estado === 'rechazada' && ev.evaluacion ? '<span class="estado-motivo">' + esc(ev.evaluacion.comentario) + '</span>' : '') + '</td>' +
            '<td class="num">' + (conLista ? US.ocupados(ev) + ' / ' + ev.cupo : '<span class="muted">—</span>') + '</td>' +
            '<td><div class="acciones-celda"><button class="btn btn-sec btn-sm" data-ver="' + ev.id + '">Ver</button>' +
              (ev.estado === 'pendiente' ? '<button class="btn btn-peligro btn-sm" data-retirar="' + ev.id + '">Retirar</button>' : '') +
              (ev.estado === 'rechazada' ? '<button class="btn btn-sec btn-sm" data-repostular="' + ev.id + '">Postular de nuevo</button>' : '') +
            '</div></td></tr>';
        }).join('') : '<tr><td colspan="6" class="vacio">Aún no has postulado actividades. <a href="#eventos/postular">Postular la primera</a></td></tr>') +
      '</tbody></table></div></section>';

    cont.addEventListener('click', async (e) => {
      const ver = e.target.closest('[data-ver]');
      if (ver) {
        const ev = US.evento(ver.dataset.ver);
        const sols = US.solicitudes(ev.id);
        const lista = (ev.estado === 'publicada' || ev.estado === 'cerrada')
          ? '<h3 style="margin-top:1rem">Estudiantes inscritos (' + sols.length + ')</h3>' +
            (sols.length ? '<div class="tabla-env"><table><thead><tr><th>Estudiante</th><th>Estado</th></tr></thead><tbody>' +
              sols.map((s) => '<tr><td>' + esc(US.nombreUsuario(s.estudianteId)) + '</td><td>' + US.chipSolicitud(s.estado) + '</td></tr>').join('') +
              '</tbody></table></div>' : '<p class="muted">Todavía no hay estudiantes inscritos.</p>')
          : '';
        US.modal({ titulo: ev.titulo, ancho: true, html: US.htmlDetalleEvento(ev, { evaluacion: true, documento: true, postulacion: true }) + lista });
        return;
      }
      const ret = e.target.closest('[data-retirar]');
      if (ret) {
        const ev = US.evento(ret.dataset.retirar);
        if (!(await US.confirmar('Retirar propuesta', '<p>Se eliminará la propuesta <b>' + esc(ev.titulo) + '</b> antes de que sea evaluada.</p>', 'Retirar propuesta', 'btn-peligro'))) return;
        const r = US.retirarPropuesta(yo.id, ev.id);
        US.toast(r.ok ? 'Propuesta retirada.' : r.motivo, r.ok ? 'ok' : 'error');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        return;
      }
      const rep = e.target.closest('[data-repostular]');
      if (rep) { borradorEvento = US.evento(rep.dataset.repostular); location.hash = 'eventos/postular'; }
    });
  }

  function formPostular(cont, yo) {
    const b = borradorEvento || {};
    borradorEvento = null;
    const minFecha = US.sumarDias(US.hoy(), DIAS_ANTICIPACION);
    const campo = (id, label, control, ayuda) =>
      '<div class="campo"><label for="pe-' + id + '">' + label + '</label>' + control +
      (ayuda ? '<div class="ayuda">' + ayuda + '</div>' : '') + '<div class="error-campo" id="err-pe-' + id + '"></div></div>';
    const inp = (id, attrs, val) => '<input class="input" id="pe-' + id + '" ' + attrs + ' value="' + esc(val ?? '') + '">';

    cont.innerHTML =
      '<section class="tarjeta" style="max-width:860px">' +
      (b.id ? '<div class="alerta alerta-info">Se copiaron los datos de "' + esc(b.titulo) + '". Corrige lo indicado en las observaciones y vuelve a adjuntar el documento.</div>' : '') +
      '<div class="alerta alerta-info">Tu propuesta será evaluada por la Administración de Eventos Sociales antes de publicarse para los estudiantes.</div>' +
      '<form id="form-postular" novalidate>' +
        campo('titulo', 'Nombre de la actividad', inp('titulo', 'maxlength="80" placeholder="Ej.: Reciclaje en la Cinta Costera"', b.titulo)) +
        '<div class="fila-2">' +
          campo('tipo', 'Tipo de trabajo social', '<select class="input" id="pe-tipo"><option value="">Selecciona…</option>' +
            US.TIPOS_EVENTO.map((t) => '<option' + (t === b.tipo ? ' selected' : '') + '>' + t + '</option>').join('') + '</select>') +
          campo('lugar', 'Lugar', inp('lugar', 'maxlength="120" placeholder="Ej.: Parque Omar, San Francisco"', b.lugar)) +
        '</div>' +
        '<div class="fila-3">' +
          campo('fecha', 'Fecha del evento', inp('fecha', 'type="date" min="' + minFecha + '"', '')) +
          campo('horaInicio', 'Hora de inicio', inp('horaInicio', 'type="time"', b.horaInicio)) +
          campo('horaFin', 'Hora de finalización', inp('horaFin', 'type="time"', b.horaFin)) +
        '</div>' +
        '<div class="fila-2">' +
          campo('cupo', 'Cantidad de participantes', inp('cupo', 'type="number" min="1" max="200" step="1" inputmode="numeric"', b.cupo)) +
          campo('horas', 'Horas sociales a otorgar', inp('horas', 'type="number" min="1" max="12" step="1" inputmode="numeric"', b.horas), 'No puede superar la duración de la actividad.') +
        '</div>' +
        campo('descripcion', 'Descripción detallada de la actividad', '<textarea class="input" id="pe-descripcion" maxlength="1500" placeholder="Describe objetivos, alcance, tareas y logística…">' + esc(b.descripcion || '') + '</textarea>') +
        campo('permisos', 'Permisos requeridos <span class="muted">(opcional)</span>', '<textarea class="input" id="pe-permisos" maxlength="500" style="min-height:70px">' + esc(b.permisos || '') + '</textarea>') +
        '<div class="fila-2">' +
          campo('encargadoNombre', 'Nombre del encargado', inp('encargadoNombre', 'maxlength="80"', b.encargado ? b.encargado.nombre : yo.nombre)) +
          campo('encargadoTelefono', 'Teléfono del encargado <span class="muted">(opcional)</span>', inp('encargadoTelefono', 'type="tel" maxlength="15" placeholder="6612-3344"', b.encargado ? b.encargado.telefono : '')) +
        '</div>' +
        campo('documento', 'Documento personal del encargado (cédula, pasaporte o licencia)',
          '<input class="input input-archivo" type="file" id="pe-documento" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png">', 'Formatos: PDF, JPG o PNG. Máximo 2 MB.') +
        '<div class="acciones-pie"><a class="btn btn-sec" href="#eventos">Regresar</a><button class="btn btn-pri" type="submit">Postular actividad</button></div>' +
      '</form></section>';

    const form = cont.querySelector('#form-postular');
    const ids = ['titulo', 'tipo', 'lugar', 'fecha', 'horaInicio', 'horaFin', 'cupo', 'horas', 'descripcion', 'permisos', 'encargadoNombre', 'encargadoTelefono'];
    const leer = () => {
      const d = {};
      ids.forEach((k) => { d[k] = form.querySelector('#pe-' + k).value; });
      d.documento = form.querySelector('#pe-documento').files[0] || null;
      return d;
    };
    const mostrarErrores = (err) => {
      ids.concat('documento').forEach((k) => {
        const el = form.querySelector('#pe-' + k);
        form.querySelector('#err-pe-' + k).textContent = err[k] || '';
        el.classList.toggle('invalido', !!err[k]);
        el.setAttribute('aria-invalid', err[k] ? 'true' : 'false');
      });
    };
    form.addEventListener('input', (e) => {
      const k = e.target.id.replace('pe-', '');
      const errEl = form.querySelector('#err-pe-' + k);
      if (errEl && errEl.textContent) { errEl.textContent = ''; e.target.classList.remove('invalido'); }
    });
    form.querySelector('#pe-documento').addEventListener('change', (e) => {
      const f = e.target.files[0];
      const err = f ? US.validarArchivo(f) : '';
      form.querySelector('#err-pe-documento').textContent = err;
      e.target.classList.toggle('invalido', !!err);
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = leer();
      const err = US.validarDatosEvento(d);
      mostrarErrores(err);
      if (Object.keys(err).length) {
        const primero = form.querySelector('.invalido');
        if (primero) primero.focus();
        US.toast('Revisa los campos marcados.', 'error');
        return;
      }
      const ok = await US.confirmar('Confirmar postulación',
        '<dl class="detalle-lista"><dt>Actividad</dt><dd>' + esc(d.titulo) + '</dd><dt>Tipo</dt><dd>' + esc(d.tipo) + '</dd>' +
        '<dt>Fecha</dt><dd>' + US.fecha(d.fecha) + ', ' + US.hora12(d.horaInicio) + ' – ' + US.hora12(d.horaFin) + '</dd>' +
        '<dt>Lugar</dt><dd>' + esc(d.lugar) + '</dd><dt>Cupo</dt><dd>' + Number(d.cupo) + ' estudiantes · ' + Number(d.horas) + ' h sociales</dd>' +
        '<dt>Encargado</dt><dd>' + esc(d.encargadoNombre) + '</dd><dt>Documento</dt><dd>' + esc(d.documento.name) + '</dd></dl>' +
        '<p class="muted" style="margin-top:1rem">Una vez enviada, solo podrás retirarla mientras esté en evaluación.</p>', 'Enviar postulación');
      if (!ok) return;
      const r = US.postularEvento(yo.id, d);
      if (!r.ok) { mostrarErrores(r.errores); return; }
      US.toast('Propuesta enviada a evaluación.');
      location.hash = 'eventos';
    });
  }
})();
