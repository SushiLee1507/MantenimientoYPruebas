/* ==========================================================================
   Universidad Social — Panel del profesor
   Secciones: Inicio · Horario · Calificaciones · Mensajes y avisos · Eventos sociales
   ========================================================================== */
(function () {
  'use strict';
  const yo = US.requerirRol('profesor');
  if (!yo) return;
  const esc = US.esc;
  const cfg = () => US.cfg();
  const misGrupos = () => US.gruposDeProfesor(yo.id, cfg().periodoActual);

  function stat(lbl, val, sub) {
    return '<div class="stat"><div class="stat-lbl">' + lbl + '</div><div class="stat-val">' + val + '</div><div class="stat-sub">' + sub + '</div></div>';
  }

  /** Estado de las propuestas de labor social en el inicio. */
  function alertaEventos() {
    const mias = US.eventosDe(yo.id);
    const pend = mias.filter((e) => e.estado === 'pendiente').length;
    const pub = mias.filter((e) => e.estado === 'publicada').length;
    if (!mias.length) return '<div class="alerta alerta-info">¿Tienes una actividad de labor social en mente? <a href="#eventos/postular">Postúlala aquí</a>.</div>';
    return '<div class="alerta alerta-info">Eventos sociales: <b>' + pend + '</b> propuesta' + (pend === 1 ? '' : 's') + ' en evaluación y <b>' + pub + '</b> publicada' + (pub === 1 ? '' : 's') + '. <a href="#eventos">Ver mis propuestas</a></div>';
  }

  /* ---------------- Inicio ---------------- */
  function inicio(main) {
    const grupos = misGrupos();
    const totalEst = grupos.reduce((t, g) => t + US.inscritosEn(g.id).length, 0);
    const hoy = US.clasesDeHoy(grupos);
    const misAvisos = US.db.avisos.filter((a) => a.autorId === yo.id).length;

    main.innerHTML =
      '<section class="bienvenida"><h1>Hola, Prof. ' + esc(US.primerNombre(yo.nombre)) + '</h1>' +
      '<p>Departamento de ' + esc(yo.departamento) + ' · ' + esc(cfg().periodoActual) + '</p></section>' +
      alertaEventos() +
      '<div class="stats">' +
        stat('Grupos a cargo', grupos.length, cfg().periodoActual) +
        stat('Estudiantes', totalEst, 'Inscritos en tus grupos') +
        stat('Mensajes sin leer', US.noLeidos(yo.id), '<a href="#mensajes/entrada">Ver bandeja</a>') +
        stat('Avisos publicados', misAvisos, '<a href="#mensajes/avisos">Publicar aviso</a>') +
      '</div>' +
      '<div class="rejilla-2">' +
        '<section class="tarjeta"><div class="tarjeta-cab"><h2>Mis grupos</h2><a href="#horario">Ver horario</a></div>' +
          '<div class="tabla-env"><table><thead><tr><th>Materia</th><th>Grupo</th><th class="num">Inscritos</th><th></th></tr></thead><tbody>' +
          (grupos.length ? grupos.map((g) =>
            '<tr><td><span class="codigo">' + esc(g.codigo) + '</span><br>' + esc(g.nombre) + '</td><td>' + esc(g.grupo) + '</td>' +
            '<td class="num">' + US.inscritosEn(g.id).length + ' / ' + g.cupo + '</td>' +
            '<td><a class="btn btn-sec btn-sm" href="#calificaciones/' + g.id + '">Calificaciones</a></td></tr>').join('')
            : '<tr><td colspan="4" class="vacio">No tienes grupos asignados.</td></tr>') +
          '</tbody></table></div></section>' +
        '<section class="tarjeta"><div class="tarjeta-cab"><h2>Clases de hoy</h2></div>' +
          (hoy.length
            ? '<ul class="lista">' + hoy.map((s) =>
                '<li class="clase-hoy"><span class="clase-hora">' + s.inicio + '–' + s.fin + '</span>' +
                '<span><b>' + esc(s.g.nombre) + '</b><br><small>' + esc(s.aula) + ' · Grupo ' + esc(s.g.grupo) + '</small></span></li>').join('') + '</ul>'
            : '<p class="vacio">No tienes clases programadas para hoy.</p>') +
        '</section>' +
      '</div>';
  }

  /* ---------------- Horario ---------------- */
  function horario(main) {
    const grupos = misGrupos();
    main.innerHTML =
      '<div class="titulo-seccion"><div><h1>Horario de clases</h1><p>' + esc(cfg().periodoActual) + ' · ' + grupos.length + ' grupos</p></div>' +
      '<button class="btn btn-sec no-imprimir" id="btn-imprimir">Imprimir horario</button></div>' +
      '<section class="tarjeta">' + US.renderHorario(grupos, { detalle: (g) => 'Grupo ' + g.grupo + ' · ' + US.inscritosEn(g.id).length + ' est.' }) + '</section>' +
      '<section class="tarjeta"><h2>Detalle de grupos</h2><div class="tabla-env"><table>' +
        '<thead><tr><th>Código</th><th>Materia</th><th>Grupo</th><th class="num">Inscritos</th><th class="num">Créditos</th><th>Horario</th><th>Aula</th></tr></thead><tbody>' +
        (grupos.length ? grupos.map((g) =>
          '<tr><td class="codigo">' + esc(g.codigo) + '</td><td>' + esc(g.nombre) + '</td><td>' + esc(g.grupo) + '</td>' +
          '<td class="num">' + US.inscritosEn(g.id).length + ' / ' + g.cupo + '</td><td class="num">' + g.creditos + '</td>' +
          '<td>' + esc(US.horarioTexto(g)) + '</td><td>' + esc([...new Set(g.sesiones.map((s) => s.aula))].join(', ')) + '</td></tr>').join('')
          : '<tr><td colspan="7" class="vacio">No tienes grupos asignados.</td></tr>') +
      '</tbody></table></div></section>';
    main.querySelector('#btn-imprimir').addEventListener('click', () => window.print());
  }

  /* ---------------- Calificaciones ---------------- */
  function calificaciones(main, sub) {
    const actuales = misGrupos();
    const anteriores = US.gruposDeProfesor(yo.id, cfg().periodoAnterior);
    const todos = actuales.concat(anteriores);
    if (!todos.length) {
      main.innerHTML = '<h1>Calificaciones</h1><div class="tarjeta"><p class="vacio">No tienes grupos asignados.</p></div>';
      return;
    }
    const g = todos.find((x) => x.id === sub) || todos[0];
    const editable = g.periodo === cfg().periodoActual;
    const estudiantes = US.inscritosEn(g.id).sort((a, b) => a.nombre.localeCompare(b.nombre));
    const pond = US.db.ponderacion;

    const opcion = (x) => '<option value="' + x.id + '"' + (x.id === g.id ? ' selected' : '') + '>' + esc(x.codigo + ' · ' + x.nombre + ' (' + x.grupo + ')') + '</option>';

    main.innerHTML =
      '<div class="titulo-seccion"><div><h1>Calificaciones</h1><p>Registra y consulta las notas de tus estudiantes.</p></div>' +
      '<select class="input" id="sel-grupo" style="width:auto;max-width:100%" aria-label="Seleccionar grupo">' +
        '<optgroup label="' + esc(cfg().periodoActual) + '">' + actuales.map(opcion).join('') + '</optgroup>' +
        (anteriores.length ? '<optgroup label="' + esc(cfg().periodoAnterior) + ' (cerrado)">' + anteriores.map(opcion).join('') + '</optgroup>' : '') +
      '</select></div>' +
      '<div class="stats" id="stats-grupo"></div>' +
      (editable ? '' : '<div class="alerta alerta-info">Este periodo está cerrado: las calificaciones son solo de consulta.</div>') +
      '<section class="tarjeta"><div class="tarjeta-cab"><h2>' + esc(g.codigo + ' · ' + g.nombre) + ' <small class="muted">Grupo ' + esc(g.grupo) + '</small></h2>' +
        '<small class="muted">Notas de 0 a 100 · deja vacío lo que aún no se evalúa</small></div>' +
        '<form id="form-notas" novalidate><div class="tabla-env"><table><thead><tr><th>Estudiante</th>' +
        US.EVALUACIONES.map((e) => '<th class="num">' + e.nombre + '<br><small>' + Math.round(pond[e.k] * 100) + '%</small></th>').join('') +
        '<th class="num">Nota</th><th class="num">Letra</th></tr></thead><tbody>' +
        (estudiantes.length ? estudiantes.map((est) => {
          const n = US.notas(est.id, g.id);
          return '<tr data-est="' + est.id + '"><td><b>' + esc(est.nombre) + '</b><br><small>' + esc(est.cedula) + '</small></td>' +
            US.EVALUACIONES.map((e) => '<td class="num"><input class="input input-nota" type="number" min="0" max="100" step="1" inputmode="numeric" ' +
              'data-k="' + e.k + '" value="' + (n[e.k] ?? '') + '" aria-label="' + esc(e.nombre + ' de ' + est.nombre) + '"' + (editable ? '' : ' disabled') + '></td>').join('') +
            '<td class="num"><b data-final></b></td><td class="num" data-letra></td></tr>';
        }).join('') : '<tr><td colspan="7" class="vacio">No hay estudiantes inscritos en este grupo.</td></tr>') +
        '</tbody></table></div>' +
        (editable && estudiantes.length
          ? '<div class="acciones-pie"><span id="estado-cambios" class="muted" style="margin-right:auto;align-self:center"></span>' +
            '<button type="button" class="btn btn-sec" id="btn-descartar">Descartar cambios</button>' +
            '<button type="submit" class="btn btn-pri">Guardar calificaciones</button></div>'
          : '') +
      '</form></section>';

    const form = main.querySelector('#form-notas');
    const estadoCambios = main.querySelector('#estado-cambios');
    let sucio = false;

    const leerFila = (tr) => {
      const n = {};
      tr.querySelectorAll('[data-k]').forEach((i) => { n[i.dataset.k] = i.value === '' ? null : Number(i.value); });
      return n;
    };
    const valida = (i) => i.value === '' || (/^\d{1,3}(\.\d+)?$/.test(i.value) && Number(i.value) >= 0 && Number(i.value) <= 100);

    const recalcular = () => {
      let suma = 0, cuenta = 0, aprob = 0, reprob = 0, pend = 0;
      form.querySelectorAll('tr[data-est]').forEach((tr) => {
        const f = US.notaFinal(leerFila(tr));
        const l = f.completo ? US.letra(f.valor) : '—';
        tr.querySelector('[data-final]').textContent = f.valor == null ? '—' : f.valor;
        tr.querySelector('[data-letra]').innerHTML = '<span class="letra letra-' + l + '">' + l + '</span>';
        if (f.valor != null) { suma += f.valor; cuenta++; }
        if (!f.completo) pend++; else if (l === 'F') reprob++; else aprob++;
      });
      main.querySelector('#stats-grupo').innerHTML =
        stat('Estudiantes', estudiantes.length, 'Cupo: ' + g.cupo) +
        stat('Promedio del grupo', cuenta ? (suma / cuenta).toFixed(1) : '—', editable ? 'Con las notas registradas' : 'Nota final') +
        stat('Aprobados / reprobados', aprob + ' / ' + reprob, 'Con nota final completa') +
        stat('En curso', pend, 'Evaluaciones pendientes');
    };
    recalcular();

    main.querySelector('#sel-grupo').addEventListener('change', async (e) => {
      if (sucio && !(await US.confirmar('Cambios sin guardar', '<p>Tienes calificaciones sin guardar. ¿Deseas salir sin guardarlas?</p>', 'Salir sin guardar', 'btn-peligro'))) {
        e.target.value = g.id;
        return;
      }
      location.hash = 'calificaciones/' + e.target.value;
    });

    if (!editable || !estudiantes.length) return;

    form.addEventListener('input', (e) => {
      if (!e.target.matches('[data-k]')) return;
      e.target.classList.toggle('invalido', !valida(e.target));
      sucio = true;
      estadoCambios.textContent = 'Hay cambios sin guardar.';
      recalcular();
    });

    main.querySelector('#btn-descartar').addEventListener('click', () => calificaciones(main, g.id));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const invalidos = [...form.querySelectorAll('[data-k]')].filter((i) => !valida(i));
      invalidos.forEach((i) => i.classList.add('invalido'));
      if (invalidos.length) {
        US.toast('Revisa las notas marcadas: deben estar entre 0 y 100.', 'error');
        invalidos[0].focus();
        return;
      }
      form.querySelectorAll('tr[data-est]').forEach((tr) => US.guardarNotas(tr.dataset.est, g.id, leerFila(tr)));
      US.guardar();
      sucio = false;
      estadoCambios.textContent = 'Guardado: ' + US.fechaHora(US.ahora());
      US.toast('Calificaciones guardadas.');
    });
  }

  /* ---------------- Mensajes ---------------- */
  function mensajes(main, sub) {
    const grupos = misGrupos();
    const est = {};
    grupos.forEach((g) => US.inscritosEn(g.id).forEach((e) => { (est[e.id] = est[e.id] || []).push(g.codigo); }));
    const destinatarios = Object.entries(est)
      .map(([id, cods]) => ({ id, nombre: US.nombreUsuario(id), detalle: 'Estudiante · ' + cods.join(', ') }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .concat(US.db.usuarios.filter((u) => u.rol === 'profesor' && u.id !== yo.id)
        .map((u) => ({ id: u.id, nombre: u.nombre, detalle: 'Profesor(a) · ' + u.departamento })))
      .concat(US.db.usuarios.filter((u) => u.rol === 'administrador').map((u) => ({ id: u.id, nombre: u.nombre, detalle: 'Administración de eventos sociales' })));
    US.vistaMensajes(main, yo, sub, { grupos, destinatarios, puedePublicar: true });
  }

  US.app({
    usuario: yo,
    inicio: 'inicio',
    rutas: {
      inicio: { titulo: 'Inicio', render: inicio },
      horario: { titulo: 'Horario', render: horario },
      calificaciones: { titulo: 'Calificaciones', render: calificaciones },
      mensajes: { titulo: 'Mensajes y avisos', render: mensajes },
      eventos: { titulo: 'Eventos sociales', render: (main, sub) => US.vistaEventosProponente(main, yo, sub) }
    }
  });
})();
