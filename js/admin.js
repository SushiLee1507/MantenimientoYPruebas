/* ==========================================================================
   Universidad Social — Panel del Administrador de Eventos Sociales
   Secciones: Inicio · Propuestas · Eventos sociales · Mensajes y avisos
   RF-05 Evaluación de propuestas · RF-06 Publicación · RF-09 Cierre de convocatoria
   RF-10 Gestión de estudiantes postulados (aceptar, rechazar, quitar, agregar)
   ========================================================================== */
    /*.*/
(function () {
  'use strict';
  const yo = US.requerirRol('administrador');
  if (!yo) return;
  const esc = US.esc;
  const stat = US.stat;
  const refrescar = () => window.dispatchEvent(new HashChangeEvent('hashchange'));
  const solicitudesPorRevisar = () => US.eventosEn('publicada').reduce((t, ev) => t + US.contarSolicitudes(ev).pendiente, 0);

  /* ---------------- Evaluación de una propuesta (RF-05 / RF-06) ---------------- */
  async function evaluar(evId) {
    const ev = US.evento(evId);
    if (!ev || ev.estado !== 'pendiente') return;
    const datos = { comentario: '', publicar: true };
    const r = await US.modal({
      titulo: 'Evaluar propuesta',
      ancho: true,
      html: '<h3>' + esc(ev.titulo) + '</h3>' +
        (US.eventoPasado(ev) ? '<div class="alerta alerta-aviso">La fecha de esta actividad ya pasó; solo puede rechazarse.</div>' : '') +
        US.htmlDetalleEvento(ev, { documento: true, postulacion: true }) +
        '<div class="campo" style="margin-top:1.1rem"><label for="ev-comentario">Observaciones para el proponente</label>' +
          '<textarea class="input" id="ev-comentario" maxlength="600" style="min-height:90px" placeholder="Obligatorio si rechazas la propuesta."></textarea>' +
          '<div class="error-campo" id="err-ev-comentario"></div></div>' +
        '<label class="check"><input type="checkbox" id="ev-publicar" checked> Publicar para los estudiantes al aprobar</label>',
      acciones: [
        { texto: 'Cancelar', clase: 'btn-sec', valor: null },
        { texto: 'Rechazar', clase: 'btn-peligro', valor: 'rechazada' }
      ].concat(US.eventoPasado(ev) ? [] : [{ texto: 'Aprobar', clase: 'btn-pri', valor: 'aprobada' }]),
      validar: (valor, fondo) => {
        const ta = fondo.querySelector('#ev-comentario');
        datos.comentario = ta.value.trim();
        datos.publicar = fondo.querySelector('#ev-publicar').checked;
        const err = valor === 'rechazada' && datos.comentario.length < 10 ? 'Explica el motivo del rechazo (mínimo 10 caracteres).' : '';
        fondo.querySelector('#err-ev-comentario').textContent = err;
        ta.classList.toggle('invalido', !!err);
        if (err) ta.focus();
        return err;
      }
    });
    if (!r) return;
    const res = US.evaluarEvento(yo.id, ev.id, r, datos.comentario, datos.publicar);
    if (!res.ok) US.toast(res.motivo, 'error');
    else US.toast(r === 'rechazada' ? 'Propuesta rechazada. Se notificó al proponente.'
      : datos.publicar ? 'Propuesta aprobada y publicada para los estudiantes.' : 'Propuesta aprobada. Queda pendiente de publicar.');
    refrescar();
  }

  async function publicar(evId) {
    const ev = US.evento(evId);
    const ok = await US.confirmar('Publicar actividad',
      '<p>Se publicará <b>' + esc(ev.titulo) + '</b> para que los estudiantes se inscriban y se creará un aviso general con la convocatoria.</p>' +
      '<dl class="detalle-lista"><dt>Fecha</dt><dd>' + US.fechaEvento(ev) + ' · ' + US.horarioEvento(ev) + '</dd><dt>Cupo</dt><dd>' + ev.cupo + ' estudiantes · ' + ev.horas + ' h</dd></dl>',
      'Publicar');
    if (!ok) return;
    const r = US.publicarEvento(yo.id, ev.id);
    US.toast(r.ok ? 'Actividad publicada.' : r.motivo, r.ok ? 'ok' : 'error');
    refrescar();
  }

  function verPropuesta(evId) {
    const ev = US.evento(evId);
    US.modal({ titulo: ev.titulo, ancho: true, html: US.htmlDetalleEvento(ev, { documento: true, postulacion: true, evaluacion: true }) });
  }

  /* ---------------- Inicio ---------------- */
  function inicio(main) {
    const pendientes = US.eventosEn('pendiente').sort((a, b) => a.fechaPostulacion.localeCompare(b.fechaPostulacion));
    const abiertas = US.convocatoriasAbiertas();
    const horas = US.db.horasSociales.reduce((t, h) => t + h.horas, 0);
    const porRevisar = solicitudesPorRevisar();

    main.innerHTML =
      '<section class="bienvenida"><h1>Hola, ' + esc(US.primerNombre(yo.nombre)) + '</h1><p>' + esc(yo.cargo) + '</p></section>' +
      (US.eventosEn('aprobada').length ? '<div class="alerta alerta-aviso">Tienes ' + US.eventosEn('aprobada').length + ' actividad(es) aprobada(s) sin publicar. <a href="#propuestas/aprobadas">Revisar</a></div>' : '') +
      '<div class="stats">' +
        stat('Propuestas por evaluar', pendientes.length, '<a href="#propuestas">Ir a propuestas</a>') +
        stat('Convocatorias abiertas', abiertas.length, 'Visibles para estudiantes') +
        stat('Solicitudes por revisar', porRevisar, 'Estudiantes en espera') +
        stat('Horas otorgadas', horas, 'Labor social validada') +
      '</div>' +
      '<div class="rejilla-2">' +
        '<section class="tarjeta"><div class="tarjeta-cab"><h2>Propuestas por evaluar</h2><a href="#propuestas">Ver todas</a></div>' +
          (pendientes.length ? '<ul class="lista">' + pendientes.slice(0, 5).map((ev) =>
            '<li class="clase-hoy">' + US.htmlFechaBloque(ev) +
            '<span style="flex:1;min-width:0"><b>' + esc(ev.titulo) + '</b><br><small>' + esc(US.nombreUsuario(ev.proponenteId)) + ' · postulada el ' + US.fecha(ev.fechaPostulacion.slice(0, 10)) + '</small></span>' +
            '<button class="btn btn-pri btn-sm" data-evaluar="' + ev.id + '">Evaluar</button></li>').join('') + '</ul>'
            : '<p class="vacio">No hay propuestas pendientes.</p>') +
        '</section>' +
        '<section class="tarjeta"><div class="tarjeta-cab"><h2>Próximas actividades</h2><a href="#eventos">Gestionar</a></div>' +
          (abiertas.length ? '<ul class="lista">' + abiertas.slice(0, 5).map((ev) => {
            const c = US.contarSolicitudes(ev);
            return '<li><a class="enlace-fila" href="#eventos/' + ev.id + '"><b>' + esc(ev.titulo) + '</b>' +
              '<small>' + US.fechaEvento(ev) + ' · ' + US.ocupados(ev) + ' / ' + ev.cupo + ' inscritos' + (c.pendiente ? ' · <span class="chip chip-aviso">' + c.pendiente + ' por revisar</span>' : '') + '</small></a>' +
              US.htmlBarraCupo(ev) + '</li>';
          }).join('') + '</ul>' : '<p class="vacio">No hay convocatorias abiertas.</p>') +
        '</section>' +
      '</div>';
    main.querySelectorAll('[data-evaluar]').forEach((b) => b.addEventListener('click', () => evaluar(b.dataset.evaluar)));
  }

  /* ---------------- Propuestas (RF-05 / RF-06) ---------------- */
  function propuestas(main, sub) {
    const vistas = {
      pendientes: { txt: 'Pendientes', estados: ['pendiente'] },
      aprobadas: { txt: 'Aprobadas sin publicar', estados: ['aprobada'] },
      rechazadas: { txt: 'Rechazadas', estados: ['rechazada'] },
      todas: { txt: 'Todas', estados: Object.keys(US.ESTADOS_EVENTO) }
    };
    const v = vistas[sub] ? sub : 'pendientes';
    const lista = US.eventosEn(...vistas[v].estados).sort((a, b) =>
      v === 'pendientes' ? a.fechaPostulacion.localeCompare(b.fechaPostulacion) : b.fechaPostulacion.localeCompare(a.fechaPostulacion));

    main.innerHTML =
      '<div class="titulo-seccion"><div><h1>Propuestas de actividades</h1><p>Evalúa las actividades postuladas por profesores y publícalas para los estudiantes.</p></div></div>' +
      '<nav class="pestanas" aria-label="Estado de las propuestas">' +
        Object.entries(vistas).map(([k, x]) => {
          const n = US.eventosEn(...x.estados).length;
          return '<a href="#propuestas/' + k + '" class="' + (k === v ? 'activo' : '') + '"' + (k === v ? ' aria-current="page"' : '') + '>' + x.txt +
            ' <span class="chip' + (k === 'pendientes' && n ? ' chip-aviso' : '') + '">' + n + '</span></a>';
        }).join('') +
      '</nav>' +
      '<section class="tarjeta"><div class="tabla-env"><table>' +
        '<thead><tr><th>Postulada</th><th>Actividad</th><th>Proponente</th><th>Lugar</th><th>Fecha del evento</th><th class="num">Cupo</th><th>Estado</th><th>Acción</th></tr></thead><tbody>' +
        (lista.length ? lista.map((ev) => {
          let accion = '<button class="btn btn-sec btn-sm" data-ver="' + ev.id + '">Ver</button>';
          if (ev.estado === 'pendiente') accion = '<button class="btn btn-pri btn-sm" data-evaluar="' + ev.id + '">Evaluar</button>';
          if (ev.estado === 'aprobada') accion += '<button class="btn btn-pri btn-sm" data-publicar="' + ev.id + '">Publicar</button>';
          if (ev.estado === 'publicada' || ev.estado === 'cerrada') accion += '<a class="btn btn-sec btn-sm" href="#eventos/' + ev.id + '">Gestionar</a>';
          return '<tr><td>' + US.fecha(ev.fechaPostulacion.slice(0, 10)) + '</td>' +
            '<td><b>' + esc(ev.titulo) + '</b><br><small>' + esc(ev.tipo) + ' · ' + ev.horas + ' h</small></td>' +
            '<td>' + esc(US.nombreUsuario(ev.proponenteId)) + '<br><small>' + esc(US.rolDe(ev.proponenteId)) + '</small></td>' +
            '<td>' + esc(ev.lugar) + '</td>' +
            '<td>' + US.fechaEvento(ev) + '<br><small>' + US.horarioEvento(ev) + '</small></td>' +
            '<td class="num">' + ev.cupo + '</td>' +
            '<td>' + US.chipEvento(ev.estado) + '</td>' +
            '<td><div class="acciones-celda">' + accion + '</div></td></tr>';
        }).join('') : '<tr><td colspan="8" class="vacio">' + (v === 'pendientes' ? 'No hay propuestas pendientes de evaluación.' : 'No hay propuestas en esta sección.') + '</td></tr>') +
      '</tbody></table></div></section>';

    main.querySelectorAll('[data-evaluar]').forEach((b) => b.addEventListener('click', () => evaluar(b.dataset.evaluar)));
    main.querySelectorAll('[data-publicar]').forEach((b) => b.addEventListener('click', () => publicar(b.dataset.publicar)));
    main.querySelectorAll('[data-ver]').forEach((b) => b.addEventListener('click', () => verPropuesta(b.dataset.ver)));
  }

  /* ---------------- Eventos sociales: convocatorias y gestión de postulados ---------------- */
  function eventos(main, sub) {
    if (sub && sub !== 'cerradas') {
      const ev = US.evento(sub);
      if (ev && (ev.estado === 'publicada' || ev.estado === 'cerrada')) return gestion(main, ev);
    }
    const v = sub === 'cerradas' ? 'cerradas' : 'publicadas';
    const publicadas = US.eventosEn('publicada').sort((a, b) => a.fecha.localeCompare(b.fecha));
    const cerradas = US.eventosEn('cerrada').sort((a, b) => b.fecha.localeCompare(a.fecha));
    const lista = v === 'cerradas' ? cerradas : publicadas;

    main.innerHTML =
      '<div class="titulo-seccion"><div><h1>Eventos sociales</h1><p>Convocatorias publicadas, estudiantes postulados y cierre de convocatorias.</p></div>' +
      '<a class="btn btn-sec" href="#propuestas">Ver propuestas</a></div>' +
      '<nav class="pestanas" aria-label="Convocatorias">' +
        '<a href="#eventos" class="' + (v === 'publicadas' ? 'activo' : '') + '">Convocatorias abiertas <span class="chip">' + publicadas.length + '</span></a>' +
        '<a href="#eventos/cerradas" class="' + (v === 'cerradas' ? 'activo' : '') + '">Cerradas <span class="chip">' + cerradas.length + '</span></a>' +
      '</nav>' +
      '<section class="tarjeta"><div class="tabla-env"><table>' +
        '<thead><tr><th>Actividad</th><th>Fecha</th><th>Proponente</th><th style="min-width:180px">Inscripción</th><th>Estado</th><th></th></tr></thead><tbody>' +
        (lista.length ? lista.map((ev) => {
          const c = US.contarSolicitudes(ev);
          return '<tr><td><b>' + esc(ev.titulo) + '</b><br><small>' + esc(ev.tipo) + ' · ' + esc(ev.lugar) + '</small></td>' +
            '<td>' + US.fechaEvento(ev) + '<br><small>' + US.horarioEvento(ev) + '</small></td>' +
            '<td>' + esc(US.nombreUsuario(ev.proponenteId)) + '</td>' +
            '<td>' + US.htmlBarraCupo(ev) + '<small class="muted">' + c.aceptado + ' aceptados · ' + c.pendiente + ' pendientes · ' + ev.cupo + ' cupos</small></td>' +
            '<td>' + US.chipEvento(ev.estado) + (ev.estado === 'publicada' && US.eventoPasado(ev) ? '<span class="estado-motivo">Ya se realizó: ciérrala</span>' : '') + '</td>' +
            '<td><a class="btn btn-' + (ev.estado === 'publicada' ? 'pri' : 'sec') + ' btn-sm" href="#eventos/' + ev.id + '">' + (ev.estado === 'publicada' ? 'Gestionar' : 'Ver lista') + '</a></td></tr>';
        }).join('') : '<tr><td colspan="6" class="vacio">' + (v === 'cerradas' ? 'No hay convocatorias cerradas.' : 'No hay convocatorias abiertas. <a href="#propuestas">Revisa las propuestas pendientes</a>.') + '</td></tr>') +
      '</tbody></table></div></section>';
  }

  /* Filtros de la lista de postulados (se conservan al refrescar) */
  const filtroPost = { q: '', estado: '' };

  /** RF-10 / RF-09: gestión de estudiantes postulados de una convocatoria. */
  function gestion(main, ev) {
    const abierta = ev.estado === 'publicada';
    const c = US.contarSolicitudes(ev);
    const sols = US.solicitudes(ev.id);
    const enLista = new Set(sols.map((s) => s.estudianteId));
    const estudiantes = US.db.usuarios.filter((u) => u.rol === 'estudiante').sort((a, b) => a.nombre.localeCompare(b.nombre));

    main.innerHTML =
      '<div class="titulo-seccion"><div><h1>' + esc(ev.titulo) + '</h1><p>' + US.fechaEvento(ev) + ' · ' + US.horarioEvento(ev) + ' · ' + esc(ev.lugar) + '</p></div>' +
      '<a class="btn btn-sec" href="#eventos' + (abierta ? '' : '/cerradas') + '">Volver al listado</a></div>' +
      (abierta ? '' : '<div class="alerta alerta-info">Convocatoria cerrada el ' + US.fechaHora(ev.cerradaEn || ev.fecha + 'T00:00:00') + '. La lista es solo de consulta y no puede reabrirse.</div>') +
      (abierta && US.eventoPasado(ev) ? '<div class="alerta alerta-aviso">La actividad ya se realizó. Cierra la convocatoria para que no se acepten más cambios.</div>' : '') +
      '<div class="stats">' +
        stat('Ocupación', US.ocupados(ev) + '<small> / ' + ev.cupo + '</small>', Math.max(0, US.cuposEvento(ev)) + ' cupos libres') +
        stat('Aceptados', c.aceptado, 'Confirmados para asistir') +
        stat('Pendientes', c.pendiente, abierta ? 'Por revisar' : 'Sin revisar') +
        stat('Rechazados', c.rechazado, 'No ocupan cupo') +
      '</div>' +
      '<div class="rejilla-2">' +
        '<section class="tarjeta"><h2>Detalle de la actividad</h2>' + US.htmlDetalleEvento(ev, { documento: true, postulacion: true, evaluacion: true }) + '</section>' +
        '<section class="tarjeta"><h2>Acciones de la convocatoria</h2>' +
          (abierta
            ? '<div class="campo"><label for="ag-est">Agregar estudiante manualmente</label>' +
                '<select class="input" id="ag-est"><option value="">Selecciona un estudiante…</option>' +
                  estudiantes.map((u) => '<option value="' + u.id + '">' + esc(u.nombre + ' — ' + u.correo) + (enLista.has(u.id) ? ' (ya en la lista)' : '') + '</option>').join('') +
                '</select><div class="ayuda">Queda aceptado directamente; se valida cupo e inscripción duplicada.</div>' +
                '<div class="error-campo" id="err-ag-est"></div>' +
                '<button class="btn btn-sec btn-sm" id="btn-agregar">Agregar estudiante</button></div>' +
              '<div class="acciones-col">' +
                '<button class="btn btn-pri" id="btn-aceptar-todos"' + (c.pendiente ? '' : ' disabled') + '>Aceptar pendientes (' + c.pendiente + ')</button>' +
                '<button class="btn btn-sec" id="btn-csv">Descargar lista (CSV)</button>' +
                '<button class="btn btn-peligro" id="btn-cerrar">Cerrar convocatoria</button>' +
              '</div><p class="ayuda" style="margin-top:.6rem">Al cerrar, las solicitudes pendientes se rechazan y la convocatoria no puede reabrirse.</p>'
            : '<div class="acciones-col"><button class="btn btn-sec" id="btn-csv">Descargar lista (CSV)</button></div>') +
        '</section>' +
      '</div>' +
      '<section class="tarjeta" style="margin-top:1.25rem"><div class="tarjeta-cab"><h2>Estudiantes postulados</h2>' +
        '<div class="eventos-filtros" style="margin:0">' +
          '<input class="input buscador" type="search" id="post-buscar" placeholder="Buscar por nombre, cédula o correo" aria-label="Buscar estudiante" value="' + esc(filtroPost.q) + '">' +
          '<select class="input" id="post-estado" style="width:auto" aria-label="Filtrar por estado"><option value="">Todos los estados</option>' +
            Object.entries(US.ESTADOS_SOLICITUD).map(([k, x]) => '<option value="' + k + '"' + (k === filtroPost.estado ? ' selected' : '') + '>' + x.txt + '</option>').join('') +
          '</select></div></div>' +
        '<div class="tabla-env"><table><thead><tr><th>Estudiante</th><th>Correo</th><th>Solicitud</th><th>Recibo de matrícula</th><th>Estado</th>' + (abierta ? '<th>Acciones</th>' : '') + '</tr></thead>' +
        '<tbody id="post-lista"></tbody></table></div></section>';

    const tbody = main.querySelector('#post-lista');
    const pintar = () => {
      const q = filtroPost.q.trim().toLowerCase();
      const orden = { pendiente: 0, aceptado: 1, rechazado: 2 };
      const filas = US.solicitudes(ev.id)
        .map((s) => ({ s, u: US.usuario(s.estudianteId) })).filter((x) => x.u)
        .filter((x) => (!filtroPost.estado || x.s.estado === filtroPost.estado) &&
          (!q || (x.u.nombre + ' ' + x.u.cedula + ' ' + x.u.correo).toLowerCase().includes(q)))
        .sort((a, b) => orden[a.s.estado] - orden[b.s.estado] || a.s.fecha.localeCompare(b.s.fecha));
      tbody.innerHTML = filas.length ? filas.map(({ s, u }) =>
        '<tr><td><b>' + esc(u.nombre) + '</b><br><small>' + esc(u.cedula) + ' · ' + esc(u.carrera) + '</small></td>' +
        '<td>' + esc(u.correo) + '</td>' +
        '<td>' + US.fechaHora(s.fecha) + (s.origen === 'admin' ? '<br><small class="muted">Agregado por la administración</small>' : '') + '</td>' +
        '<td>' + US.htmlArchivo(s.recibo) + '</td>' +
        '<td>' + US.chipSolicitud(s.estado) + (s.motivo ? '<span class="estado-motivo">' + esc(s.motivo) + '</span>' : '') + '</td>' +
        (abierta ? '<td><div class="acciones-celda">' +
          (s.estado !== 'aceptado' ? '<button class="btn btn-pri btn-sm" data-aceptar="' + s.id + '">Aceptar</button>' : '') +
          (s.estado !== 'rechazado' ? '<button class="btn btn-sec btn-sm" data-rechazar="' + s.id + '">Rechazar</button>' : '') +
          '<button class="btn btn-peligro btn-sm" data-quitar="' + s.id + '">Quitar</button></div></td>' : '') +
        '</tr>').join('')
        : '<tr><td colspan="' + (abierta ? 6 : 5) + '" class="vacio">' + (sols.length ? 'Ningún estudiante coincide con el filtro.' : 'Todavía no hay estudiantes postulados.') + '</td></tr>';
    };
    pintar();
    main.querySelector('#post-buscar').addEventListener('input', (e) => { filtroPost.q = e.target.value; pintar(); });
    main.querySelector('#post-estado').addEventListener('change', (e) => { filtroPost.estado = e.target.value; pintar(); });
    main.querySelector('#btn-csv').addEventListener('click', () => descargarCSV(ev));
    if (!abierta) return;

    tbody.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-aceptar],[data-rechazar],[data-quitar]');
      if (!b) return;
      const id = b.dataset.aceptar || b.dataset.rechazar || b.dataset.quitar;
      const s = US.db.eventoInscripciones.find((x) => x.id === id);
      const nombre = esc(US.nombreUsuario(s.estudianteId));
      let r;
      if (b.dataset.aceptar) {
        r = US.resolverSolicitud(yo.id, id, 'aceptado');
        if (r.ok) US.toast(US.nombreUsuario(s.estudianteId) + ' fue aceptado(a).');
      } else {
        const rechazo = !!b.dataset.rechazar;
        const datos = { motivo: '' };
        const v = await US.modal({
          titulo: rechazo ? 'Rechazar solicitud' : 'Quitar de la lista',
          html: '<p>' + (rechazo ? 'Se rechazará la solicitud de <b>' + nombre + '</b> y se liberará su cupo.'
                                 : 'Se quitará a <b>' + nombre + '</b> de la lista y se liberará su cupo. Podrá volver a inscribirse si hay cupo.') + '</p>' +
            '<div class="campo"><label for="mot">Motivo ' + (rechazo ? '' : '<span class="muted">(opcional)</span>') + '</label>' +
            '<textarea class="input" id="mot" maxlength="300" style="min-height:80px" placeholder="Se enviará al estudiante."></textarea><div class="error-campo" id="err-mot"></div></div>',
          acciones: [{ texto: 'Cancelar', clase: 'btn-sec', valor: null }, { texto: rechazo ? 'Rechazar' : 'Quitar', clase: 'btn-peligro', valor: true }],
          validar: (_, fondo) => {
            datos.motivo = fondo.querySelector('#mot').value.trim();
            const err = rechazo && datos.motivo.length < 5 ? 'Indica el motivo del rechazo.' : '';
            fondo.querySelector('#err-mot').textContent = err;
            return err;
          }
        });
        if (!v) return;
        r = rechazo ? US.resolverSolicitud(yo.id, id, 'rechazado', datos.motivo) : US.quitarSolicitud(yo.id, id, datos.motivo);
        if (r.ok) US.toast(rechazo ? 'Solicitud rechazada. Se notificó al estudiante.' : 'Estudiante retirado de la lista.');
      }
      if (!r.ok) US.toast(r.motivo, 'error');
      refrescar();
    });

    main.querySelector('#btn-agregar').addEventListener('click', () => {
      const sel = main.querySelector('#ag-est');
      const err = main.querySelector('#err-ag-est');
      if (!sel.value) { err.textContent = 'Selecciona un estudiante.'; return; }
      const r = US.inscribirEvento(sel.value, ev.id, null, 'admin');
      if (!r.ok) {
        err.textContent = r.tipo === 'duplicada' ? 'Ese estudiante ya está en la lista de esta actividad.' : r.tipo === 'choque' ? 'El estudiante tiene otra actividad a la misma hora.' : r.motivo;
        sel.classList.add('invalido');
        return;
      }
      US.notificar(yo.id, sel.value, 'Inscripción aceptada: ' + ev.titulo,
        'Hola, ' + US.primerNombre(US.nombreUsuario(sel.value)) + ':\n\nLa Administración de Eventos Sociales te inscribió en "' + ev.titulo + '" (' + US.fechaEvento(ev) + ', ' + US.horarioEvento(ev) + ', ' + ev.lugar + ').\n\nAdministración de Eventos Sociales');
      US.guardar();
      US.toast(US.nombreUsuario(sel.value) + ' fue agregado(a) a la lista.');
      refrescar();
    });

    main.querySelector('#btn-aceptar-todos').addEventListener('click', async () => {
      const pend = US.solicitudes(ev.id).filter((s) => s.estado === 'pendiente');
      if (!(await US.confirmar('Aceptar pendientes', '<p>Se aceptarán <b>' + pend.length + '</b> solicitud(es) pendiente(s) y se notificará a cada estudiante.</p>', 'Aceptar todas'))) return;
      pend.forEach((s) => US.resolverSolicitud(yo.id, s.id, 'aceptado'));
      US.toast(pend.length + ' solicitud(es) aceptada(s).');
      refrescar();
    });

    main.querySelector('#btn-cerrar').addEventListener('click', async () => {
      const cc = US.contarSolicitudes(ev);
      const ok = await US.confirmar('Cerrar convocatoria',
        '<p>Se cerrará la convocatoria de <b>' + esc(ev.titulo) + '</b>. Los estudiantes ya no podrán inscribirse ni cancelar.</p>' +
        (cc.pendiente ? '<div class="alerta alerta-aviso">Hay ' + cc.pendiente + ' solicitud(es) pendiente(s) que se rechazarán automáticamente.</div>' : '') +
        '<div class="alerta alerta-error" style="margin:0">Esta acción no se puede deshacer: una convocatoria cerrada no puede reabrirse.</div>',
        'Cerrar convocatoria', 'btn-peligro');
      if (!ok) return;
      const r = US.cerrarConvocatoria(yo.id, ev.id);
      US.toast(r.ok ? 'Convocatoria cerrada.' : r.motivo, r.ok ? 'ok' : 'error');
      refrescar();
    });
  }

  function descargarCSV(ev) {
    const celda = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const filas = [['Nombre', 'Cédula', 'Correo', 'Carrera', 'Fecha de solicitud', 'Estado', 'Motivo', 'Recibo']].concat(
      US.solicitudes(ev.id).map((s) => {
        const u = US.usuario(s.estudianteId) || {};
        return [u.nombre, u.cedula, u.correo, u.carrera, s.fecha.replace('T', ' '), US.ESTADOS_SOLICITUD[s.estado].txt, s.motivo, s.recibo ? s.recibo.nombre : ''];
      }));
    const csv = '﻿' + filas.map((f) => f.map(celda).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'postulados-' + ev.titulo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ---------------- Mensajes ---------------- */
  function mensajes(main, sub) {
    const destinatarios = US.db.usuarios.filter((u) => u.id !== yo.id && u.rol !== 'administrador')
      .sort((a, b) => a.rol.localeCompare(b.rol) || a.nombre.localeCompare(b.nombre))
      .map((u) => ({ id: u.id, nombre: u.nombre, detalle: US.ROLES[u.rol] + (u.rol === 'estudiante' ? ' · ' + u.cedula : ' · ' + u.departamento) }));
    US.vistaMensajes(main, yo, sub, { grupos: [], destinatarios, puedePublicar: true, general: true });
  }

  US.app({
    usuario: yo,
    inicio: 'inicio',
    rutas: {
      inicio: { titulo: 'Inicio', render: inicio },
      propuestas: { titulo: 'Propuestas', render: propuestas, badge: () => US.eventosEn('pendiente').length, badgeTexto: 'propuestas por evaluar' },
      eventos: { titulo: 'Eventos sociales', render: eventos, badge: solicitudesPorRevisar, badgeTexto: 'solicitudes por revisar' },
      mensajes: { titulo: 'Mensajes y avisos', render: mensajes }
    }
  });
})();
