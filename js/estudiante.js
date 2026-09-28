/* ==========================================================================
   Universidad Social — Panel del estudiante
   Secciones: Inicio · Horario · Calificaciones · Mensajes y avisos · Inscripción
   ========================================================================== */
(function () {
  'use strict';
  const yo = US.requerirRol('estudiante');
  if (!yo) return;
  const esc = US.esc;
  const cfg = () => US.cfg();
  const misGrupos = () => US.gruposDeEstudiante(yo.id, cfg().periodoActual);

  /* ---------------- Inicio ---------------- */
  function inicio(main) {
    const grupos = misGrupos();
    const creditos = US.creditos(grupos);
    const indice = US.indice(yo.id);
    const hoy = US.clasesDeHoy(grupos);
    const avisos = US.avisosVisibles(grupos).slice(0, 3);
    const noLeidos = US.noLeidos(yo.id);

    main.innerHTML =
      '<section class="bienvenida"><h1>Hola, ' + esc(US.primerNombre(yo.nombre)) + '</h1>' +
      '<p>' + esc(yo.carrera) + ' · Cédula ' + esc(yo.cedula) + ' · ' + esc(cfg().periodoActual) + '</p></section>' +
      (cfg().inscripcionAbierta
        ? '<div class="alerta alerta-info">La inscripción de materias está abierta hasta el ' + US.fecha(cfg().cierreInscripcion) + '. <a href="#inscripcion">Ir a inscripción</a></div>'
        : '') +
      '<div class="stats">' +
        stat('Materias inscritas', grupos.length, cfg().periodoActual) +
        stat('Créditos', creditos + '<small> / ' + cfg().maxCreditos + '</small>', 'Máximo permitido: ' + cfg().maxCreditos) +
        stat('Índice académico', indice == null ? '—' : indice.toFixed(2), 'Escala de 0 a 3') +
        stat('Mensajes sin leer', noLeidos, '<a href="#mensajes/entrada">Ver bandeja</a>') +
      '</div>' +
      '<div class="rejilla-2">' +
        '<section class="tarjeta"><div class="tarjeta-cab"><h2>Clases de hoy</h2><a href="#horario">Ver horario</a></div>' +
          (hoy.length
            ? '<ul class="lista">' + hoy.map((s) =>
                '<li class="clase-hoy"><span class="clase-hora">' + s.inicio + '–' + s.fin + '</span>' +
                '<span><b>' + esc(s.g.nombre) + '</b><br><small>' + esc(s.aula) + ' · ' + esc(US.nombreUsuario(s.g.profesorId)) + '</small></span></li>').join('') + '</ul>'
            : '<p class="vacio">No tienes clases programadas para hoy.</p>') +
        '</section>' +
        '<section class="tarjeta"><div class="tarjeta-cab"><h2>Últimos avisos</h2><a href="#mensajes/avisos">Ver todos</a></div>' +
          (avisos.length ? '<ul class="lista">' + avisos.map((a) => US.htmlAviso(a)).join('') + '</ul>' : '<p class="vacio">Sin avisos.</p>') +
        '</section>' +
      '</div>';
  }
  function stat(lbl, val, sub) {
    return '<div class="stat"><div class="stat-lbl">' + lbl + '</div><div class="stat-val">' + val + '</div><div class="stat-sub">' + sub + '</div></div>';
  }

  /* ---------------- Horario ---------------- */
  function horario(main) {
    const grupos = misGrupos();
    main.innerHTML =
      '<div class="titulo-seccion"><div><h1>Mi horario</h1><p>' + esc(cfg().periodoActual) + ' · ' + grupos.length + ' materias · ' + US.creditos(grupos) + ' créditos</p></div>' +
      '<button class="btn btn-sec no-imprimir" id="btn-imprimir">Imprimir horario</button></div>' +
      '<section class="tarjeta">' + US.renderHorario(grupos) + '</section>' +
      '<section class="tarjeta"><h2>Detalle de materias</h2><div class="tabla-env"><table>' +
        '<thead><tr><th>Código</th><th>Materia</th><th>Grupo</th><th>Profesor(a)</th><th class="num">Créditos</th><th>Horario</th><th>Aula</th></tr></thead><tbody>' +
        (grupos.length ? grupos.map((g) =>
          '<tr><td class="codigo">' + esc(g.codigo) + '</td><td>' + esc(g.nombre) + '</td><td>' + esc(g.grupo) + '</td>' +
          '<td>' + esc(US.nombreUsuario(g.profesorId)) + '</td><td class="num">' + g.creditos + '</td>' +
          '<td>' + esc(US.horarioTexto(g)) + '</td><td>' + esc([...new Set(g.sesiones.map((s) => s.aula))].join(', ')) + '</td></tr>').join('')
          : '<tr><td colspan="7" class="vacio">Aún no tienes materias inscritas. <a href="#inscripcion">Inscribir materias</a></td></tr>') +
      '</tbody></table></div></section>';
    main.querySelector('#btn-imprimir').addEventListener('click', () => window.print());
  }

  /* ---------------- Calificaciones ---------------- */
  function calificaciones(main, sub) {
    const periodo = sub === 'anterior' ? cfg().periodoAnterior : cfg().periodoActual;
    const grupos = US.gruposDeEstudiante(yo.id, periodo);
    const pond = US.db.ponderacion;
    const pct = (k) => Math.round(pond[k] * 100) + '%';

    const filas = grupos.map((g) => {
      const n = US.notas(yo.id, g.id);
      const f = US.notaFinal(n);
      return { g, n, f, letra: f.completo ? US.letra(f.valor) : '—' };
    });
    const cerradas = filas.filter((x) => x.f.completo);
    const credAprob = cerradas.filter((x) => x.letra !== 'F').reduce((t, x) => t + x.g.creditos, 0);
    const conNota = filas.filter((x) => x.f.valor != null);
    const credNota = conNota.reduce((t, x) => t + x.g.creditos, 0);
    const promedio = credNota ? conNota.reduce((t, x) => t + x.f.valor * x.g.creditos, 0) / credNota : null;
    const indP = US.indice(yo.id, periodo);
    const indA = US.indice(yo.id);

    const estado = (x) => !x.f.completo ? '<span class="chip chip-info">En curso</span>'
      : x.letra === 'F' ? '<span class="chip chip-mal">Reprobada</span>' : '<span class="chip chip-ok">Aprobada</span>';
    const celda = (v) => '<td class="num">' + (v == null ? '<span class="muted">—</span>' : v) + '</td>';

    main.innerHTML =
      '<div class="titulo-seccion"><div><h1>Calificaciones</h1><p>Consulta tus notas por evaluación, nota final e índice académico.</p></div></div>' +
      '<nav class="pestanas" aria-label="Periodo">' +
        '<a href="#calificaciones" class="' + (sub !== 'anterior' ? 'activo' : '') + '">' + esc(cfg().periodoActual) + ' (en curso)</a>' +
        '<a href="#calificaciones/anterior" class="' + (sub === 'anterior' ? 'activo' : '') + '">' + esc(cfg().periodoAnterior) + '</a>' +
      '</nav>' +
      '<div class="stats">' +
        stat(sub === 'anterior' ? 'Promedio del periodo' : 'Promedio parcial', promedio == null ? '—' : promedio.toFixed(1), 'Ponderado por créditos') +
        stat('Índice del periodo', indP == null ? '—' : indP.toFixed(2), indP == null ? 'Se calcula al cerrar el periodo' : 'Escala de 0 a 3') +
        stat('Índice acumulado', indA == null ? '—' : indA.toFixed(2), 'Todas las materias cerradas') +
        stat('Créditos aprobados', credAprob, 'En este periodo') +
      '</div>' +
      '<section class="tarjeta"><div class="tabla-env"><table>' +
        '<thead><tr><th>Código</th><th>Materia</th><th class="num">Cr.</th>' +
        '<th class="num">Parcial 1<br><small>' + pct('p1') + '</small></th><th class="num">Parcial 2<br><small>' + pct('p2') + '</small></th>' +
        '<th class="num">Proyecto<br><small>' + pct('proyecto') + '</small></th><th class="num">Semestral<br><small>' + pct('semestral') + '</small></th>' +
        '<th class="num">Nota</th><th class="num">Letra</th><th>Estado</th><th></th></tr></thead><tbody>' +
        (filas.length ? filas.map((x) =>
          '<tr><td class="codigo">' + esc(x.g.codigo) + '</td><td>' + esc(x.g.nombre) + '<br><small>' + esc(US.nombreUsuario(x.g.profesorId)) + '</small></td>' +
          '<td class="num">' + x.g.creditos + '</td>' + celda(x.n.p1) + celda(x.n.p2) + celda(x.n.proyecto) + celda(x.n.semestral) +
          '<td class="num"><b>' + (x.f.valor == null ? '—' : x.f.valor) + '</b>' + (x.f.valor != null && !x.f.completo ? '<br><small>parcial</small>' : '') + '</td>' +
          '<td class="num"><span class="letra letra-' + x.letra + '">' + x.letra + '</span></td>' +
          '<td>' + estado(x) + '</td><td><button class="btn btn-sec btn-sm" data-ver="' + x.g.id + '">Ver</button></td></tr>').join('')
          : '<tr><td colspan="11" class="vacio">No hay materias en este periodo.</td></tr>') +
      '</tbody></table></div>' +
      '<p class="muted" style="margin:.9rem 0 0;font-size:.82rem">Escala: A (91–100) = 3 pts · B (81–90) = 2 · C (71–80) = 1 · D (61–70) = 0 · F (0–60) = 0. ' +
      'Mientras la materia está en curso, la nota mostrada es el promedio de las evaluaciones ya registradas.</p></section>';

    main.querySelectorAll('[data-ver]').forEach((b) => b.addEventListener('click', () => {
      const x = filas.find((f) => f.g.id === b.dataset.ver);
      const html = '<p><b>' + esc(x.g.codigo + ' · ' + x.g.nombre) + '</b><br><small>' + esc(US.nombreUsuario(x.g.profesorId)) + ' · Grupo ' + esc(x.g.grupo) + '</small></p>' +
        '<div class="tabla-env"><table><thead><tr><th>Evaluación</th><th class="num">Peso</th><th class="num">Nota</th><th class="num">Aporte</th></tr></thead><tbody>' +
        US.EVALUACIONES.map((e) => {
          const v = x.n[e.k];
          return '<tr><td>' + e.nombre + '</td><td class="num">' + pct(e.k) + '</td><td class="num">' + (v == null ? '—' : v) + '</td>' +
            '<td class="num">' + (v == null ? '—' : (v * pond[e.k]).toFixed(1)) + '</td></tr>';
        }).join('') +
        '</tbody></table></div><p style="margin-top:1rem">Nota ' + (x.f.completo ? 'final' : 'parcial') + ': <b>' + (x.f.valor ?? '—') + '</b> ' +
        (x.f.completo ? '<span class="letra letra-' + x.letra + '">' + x.letra + '</span>' : '<span class="chip chip-info">En curso</span>') + '</p>';
      US.modal({ titulo: 'Detalle de calificación', html });
    }));
  }

  /* ---------------- Inscripción ---------------- */
  let busqueda = '';
  function inscripcion(main) {
    const c = cfg();
    const grupos = misGrupos();
    const creditos = US.creditos(grupos);
    const oferta = US.gruposDePeriodo(c.periodoActual);
    const pctCred = Math.min(100, (creditos / c.maxCreditos) * 100);

    main.innerHTML =
      '<div class="titulo-seccion"><div><h1>Inscripción de materias</h1><p>' + esc(c.periodoActual) + '</p></div>' +
      (c.inscripcionAbierta
        ? '<span class="chip chip-ok">Abierta hasta el ' + US.fecha(c.cierreInscripcion) + '</span>'
        : '<span class="chip chip-mal">Periodo cerrado</span>') + '</div>' +
      '<section class="tarjeta"><div class="tarjeta-cab"><h2>Materias inscritas</h2>' +
        '<span><b>' + creditos + '</b> de ' + c.maxCreditos + ' créditos</span></div>' +
        '<div class="barra" role="progressbar" aria-valuemin="0" aria-valuemax="' + c.maxCreditos + '" aria-valuenow="' + creditos + '" aria-label="Créditos inscritos"><i style="width:' + pctCred + '%"></i></div>' +
        '<div class="tabla-env" style="margin-top:1rem"><table><thead><tr><th>Código</th><th>Materia</th><th class="num">Cr.</th><th>Horario</th><th>Profesor(a)</th><th></th></tr></thead><tbody>' +
        (grupos.length ? grupos.map((g) =>
          '<tr><td class="codigo">' + esc(g.codigo) + '</td><td>' + esc(g.nombre) + '<br><small>Grupo ' + esc(g.grupo) + '</small></td><td class="num">' + g.creditos + '</td>' +
          '<td>' + esc(US.horarioTexto(g)) + '</td><td>' + esc(US.nombreUsuario(g.profesorId)) + '</td>' +
          '<td>' + (c.inscripcionAbierta ? '<button class="btn btn-peligro btn-sm" data-retirar="' + g.id + '">Retirar</button>' : '') + '</td></tr>').join('')
          : '<tr><td colspan="6" class="vacio">Todavía no has inscrito materias.</td></tr>') +
        '</tbody></table></div></section>' +
      '<section class="tarjeta"><div class="tarjeta-cab"><h2>Oferta académica</h2>' +
        '<input class="input buscador" type="search" id="buscar" placeholder="Buscar por código, materia o profesor" aria-label="Buscar materias" value="' + esc(busqueda) + '"></div>' +
        '<div class="tabla-env"><table><thead><tr><th>Código</th><th>Materia</th><th class="num">Cr.</th><th>Profesor(a)</th><th>Horario</th><th class="num">Cupos</th><th>Acción</th></tr></thead>' +
        '<tbody id="oferta"></tbody></table></div></section>';

    const tbody = main.querySelector('#oferta');
    const pintarOferta = () => {
      const q = busqueda.trim().toLowerCase();
      const lista = oferta.filter((g) => !q || (g.codigo + ' ' + g.nombre + ' ' + US.nombreUsuario(g.profesorId)).toLowerCase().includes(q));
      tbody.innerHTML = lista.length ? lista.map((g) => {
        const v = US.validarInscripcion(yo.id, g.id);
        const libres = US.cuposDisponibles(g);
        let accion;
        if (v.ok) accion = '<button class="btn btn-pri btn-sm" data-inscribir="' + g.id + '">Inscribir</button>';
        else if (v.tipo === 'inscrita') accion = '<span class="chip chip-ok">Inscrita</span>';
        else if (v.tipo === 'llena') accion = '<span class="chip chip-mal">Sin cupo</span>';
        else accion = '<button class="btn btn-suave btn-sm" disabled>Inscribir</button><span class="motivo">' + esc(v.motivo) + '</span>';
        return '<tr><td class="codigo">' + esc(g.codigo) + '</td><td>' + esc(g.nombre) + '<br><small>Grupo ' + esc(g.grupo) + '</small></td><td class="num">' + g.creditos + '</td>' +
          '<td>' + esc(US.nombreUsuario(g.profesorId)) + '</td><td>' + esc(US.horarioTexto(g)) + '</td>' +
          '<td class="num">' + Math.max(0, libres) + ' / ' + g.cupo + '</td><td>' + accion + '</td></tr>';
      }).join('') : '<tr><td colspan="7" class="vacio">No se encontraron materias con ese criterio.</td></tr>';
    };
    pintarOferta();

    main.querySelector('#buscar').addEventListener('input', (e) => { busqueda = e.target.value; pintarOferta(); });

    tbody.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-inscribir]');
      if (!b) return;
      const g = US.grupo(b.dataset.inscribir);
      const ok = await US.confirmar('Confirmar inscripción',
        '<dl class="detalle-lista"><dt>Materia</dt><dd>' + esc(g.codigo + ' · ' + g.nombre) + '</dd>' +
        '<dt>Grupo</dt><dd>' + esc(g.grupo) + '</dd><dt>Profesor(a)</dt><dd>' + esc(US.nombreUsuario(g.profesorId)) + '</dd>' +
        '<dt>Horario</dt><dd>' + esc(US.horarioTexto(g)) + '</dd><dt>Créditos</dt><dd>' + g.creditos + ' (total: ' + (creditos + g.creditos) + ' de ' + c.maxCreditos + ')</dd></dl>' +
        '<p style="margin-top:1rem" class="muted">La materia se agregará a tu horario. Puedes retirarla mientras el periodo de inscripción esté abierto.</p>',
        'Confirmar inscripción');
      if (!ok) return;
      const r = US.inscribir(yo.id, g.id);
      if (r.ok) US.toast('Inscribiste ' + g.nombre + '.');
      else US.toast(r.motivo, 'error');
      inscripcion(main);
    });

    main.querySelectorAll('[data-retirar]').forEach((b) => b.addEventListener('click', async () => {
      const g = US.grupo(b.dataset.retirar);
      const tieneNotas = Object.values(US.notas(yo.id, g.id)).some((v) => v != null);
      const ok = await US.confirmar('Retirar materia',
        '<p>¿Seguro que deseas retirar <b>' + esc(g.codigo + ' · ' + g.nombre) + '</b>?</p>' +
        (tieneNotas ? '<div class="alerta alerta-aviso">Esta materia ya tiene calificaciones registradas; se perderán al retirarla.</div>' : ''),
        'Retirar materia', 'btn-peligro');
      if (!ok) return;
      US.retirar(yo.id, g.id);
      US.toast('Retiraste ' + g.nombre + '.');
      inscripcion(main);
    }));
  }

  /* ---------------- Mensajes ---------------- */
  function mensajes(main, sub) {
    const grupos = misGrupos();
    const profes = {};
    grupos.forEach((g) => { (profes[g.profesorId] = profes[g.profesorId] || []).push(g.nombre); });
    const destinatarios = Object.entries(profes).map(([id, mats]) => ({ id, nombre: US.nombreUsuario(id), detalle: mats.join(', ') }));
    US.vistaMensajes(main, yo, sub, { grupos, destinatarios, puedePublicar: false });
  }

  US.app({
    usuario: yo,
    inicio: 'inicio',
    rutas: {
      inicio: { titulo: 'Inicio', render: inicio },
      horario: { titulo: 'Horario', render: horario },
      calificaciones: { titulo: 'Calificaciones', render: calificaciones },
      mensajes: { titulo: 'Mensajes y avisos', render: mensajes },
      inscripcion: { titulo: 'Inscripción', render: inscripcion }
    }
  });
})();
