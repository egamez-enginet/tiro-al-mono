/* Dueño único del <svg>. Recibe participantes y los pinta; recibe la orden de
   dispararle a un índice y ejecuta la animación. NO decide a quién se le dispara. */
(function (global) {
  'use strict';

  var ANCHO = 900, ALTO = 520;
  var RAMA_Y = 74;                  // altura de la rama
  var X0 = 250, X1 = 856;           // franja donde caben los monos
  var TEAL = '#0F4C4A', MADERA = '#7A4A22', HOJA = '#4E6E3A';

  var svg = null, capaFondo = null, capaMonos = null, capaVuelo = null;
  var monos = [];                   // {id, cx, cy, escala}
  var multiplicador = 2;            // lo fija la app desde el panel

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
    pintarFondo();
  }

  // La preferencia del sistema solo fija el valor inicial; quien manda es la app,
  // porque aquí la animación no es adorno: es la función del programa.
  function prefiereMenosMovimiento() {
    return !!(global.matchMedia &&
              global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function setMultiplicador(m) {
    multiplicador = (typeof m === 'number' && m > 0) ? m : 2;
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

      // Se identifica por el id estable de la persona, NO por su posición: la lista
      // se va acortando con cada disparo y los índices dejarían de coincidir.
      s += '<g class="colgado" style="' +
           '--vaiven:' + id.vaiven + 's; --retraso:-' + id.retraso + 's; ' +
           '--pivote:' + (x + 30 * escala) + 'px ' + anclaY + 'px" data-id="' + persona.id + '">';
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

      monos.push({ id: persona.id, cx: x + 30 * escala, cy: y + 40 * escala, escala: escala });
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

  function posicionDe(id) {
    for (var i = 0; i < monos.length; i++) {
      if (monos[i].id === id) return { x: monos[i].cx, y: monos[i].cy };
    }
    return null;
  }

  function olvidar(id) {
    monos = monos.filter(function (m) { return m.id !== id; });
  }

  // Animador mínimo: corre f(t) con t de 0 a 1 durante ms, y resuelve al terminar.
  function animar(ms, f) {
    return new Promise(function (listo) {
      if (ms <= 0) { f(1); listo(); return; }
      var inicio = null;
      function paso(ahora) {
        if (inicio === null) inicio = ahora;
        var t = Math.min(1, (ahora - inicio) / ms);
        f(t);
        if (t < 1) requestAnimationFrame(paso); else listo();
      }
      requestAnimationFrame(paso);
    });
  }

  function esperar(ms) { return animar(ms, function () {}); }

  // Bézier cuadrática y su tangente, para que la punta de la flecha
  // apunte a donde va y no siempre al frente.
  function bezier(p0, p1, p2, t) {
    var u = 1 - t;
    return {
      x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
      y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
      ang: Math.atan2(2 * u * (p1.y - p0.y) + 2 * t * (p2.y - p1.y),
                      2 * u * (p1.x - p0.x) + 2 * t * (p2.x - p1.x)) * 180 / Math.PI
    };
  }

  // Tiempos base: 2.1 s en total. La velocidad elegida en el panel los multiplica,
  // así que el ritmo se calibra en vivo en vez de a ojo desde el código.
  var BASE = { tensar: 450, soltar: 70, vuelo: 830, impacto: 100, caida: 650 };

  function tiempos() {
    return {
      tensar:  Math.round(BASE.tensar * multiplicador),
      soltar:  Math.round(BASE.soltar * multiplicador),
      vuelo:   Math.round(BASE.vuelo * multiplicador),
      impacto: Math.round(BASE.impacto * multiplicador),
      caida:   Math.round(BASE.caida * multiplicador)
    };
  }

  function lluvia(x, y) {
    var piezas = [], i, s = '';
    var cuantas = multiplicador < 1 ? 6 : 16;
    for (i = 0; i < cuantas; i++) {
      // Deliberadamente pseudoaleatorio y no determinista: cada impacto se ve
      // distinto, y nadie audita la trayectoria de un plátano.
      var esHoja = i % 4 === 3;
      var ang = (-140 + Math.random() * 100) * Math.PI / 180;
      var vel = 3.4 + Math.random() * 3.6;
      piezas.push({
        x: x, y: y,
        vx: Math.cos(ang) * vel,
        vy: Math.sin(ang) * vel,
        giro: (Math.random() - .5) * 22,
        rot: Math.random() * 360
      });
      s += '<g class="pieza">' + (esHoja ? Sprites.hoja({ rot: 0 }) : Sprites.platano({ rot: 0 })) + '</g>';
    }
    var capa = crear('g');
    capa.innerHTML = s;
    capaVuelo.appendChild(capa);
    var nodos = capa.querySelectorAll('.pieza');

    // Posición en forma cerrada, no integrada por cuadro: así el recorrido es el mismo
    // sin importar cuánto dure la animación. Integrando por cuadro, alargar la duración
    // mandaría los plátanos fuera de la pantalla en vez de hacerlos caer más despacio.
    var CUADROS = 66, GRAVEDAD = 740;
    animar(1100 * multiplicador, function (t) {
      piezas.forEach(function (p, k) {
        var px = p.x + p.vx * CUADROS * t;
        var py = p.y + p.vy * CUADROS * t + GRAVEDAD * t * t;
        var rot = p.rot + p.giro * CUADROS * t;
        nodos[k].setAttribute('transform',
          'translate(' + px.toFixed(1) + ',' + py.toFixed(1) + ') rotate(' + rot.toFixed(1) + ')');
        nodos[k].setAttribute('opacity', (1 - t * t).toFixed(2));
      });
    }).then(function () { capa.remove(); });
  }

  function destello(x, y) {
    var g = crear('g');
    g.setAttribute('class', 'destello');
    g.innerHTML = '<g transform="translate(' + x + ',' + y + ')" stroke="#8E2118" ' +
      'stroke-width="3" fill="none" stroke-linecap="round">' +
      '<path d="M0,-20 v-11 M0,20 v11 M-20,0 h-11 M20,0 h11 ' +
      'M-15,-15 l-8,-8 M15,15 l8,8 M15,-15 l8,-8 M-15,15 l-8,8"/></g>';
    capaVuelo.appendChild(g);
    setTimeout(function () { g.remove(); }, Math.round(260 * multiplicador));
  }

  function shoot(id) {
    var destino = posicionDe(id);
    if (!destino) return Promise.reject(new Error('no hay ningún mono con id ' + id));

    var T = tiempos();
    var grupo = capaMonos.querySelector('[data-id="' + id + '"]');
    var punta = Sprites.puntaFlecha({ escala: ARQUERO.escala });
    var origen = { x: ARQUERO.x + punta.x, y: ARQUERO.y + punta.y };
    // Control levantado por encima de los dos extremos: la parábola sale distinta
    // para cada mono según qué tan lejos y qué tan alto esté.
    var control = {
      x: (origen.x + destino.x) / 2,
      y: Math.min(origen.y, destino.y) - 90 - Math.abs(destino.x - origen.x) * .16
    };

    // 1. Tensado
    return animar(T.tensar, function (t) {
      dibujarArquero(t * t * (3 - 2 * t));       // suavizado
    })
    // 2. Suelta
    .then(function () {
      return animar(T.soltar, function (t) { dibujarArquero(1 - t); });
    })
    // 3. Vuelo
    .then(function () {
      dibujarArquero(0);
      var g = crear('g');
      g.innerHTML = Sprites.flecha();
      capaVuelo.appendChild(g);
      return animar(T.vuelo, function (t) {
        var p = bezier(origen, control, destino, t);
        g.setAttribute('transform',
          'translate(' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ') rotate(' + p.ang.toFixed(1) + ')');
      }).then(function () { setTimeout(function () { g.remove(); }, T.impacto); });
    })
    // 4. Impacto
    .then(function () {
      destello(destino.x, destino.y);
      if (grupo) grupo.classList.add('sacudida');
      return esperar(T.impacto);
    })
    // 5. Caída
    .then(function () {
      lluvia(destino.x, destino.y);
      if (!grupo) return esperar(T.caida);
      grupo.classList.remove('sacudida');
      grupo.classList.add('cayendo');
      var haciaX = (Math.random() - .3) * 90;
      return animar(T.caida, function (t) {
        var caida = t * t * (ALTO - destino.y + 140);
        grupo.setAttribute('transform',
          'translate(' + (haciaX * t).toFixed(1) + ',' + caida.toFixed(1) +
          ') rotate(' + (540 * t).toFixed(1) + ' ' + destino.x + ' ' + destino.y + ')');
        grupo.setAttribute('opacity', t > .75 ? ((1 - t) / .25).toFixed(2) : '1');
      });
    })
    .then(function () { if (grupo) grupo.remove(); olvidar(id); });
  }

  var Scene = { init: init, render: render, posicionDe: posicionDe, shoot: shoot,
                setMultiplicador: setMultiplicador,
                prefiereMenosMovimiento: prefiereMenosMovimiento,
                ANCHO: ANCHO, ALTO: ALTO };

  global.Scene = Scene;
})(typeof globalThis !== 'undefined' ? globalThis : this);
