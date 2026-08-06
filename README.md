# Tiro al Mono

Reparte el turno de resumen semanal del equipo. Cada persona es un mono colgado de una liana; el
arquero dispara y a quien le pega, le toca hablar. El mono cae, su nombre pasa al orden de la
sesión, y la ronda sigue hasta que la rama queda vacía — al último también se lo tumba.

No hay ganador ni premio. Es un repartidor de turnos que da risa.

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

Por eso la escena identifica a cada mono por el `id` de la persona y no por su posición en la
lista: la lista se acorta con cada disparo, y con índices terminaría cayendo un mono distinto al
que se anuncia.

### La secuencia dura 4.2 s

Tensado 900 ms, suelta 140, vuelo 1660, impacto 200, caída 1300. Si quieres cambiar el ritmo, todo
está en la función `tiempos()` de `js/scene.js`. Quien tenga activado "reducir movimiento" en su
sistema recibe una versión de 700 ms.

## Pruebas

```bash
node --test
```

Corre desde la raíz del proyecto, sin argumentos: `node --test tests/` no funciona en Windows
porque interpreta la ruta como un módulo.

Cubren la lógica pura: que el sorteo sea uniforme (10 000 tiradas con menos de 5% de desvío), que
una ronda agote a todos exactamente una vez, que la identidad sea estable, y que el estado
sobreviva un guardado. La animación se revisa a ojo.
