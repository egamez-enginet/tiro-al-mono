# Tiro al Mono — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una app local de una pantalla que reparte el turno de resumen semanal del equipo: cada persona es un mono colgado de una liana, el arquero dispara con un clic y a quien le pega, le toca hablar.

**Architecture:** Seis archivos estáticos sin build ni dependencias, abiertos desde `file://`. La lógica pura (sorteo, identidad, estado) vive en `js/logic.js`, separada del dibujo (`js/sprites.js`, funciones puras que devuelven cadenas SVG) y de la animación (`js/scene.js`, dueño único del `<svg>`). `js/app.js` es el único que decide y el único que toca `localStorage`.

**Tech Stack:** HTML + CSS + JavaScript ES2020 sin transpilar. SVG inline animado con `requestAnimationFrame` y CSS. Sin npm, sin frameworks, sin bundler. Pruebas con `node --test` (Node 22).

## Refinamiento sobre el spec

El spec pedía un `tests.html` que se abre a ojo. En su lugar: `js/logic.js` lleva una cola UMD
(`if (typeof module !== 'undefined') module.exports = ...`) que la hace cargable con `require` en
Node **y** como script clásico en el navegador. Así las pruebas corren de verdad con
`node --test tests/`, con ciclo rojo→verde real, y no cambia nada para el navegador.

El spec listaba los `.js` en la raíz; van en `js/` para que la raíz quede legible.
Todo lo demás del spec se respeta tal cual.

## Global Constraints

- **Sin dependencias.** Nada de npm, CDN, frameworks ni bundler. No se crea `package.json`.
- **Debe funcionar desde `file://`** con doble clic en `index.html`. Por eso `<script>` clásicos en orden, **nunca** `type="module"` (los módulos ES fallan por CORS en `file://`).
- **Paleta exacta** (variables CSS en `:root`): `--papel:#F4E9D6` `--papel-2:#EFE2C8` `--teal:#0F4C4A` `--teal-2:#15625F` `--ox:#8E2118` `--laton:#C89B3C` `--tinta:#2A1B0E` `--madera:#7A4A22` `--hoja:#4E6E3A`
- **Tipografías:** `'Alfa Slab One'` para títulos y `'Libre Baskerville'` para texto, desde Google Fonts, con `Georgia, serif` de respaldo. Sin internet la app se ve distinta pero funciona igual.
- **Copy en español, sin lenguaje de premio.** Jamás "ganador", "premio", "felicidades" ni "suerte". El cartel dice **"LE TOCA A"**. La lista de caídos se titula **"Ya pasaron"**.
- **El sorteo se resuelve antes de animar.** La animación revela una decisión ya tomada; nunca la causa.
- **Sin sonido.** Descartado explícitamente por el usuario. No agregar audio de ningún tipo.
- **Node 22** para las pruebas (`node --test`). El navegador no necesita Node.
- Los mensajes de commit terminan con `-m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"`.

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `index.html` | Estructura, panel lateral, `<svg>` raíz vacío, `<script>` en orden |
| `styles.css` | Paleta, tipografía, layout, balanceo de lianas, modo proyector |
| `js/logic.js` | **Pura.** Hash, identidad, sorteo uniforme, transiciones de estado, serialización. No toca el DOM |
| `js/sprites.js` | **Pura.** `(opciones) -> string` de SVG: mono, arquero, plátano, hoja, placa |
| `js/scene.js` | Dueño único del `<svg>`: layout de la rama, balanceo, secuencia del disparo |
| `js/app.js` | Estado, eventos de UI, `localStorage`, atajos. El único que decide |
| `tests/logic.test.js` | Pruebas de `js/logic.js` con `node --test` |

Dependencias en un solo sentido: `app.js → scene.js → sprites.js` y `app.js → logic.js`.
`logic.js` y `sprites.js` no dependen de nada.

---

### Task 1: Andamio del proyecto e identidad determinista

Arranca el repo y la primera pieza de lógica pura: el hash que le da a cada persona su mono.

**Files:**
- Create: `js/logic.js`
- Create: `tests/logic.test.js`
- Create: `.gitignore`

**Interfaces:**
- Consumes: nada
- Produces:
  - `Logic.PELOS: string[]` — hex de colores de pelo
  - `Logic.GORROS: string[]` — hex de colores de gorro
  - `Logic.hash(texto: string) -> number` — entero sin signo de 32 bits
  - `Logic.identidad(nombre: string) -> {pelo: string, gorro: string, liana: number, vaiven: number, retraso: number}`

- [ ] **Step 1: Inicializar el repo**

La carpeta todavía no es un repo de git. Desde `C:\Users\TYT\Documents\Proyectos\Ruleta`:

```bash
git init
```

Crear `.gitignore`:

```gitignore
.superpowers/
.playwright-mcp/
*.png
Thumbs.db
desktop.ini
```

- [ ] **Step 2: Escribir la prueba que falla**

Crear `tests/logic.test.js`:

```js
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
```

- [ ] **Step 3: Correr la prueba y verificar que falla**

Run: `node --test tests/`
Expected: FAIL — `Cannot find module '../js/logic.js'`

- [ ] **Step 4: Implementar lo mínimo**

Crear `js/logic.js`:

```js
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
    var vaiven = 2.6 + ((h >>> 24) % 13) / 10;          // 2.6 – 3.8 s por ciclo
    return {
      pelo:    PELOS[h % PELOS.length],
      gorro:   GORROS[(h >>> 8) % GORROS.length],
      liana:   40 + ((h >>> 16) % 71),                   // 40 – 110 px
      vaiven:  Math.round(vaiven * 10) / 10,
      retraso: Math.round(((h >>> 4) % 100) / 100 * vaiven * 10) / 10
    };
  }

  var Logic = { PELOS: PELOS, GORROS: GORROS, hash: hash, identidad: identidad };

  if (typeof module !== 'undefined' && module.exports) module.exports = Logic;
  else global.Logic = Logic;
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

- [ ] **Step 5: Correr las pruebas y verificar que pasan**

Run: `node --test tests/`
Expected: PASS — 6 pruebas verdes

Si `retraso` falla el rango, revisar que se calcule contra el `vaiven` ya redondeado.

- [ ] **Step 6: Commit**

```bash
git add .gitignore js/logic.js tests/logic.test.js docs/
git commit -m "feat: andamio del proyecto e identidad determinista de cada mono" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Sorteo uniforme y mecánica de la ronda

El corazón honesto de la app: elegir sin sesgo, y mover a la persona elegida de la rama a "ya pasaron".

**Files:**
- Modify: `js/logic.js`
- Modify: `tests/logic.test.js`

**Interfaces:**
- Consumes: `Logic.hash`, `Logic.identidad` (Task 1)
- Produces:
  - `Logic.elegirIndice(n: number, rng?: () => number) -> number` — entero en `[0, n)`. `rng` devuelve un uint32; por omisión usa `crypto.getRandomValues`
  - `Logic.crearEstado(nombres: string[]) -> Estado`
  - `Logic.iniciarDisparo(estado: Estado, rng?) -> {estado: Estado, indice: number}` — deja `fase: 'disparando'`
  - `Logic.resolverDisparo(estado: Estado, indice: number) -> {estado: Estado, elegido: Persona}`
  - `Logic.reiniciarRonda(estado: Estado) -> Estado`
  - `Estado = {participantes: Persona[], yaPasaron: Persona[], fase: 'preparacion'|'disparando'|'revelado'|'finDeRonda', proyector: boolean}`
  - `Persona = {id: string, nombre: string}`

