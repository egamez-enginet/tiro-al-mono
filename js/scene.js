/* Dueño único del <svg>. Recibe participantes y los pinta; recibe la orden de
   dispararle a un índice y ejecuta la animación. NO decide a quién se le dispara. */
(function (global) {
  'use strict';

  var ANCHO = 900, ALTO = 520;
  var RAMA_Y = 74;                  // altura de la rama
  var X0 = 250, X1 = 856;           // franja donde caben los monos
  var TEAL = '#0F4C4A', MADERA = '#7A4A22', HOJA = '#4E6E3A';

  var svg = null, capaFondo = null, capaMonos = null, capaVuelo = null;
  var monos = [];                   // {persona, cx, cy, escala}
  var reducido = false;

  function crear(nombre) {
    return document.createElementNS('http://www.w3.org/2000/svg', nombre);
  }

  function init(el) {
    svg = el;
    svg.innerHTML = '';
    capaFondo = crear('g');
    capaMonos = crear('g');
    capaVuelo = crear('g');
    svg.appendChild(capaFondo);
    svg.appendChild(capaMonos);
    svg.appendChild(capaVuelo);
    reducido = !!(global.matchMedia &&
                  global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    pintarFondo();
  }

  function pintarFondo() {
    var s = '';
    // hojas grandes en silueta
    s += '<g opacity=".15" fill="' + TEAL + '">';
    s += '<path d="M0,520 Q56,372 8,268 Q112,340 80,520 Z"/>';
    s += '<path d="M900,520 Q838,352 892,246 Q788,332 822,520 Z"/>';
    s += '<ellipse cx="128" cy="176" rx="66" ry="21" transform="rotate(-24 128 176)"/>';
    s += '<ellipse cx="782" cy="198" rx="72" ry="23" transform="rotate(22 782 198)"/>';
    s += '<ellipse cx="470" cy="150" rx="54" ry="18" transform="rotate(-9 470 150)"/>';
    s += '</g>';
    // suelo insinuado
    s += '<path d="M0,486 Q450,462 900,486 L900,520 L0,520 Z" fill="' + TEAL + '" opacity=".2"/>';
    // la rama
    s += '<path d="M0,' + (RAMA_Y + 4) + ' Q230,' + (RAMA_Y - 24) + ' 470,' + RAMA_Y +
         ' Q710,' + (RAMA_Y + 22) + ' 900,' + (RAMA_Y - 10) +
         '" fill="none" stroke="' + MADERA + '" stroke-width="26" stroke-linecap="round"/>';
    s += '<path d="M0,' + (RAMA_Y - 4) + ' Q230,' + (RAMA_Y - 32) + ' 470,' + (RAMA_Y - 8) +
         ' Q710,' + (RAMA_Y + 14) + ' 900,' + (RAMA_Y - 18) +
         '" fill="none" stroke="#96603A" stroke-width="9"/>';
    // un par de hojas colgando de la rama
    s += '<g transform="translate(120,88) rotate(64)">' + Sprites.hoja({ rot: 0 }) + '</g>';
    s += '<g transform="translate(690,96) rotate(108)">' + Sprites.hoja({ rot: 0 }) + '</g>';
    capaFondo.innerHTML = s;
  }

  // Altura de la rama en un x dado, siguiendo la curva que se dibujó arriba.
  function ramaEn(x) {
    var t, a, b, c;
    if (x <= 470) { t = x / 470; a = RAMA_Y + 4; b = RAMA_Y - 24; c = RAMA_Y; }
    else { t = (x - 470) / 430; a = RAMA_Y; b = RAMA_Y + 22; c = RAMA_Y - 10; }
    return (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
  }

  function render(participantes) {
    monos = [];
    if (!participantes.length) { capaMonos.innerHTML = ''; dibujarArquero(); return; }

    var total = participantes.length;
    var filas = total > 16 ? 3 : (total > 8 ? 2 : 1);
    var porFila = Math.ceil(total / filas);
    // Con varias filas los monos se encogen: hay que meter más lianas en el mismo ancho
    // y dejar aire vertical entre nivel y nivel.
    var escala = Math.min(filas > 1 ? .8 : 1.05, Math.max(.46, (X1 - X0) / (porFila * 96)));

    var s = '';
    participantes.forEach(function (persona, i) {
      var fila = Math.floor(i / porFila);
      var enFila = i % porFila;
      var cuantosEnEstaFila = Math.min(porFila, total - fila * porFila);
      var paso = (X1 - X0) / cuantosEnEstaFila;
      // Las filas impares van corridas medio paso, para que sus lianas bajen por los
      // huecos y no atraviesen a los monos de la fila de arriba.
      var x = X0 + paso * (enFila + .5) + (fila % 2) * paso / 2 - 30 * escala;

      var id = Logic.identidad(persona.nombre);
      // Con una sola fila la liana varía libre (40–110). Con varias, la variación se
      // acota para que los niveles no se traslapen entre sí.
      var base = filas > 1 ? (id.liana % 26) + 34 : id.liana;
      var largo = (base + fila * 150) * escala;
      var anclaY = ramaEn(x + 30 * escala);
      var y = anclaY + largo;
      var curva = (i % 2 ? 9 : -9) * escala;

      s += '<g class="colgado" style="' +
           '--vaiven:' + id.vaiven + 's; --retraso:-' + id.retraso + 's; ' +
           '--pivote:' + (x + 30 * escala) + 'px ' + anclaY + 'px" data-indice="' + i + '">';
      // liana
      s += '<path d="M' + (x + 30 * escala) + ',' + anclaY + ' q' + curva + ',' + (largo / 2) +
           ' 0,' + largo + '" fill="none" stroke="' + HOJA + '" stroke-width="' +
           (3.4 * escala) + '"/>';
      s += Sprites.mono({ x: x, y: y, escala: escala, pelo: id.pelo, gorro: id.gorro,
                          rot: i % 2 ? 4 : -5 });
      s += Sprites.placa({ x: x + 4 * escala, y: y + 82 * escala,
                           ancho: 52 * escala + 8,
                           texto: Logic.recortar(persona.nombre, 14) });
      s += '</g>';

      monos.push({ persona: persona, cx: x + 30 * escala, cy: y + 40 * escala, escala: escala });
    });

    capaMonos.innerHTML = s;
    dibujarArquero();
  }

  var ARQUERO = { x: 40, y: 344, escala: 1.15 };
  function dibujarArquero(tension) {
    var vieja = svg.querySelector('.arquero');
    if (vieja) vieja.remove();
    var g = crear('g');
    g.setAttribute('class', 'arquero');
    g.innerHTML = Sprites.arquero({ x: ARQUERO.x, y: ARQUERO.y, escala: ARQUERO.escala,
                                    tension: tension || 0 });
    capaFondo.after(g);
  }

  function posicionDe(indice) {
    var m = monos[indice];
    return m ? { x: m.cx, y: m.cy } : null;
  }

  var Scene = { init: init, render: render, posicionDe: posicionDe,
                ANCHO: ANCHO, ALTO: ALTO };

  global.Scene = Scene;
})(typeof globalThis !== 'undefined' ? globalThis : this);
