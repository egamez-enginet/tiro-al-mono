const test = require('node:test');
const assert = require('node:assert');
const Logic = require('../js/logic.js');

test('hash es determinista', () => {
  assert.strictEqual(Logic.hash('Ana'), Logic.hash('Ana'));
});

test('hash distingue nombres distintos', () => {
  assert.notStrictEqual(Logic.hash('Ana'), Logic.hash('Luis'));
});

test('hash siempre es un entero sin signo de 32 bits', () => {
  for (const n of ['', 'a', 'Ana', 'Sofía Delgado', '🐒', 'x'.repeat(300)]) {
    const h = Logic.hash(n);
    assert.ok(Number.isInteger(h), `${n} no dio entero`);
    assert.ok(h >= 0 && h <= 0xFFFFFFFF, `${n} salió del rango: ${h}`);
  }
});

test('identidad es estable: Ana siempre es la misma mona', () => {
  assert.deepStrictEqual(Logic.identidad('Ana'), Logic.identidad('Ana'));
});

test('identidad devuelve colores de las paletas', () => {
  const id = Logic.identidad('Sofía');
  assert.ok(Logic.PELOS.includes(id.pelo));
  assert.ok(Logic.GORROS.includes(id.gorro));
});

test('identidad da lianas y vaivenes dentro de rango', () => {
  for (const n of ['Ana', 'Luis', 'Sofía', 'Diego', 'Mar', 'Iván', 'Rocío', 'Pau']) {
    const id = Logic.identidad(n);
    assert.ok(id.liana >= 40 && id.liana <= 110, `liana de ${n}: ${id.liana}`);
    assert.ok(id.vaiven >= 2.6 && id.vaiven <= 3.8, `vaiven de ${n}: ${id.vaiven}`);
    assert.ok(id.retraso >= 0 && id.retraso < id.vaiven, `retraso de ${n}: ${id.retraso}`);
  }
});

// rng falso: devuelve valores fijos en secuencia, para probar el rechazo de módulo
function rngFijo(valores) {
  let i = 0;
  return () => valores[i++ % valores.length];
}

test('elegirIndice devuelve un entero en rango', () => {
  for (let n = 1; n <= 12; n++) {
    for (let k = 0; k < 200; k++) {
      const i = Logic.elegirIndice(n);
      assert.ok(Number.isInteger(i) && i >= 0 && i < n, `n=${n} dio ${i}`);
    }
  }
});

test('elegirIndice rechaza los valores del residuo sesgado', () => {
  // Con n=3, el límite es floor(2^32/3)*3 = 4294967295. El valor 4294967295
  // debe rechazarse y consumirse el siguiente del rng.
  const i = Logic.elegirIndice(3, rngFijo([4294967295, 7]));
  assert.strictEqual(i, 1, 'debió descartar el valor sesgado y usar el 7');
});

test('elegirIndice reparte parejo en 10 000 tiradas', () => {
  const n = 5, tiradas = 10000, cuentas = new Array(n).fill(0);
  for (let k = 0; k < tiradas; k++) cuentas[Logic.elegirIndice(n)]++;
  const esperado = tiradas / n;
  for (const c of cuentas) {
    const desvio = Math.abs(c - esperado) / esperado;
    assert.ok(desvio < 0.05, `desvío de ${(desvio * 100).toFixed(1)}% en ${cuentas}`);
  }
});

test('crearEstado limpia y da ids únicos', () => {
  const e = Logic.crearEstado(['  Ana  ', 'Luis', '', '   ', 'Ana']);
  assert.strictEqual(e.participantes.length, 3, 'descarta vacíos, conserva duplicados');
  assert.deepStrictEqual(e.participantes.map(p => p.nombre), ['Ana', 'Luis', 'Ana']);
  assert.strictEqual(new Set(e.participantes.map(p => p.id)).size, 3);
  assert.deepStrictEqual(e.yaPasaron, []);
  assert.strictEqual(e.fase, 'preparacion');
});

test('iniciarDisparo no muta el estado que recibe', () => {
  const antes = Logic.crearEstado(['Ana', 'Luis']);
  const copia = JSON.parse(JSON.stringify(antes));
  Logic.iniciarDisparo(antes);
  assert.deepStrictEqual(antes, copia);
});

test('resolverDisparo mueve al elegido a yaPasaron', () => {
  let e = Logic.crearEstado(['Ana', 'Luis', 'Sofía']);
  const r = Logic.resolverDisparo(e, 1);
  assert.strictEqual(r.elegido.nombre, 'Luis');
  assert.deepStrictEqual(r.estado.participantes.map(p => p.nombre), ['Ana', 'Sofía']);
  assert.deepStrictEqual(r.estado.yaPasaron.map(p => p.nombre), ['Luis']);
  assert.strictEqual(r.estado.fase, 'revelado');
});

test('al caer el último se entra a finDeRonda', () => {
  let e = Logic.crearEstado(['Ana']);
  const r = Logic.resolverDisparo(e, 0);
  assert.strictEqual(r.estado.fase, 'finDeRonda');
  assert.strictEqual(r.estado.participantes.length, 0);
});

test('una ronda completa agota a todos exactamente una vez', () => {
  const nombres = ['Ana', 'Luis', 'Sofía', 'Diego', 'Mar', 'Iván', 'Rocío'];
  let e = Logic.crearEstado(nombres);
  const orden = [];
  while (e.participantes.length) {
    const ini = Logic.iniciarDisparo(e);
    const res = Logic.resolverDisparo(ini.estado, ini.indice);
    orden.push(res.elegido.nombre);
    e = res.estado;
  }
  assert.strictEqual(orden.length, nombres.length, 'nadie de más, nadie de menos');
  assert.deepStrictEqual([...orden].sort(), [...nombres].sort(), 'sin repetidos ni faltantes');
  assert.strictEqual(e.fase, 'finDeRonda');
});