Todas las funciones son **inmutables**: devuelven un estado nuevo, nunca mutan el que reciben.

- [ ] **Step 1: Escribir las pruebas que fallan**

Agregar al final de `tests/logic.test.js`:

```js
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
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `node --test tests/`
Expected: FAIL — `Logic.elegirIndice is not a function`

- [ ] **Step 3: Implementar**

En `js/logic.js`, antes de la línea `var Logic = {...}`, agregar:

```js
  // rng por omisión: un uint32 criptográfico. Existe igual en navegador y en Node 22.
  function rngPorOmision() {
    var buf = new Uint32Array(1);
    (typeof crypto !== 'undefined' ? crypto : require('crypto').webcrypto).getRandomValues(buf);
    return buf[0];
  }

  // Uniforme de verdad. Con `% n` a secas los primeros índices salen un pelo más
  // seguido; se nota poco en una reunión, pero la corrección cuesta dos líneas y
  // significa que si alguien acusa a la app de tener favoritos, hay respuesta.
  function elegirIndice(n, rng) {
    if (!Number.isInteger(n) || n < 1) throw new Error('elegirIndice necesita n >= 1');
    rng = rng || rngPorOmision;
    var limite = Math.floor(0x100000000 / n) * n, v;
    do { v = rng(); } while (v >= limite);
    return v % n;
  }

  var contadorId = 0;
  function nuevoId() {
    contadorId += 1;
    return 'p' + contadorId + '-' + hash(String(contadorId) + ':' + contadorId * 2654435761).toString(36);
  }

  function crearEstado(nombres) {
    return {
      participantes: (nombres || [])
        .map(function (n) { return String(n).trim(); })
        .filter(function (n) { return n.length > 0; })
        .map(function (n) { return { id: nuevoId(), nombre: n }; }),
      yaPasaron: [],
      fase: 'preparacion',
      proyector: false
    };
  }

  function clonar(estado) {
    return {
      participantes: estado.participantes.slice(),
      yaPasaron: estado.yaPasaron.slice(),
      fase: estado.fase,
      proyector: estado.proyector
    };
  }

  function iniciarDisparo(estado, rng) {
    if (!estado.participantes.length) throw new Error('no hay a quién dispararle');
    var siguiente = clonar(estado);
    siguiente.fase = 'disparando';
    return { estado: siguiente, indice: elegirIndice(estado.participantes.length, rng) };
  }

  function resolverDisparo(estado, indice) {
    var elegido = estado.participantes[indice];
    if (!elegido) throw new Error('índice fuera de la rama: ' + indice);
    var siguiente = clonar(estado);
    siguiente.participantes = estado.participantes.filter(function (_, i) { return i !== indice; });
    siguiente.yaPasaron = estado.yaPasaron.concat([elegido]);
    siguiente.fase = siguiente.participantes.length ? 'revelado' : 'finDeRonda';
    return { estado: siguiente, elegido: elegido };
  }

  function reiniciarRonda(estado) {
    var siguiente = clonar(estado);
    siguiente.participantes = estado.yaPasaron.concat(estado.participantes);
    siguiente.yaPasaron = [];
    siguiente.fase = 'preparacion';
    return siguiente;
  }
```

Y ampliar el objeto exportado:

```js
  var Logic = {
    PELOS: PELOS, GORROS: GORROS, hash: hash, identidad: identidad,
    elegirIndice: elegirIndice, crearEstado: crearEstado,
    iniciarDisparo: iniciarDisparo, resolverDisparo: resolverDisparo,
    reiniciarRonda: reiniciarRonda
  };
```

- [ ] **Step 4: Correr y verificar que pasan**

Run: `node --test tests/`
Expected: PASS — las 6 de Task 1 más 9 nuevas

- [ ] **Step 5: Commit**

```bash
git add js/logic.js tests/logic.test.js
git commit -m "feat: sorteo uniforme sin sesgo de modulo y mecanica de ronda" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Serialización del estado

Para que una recarga a media reunión no borre el orden en que ya habló la gente.

**Files:**
- Modify: `js/logic.js`
- Modify: `tests/logic.test.js`

**Interfaces:**
- Consumes: `Logic.crearEstado`, `Logic.resolverDisparo` (Task 2)
- Produces:
  - `Logic.serializar(estado: Estado) -> string`
  - `Logic.deserializar(texto: string) -> Estado | null` — `null` si el texto es basura o de otra versión
  - `Logic.LLAVE: string` — `'tiro-al-mono/v1'`
  - `Logic.recortar(nombre: string, max: number) -> string`

- [ ] **Step 1: Escribir las pruebas que fallan**

Agregar a `tests/logic.test.js`:

```js
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

test('recortar acorta con puntos y respeta lo corto', () => {
  assert.strictEqual(Logic.recortar('Ana', 14), 'Ana');
  assert.strictEqual(Logic.recortar('Bartolomé Estanislao', 14), 'Bartolomé Est…');
  assert.strictEqual(Logic.recortar('Bartolomé Estanislao', 14).length, 14);
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `node --test tests/`
Expected: FAIL — `Logic.serializar is not a function`

- [ ] **Step 3: Implementar**

En `js/logic.js`, antes del objeto exportado:

```js
  var LLAVE = 'tiro-al-mono/v1';
  var VERSION = 1;
  var FASES = ['preparacion', 'disparando', 'revelado', 'finDeRonda'];

  function serializar(estado) {
    return JSON.stringify({
      v: VERSION,
      participantes: estado.participantes,
      yaPasaron: estado.yaPasaron,
      fase: estado.fase,
      proyector: !!estado.proyector
    });
  }

  function esListaDePersonas(x) {
    return Array.isArray(x) && x.every(function (p) {
      return p && typeof p.id === 'string' && typeof p.nombre === 'string';
    });
  }

  function deserializar(texto) {
    var d;
    try { d = JSON.parse(texto); } catch (e) { return null; }
    if (!d || typeof d !== 'object' || d.v !== VERSION) return null;
    if (!esListaDePersonas(d.participantes) || !esListaDePersonas(d.yaPasaron)) return null;
    if (FASES.indexOf(d.fase) === -1) return null;
    // 'disparando' es una fase transitoria: si la recarga cayó justo a media flecha,
    // guardarla dejaría el botón bloqueado para siempre. Se aterriza en algo estable.
    var fase = d.fase;
    if (fase === 'disparando') fase = d.participantes.length ? 'preparacion' : 'finDeRonda';
    return {
      participantes: d.participantes,
      yaPasaron: d.yaPasaron,
      fase: fase,
      proyector: !!d.proyector
    };
  }

  function recortar(nombre, max) {
    return nombre.length <= max ? nombre : nombre.slice(0, max - 1) + '…';
  }
```

Agregar `LLAVE: LLAVE, serializar: serializar, deserializar: deserializar, recortar: recortar` al objeto `Logic`.

- [ ] **Step 4: Correr y verificar que pasan**

Run: `node --test tests/`
Expected: PASS — 20 pruebas verdes

- [ ] **Step 5: Commit**

```bash
git add js/logic.js tests/logic.test.js
git commit -m "feat: serializacion del estado resistente a recargas y basura" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Cascarón visual — index.html y styles.css

