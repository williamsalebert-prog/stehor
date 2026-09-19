/* Sethoria Writer — bootstrap A7
 *
 * El runtime A7 heredado vive en core/app-legacy.js mientras se migra módulo
 * por módulo. Este archivo debe permanecer pequeño: no agregar aquí lógica de
 * personajes, lugares, timeline, etc.
 */
(function () {
  'use strict';
  // El runtime principal se carga desde index.html.
  // Este archivo queda como punto de entrada estable para futuras versiones.
  window.SETHORIA_APP_BOOTSTRAP = {
    version: 'modular-bootstrap-1',
    commonTemplate: 'modules/_comun/template-contract.js'
  };
})();
