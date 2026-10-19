/* ==========================================================================
   Universidad Social — Gestión de mensajes y avisos (compartido)
   ========================================================================== */
(function () {
  'use strict';
  const esc = US.esc;
  let borrador = null; // datos para "Responder"

  /**
   * @param {HTMLElement} main
   * @param {Object} usuario
   * @param {string} sub  subvista
   * @param {Object} op   { grupos: grupos visibles para avisos,
   *                        destinatarios: [{ id, nombre, detalle }],
   *                        puedePublicar: boolean,
   *                        general: boolean  → puede publicar avisos para toda la universidad }
   */
  US.vistaMensajes = (main, usuario, sub, op) => {
    const vista = ['avisos', 'entrada', 'enviados', 'nuevo'].includes(sub) ? sub : 'avisos';
    const noLeidos = US.noLeidos(usuario.id);

    main.innerHTML =
      '<div class="titulo-seccion"><div><h1>Mensajes y avisos</h1><p>Comunicación entre estudiantes y profesores.</p></div>' +
      '<a class="btn btn-pri" href="#mensajes/nuevo">+ Nuevo mensaje</a></div>' +
      '<nav class="pestanas" aria-label="Secciones de mensajes">' +
        tab('avisos', 'Avisos', vista) +
        tab('entrada', 'Bandeja de entrada' + (noLeidos ? ' <span class="badge">' + noLeidos + '</span>' : ''), vista) +
        tab('enviados', 'Enviados', vista) +
        tab('nuevo', 'Redactar', vista) +
      '</nav><div id="msj-contenido"></div>';

    const cont = main.querySelector('#msj-contenido');
    if (vista === 'avisos') avisos(cont, usuario, op);
    if (vista === 'entrada') bandeja(cont, usuario, 'entrada');
    if (vista === 'enviados') bandeja(cont, usuario, 'enviados');
    if (vista === 'nuevo') redactar(cont, usuario, op);
  };

  function tab(k, txt, activa) {
    return '<a href="#mensajes/' + k + '" class="' + (k === activa ? 'activo' : '') + '"' + (k === activa ? ' aria-current="page"' : '') + '>' + txt + '</a>';
  }

  /** Avisos visibles para el usuario: generales + de sus grupos. */
  US.avisosVisibles = (grupos) => {
    const ids = new Set(grupos.map((g) => g.id));
    return US.db.avisos.filter((a) => a.grupoId === null || ids.has(a.grupoId)).sort((a, b) => b.fecha.localeCompare(a.fecha));
  };

  US.htmlAviso = (a, usuario) => {
    const g = a.grupoId ? US.grupo(a.grupoId) : null;
    const propio = usuario && a.autorId === usuario.id;
    return '<li class="aviso-item' + (a.importante ? ' aviso-importante' : '') + '">' +
      '<div class="aviso-meta">' +
        (a.importante ? '<span class="chip chip-aviso">Importante</span>' : '') +
        (g ? '<span class="chip chip-ok">' + esc(g.codigo + ' · ' + g.nombre) + '</span>' : '<span class="chip chip-info">General</span>') +
        '<span>' + esc(US.nombreUsuario(a.autorId)) + ' · ' + US.fechaHora(a.fecha) + '</span>' +
      '</div>' +
      '<h3>' + esc(a.titulo) + '</h3><p>' + esc(a.cuerpo) + '</p>' +
      (propio ? '<button class="btn btn-peligro btn-sm" style="margin-top:.6rem" data-borrar-aviso="' + a.id + '">Eliminar aviso</button>' : '') +
    '</li>';
  };

  /* ---------------- Avisos ---------------- */
  function avisos(cont, usuario, op) {
    const grupos = op.grupos;
    let filtro = 'todos';

    let html = '';
    if (op.puedePublicar) {
      const hayDestino = grupos.length || op.general;
      html += '<div class="tarjeta"><h2>Publicar aviso</h2>' +
        (hayDestino ? '' : '<p class="muted">No tienes grupos asignados en el periodo actual.</p>') +
        '<form id="form-aviso" novalidate' + (hayDestino ? '' : ' hidden') + '>' +
          '<div class="fila-2">' +
            '<div class="campo"><label for="av-grupo">Dirigido a</label><select class="input" id="av-grupo">' +
              (op.general ? '<option value="">General · toda la universidad</option>' : '') +
              grupos.map((g) => '<option value="' + g.id + '">' + esc(g.codigo + ' · ' + g.nombre + ' (' + g.grupo + ')') + '</option>').join('') +
            '</select></div>' +
            '<div class="campo"><label for="av-titulo">Título</label><input class="input" id="av-titulo" maxlength="100" placeholder="Ej.: Cambio de fecha del parcial"><div class="error-campo" id="err-av-titulo"></div></div>' +
          '</div>' +
          '<div class="campo"><label for="av-cuerpo">Contenido</label><textarea class="input" id="av-cuerpo" maxlength="1000" placeholder="' + (op.general ? 'Escribe el aviso para la comunidad universitaria…' : 'Escribe el aviso para tus estudiantes…') + '"></textarea><div class="error-campo" id="err-av-cuerpo"></div></div>' +
          '<div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap">' +
            '<label class="check"><input type="checkbox" id="av-importante"> Marcar como importante</label>' +
            '<button class="btn btn-pri" type="submit">Publicar aviso</button>' +
          '</div>' +
        '</form></div>';
    }
    html += '<div class="tarjeta"><div class="tarjeta-cab"><h2>Avisos recientes</h2>' +
      '<select class="input" id="av-filtro" style="width:auto" aria-label="Filtrar avisos">' +
        '<option value="todos">Todos</option><option value="general">Generales</option>' +
        grupos.map((g) => '<option value="' + g.id + '">' + esc(g.codigo + ' · ' + g.nombre) + '</option>').join('') +
      '</select></div><ul class="lista" id="av-lista"></ul></div>';
    cont.innerHTML = html;

    const lista = cont.querySelector('#av-lista');
    const pintar = () => {
      let items = US.avisosVisibles(grupos);
      if (filtro === 'general') items = items.filter((a) => a.grupoId === null);
      else if (filtro !== 'todos') items = items.filter((a) => a.grupoId === filtro);
      lista.innerHTML = items.length ? items.map((a) => US.htmlAviso(a, usuario)).join('') : '<li class="vacio">No hay avisos.</li>';
    };
    pintar();

    cont.querySelector('#av-filtro').addEventListener('change', (e) => { filtro = e.target.value; pintar(); });

    lista.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-borrar-aviso]');
      if (!b) return;
      if (!(await US.confirmar('Eliminar aviso', '<p>El aviso dejará de estar visible para los estudiantes.</p>', 'Eliminar', 'btn-peligro'))) return;
      US.db.avisos = US.db.avisos.filter((a) => a.id !== b.dataset.borrarAviso);
      US.guardar();
      US.toast('Aviso eliminado.');
      pintar();
    });

    const form = cont.querySelector('#form-aviso');
    if (form) form.addEventListener('submit', (e) => {
      e.preventDefault();
      const t = form.querySelector('#av-titulo'), c = form.querySelector('#av-cuerpo');
      const errT = form.querySelector('#err-av-titulo'), errC = form.querySelector('#err-av-cuerpo');
      errT.textContent = t.value.trim().length < 3 ? 'El título debe tener al menos 3 caracteres.' : '';
      errC.textContent = c.value.trim().length < 10 ? 'El contenido debe tener al menos 10 caracteres.' : '';
      t.classList.toggle('invalido', !!errT.textContent); c.classList.toggle('invalido', !!errC.textContent);
      if (errT.textContent || errC.textContent) return;
      const destino = form.querySelector('#av-grupo').value || null;
      US.db.avisos.push({
        id: US.nuevoId('a'), autorId: usuario.id, grupoId: destino,
        importante: form.querySelector('#av-importante').checked, fecha: US.ahora(),
        titulo: t.value.trim(), cuerpo: c.value.trim()
      });
      US.guardar();
      form.reset();
      US.toast(destino ? 'Aviso publicado para el grupo.' : 'Aviso general publicado.');
      pintar();
    });
  }

  /* ---------------- Bandeja / enviados ---------------- */
  function bandeja(cont, usuario, tipo) {
    const lista = tipo === 'entrada' ? US.bandeja(usuario.id) : US.enviados(usuario.id);
    if (!lista.length) {
      cont.innerHTML = '<div class="tarjeta"><p class="vacio">' + (tipo === 'entrada' ? 'No tienes mensajes recibidos.' : 'No has enviado mensajes.') + '</p></div>';
      return;
    }
    cont.innerHTML = '<div class="tarjeta"><div class="msj-lista">' + lista.map((m) => {
      const otro = tipo === 'entrada' ? m.de : m.para;
      const nuevo = tipo === 'entrada' && !m.leido;
      return '<button class="msj-fila' + (nuevo ? ' no-leido' : '') + '" data-msj="' + m.id + '">' +
        '<span class="avatar">' + esc(US.iniciales(US.nombreUsuario(otro))) + '</span>' +
        '<span style="min-width:0"><span class="msj-de">' + (nuevo ? '<span class="msj-punto" aria-label="No leído"></span>' : '') +
          (tipo === 'enviados' ? 'Para: ' : '') + esc(US.nombreUsuario(otro)) + '</span>' +
        '<span class="msj-asunto" style="display:block">' + esc(m.asunto) + '</span></span>' +
        '<span class="msj-fecha">' + US.fecha(m.fecha) + '</span></button>';
    }).join('') + '</div></div>';

    cont.querySelectorAll('[data-msj]').forEach((b) => b.addEventListener('click', () => abrir(b.dataset.msj, usuario, tipo)));
  }

  async function abrir(id, usuario, tipo) {
    const m = US.db.mensajes.find((x) => x.id === id);
    if (!m) return;
    if (tipo === 'entrada' && !m.leido) { m.leido = true; US.guardar(); US.actualizarBadge(); }
    const html =
      '<dl class="detalle-lista"><dt>De</dt><dd>' + esc(US.nombreUsuario(m.de)) + '</dd>' +
      '<dt>Para</dt><dd>' + esc(US.nombreUsuario(m.para)) + '</dd>' +
      '<dt>Fecha</dt><dd>' + US.fechaHora(m.fecha) + '</dd>' +
      (tipo === 'enviados' ? '<dt>Estado</dt><dd>' + (m.leido ? '<span class="chip chip-ok">Leído</span>' : '<span class="chip">No leído</span>') + '</dd>' : '') +
      '</dl><div class="msj-texto">' + esc(m.cuerpo) + '</div>';
    const acciones = [{ texto: 'Eliminar', clase: 'btn-peligro', valor: 'borrar' }];
    if (tipo === 'entrada') acciones.push({ texto: 'Responder', clase: 'btn-pri', valor: 'responder' });
    else acciones.push({ texto: 'Cerrar', clase: 'btn-sec', valor: null });

    const r = await US.modal({ titulo: m.asunto, html, acciones });
    if (r === 'borrar') {
      m.borradoPor.push(usuario.id);
      US.guardar();
      US.toast('Mensaje eliminado.');
    } else if (r === 'responder') {
      borrador = { para: m.de, asunto: m.asunto.startsWith('Re:') ? m.asunto : 'Re: ' + m.asunto };
      location.hash = 'mensajes/nuevo';
      return;
    }
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }

  /* ---------------- Redactar ---------------- */
  function redactar(cont, usuario, op) {
    const d = borrador || {};
    borrador = null;
    const dest = op.destinatarios;
    cont.innerHTML = '<div class="tarjeta" style="max-width:760px"><h2>Nuevo mensaje</h2>' +
      (dest.length ? '' : '<div class="alerta alerta-info">No tienes destinatarios disponibles todavía.</div>') +
      '<form id="form-msj" novalidate>' +
        '<div class="campo"><label for="m-para">Para</label><select class="input" id="m-para"><option value="">Selecciona un destinatario…</option>' +
          dest.map((x) => '<option value="' + x.id + '"' + (x.id === d.para ? ' selected' : '') + '>' + esc(x.nombre + (x.detalle ? ' — ' + x.detalle : '')) + '</option>').join('') +
        '</select><div class="error-campo" id="err-m-para"></div></div>' +
        '<div class="campo"><label for="m-asunto">Asunto</label><input class="input" id="m-asunto" maxlength="120" value="' + esc(d.asunto || '') + '"><div class="error-campo" id="err-m-asunto"></div></div>' +
        '<div class="campo"><label for="m-cuerpo">Mensaje</label><textarea class="input" id="m-cuerpo" maxlength="2000" rows="7"></textarea><div class="error-campo" id="err-m-cuerpo"></div></div>' +
        '<div class="acciones-pie"><a class="btn btn-sec" href="#mensajes/entrada">Cancelar</a><button class="btn btn-pri" type="submit">Enviar mensaje</button></div>' +
      '</form></div>';

    const form = cont.querySelector('#form-msj');
    const campos = {
      'm-para': (v) => (v ? '' : 'Selecciona un destinatario.'),
      'm-asunto': (v) => (v.trim().length >= 3 ? '' : 'El asunto debe tener al menos 3 caracteres.'),
      'm-cuerpo': (v) => (v.trim().length >= 5 ? '' : 'Escribe el mensaje (mínimo 5 caracteres).')
    };
    (d.para ? form.querySelector('#m-cuerpo') : form.querySelector('#m-para')).focus();

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let ok = true;
      for (const [id, fn] of Object.entries(campos)) {
        const el = form.querySelector('#' + id);
        const err = fn(el.value);
        form.querySelector('#err-' + id).textContent = err;
        el.classList.toggle('invalido', !!err);
        if (err) ok = false;
      }
      if (!ok) return;
      US.db.mensajes.push({
        id: US.nuevoId('m'), de: usuario.id, para: form.querySelector('#m-para').value,
        asunto: form.querySelector('#m-asunto').value.trim(), cuerpo: form.querySelector('#m-cuerpo').value.trim(),
        fecha: US.ahora(), leido: false, borradoPor: []
      });
      US.guardar();
      US.toast('Mensaje enviado.');
      location.hash = 'mensajes/enviados';
    });
  }
})();