La app todavía no hace nada, pero ya se ve como debe verse. Se verifica a ojo abriendo el archivo.

**Files:**
- Create: `index.html`
- Create: `styles.css`

**Interfaces:**
- Consumes: nada
- Produces (IDs que las tareas siguientes buscan con `getElementById`):
  - `#escena` — el `<svg>` raíz, `viewBox="0 0 900 520"`
  - `#disparar` — el botón grande
  - `#lista` — `<ul>` de participantes
  - `#nuevo` — `<input>` de nombre nuevo
  - `#agregar` — botón de agregar
  - `#pegar` — `<textarea>` de pegar lista
  - `#aplicar-pegado` — botón que aplica el textarea
  - `#orden` — `<ol>` de "Ya pasaron"
  - `#cartel`, `#cartel-nombre` — el cartel de "LE TOCA A"
  - `#reiniciar` — botón de reiniciar
  - `#proyector` — botón de modo proyector
  - `#aviso` — línea de mensajes ("agrega a alguien primero")
  - clase `proyector` en `<body>` para el modo proyector

- [ ] **Step 1: Crear `index.html`**

```html
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tiro al Mono</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="styles.css">
</head>
<body>

<main class="tablero">

  <section class="izquierda">
    <header class="titular">
      <p class="kicker">Reunión semanal</p>
      <h1>Tiro al Mono</h1>
      <p class="lema">¿A quién le toca dar su resumen?</p>
    </header>

    <div class="marco">
      <svg id="escena" viewBox="0 0 900 520" role="img"
           aria-label="Escena de selva con un arquero y los monos del equipo"></svg>
      <div id="cartel" class="cartel" hidden>
        <span>Le toca a</span>
        <strong id="cartel-nombre"></strong>
      </div>
    </div>

    <div class="acciones">
      <button id="disparar" class="tirar" type="button">Disparar</button>
      <p id="aviso" class="aviso" role="status"></p>
    </div>
  </section>

  <aside class="panel">
    <div class="panel-caja">
      <h2>En la rama</h2>
      <ul id="lista" class="lista"></ul>

      <form id="forma-agregar" class="agregar">
        <input id="nuevo" type="text" placeholder="Nombre" autocomplete="off" maxlength="40">
        <button id="agregar" type="submit">+</button>
      </form>

      <details class="pegado">
        <summary>Pegar lista completa</summary>
        <textarea id="pegar" rows="6" placeholder="Un nombre por línea&#10;Ana&#10;Luis&#10;Sofía"></textarea>
        <button id="aplicar-pegado" type="button">Reemplazar la rama</button>
      </details>
    </div>

    <div class="panel-caja">
      <h2>Ya pasaron</h2>
      <ol id="orden" class="orden"></ol>
    </div>

    <div class="panel-pie">
      <button id="proyector" type="button">Modo proyector</button>
      <button id="reiniciar" type="button">Reiniciar</button>
    </div>
  </aside>

</main>

<script src="js/logic.js"></script>
<script src="js/sprites.js"></script>
<script src="js/scene.js"></script>
<script src="js/app.js"></script>
</body>
</html>
```

Los cuatro `<script>` van en ese orden y **sin** `type="module"`: así funciona con doble clic
desde `file://`. Todavía no existen `sprites.js`, `scene.js` ni `app.js`; el navegador se queja en
consola y no pasa nada. Se crean en las tareas 5, 6 y 8.

- [ ] **Step 2: Crear `styles.css`**

