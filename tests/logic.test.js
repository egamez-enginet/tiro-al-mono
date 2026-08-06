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
