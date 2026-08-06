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

### La velocidad se elige en el panel

**Velocidad del disparo** ofrece cuatro ritmos: Rápida (0.7 s), Normal (2.1 s), Lenta (4.2 s) y
Lentísima (8.4 s). La elección se guarda.

Por dentro hay una sola tabla de tiempos base —2.1 s en total, en `BASE` de `js/scene.js`— y un
multiplicador. El CSS usa el mismo multiplicador vía la variable `--mult`, para no tener los
números repetidos en dos lenguajes. Las velocidades viven en `Logic.VELOCIDADES`: si quieres otra,
agrégala ahí y aparece sola en el selector.

**Si tu sistema tiene los efectos de animación desactivados** (en Windows: Configuración →
Accesibilidad → Efectos visuales → Efectos de animación), el navegador lo reporta como
`prefers-reduced-motion` y la app arranca en Rápida, avisándote por qué. A partir de ahí manda el
selector: aquí la animación no es adorno, es la función del programa.

La lluvia de plátanos calcula la posición en forma cerrada en vez de integrar la física por cuadro,
justamente para que cambiar la velocidad cambie la velocidad y no la distancia recorrida.

## Pruebas

```bash
node --test
```

Corre desde la raíz del proyecto, sin argumentos: `node --test tests/` no funciona en Windows
porque interpreta la ruta como un módulo.

Cubren la lógica pura: que el sorteo sea uniforme (10 000 tiradas con menos de 5% de desvío), que
una ronda agote a todos exactamente una vez, que la identidad sea estable, y que el estado
sobreviva un guardado. La animación se revisa a ojo.