```css
:root {
  --papel: #F4E9D6;
  --papel-2: #EFE2C8;
  --teal: #0F4C4A;
  --teal-2: #15625F;
  --ox: #8E2118;
  --laton: #C89B3C;
  --tinta: #2A1B0E;
  --madera: #7A4A22;
  --hoja: #4E6E3A;
  --display: 'Alfa Slab One', Georgia, serif;
  --texto: 'Libre Baskerville', Georgia, serif;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  min-height: 100vh;
  background: var(--papel);
  /* grano de papel: un punto cada 4px, casi invisible pero le quita lo plano */
  background-image: radial-gradient(rgba(120, 90, 40, .07) 1px, transparent 1px);
  background-size: 4px 4px;
  color: var(--tinta);
  font-family: var(--texto);
}

.tablero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 28px;
  max-width: 1440px;
  margin: 0 auto;
  padding: 26px 30px 34px;
}

/* ── titular ── */
.titular { margin-bottom: 14px; }
.kicker {
  margin: 0 0 6px;
  font-size: 10px;
  letter-spacing: .34em;
  text-transform: uppercase;
  color: var(--ox);
}
.titular h1 {
  margin: 0;
  font: 44px/.95 var(--display);
  color: var(--teal);
  letter-spacing: -.01em;
}
.lema {
  margin: 8px 0 0;
  font-style: italic;
  font-size: 14px;
  color: var(--madera);
}

/* ── marco de la escena ── */
.marco {
  position: relative;
  border: 6px solid var(--teal);
  border-radius: 5px;
  box-shadow: 0 0 0 2px var(--laton) inset, 7px 7px 0 rgba(42, 27, 14, .14);
  background: var(--papel);
  overflow: hidden;
}
#escena { display: block; width: 100%; height: auto; }

/* ── cartel de "le toca a" ── */
.cartel {
  position: absolute;
  left: 50%;
  bottom: 22px;
  transform: translateX(-50%) rotate(-1.2deg);
  padding: 14px 34px;
  background: var(--papel-2);
  border: 3px solid var(--ox);
  box-shadow: 6px 6px 0 var(--teal);
  text-align: center;
  animation: cartel-entra .32s cubic-bezier(.2, 1.5, .4, 1) both;
}
.cartel[hidden] { display: none; }
.cartel span {
  display: block;
  font-size: 9.5px;
  letter-spacing: .3em;
  text-transform: uppercase;
  color: var(--teal);
}
.cartel strong {
  display: block;
  margin-top: 5px;
  font: 30px/1 var(--display);
  color: var(--ox);
}
@keyframes cartel-entra {
  from { transform: translateX(-50%) rotate(-1.2deg) scale(.7); opacity: 0; }
  to   { transform: translateX(-50%) rotate(-1.2deg) scale(1); opacity: 1; }
}

/* ── botón de disparar ── */
.acciones { margin-top: 18px; display: flex; align-items: center; gap: 18px; }
.tirar {
  padding: 15px 46px;
  border: 3px solid var(--teal);
  background: var(--ox);
  color: var(--papel);
  font: 19px/1 var(--display);
  letter-spacing: .1em;
  cursor: pointer;
  box-shadow: 5px 5px 0 var(--teal);
  transition: transform .07s, box-shadow .07s;
}
.tirar:hover:not(:disabled) { transform: translate(-1px, -1px); box-shadow: 6px 6px 0 var(--teal); }
.tirar:active:not(:disabled) { transform: translate(4px, 4px); box-shadow: 1px 1px 0 var(--teal); }
.tirar:disabled { background: #B59C7E; border-color: #8C7A62; box-shadow: 5px 5px 0 #8C7A62; cursor: not-allowed; }
.aviso { margin: 0; font-size: 12.5px; font-style: italic; color: var(--ox); }

/* ── panel lateral ── */
.panel { display: flex; flex-direction: column; gap: 16px; }
.panel-caja {
  padding: 18px 20px;
  background: var(--papel-2);
  border: 2px solid var(--laton);
  border-radius: 3px;
}
.panel-caja h2 {
  margin: 0 0 12px;
  font: 16px/1 var(--display);
  color: var(--teal);
  letter-spacing: .02em;
}

.lista, .orden { margin: 0; padding: 0; list-style: none; }
.lista li {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 0;
  border-bottom: 1px dotted rgba(42, 27, 14, .3);
  font-size: 13.5px;
}
.lista .punto { width: 11px; height: 11px; border-radius: 50%; flex: none; box-shadow: inset 0 0 0 1px rgba(0,0,0,.2); }
.lista .nombre { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lista .quitar {
  border: 0; background: none; cursor: pointer;
  color: var(--ox); font-size: 16px; line-height: 1; padding: 2px 4px;
}
.lista .vacia { color: var(--madera); font-style: italic; border: 0; }

.orden { counter-reset: turno; }
.orden li {
  counter-increment: turno;
  padding: 6px 0 6px 30px;
  position: relative;
  font-size: 13.5px;
  border-bottom: 1px dotted rgba(42, 27, 14, .22);
}
.orden li::before {
  content: counter(turno, decimal-leading-zero);
  position: absolute; left: 0;
  font-size: 10px; letter-spacing: .1em;
  color: var(--ox);
  top: 8px;
}
.orden .vacia { padding-left: 0; color: var(--madera); font-style: italic; border: 0; }
.orden .vacia::before { content: ''; }

/* ── formulario ── */
.agregar { display: flex; gap: 7px; margin-top: 13px; }
.agregar input {
  flex: 1; min-width: 0;
  padding: 9px 11px;
  border: 2px solid var(--madera);
  background: var(--papel);
  font: 13.5px var(--texto);
  color: var(--tinta);
}
.agregar input:focus { outline: 2px solid var(--laton); outline-offset: 1px; }
.agregar button, .panel-pie button, .pegado button {
  border: 2px solid var(--teal);
  background: var(--papel);
  color: var(--teal);
  font: 13px var(--texto);
  padding: 9px 13px;
  cursor: pointer;
}
.agregar button { font: 17px/1 var(--display); padding: 0 15px; }
.agregar button:hover, .panel-pie button:hover, .pegado button:hover { background: var(--teal); color: var(--papel); }

.pegado { margin-top: 15px; font-size: 12.5px; }
.pegado summary { cursor: pointer; color: var(--teal); }
.pegado textarea {
  width: 100%; margin: 9px 0;
  padding: 9px;
  border: 2px solid var(--madera);
  background: var(--papel);
  font: 12.5px/1.6 var(--texto);
  resize: vertical;
}
.pegado button { width: 100%; }

.panel-pie { display: flex; gap: 9px; }
.panel-pie button { flex: 1; font-size: 12px; }

/* ── modo proyector ── */
body.proyector .panel-caja:first-child,
body.proyector .panel-pie,
body.proyector .titular .lema { display: none; }
body.proyector .tablero { grid-template-columns: minmax(0, 1fr); max-width: none; padding: 16px 20px; }
body.proyector .panel { flex-direction: row; }
body.proyector .panel-caja { flex: 1; }
body.proyector .orden { display: flex; flex-wrap: wrap; gap: 6px 20px; }
body.proyector .orden li { border: 0; }
body.proyector .titular h1 { font-size: 34px; }
body.proyector .tirar { padding: 20px 66px; font-size: 25px; }
body.proyector .cartel strong { font-size: 44px; }

/* ── pantallas angostas ── */
@media (max-width: 960px) {
  .tablero { grid-template-columns: minmax(0, 1fr); }
}

/* ── quien pidió menos movimiento ── */
@media (prefers-reduced-motion: reduce) {
  .cartel { animation-duration: .01s; }
  .tirar { transition: none; }
}
```

- [ ] **Step 3: Verificar a ojo**

Abrir `index.html` con doble clic. Debe verse: el titular en verde petróleo con la slab, el marco
vacío con doble borde y sombra dura, el botón oxblood con sombra desplazada, y el panel de papel a
la derecha con las dos cajas vacías. La consola se queja de tres scripts que no existen — es lo
esperado.

Comprobar también que el botón se ve pulsado (se desplaza 4px) al hacer clic, y que la caja del
panel tiene el borde de latón.

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css
git commit -m "feat: cascaron visual con la paleta de feria vintage" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: sprites.js — el dibujo

Funciones puras que devuelven cadenas de SVG. No saben qué es un participante ni tocan el DOM.

**Files:**
- Create: `js/sprites.js`
- Create: `tests/sprites.test.js`

**Interfaces:**
- Consumes: nada
- Produces:
  - `Sprites.mono({x, y, escala, pelo, gorro, rot}) -> string` — caja local 60×74, cabeza arriba, ambos brazos alzados agarrando la liana
  - `Sprites.arquero({x, y, escala, tension}) -> string` — de perfil mirando a la derecha, caja 106×104. `tension` de 0 (relajado) a 1 (arco a tope)
  - `Sprites.puntaFlecha({escala}) -> {x, y}` — dónde queda la punta de la flecha del arquero, en coordenadas locales sin escalar
  - `Sprites.flecha() -> string` — la flecha suelta, apuntando a la derecha, origen en la punta
  - `Sprites.platano({rot}) -> string`
  - `Sprites.hoja({rot}) -> string`
  - `Sprites.placa({x, y, ancho, texto}) -> string`

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `tests/sprites.test.js`:

```js
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
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `node --test tests/`
Expected: FAIL — `Cannot find module '../js/sprites.js'`

- [ ] **Step 3: Implementar**

Crear `js/sprites.js`. El mono ya está calibrado: caja local de 60 de ancho por 74 de alto, con la
cabeza en `y≈22` y los brazos alzados terminando en `y≈3`, de modo que al colgarlo de una liana la
liana termina justo en las manos.

```js
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
    var jalon = 16 * t;                 // cuánto retrocede la cuerda
    var curva = 88 + 12 * t;            // cuánto se dobla la pala del arco
    var codo = 40 - 10 * t;             // el codo sube al tensar
    var s = '<g transform="translate(' + n(o.x) + ',' + n(o.y) + ') scale(' + n(o.escala) + ')">';
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
    // flecha nocada
    s += '<path d="M' + n(56 - jalon) + ',34 L' + PUNTA.x + ',34" stroke="' + TINTA + '" stroke-width="2.6"/>';
    s += '<path d="M' + PUNTA.x + ',34 l-9,-4 l0,8 Z" fill="' + LATON + '"/>';
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
```

- [ ] **Step 4: Correr y verificar que pasan**

Run: `node --test tests/`
Expected: PASS — 20 de logic más 7 de sprites

- [ ] **Step 5: Commit**

```bash
git add js/sprites.js tests/sprites.test.js
git commit -m "feat: sprites del mono, el arquero y las particulas" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: scene.js — la rama con los monos meciéndose

La escena estática y viva: rama, lianas, monos con su balanceo, placas, arquero y fondo.

