const test = require('node:test');
const assert = require('node:assert');
const Sprites = require('../js/sprites.js');

// No se puede probar "se ve bonito", pero sí que el marcado esté bien formado
// y que los parámetros lleguen al dibujo. Lo demás se revisa a ojo.

test('mono devuelve un grupo con etiquetas balanceadas', () => {
  const s = Sprites.mono({ x: 10, y: 20, escala: .6, pelo: '#A0693A', gorro: '#8E2118' });
  assert.ok(s.startsWith('<g'), 'debe abrir con <g>');
  assert.ok(s.endsWith('</g>'), 'debe cerrar el grupo');
  const abre = (s.match(/<g[\s>]/g) || []).length;
  const cierra = (s.match(/<\/g>/g) || []).length;
  assert.strictEqual(abre, cierra, 'grupos sin balancear');
});

test('mono usa los colores que se le pasan', () => {
  const s = Sprites.mono({ x: 0, y: 0, escala: 1, pelo: '#123456', gorro: '#ABCDEF' });
  assert.ok(s.includes('#123456'), 'no pintó el pelo');
  assert.ok(s.includes('#ABCDEF'), 'no pintó el gorro');
});

test('mono coloca la traslación y la escala pedidas', () => {
  const s = Sprites.mono({ x: 42, y: 99, escala: .5, pelo: '#A0693A', gorro: '#8E2118' });
  assert.ok(s.includes('translate(42,99)'), `sin traslación: ${s.slice(0, 90)}`);
  assert.ok(s.includes('scale(0.5)'), 'sin escala');
});

test('arquero cambia de forma con la tension', () => {
  const flojo = Sprites.arquero({ x: 0, y: 0, escala: 1, tension: 0 });
  const tenso = Sprites.arquero({ x: 0, y: 0, escala: 1, tension: 1 });
  assert.notStrictEqual(flojo, tenso, 'la tensión no afecta el dibujo');
  assert.ok(flojo.startsWith('<g') && tenso.endsWith('</g>'));
});

test('puntaFlecha crece con la escala', () => {
  const a = Sprites.puntaFlecha({ escala: 1 });
  const b = Sprites.puntaFlecha({ escala: 2 });
  assert.strictEqual(b.x, a.x * 2);
  assert.strictEqual(b.y, a.y * 2);
});

test('placa mete el texto escapado', () => {
  const s = Sprites.placa({ x: 0, y: 0, ancho: 60, texto: 'Ana & <Luis>' });
  assert.ok(s.includes('Ana &amp; &lt;Luis&gt;'), `sin escapar: ${s}`);
  assert.ok(!s.includes('<Luis>'), 'dejó pasar marcado crudo');
});

test('platano y hoja devuelven grupos', () => {
  for (const s of [Sprites.platano({ rot: 30 }), Sprites.hoja({ rot: -12 })]) {
    assert.ok(s.startsWith('<g') && s.endsWith('</g>'));
  }
});
