/* Dibujo puro. (opciones) -> cadena de SVG. Sin DOM, sin estado. */
(function (global) {
  'use strict';

  var LATON = '#C89B3C', TINTA = '#2A1B0E', MADERA = '#7A4A22',
      TEAL = '#0F4C4A', TEAL2 = '#15625F', OX = '#8E2118', PIEL = '#E8CBA2',
      PAPEL2 = '#EFE2C8', HOJA = '#4E6E3A';

  function esc(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function n(v) { return Math.round(v * 100) / 100; }

  // Mono colgado: caja 60x74, cabeza arriba, manos alzadas terminando en y≈3.
  function mono(o) {
    var f = o.pelo, lt = '#E8CBA2', p = o.gorro, s = '';
    s += '<g transform="translate(' + n(o.x) + ',' + n(o.y) + ') scale(' + n(o.escala) + ')' +
         (o.rot ? ' rotate(' + n(o.rot) + ' 30 6)' : '') + '">';
    // cola
    s += '<path d="M21,54 C 4,58 1,38 12,31" fill="none" stroke="' + f + '" stroke-width="5" stroke-linecap="round"/>';
    // piernas y pies
    s += '<path d="M24,58 L21,71 M36,58 L39,71" stroke="' + f + '" stroke-width="6.5" stroke-linecap="round" fill="none"/>';
    s += '<ellipse cx="20" cy="72" rx="4.5" ry="3" fill="' + lt + '"/><ellipse cx="40" cy="72" rx="4.5" ry="3" fill="' + lt + '"/>';
    // brazos alzados, agarrando la liana
    s += '<path d="M18,36 L9,4 M42,36 L51,4" stroke="' + f + '" stroke-width="6.5" stroke-linecap="round" fill="none"/>';
    s += '<circle cx="9" cy="3" r="4.2" fill="' + lt + '"/><circle cx="51" cy="3" r="4.2" fill="' + lt + '"/>';
    // cuerpo y panza
    s += '<ellipse cx="30" cy="45" rx="14" ry="15.5" fill="' + f + '"/>';
    s += '<ellipse cx="30" cy="47.5" rx="9" ry="10.5" fill="' + lt + '"/>';
    // orejas
    s += '<circle cx="12.5" cy="23" r="6.8" fill="' + f + '"/><circle cx="47.5" cy="23" r="6.8" fill="' + f + '"/>';
    s += '<circle cx="12.5" cy="23" r="3.4" fill="' + lt + '"/><circle cx="47.5" cy="23" r="3.4" fill="' + lt + '"/>';
    // cabeza, copete y hocico
    s += '<circle cx="30" cy="22" r="14.5" fill="' + f + '"/>';
    s += '<path d="M30,9.5 A14.5,14.5 0 0 0 16.2,19.8 C 22,16.5 38,16.5 43.8,19.8 A14.5,14.5 0 0 0 30,9.5 Z" fill="' + f + '" opacity=".45"/>';
    s += '<ellipse cx="30" cy="27.5" rx="10.5" ry="8.6" fill="' + lt + '"/>';
    // ojos
    s += '<circle cx="25.2" cy="20" r="3.2" fill="#FFF8EC"/><circle cx="34.8" cy="20" r="3.2" fill="#FFF8EC"/>';
    s += '<circle cx="25.7" cy="20.4" r="1.7" fill="' + TINTA + '"/><circle cx="35.3" cy="20.4" r="1.7" fill="' + TINTA + '"/>';
    // nariz y boca
    s += '<circle cx="27.6" cy="26" r="1.1" fill="' + TINTA + '" opacity=".65"/><circle cx="32.4" cy="26" r="1.1" fill="' + TINTA + '" opacity=".65"/>';
    s += '<path d="M25.5,30.5 Q30,34 34.5,30.5" fill="none" stroke="' + TINTA + '" stroke-width="1.5" stroke-linecap="round" opacity=".8"/>';
    // gorro de identidad
    s += '<path d="M17,11 Q30,-3 43,11 Z" fill="' + p + '"/>';
    s += '<rect x="15.5" y="10" width="29" height="3.6" rx="1.8" fill="' + p + '"/>';
    s += '<circle cx="30" cy="-1.5" r="2.6" fill="' + LATON + '"/>';
    return s + '</g>';
  }

  // Punta de la flecha del arquero en coordenadas locales (antes de trasladar).
  var PUNTA = { x: 106, y: 34 };
  function puntaFlecha(o) {
    return { x: PUNTA.x * o.escala, y: PUNTA.y * o.escala };
  }

  // Arquero de perfil, caja 106x104. tension 0..1 dobla el arco y jala el codo.
  function arquero(o) {
    var t = Math.max(0, Math.min(1, o.tension || 0));
    var jalon = 26 * t;                 // cuánto retrocede la cuerda
    var curva = 88 + 17 * t;            // cuánto se dobla la pala del arco
    var codo = 40 - 11 * t;             // el codo sube al tensar
    var lean = -2.5 * t;                // el torso se recuesta un poco hacia atrás
    var s = '<g transform="translate(' + n(o.x) + ',' + n(o.y) + ') scale(' + n(o.escala) +
            ') rotate(' + n(lean) + ' 44 70)">';
    // piernas y pies
    s += '<path d="M40,66 L30,102 M46,66 L60,100" stroke="' + TEAL + '" stroke-width="11" stroke-linecap="round" fill="none"/>';
    s += '<ellipse cx="26" cy="103" rx="9" ry="4" fill="' + TINTA + '"/><ellipse cx="64" cy="102" rx="9" ry="4" fill="' + TINTA + '"/>';
    // torso con chaleco
    s += '<path d="M32,30 Q52,26 54,48 Q56,68 42,70 Q30,70 30,52 Z" fill="' + OX + '"/>';
    s += '<path d="M40,30 Q50,32 52,50 L44,52 Q42,38 38,32 Z" fill="' + LATON + '" opacity=".55"/>';
    // carcaj
    s += '<path d="M22,44 L14,74 L26,78 L34,48 Z" fill="' + MADERA + '"/>';
    s += '<path d="M24,44 L22,32 M29,45 L29,32 M34,46 L36,33" stroke="' + OX + '" stroke-width="2.6" stroke-linecap="round"/>';
    // arco: se dobla con la tensión
    s += '<path d="M74,-4 Q' + n(curva) + ',34 74,72" fill="none" stroke="' + MADERA + '" stroke-width="5" stroke-linecap="round"/>';
    // cuerda en V, jalada hacia atrás
    s += '<path d="M74,-4 L' + n(58 - jalon) + ',34 L74,72" fill="none" stroke="' + TINTA + '" stroke-width="1.6"/>';
    // Flecha nocada: se desliza hacia atrás en vez de estirarse. La punta recorre
    // un poco menos que la cuerda para que no se esconda detrás de la mano del arco.
    var punta = PUNTA.x - jalon * .7;
    s += '<path d="M' + n(56 - jalon) + ',34 L' + n(punta) + ',34" stroke="' + TINTA + '" stroke-width="2.6"/>';
    s += '<path d="M' + n(punta) + ',34 l-9,-4 l0,8 Z" fill="' + LATON + '"/>';
    s += '<path d="M' + n(56 - jalon) + ',34 l7,-6 M' + n(56 - jalon) + ',34 l7,6" stroke="' + OX + '" stroke-width="2.4" fill="none"/>';
    // brazos: el de atrás jala
    s += '<path d="M40,38 L72,34" stroke="' + OX + '" stroke-width="8.5" stroke-linecap="round" fill="none"/>';
    s += '<path d="M40,' + n(codo) + ' L' + n(57 - jalon) + ',35" stroke="#B4472F" stroke-width="8" stroke-linecap="round" fill="none"/>';
    s += '<circle cx="73" cy="34" r="5" fill="' + PIEL + '"/><circle cx="' + n(57 - jalon) + '" cy="35" r="4.6" fill="' + PIEL + '"/>';
    // cabeza y gorra
    s += '<circle cx="44" cy="18" r="13" fill="' + PIEL + '"/>';
    s += '<path d="M31,15 Q44,-1 57,15 Z" fill="' + TEAL + '"/><path d="M55,15 Q68,15 66,20 L54,19 Z" fill="' + TEAL2 + '"/>';
    s += '<circle cx="51" cy="19" r="1.8" fill="' + TINTA + '"/>';
    s += '<path d="M55,26 Q59,28 55,30" fill="none" stroke="' + TINTA + '" stroke-width="1.5"/>';
    return s + '</g>';
  }

  // Flecha suelta, apuntando a +x, con el origen EN LA PUNTA.
  function flecha() {
    var s = '<g>';
    s += '<path d="M0,0 L-46,0" stroke="' + TINTA + '" stroke-width="2.6" stroke-linecap="round"/>';
    s += '<path d="M0,0 l-10,-4.5 l0,9 Z" fill="' + LATON + '"/>';
    s += '<path d="M-46,0 l8,-6 M-46,0 l8,6 M-41,0 l8,-6 M-41,0 l8,6" stroke="' + OX + '" stroke-width="2.2" fill="none"/>';
    return s + '</g>';
  }

  function platano(o) {
    var s = '<g transform="rotate(' + n(o.rot || 0) + ')">';
    s += '<path d="M-9,-7 Q3,-11 9,2 Q10,7 6,9 Q-2,10 -8,1 Q-11,-4 -9,-7 Z" fill="#E3B23C"/>';
    s += '<path d="M-9,-7 Q1,-9 7,1 Q4,-1 -3,-3 Q-7,-4 -9,-7 Z" fill="#F2CC5E"/>';
    s += '<path d="M-9,-7 l-3,-3" stroke="' + MADERA + '" stroke-width="2.4" stroke-linecap="round"/>';
    return s + '</g>';
  }

  function hoja(o) {
    var s = '<g transform="rotate(' + n(o.rot || 0) + ')">';
    s += '<path d="M0,0 Q11,-8 20,0 Q11,8 0,0 Z" fill="' + HOJA + '"/>';
    s += '<path d="M0,0 L20,0" stroke="#3B5A2C" stroke-width="1" opacity=".7"/>';
    return s + '</g>';
  }

  function placa(o) {
    var s = '<g>';
    s += '<rect x="' + n(o.x) + '" y="' + n(o.y) + '" width="' + n(o.ancho) + '" height="19" rx="2.5" fill="' +
         PAPEL2 + '" stroke="' + LATON + '" stroke-width="1.6"/>';
    s += '<text x="' + n(o.x + o.ancho / 2) + '" y="' + n(o.y + 13.5) +
         '" text-anchor="middle" fill="' + TEAL +
         '" style="font:11px \'Libre Baskerville\',Georgia,serif">' + esc(o.texto) + '</text>';
    return s + '</g>';
  }

  var Sprites = { mono: mono, arquero: arquero, puntaFlecha: puntaFlecha, flecha: flecha,
                  platano: platano, hoja: hoja, placa: placa };

  if (typeof module !== 'undefined' && module.exports) module.exports = Sprites;
  else global.Sprites = Sprites;
})(typeof globalThis !== 'undefined' ? globalThis : this);