test('reiniciarRonda devuelve a todos a la rama sin perder a nadie', () => {
  let e = Logic.crearEstado(['Ana', 'Luis', 'Sofía']);
  e = Logic.resolverDisparo(e, 0).estado;
  e = Logic.resolverDisparo(e, 0).estado;
  const r = Logic.reiniciarRonda(e);
  assert.strictEqual(r.participantes.length, 3);
  assert.deepStrictEqual(r.participantes.map(p => p.nombre).sort(), ['Ana', 'Luis', 'Sofía']);
  assert.deepStrictEqual(r.yaPasaron, []);
  assert.strictEqual(r.fase, 'preparacion');
});

test('el estado sobrevive un ciclo de guardar y cargar', () => {
  let e = Logic.crearEstado(['Ana', 'Luis', 'Sofía', 'Diego']);
  e = Logic.resolverDisparo(e, 2).estado;   // cae Sofía
  e = Logic.resolverDisparo(e, 0).estado;   // cae Ana
  const vuelta = Logic.deserializar(Logic.serializar(e));
  assert.deepStrictEqual(vuelta, e);
  assert.deepStrictEqual(vuelta.yaPasaron.map(p => p.nombre), ['Sofía', 'Ana'],
    'el orden de caída no se reordena');
});

test('deserializar devuelve null ante basura', () => {
  for (const basura of ['', 'null', '{', '[]', '{"fase":"x"}', '{"participantes":"no"}']) {
    assert.strictEqual(Logic.deserializar(basura), null, `no rechazó: ${basura}`);
  }
});

test('deserializar rechaza otra version del formato', () => {
  const viejo = JSON.stringify({ v: 0, participantes: [], yaPasaron: [], fase: 'preparacion', proyector: false });
  assert.strictEqual(Logic.deserializar(viejo), null);
});

test('deserializar no arrastra una fase a medio disparo', () => {
  let e = Logic.crearEstado(['Ana', 'Luis']);
  e = Logic.iniciarDisparo(e).estado;                   // fase: 'disparando'
  const vuelta = Logic.deserializar(Logic.serializar(e));
  assert.strictEqual(vuelta.fase, 'preparacion',
    'una recarga a media flecha no debe dejar el botón bloqueado para siempre');
});

test('velocidad devuelve la pedida y cae en la de omisión si no existe', () => {
  assert.strictEqual(Logic.velocidad('rapida').id, 'rapida');
  assert.strictEqual(Logic.velocidad('lentisima').mult, 4);
  for (const basura of [undefined, null, '', 'turbo', 42]) {
    assert.strictEqual(Logic.velocidad(basura).id, Logic.VELOCIDAD_POR_OMISION,
      `no cayó en la de omisión con ${basura}`);
  }
});

test('las velocidades van de menor a mayor y sin repetir', () => {
  const mults = Logic.VELOCIDADES.map(v => v.mult);
  assert.deepStrictEqual(mults, [...mults].sort((a, b) => a - b));
  assert.strictEqual(new Set(mults).size, mults.length);
  assert.ok(Logic.VELOCIDADES.some(v => v.id === Logic.VELOCIDAD_POR_OMISION));
});

test('duracionTotal escala con el multiplicador', () => {
  assert.strictEqual(Logic.duracionTotal('normal'), 2100);
  assert.strictEqual(Logic.duracionTotal('lenta'), 4200);
  assert.strictEqual(Logic.duracionTotal('lentisima'), 8400);
  assert.ok(Logic.duracionTotal('rapida') < 800);
});

test('crearEstado arranca en la velocidad por omisión', () => {
  assert.strictEqual(Logic.crearEstado(['Ana']).velocidad, Logic.VELOCIDAD_POR_OMISION);
});

test('la velocidad sobrevive el guardado y se sanea si viene corrupta', () => {
  let e = Logic.crearEstado(['Ana', 'Luis']);
  e.velocidad = 'lentisima';
  assert.strictEqual(Logic.deserializar(Logic.serializar(e)).velocidad, 'lentisima');

  const corrupto = JSON.parse(Logic.serializar(e));
  corrupto.velocidad = 'turbo';
  assert.strictEqual(Logic.deserializar(JSON.stringify(corrupto)).velocidad,
    Logic.VELOCIDAD_POR_OMISION, 'una velocidad inventada no debe tirar el estado');
});

test('migra el booleano animacionCorta de la versión anterior', () => {
  const viejoCorto = JSON.stringify({ v: 1, participantes: [], yaPasaron: [],
    fase: 'preparacion', proyector: false, animacionCorta: true });
  assert.strictEqual(Logic.deserializar(viejoCorto).velocidad, 'rapida');

  const viejoLargo = JSON.stringify({ v: 1, participantes: [], yaPasaron: [],
    fase: 'preparacion', proyector: false, animacionCorta: false });
  assert.strictEqual(Logic.deserializar(viejoLargo).velocidad, Logic.VELOCIDAD_POR_OMISION);
});

test('recortar acorta con puntos y respeta lo corto', () => {
  assert.strictEqual(Logic.recortar('Ana', 14), 'Ana');
  assert.strictEqual(Logic.recortar('Bartolomé Estanislao', 14), 'Bartolomé Est…');
  assert.strictEqual(Logic.recortar('Bartolomé Estanislao', 14).length, 14);
});
