/* Lógica pura de Tiro al Mono. Sin DOM, sin localStorage, sin animación.
   Se carga como <script> clásico en el navegador (define window.Logic)
   y con require() en Node (para las pruebas). */
(function (global) {
  'use strict';

  // Pelos: cafés de mono, suficientemente distintos entre sí a simple vista.
  var PELOS = ['#A0693A', '#8B5A2B', '#B07A45', '#784E24', '#A87B4E', '#6F4520', '#C08E5A', '#94623C'];

  // Gorros: la marca de identidad. Sacados de la paleta de feria más tres apoyos.
  var GORROS = ['#8E2118', '#0F4C4A', '#C89B3C', '#4E6E3A', '#6B3E7A', '#1F5C8B', '#B4472F', '#3C6E71'];

  // FNV-1a de 32 bits. Se recorre por code unit, así que los acentos y emojis
  // cuentan; lo único que importa es que sea estable y bien revuelto.
  function hash(texto) {
    var h = 0x811C9DC5;
    for (var i = 0; i < texto.length; i++) {
      h ^= texto.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  // Cada persona recibe siempre el mismo mono: mismo pelo, mismo gorro,
  // misma liana y mismo vaivén, semana tras semana.
  function identidad(nombre) {
    var h = hash(nombre);
    var vaiven = Math.round((2.6 + ((h >>> 24) % 13) / 10) * 10) / 10;   // 2.6 – 3.8 s por ciclo
    return {
      pelo:    PELOS[h % PELOS.length],
      gorro:   GORROS[(h >>> 8) % GORROS.length],
      liana:   40 + ((h >>> 16) % 71),                                   // 40 – 110 px
      vaiven:  vaiven,
      retraso: Math.round(((h >>> 4) % 100) / 100 * vaiven * 10) / 10
    };
  }

  var Logic = { PELOS: PELOS, GORROS: GORROS, hash: hash, identidad: identidad };

  if (typeof module !== 'undefined' && module.exports) module.exports = Logic;
  else global.Logic = Logic;
})(typeof globalThis !== 'undefined' ? globalThis : this);