**Files:**
- Create: `js/scene.js`

**Interfaces:**
- Consumes: `Sprites.*` (Task 5), `Logic.identidad`, `Logic.recortar` (Tasks 1 y 3)
- Produces:
  - `Scene.init(svgEl: SVGElement)` — se llama una vez
  - `Scene.render(participantes: Persona[])` — repinta la rama entera
  - `Scene.posicionDe(indice: number) -> {x, y}` — centro del mono, en coordenadas del viewBox (lo usa Task 7)
  - `Scene.ANCHO = 900`, `Scene.ALTO = 520`

- [ ] **Step 1: Implementar `js/scene.js`**

El `viewBox` es `0 0 900 520`. La rama cruza arriba, el arquero va abajo a la izquierda, y los monos
se reparten en el ancho disponible a la derecha del arquero.

```js
/* Dueño único del <svg>. Recibe participantes y los pinta; recibe la orden de
   dispararle a un índice y ejecuta la animación. NO decide a quién se le dispara. */
(function (global) {
  'use strict';

  var ANCHO = 900, ALTO = 520;
  var RAMA_Y = 74;                  // altura de la rama
  var X0 = 250, X1 = 856;           // franja donde caben los monos
  var TEAL = '#0F4C4A', MADERA = '#7A4A22', HOJA = '#4E6E3A';

  var svg = null, capaFondo = null, capaMonos = null, capaVuelo = null;
  var monos = [];                   // {persona, x, y, escala, cx, cy}
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
    reducido = global.matchMedia &&
               global.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    var filas = total > 8 ? 2 : 1;
    var porFila = Math.ceil(total / filas);
    var escala = Math.min(1.05, Math.max(.5, (X1 - X0) / (porFila * 96)));

    var s = '';
    participantes.forEach(function (persona, i) {
      var fila = Math.floor(i / porFila);
      var enFila = i % porFila;
      var cuantosEnEstaFila = Math.min(porFila, total - fila * porFila);
      var paso = (X1 - X0) / cuantosEnEstaFila;
      var x = X0 + paso * (enFila + .5) - 30 * escala;

      var id = Logic.identidad(persona.nombre);
      var largo = id.liana * escala + fila * 118;
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
      s += Sprites.placa({ x: x + 4 * escala, y: y + 76 * escala,
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
                ANCHO: ANCHO, ALTO: ALTO,
                _interno: { monos: function () { return monos; },
                            arquero: ARQUERO, dibujarArquero: dibujarArquero,
                            capaVuelo: function () { return capaVuelo; },
                            capaMonos: function () { return capaMonos; },
                            reducido: function () { return reducido; } } };

  global.Scene = Scene;
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

- [ ] **Step 2: Agregar el balanceo a `styles.css`**

Al final de `styles.css`:

```css
/* ── balanceo de las lianas ── */
.colgado {
  transform-origin: var(--pivote);
  animation: mecer var(--vaiven) ease-in-out var(--retraso) infinite alternate;
}
@keyframes mecer {
  from { transform: rotate(-2.2deg); }
  to   { transform: rotate(2.2deg); }
}
.colgado.cayendo { animation: none; }

@media (prefers-reduced-motion: reduce) {
  .colgado { animation: none; }
}
```

- [ ] **Step 3: Verificar a ojo con un arranque temporal**

Todavía no existe `app.js`. Para ver la escena, abrir `index.html` y pegar en la consola del
navegador:

```js
Scene.init(document.getElementById('escena'));
Scene.render(['Ana','Luis','Sofía','Diego','Mar'].map((n,i) => ({id:'t'+i, nombre:n})));
```

Debe verse: la rama cruzando arriba, cinco monos colgando a alturas distintas, cada uno meciéndose
con su propio ritmo y fuera de sincronía, su placa de latón debajo, y el arquero abajo a la
izquierda con el arco relajado. Los pies de los monos no deben tocar el suelo y las lianas deben
salir de la rama, no del aire.

Probar también con 3, con 8 y con 12 nombres: con 12 deben aparecer dos niveles.

- [ ] **Step 4: Commit**

```bash
git add js/scene.js styles.css
git commit -m "feat: escena de la rama con monos meciendose fuera de sincronia" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: La secuencia del disparo

Un clic: tensado, suelta, vuelo en parábola, impacto, caída y plátanos. Devuelve una promesa.

**Files:**
- Modify: `js/scene.js`
- Modify: `styles.css`

**Interfaces:**
- Consumes: `Scene.posicionDe`, `Scene._interno` (Task 6), `Sprites.flecha`, `Sprites.platano`, `Sprites.hoja` (Task 5)
- Produces:
  - `Scene.shoot(indice: number) -> Promise<void>` — se resuelve cuando el mono ya cayó y es momento de mostrar el cartel

Tiempos (del spec). Con `prefers-reduced-motion` todo se comprime a ~700 ms:

| Tramo | Normal | Reducido |
|---|---|---|
| Tensado | 450 ms | 120 ms |
| Suelta | 70 ms | 30 ms |
| Vuelo | 830 ms | 300 ms |
| Impacto | 100 ms | 50 ms |
| Caída | 650 ms | 200 ms |

- [ ] **Step 1: Implementar el motor de animación en `js/scene.js`**

Agregar antes de `var Scene = {`:

```js
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

  function tiempos() {
    return reducido
      ? { tensar: 120, soltar: 30, vuelo: 300, impacto: 50, caida: 200 }
      : { tensar: 450, soltar: 70, vuelo: 830, impacto: 100, caida: 650 };
  }

  function lluvia(x, y) {
    var piezas = [], i, s = '';
    var cuantas = reducido ? 6 : 16;
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
        rot: Math.random() * 360,
        html: esHoja ? Sprites.hoja({ rot: 0 }) : Sprites.platano({ rot: 0 })
      });
      s += '<g class="pieza" data-i="' + i + '">' + piezas[i].html + '</g>';
    }
    var capa = crear('g');
    capa.innerHTML = s;
    capaVuelo.appendChild(capa);
    var nodos = capa.querySelectorAll('.pieza');

    animar(reducido ? 320 : 1100, function (t) {
      piezas.forEach(function (p, k) {
        p.x += p.vx; p.y += p.vy; p.vy += .34; p.rot += p.giro;
        nodos[k].setAttribute('transform',
          'translate(' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ') rotate(' + p.rot.toFixed(1) + ')');
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
    setTimeout(function () { g.remove(); }, reducido ? 120 : 260);
  }

  function shoot(indice) {
    var destino = posicionDe(indice);
    if (!destino) return Promise.reject(new Error('no hay mono en el índice ' + indice));

    var T = tiempos();
    var grupo = capaMonos.querySelector('[data-indice="' + indice + '"]');
    var origen = {
      x: ARQUERO.x + Sprites.puntaFlecha({ escala: ARQUERO.escala }).x,
      y: ARQUERO.y + Sprites.puntaFlecha({ escala: ARQUERO.escala }).y
    };
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
      var desdeX = 0, haciaX = (Math.random() - .3) * 90;
      return animar(T.caida, function (t) {
        var caida = t * t * (ALTO - destino.y + 140);
        grupo.setAttribute('transform',
          'translate(' + (desdeX + haciaX * t).toFixed(1) + ',' + caida.toFixed(1) +
          ') rotate(' + (540 * t).toFixed(1) + ' ' + destino.x + ' ' + destino.y + ')');
        grupo.setAttribute('opacity', t > .75 ? ((1 - t) / .25).toFixed(2) : '1');
      });
    })
    .then(function () { if (grupo) grupo.remove(); });
  }
```

