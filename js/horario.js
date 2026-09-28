/* ==========================================================================
   Universidad Social — Componente de horario semanal (compartido)
   ========================================================================== */
(function () {
  'use strict';

  const COLORES = [
    { bg: '#f4e9f5', bd: '#7e2382', tx: '#3f0f43' },
    { bg: '#e1f1fa', bd: '#1f8fc4', tx: '#0f3f57' },
    { bg: '#fff3dc', bd: '#c98a00', tx: '#5a3e00' },
    { bg: '#e3f4ea', bd: '#2e8b57', tx: '#12402c' },
    { bg: '#fde8e6', bd: '#c0493a', tx: '#5e1c14' },
    { bg: '#e2f4f1', bd: '#138a7a', tx: '#0b4038' },
    { bg: '#eef1e0', bd: '#6f7f1e', tx: '#353d0c' },
    { bg: '#f3e9e1', bd: '#9a5b34', tx: '#4b2a15' }
  ];

  /** Devuelve { idGrupo: color } estable según el orden recibido. */
  US.coloresGrupos = (grupos) => Object.fromEntries(grupos.map((g, i) => [g.id, COLORES[i % COLORES.length]]));

  /**
   * Genera el HTML del horario (rejilla para escritorio + lista para móvil).
   * @param {Array} grupos  grupos a mostrar
   * @param {Object} op     { detalle: (g) => string }  texto extra en cada bloque
   */
  US.renderHorario = (grupos, op = {}) => {
    const esc = US.esc;
    if (!grupos.length) {
      return '<p class="vacio">No hay clases para mostrar en este periodo.</p>';
    }
    const colores = US.coloresGrupos(grupos);
    const sesiones = grupos.flatMap((g) => g.sesiones.map((s) => ({ ...s, g })));
    const dias = [1, 2, 3, 4, 5];
    if (sesiones.some((s) => s.dia === 6)) dias.push(6);

    let min = Math.min(...sesiones.map((s) => US.aMin(s.inicio)));
    let max = Math.max(...sesiones.map((s) => US.aMin(s.fin)));
    min = Math.min(Math.floor(min / 60) * 60, 7 * 60);
    max = Math.max(Math.ceil(max / 60) * 60, min + 8 * 60);
    const slots = (max - min) / 30;
    const hoy = US.diaHoy();
    const fila = (m) => 2 + (m - min) / 30;
    const extra = op.detalle || ((g) => US.nombreUsuario(g.profesorId));

    let h = '<div class="horario-env"><div class="horario" role="table" aria-label="Horario semanal" ' +
      'style="grid-template-columns:60px repeat(' + dias.length + ',minmax(105px,1fr));grid-template-rows:38px repeat(' + slots + ',26px)">';
    h += '<div style="grid-row:1;grid-column:1"></div>';
    dias.forEach((d, j) => {
      h += '<div class="h-cab' + (d === hoy ? ' hoy' : '') + '" role="columnheader" style="grid-row:1;grid-column:' + (j + 2) + '">' + US.DIAS[d] + (d === hoy ? ' · hoy' : '') + '</div>';
    });
    for (let m = min; m < max; m += 60) {
      h += '<div class="h-hora" style="grid-row:' + fila(m) + ' / span 2;grid-column:1">' + String(m / 60).padStart(2, '0') + ':00</div>';
    }
    for (let i = 0; i < slots; i++) {
      dias.forEach((d, j) => {
        h += '<div class="h-celda' + (i % 2 ? ' media' : '') + '" style="grid-row:' + (i + 2) + ';grid-column:' + (j + 2) + '"></div>';
      });
    }
    sesiones.forEach((s) => {
      const j = dias.indexOf(s.dia);
      const c = colores[s.g.id];
      h += '<div class="h-bloque" role="cell" title="' + esc(s.g.nombre + ' · ' + s.inicio + '–' + s.fin + ' · ' + s.aula) + '" style="grid-row:' +
        fila(US.aMin(s.inicio)) + ' / ' + fila(US.aMin(s.fin)) + ';grid-column:' + (j + 2) +
        ';background:' + c.bg + ';border-color:' + c.bd + ';color:' + c.tx + '">' +
        '<b>' + esc(s.g.nombre) + '</b><span>' + s.inicio + '–' + s.fin + ' · ' + esc(s.aula) + '</span>' +
        '<span>' + esc(extra(s.g)) + '</span></div>';
    });
    h += '</div></div>';

    // Vista de lista (pantallas pequeñas)
    h += '<div class="horario-lista">';
    dias.forEach((d) => {
      const del = sesiones.filter((s) => s.dia === d).sort((a, b) => a.inicio.localeCompare(b.inicio));
      if (!del.length) return;
      h += '<div class="dia-lista"><h3>' + US.DIAS[d] + (d === hoy ? ' <span class="chip chip-ok">Hoy</span>' : '') + '</h3>';
      del.forEach((s) => {
        const c = colores[s.g.id];
        h += '<div class="h-bloque" style="background:' + c.bg + ';border-color:' + c.bd + ';color:' + c.tx + '">' +
          '<b>' + s.inicio + '–' + s.fin + ' · ' + esc(s.g.nombre) + '</b><span>' + esc(s.aula) + ' · ' + esc(extra(s.g)) + '</span></div>';
      });
      h += '</div>';
    });
    h += '</div>';
    return h;
  };

  /** Sesiones de hoy para una lista de grupos, ordenadas por hora. */
  US.clasesDeHoy = (grupos) => {
    const d = US.diaHoy();
    return grupos.flatMap((g) => g.sesiones.filter((s) => s.dia === d).map((s) => ({ ...s, g })))
      .sort((a, b) => a.inicio.localeCompare(b.inicio));
  };
})();