Agregar `shoot: shoot` al objeto `Scene`.

- [ ] **Step 2: Agregar la sacudida a `styles.css`**

```css
/* ── sacudón del impacto ── */
.sacudida { animation: sacudir .1s linear 2; }
@keyframes sacudir {
  0%, 100% { transform: translateX(0); }
  25%  { transform: translateX(-3px); }
  75%  { transform: translateX(3px); }
}
@media (prefers-reduced-motion: reduce) {
  .sacudida { animation: none; }
}
```

- [ ] **Step 3: Verificar a ojo**

Abrir `index.html` y en la consola:

```js
Scene.init(document.getElementById('escena'));
Scene.render(['Ana','Luis','Sofía','Diego','Mar'].map((n,i) => ({id:'t'+i, nombre:n})));
Scene.shoot(2).then(() => console.log('cayó Sofía'));
```

Revisar en orden:
1. El arquero jala la cuerda y el arco se dobla (no salta de golpe a tensado)
2. La flecha sale y viaja en curva, con la punta apuntando por donde va
3. Al llegar hay destello y sacudón
4. El mono gira cayendo y se desvanece cerca del final
5. Caen plátanos y hojas girando, con gravedad, y desaparecen
6. La consola imprime `cayó Sofía` al terminar

Probar `Scene.shoot(0)` y `Scene.shoot(4)` para ver que la parábola cambia de forma según la
distancia. Probar en un navegador con "reducir movimiento" activado: todo debe pasar en menos de un
segundo.

- [ ] **Step 4: Commit**

```bash
git add js/scene.js styles.css
git commit -m "feat: secuencia del disparo con tensado, parabola, impacto y lluvia de platanos" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: app.js — todo conectado

El primer momento en que la app funciona de verdad: editar la lista, disparar, ver el orden, y que
sobreviva una recarga.

**Files:**
- Create: `js/app.js`

**Interfaces:**
- Consumes: `Logic.*` (Tasks 1–3), `Scene.init`, `Scene.render`, `Scene.shoot` (Tasks 6–7), los IDs de Task 4
- Produces: nada (IIFE). Expone `window.App = {estado: () => estado}` solo para depurar.

- [ ] **Step 1: Implementar `js/app.js`**

```js
/* El único que decide. Estado, eventos, persistencia. No dibuja SVG a mano. */
(function () {
  'use strict';

  var estado = null;
  var el = {};

  function $(id) { return document.getElementById(id); }

  function guardar() {
    try { localStorage.setItem(Logic.LLAVE, Logic.serializar(estado)); }
    catch (e) { /* modo privado o cuota llena: la app sigue, solo no recuerda */ }
  }

  function cargar() {
    try {
      var crudo = localStorage.getItem(Logic.LLAVE);
      return crudo ? Logic.deserializar(crudo) : null;
    } catch (e) { return null; }
  }

  // ── pintado del panel ──

  function pintarLista() {
    if (!estado.participantes.length) {
      el.lista.innerHTML = '<li class="vacia">La rama está vacía</li>';
      return;
    }
    el.lista.innerHTML = '';
    estado.participantes.forEach(function (p) {
      var id = Logic.identidad(p.nombre);
      var li = document.createElement('li');

      var punto = document.createElement('span');
      punto.className = 'punto';
      punto.style.background = id.gorro;

      var nombre = document.createElement('span');
      nombre.className = 'nombre';
      nombre.textContent = p.nombre;          // textContent: nada de innerHTML con nombres

      var quitar = document.createElement('button');
      quitar.className = 'quitar';
      quitar.type = 'button';
      quitar.textContent = '×';
      quitar.title = 'Quitar a ' + p.nombre;
      quitar.addEventListener('click', function () { quitarPersona(p.id); });

      li.appendChild(punto);
      li.appendChild(nombre);
      li.appendChild(quitar);
      el.lista.appendChild(li);
    });
  }

  function pintarOrden() {
    if (!estado.yaPasaron.length) {
      el.orden.innerHTML = '<li class="vacia">Nadie todavía</li>';
      return;
    }
    el.orden.innerHTML = '';
    estado.yaPasaron.forEach(function (p) {
      var li = document.createElement('li');
      li.textContent = p.nombre;
      el.orden.appendChild(li);
    });
  }

  function pintarBoton() {
    var puede = estado.fase !== 'disparando' && estado.participantes.length > 0;
    el.disparar.disabled = !puede;
    if (estado.fase === 'finDeRonda') {
      el.disparar.textContent = 'Otra ronda';
      el.disparar.disabled = false;
      el.aviso.textContent = 'Ya pasaron todos.';
    } else {
      el.disparar.textContent = 'Disparar';
      el.aviso.textContent = estado.participantes.length ? '' : 'Agrega a alguien primero.';
    }
  }

  function pintar() {
    pintarLista();
    pintarOrden();
    pintarBoton();
    document.body.classList.toggle('proyector', !!estado.proyector);
    Scene.render(estado.participantes);
  }

  function cartel(nombre) {
    el.cartelNombre.textContent = nombre;
    el.cartel.hidden = false;
  }
  function ocultarCartel() { el.cartel.hidden = true; }

  // ── acciones ──

  function agregarPersona(nombre) {
    nombre = String(nombre).trim();
    if (!nombre) return;
    var nuevo = Logic.crearEstado([nombre]).participantes[0];
    estado = Object.assign({}, estado, {
      participantes: estado.participantes.concat([nuevo]),
      fase: estado.fase === 'finDeRonda' ? 'preparacion' : estado.fase
    });
    ocultarCartel();
    guardar();
    pintar();
  }

  function quitarPersona(id) {
    estado = Object.assign({}, estado, {
      participantes: estado.participantes.filter(function (p) { return p.id !== id; })
    });
    guardar();
    pintar();
  }

  function reemplazarLista(texto) {
    var nombres = texto.split(/\r?\n/);
    var nuevo = Logic.crearEstado(nombres);
    nuevo.proyector = estado.proyector;
    estado = nuevo;
    ocultarCartel();
    guardar();
    pintar();
  }

  function disparar() {
    if (estado.fase === 'finDeRonda') { reiniciar(true); return; }
    if (estado.fase === 'disparando' || !estado.participantes.length) return;

    ocultarCartel();
    var inicio = Logic.iniciarDisparo(estado);
    estado = inicio.estado;                    // fase: 'disparando' -> botón bloqueado
    pintarBoton();
    // Ojo: no se llama a pintar() aquí. Repintar la escena a media animación
    // borraría el mono que está cayendo.

    Scene.shoot(inicio.indice).then(function () {
      var r = Logic.resolverDisparo(estado, inicio.indice);
      estado = r.estado;
      cartel(r.elegido.nombre);
      guardar();
      pintarLista();
      pintarOrden();
      pintarBoton();
      // La escena ya quitó al mono caído; se repinta solo al cambiar la lista.
    }).catch(function (err) {
      // Si la animación truena, el botón no puede quedarse bloqueado para siempre.
      console.error(err);
      estado = Object.assign({}, estado, {
        fase: estado.participantes.length ? 'preparacion' : 'finDeRonda'
      });
      pintar();
    });
  }

  function reiniciar(sinPreguntar) {
    if (!sinPreguntar && estado.yaPasaron.length &&
        !confirm('¿Reiniciar la ronda? Vuelven todos a la rama.')) return;
    estado = Logic.reiniciarRonda(estado);
    ocultarCartel();
    guardar();
    pintar();
  }

  function proyector() {
    estado = Object.assign({}, estado, { proyector: !estado.proyector });
    guardar();
    document.body.classList.toggle('proyector', estado.proyector);
    el.proyector.textContent = estado.proyector ? 'Salir del proyector' : 'Modo proyector';
  }

  // ── arranque ──

  function arrancar() {
    el.escena = $('escena');
    el.disparar = $('disparar');
    el.lista = $('lista');
    el.nuevo = $('nuevo');
    el.formaAgregar = $('forma-agregar');
    el.pegar = $('pegar');
    el.aplicarPegado = $('aplicar-pegado');
    el.orden = $('orden');
    el.cartel = $('cartel');
    el.cartelNombre = $('cartel-nombre');
    el.reiniciar = $('reiniciar');
    el.proyector = $('proyector');
    el.aviso = $('aviso');

    estado = cargar() || Logic.crearEstado([]);

    Scene.init(el.escena);

    el.formaAgregar.addEventListener('submit', function (ev) {
      ev.preventDefault();
      agregarPersona(el.nuevo.value);
      el.nuevo.value = '';
      el.nuevo.focus();
    });
    el.aplicarPegado.addEventListener('click', function () {
      reemplazarLista(el.pegar.value);
      el.pegar.value = '';
    });
    el.disparar.addEventListener('click', disparar);
    el.reiniciar.addEventListener('click', function () { reiniciar(false); });
    el.proyector.addEventListener('click', proyector);

    pintar();
    el.proyector.textContent = estado.proyector ? 'Salir del proyector' : 'Modo proyector';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
  } else {
    arrancar();
  }

  window.App = { estado: function () { return estado; } };
})();
```

- [ ] **Step 2: Verificar el recorrido completo a ojo**

Abrir `index.html` con doble clic (no con servidor, para confirmar que `file://` funciona):

1. Sin nadie: el botón está apagado y dice "Agrega a alguien primero"
2. Agregar "Ana": aparece un mono en la rama y un punto de su color en la lista
3. Abrir *Pegar lista completa*, pegar `Ana`/`Luis`/`Sofía`/`Diego`/`Mar` en cinco líneas, aplicar: cinco monos
4. Disparar: la secuencia corre y aparece el cartel **LE TOCA A** con un nombre
5. Ese nombre está en *Ya pasaron* con el número 01, y ya no está en *En la rama*
6. Disparar cuatro veces más: al último, el botón cambia a **Otra ronda** y el aviso dice "Ya pasaron todos"
7. **Recargar la página a media ronda** (con dos o tres caídos): el orden y la rama siguen igual
8. Clic en *Otra ronda*: vuelven los cinco, con los mismos gorros y las mismas lianas que antes
9. Doble clic rápido en *Disparar*: solo se ejecuta un disparo
10. La × junto a un nombre lo quita de la rama

- [ ] **Step 3: Commit**

```bash
git add js/app.js
git commit -m "feat: conectar estado, escena y panel con persistencia" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Cierre de ronda y atajos de teclado

Los dos detalles que se sienten en vivo: el cierre que muestra todo el orden, y no tener que buscar
el cursor cuando la laptop está conectada a la pantalla de la sala.

**Files:**
- Modify: `js/app.js`
- Modify: `styles.css`
- Modify: `index.html`

**Interfaces:**
- Consumes: todo lo anterior
- Produces: el cartel de cierre `#cierre` con `#cierre-orden`

- [ ] **Step 1: Agregar el cartel de cierre a `index.html`**

Justo después del `<div id="cartel">`, dentro de `.marco`:

```html
      <div id="cierre" class="cierre" hidden>
        <p class="cierre-titulo">Ya pasaron todos</p>
        <ol id="cierre-orden" class="cierre-orden"></ol>
      </div>
```

- [ ] **Step 2: Estilos del cierre en `styles.css`**

```css
/* ── cierre de ronda ── */
.cierre {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: rgba(244, 233, 214, .95);
  animation: cartel-entra .3s ease both;
}
.cierre[hidden] { display: none; }
.cierre-titulo {
  margin: 0;
  font: 30px/1 var(--display);
  color: var(--teal);
}
.cierre-orden {
  margin: 0; padding: 0; list-style: none;
  counter-reset: cierre;
  display: flex; flex-direction: column; gap: 7px;
  text-align: center;
}
.cierre-orden li {
  counter-increment: cierre;
  font-size: 16px;
}
.cierre-orden li::before {
  content: counter(cierre) '. ';
  color: var(--ox);
  font-size: 12px;
}
```

- [ ] **Step 3: Conectar el cierre y los atajos en `js/app.js`**

Agregar dentro del IIFE, antes de `arrancar`:

```js
  function pintarCierre() {
    if (estado.fase !== 'finDeRonda' || !estado.yaPasaron.length) {
      el.cierre.hidden = true;
      return;
    }
    el.cierreOrden.innerHTML = '';
    estado.yaPasaron.forEach(function (p) {
      var li = document.createElement('li');
      li.textContent = p.nombre;
      el.cierreOrden.appendChild(li);
    });
    el.cierre.hidden = false;
  }

  function enCampoDeTexto() {
    var a = document.activeElement;
    return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable);
  }

  function atajos(ev) {
    if (enCampoDeTexto()) return;             // si escribes una efe, se escribe una efe
    if (ev.code === 'Space' || ev.key === 'Enter') {
      ev.preventDefault();
      if (!el.disparar.disabled) disparar();
    } else if (ev.key === 'f' || ev.key === 'F') {
      proyector();
    } else if (ev.key === 'Escape' && estado.proyector) {
      proyector();
    }
  }
```

En `arrancar`, agregar la referencia y el escucha:

```js
    el.cierre = $('cierre');
    el.cierreOrden = $('cierre-orden');
    // ...
    document.addEventListener('keydown', atajos);
```

Y llamar a `pintarCierre()` desde `pintar()`, y también al final del `.then` de `Scene.shoot` en
`disparar()` (justo después de `pintarBoton()`). En `reiniciar()` y `agregarPersona()`,
`pintarCierre()` se encarga de esconderlo porque la fase deja de ser `finDeRonda`.

- [ ] **Step 4: Verificar a ojo**

1. Vaciar una ronda completa: al caer el último aparece el velo con el orden numerado de todos
2. Clic en *Otra ronda*: el velo desaparece y vuelven todos a la rama
3. Con el foco fuera de los campos, la barra espaciadora dispara
4. Tecla `F`: entra y sale del modo proyector; el panel de edición desaparece y la escena crece
5. En modo proyector, `Escape` sale
6. Escribir una efe en el campo de nombre **no** activa el proyector
7. En modo proyector, *Ya pasaron* se ve como una tira horizontal al pie

- [ ] **Step 5: Commit**

```bash
git add index.html styles.css js/app.js
git commit -m "feat: cierre de ronda con el orden completo y atajos de teclado" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Bordes y pulido final

Lo que evita una pena en la reunión.

**Files:**
- Modify: `js/app.js`
- Modify: `js/scene.js`
- Create: `README.md`

**Interfaces:**
- Consumes: todo lo anterior
- Produces: nada nuevo

- [ ] **Step 1: Avisar cuando la rama se llena**

En `js/app.js`, dentro de `pintarBoton()`, antes del `else` final:

```js
    if (estado.participantes.length > 16) {
      el.aviso.textContent = 'Son ' + estado.participantes.length +
        ' monos: la rama se ve apretada, pero funciona.';
    }
```

- [ ] **Step 2: Que la escena aguante una lista larguísima**

En `js/scene.js`, dentro de `render`, cambiar el cálculo de filas para que pase de dos niveles
cuando haga falta:

```js
    var filas = total > 16 ? 3 : (total > 8 ? 2 : 1);
```

- [ ] **Step 3: Verificar los bordes uno por uno**

Abrir `index.html` y comprobar:

1. Pegar 20 nombres: tres niveles de rama, monos chicos, nada se sale del marco
2. Agregar `Bartolomé Estanislao de la Concha`: la placa muestra `Bartolomé Est…` y el cartel al caer muestra el nombre completo
3. Agregar dos veces `Ana`: son dos monos distintos, la × quita solo uno
4. Agregar `<script>alert(1)</script>` como nombre: se muestra como texto literal en la lista, en la placa y en el cartel; **no** ejecuta nada
5. Con un solo participante: dispara, cae, y entra directo al cierre de ronda
6. Quitar a todos con la ×: el botón se apaga con "Agrega a alguien primero"
7. Ventana angosta (menos de 960px): el panel se acomoda debajo y nada se traslapa

El punto 4 es el que importa: si el nombre se ejecuta, alguien usó `innerHTML` con texto de la
persona. En la lista y el orden se usa `textContent`; en el SVG, `Sprites.placa` escapa con `esc()`.

- [ ] **Step 4: Escribir `README.md`**

```markdown
# Tiro al Mono

Reparte el turno de resumen semanal del equipo. Cada persona es un mono colgado de una liana; el
arquero dispara y a quien le pega, le toca hablar. El mono cae, se anota en el orden, y la ronda
sigue hasta que la rama queda vacía — al último también se lo tumba.

## Usar

Doble clic en `index.html`. No hay que instalar nada.

- **Disparar** — o la barra espaciadora
- **F** — modo proyector, para la pantalla de la sala. `Escape` sale
- **Pegar lista completa** — un nombre por línea, reemplaza la rama entera
- **Reiniciar** — devuelve a todos a la rama

La lista y el orden se guardan en el navegador: si se recarga a media reunión, no se pierde nada.

## Cómo está hecho

Sin dependencias, sin build, sin npm. HTML, CSS y JavaScript a secas, con la escena en SVG.

| Archivo | Qué hace |
|---|---|
| `js/logic.js` | Lógica pura: sorteo, identidad de cada mono, estado. Sin DOM |
| `js/sprites.js` | Dibujo puro: recibe colores, devuelve SVG |
| `js/scene.js` | La escena y la animación del disparo |
| `js/app.js` | Estado, eventos y guardado |

Los `<script>` son clásicos y no módulos ES, a propósito: los módulos fallan por CORS al abrir un
archivo con doble clic.

### El sorteo es parejo

La persona se elige **antes** de animar, con `crypto.getRandomValues` y rechazo de módulo para que
no haya sesgo. La animación solo revela una decisión ya tomada: el arquero no apunta. Está en
`elegirIndice`, en `js/logic.js`, y son seis líneas.

### Cada quien es siempre el mismo mono

El color del pelo, el gorro, el largo de la liana y el ritmo del vaivén salen de un hash del
nombre. Ana lleva el mismo gorro cada semana.

## Pruebas

```bash
node --test tests/
```

Cubren la lógica pura: que el sorteo sea uniforme, que una ronda agote a todos exactamente una vez,
que la identidad sea estable y que el estado sobreviva un guardado. La animación se revisa a ojo.
```

- [ ] **Step 5: Correr las pruebas por última vez y commitear**

Run: `node --test tests/`
Expected: PASS — 27 pruebas

```bash
git add js/app.js js/scene.js README.md
git commit -m "fix: bordes de listas largas, nombres largos y nombres con marcado" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Auto-revisión del plan

**Cobertura del spec:**

| Requisito del spec | Tarea |
|---|---|
| Carpeta sin build, `file://` | 4 (scripts clásicos), README en 10 |
| Paleta y tipografías exactas | 4 |
| Identidad determinista por hash | 1 |
| Sorteo uniforme con rechazo de módulo | 2 |
| Sorteo antes de animar | 2 (lógica), 8 (orden de llamadas) |
| Mecánica: el elegido sale y no vuelve | 2 |
| Persistencia en `localStorage` | 3 (serialización), 8 (lectura y escritura) |
| Escena de selva colgante, lianas dispares, balanceo desincronizado | 6 |
| Secuencia de un clic con tensado del arco | 7 |
| Parábola con punta tangente | 7 |
| Lluvia de plátanos y hojas | 7 |
| Cartel "LE TOCA A" | 4 (marcado), 8 (lógica) |
| "Ya pasaron" numerado | 4, 8 |
| Fin de ronda con el orden completo y *Otra ronda* | 9 |
| Reiniciar con confirmación | 8 |
| Modo proyector con `F` y `Escape`, sin robar teclas a los campos | 9 |
| Pegar lista de golpe | 4, 8 |
| Doble clic bloqueado | 2 (`fase`), 8 |
| Lista vacía | 8 |
| Un solo participante | 2, 10 |
| Nombres largos recortados | 3 (`recortar`), 6, 10 |
| Duplicados permitidos | 2, 10 |
| Más de 8 monos en varios niveles | 6, 10 |
| `prefers-reduced-motion` | 6, 7 |
| Sin internet: respaldo de tipografías | 4 |
| Las seis pruebas que pide el spec | 1, 2, 3 |
| Sin sonido | ninguna tarea agrega audio |

Sin huecos.

**Placeholders:** ninguno. Todos los pasos llevan el código real o los pasos de verificación
concretos.

**Consistencia de nombres:** `Logic.LLAVE`, `Logic.recortar`, `Logic.identidad`,
`Logic.iniciarDisparo`/`resolverDisparo`/`reiniciarRonda`, `Sprites.mono`/`arquero`/`puntaFlecha`/
`flecha`/`platano`/`hoja`/`placa`, `Scene.init`/`render`/`shoot`/`posicionDe` se usan con el mismo
nombre y la misma firma en todas las tareas. Los IDs del DOM declarados en Task 4 son exactamente
los que busca Task 8 y Task 9. La clase `.colgado` de Task 6 es la que Task 7 manipula con
`.sacudida` y `.cayendo`.

**Un riesgo anotado:** en Task 8, `disparar()` deliberadamente **no** llama a `pintar()` completo
mientras la animación corre, porque `Scene.render` reconstruye `capaMonos` y borraría el mono que
está cayendo. Si al implementar se cambia eso, la caída se corta a medias.
