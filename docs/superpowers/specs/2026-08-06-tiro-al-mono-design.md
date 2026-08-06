# Tiro al Mono — Diseño

**Fecha:** 2026-08-06
**Estado:** aprobado, listo para plan de implementación

## Qué es

Una app local de una sola pantalla que decide **a quién le toca dar su resumen semanal** en la
reunión del equipo. Cada persona es un mono colgado de una liana en una escena 2D de selva, con
estética de feria vintage. El arquero dispara; a quien le pega, le toca hablar. Ese mono cae y la
ronda sigue hasta que la rama queda vacía — al último también se lo tumba, con su disparo completo.

No hay ganador, no hay premio, no hay puntaje. Es un repartidor de turnos que da risa.

## Contexto y decisiones ya tomadas

| Decisión | Elección | Por qué |
|---|---|---|
| Mecánica | El elegido sale de la escena y no vuelve en esa ronda | Es un orden de intervención, no un sorteo con repetición |
| Estética | Feria vintage (papel con grano, verde petróleo, oxblood, latón) | Elegida sobre editorial suizo y risografía |
| Escenario | Selva colgante: monos guindados de una rama a distintas alturas | Elegido sobre galería de tiro y teatrino de papel |
| Participantes | 3 a 8 es el caso normal | Monos grandes, nombres siempre visibles |
| Entrega | Carpeta sin build ni dependencias | Doble clic y corre, incluso sin internet |
| Sonido | **Fuera de alcance** | Descartado explícitamente |
| Disparo | Un solo clic ejecuta toda la secuencia | Sin paso de "apuntar" separado |
| Registro | El orden se muestra en pantalla pero no se exporta ni se archiva | "No se anota ni nada" |

Extras aprobados: modo proyector, lluvia de plátanos, pegar lista de golpe.

## Arquitectura

Cinco archivos, sin build, sin npm, sin dependencias. `<script>` clásicos en orden (no módulos ES)
para que funcione desde `file://` sin servidor.

```
index.html    Estructura, panel lateral y el <svg> raíz de la escena
styles.css    Paleta, tipografía, layout, balanceo de lianas, modo proyector
sprites.js    Dibujo puro: mono, arquero, plátano, hoja, placa de latón
scene.js      La escena viva: layout de la rama, vuelo de flecha, caída, partículas
app.js        Estado, sorteo, persistencia y eventos de UI
tests.html    Aserciones de la lógica pura, sin dependencias
```

### Fronteras entre archivos

**`sprites.js`** — funciones puras `(opciones) -> string de SVG`. No conoce el estado de la app, no
toca el DOM, no sabe qué es un participante. Recibe colores y medidas, devuelve marcado.
Exporta: `monkeySvg`, `archerSvg`, `bananaSvg`, `leafSvg`, `plateSvg`.

**`scene.js`** — dueño único del `<svg>`. Recibe una lista de participantes y los pinta en la rama;
recibe la orden "dispárale al índice N" y ejecuta la secuencia animada, devolviendo una promesa que
se resuelve al terminar. No decide **a quién** se le dispara y no lee `localStorage`.
Exporta: `render(participantes)`, `shoot(indice) -> Promise`, `reset()`.

**`app.js`** — el único que decide. Guarda el estado, sortea, llama a `scene.shoot`, actualiza el
panel y persiste. No dibuja SVG a mano.

**Por qué SVG y no canvas:** se ve nítido a tamaño de proyector, cada mono es un nodo del DOM con su
propio balanceo por CSS, y los colores viven en el CSS donde se pueden ajustar sin tocar la lógica.

## Estado

```js
{
  participantes: [ { id, nombre } ],   // los que siguen en la rama
  yaPasaron:     [ { id, nombre } ],   // en orden de caída
  fase: 'preparacion' | 'disparando' | 'revelado' | 'finDeRonda',
  proyector: false
}
```

Se persiste completo en `localStorage` bajo la llave `tiro-al-mono/v1` en cada cambio. Si la página
se recarga a media reunión, la escena se reconstruye exactamente donde estaba.

`fase` es lo que bloquea el botón: solo se puede disparar en `preparacion` o `revelado`.

## El sorteo

La persona se elige **antes** de animar. La animación es la revelación de una decisión ya tomada, no
su causa. El arquero nunca "apunta": la flecha se dibuja hacia un mono ya escogido.

```js
function elegirIndice(n) {          // uniforme de verdad, con rechazo de módulo
  const limite = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  do { crypto.getRandomValues(buf); } while (buf[0] >= limite);
  return buf[0] % n;
}
```

El rechazo de módulo importa: con `% n` a secas, los primeros índices salen ligeramente más seguido.
Es invisible en una reunión pero la corrección cuesta dos líneas, y significa que la app aguanta que
alguien la audite.

## Identidad de cada mono

Color de pelo, color de gorro, largo de liana y ritmo de balanceo salen de un hash FNV-1a del
nombre. Consecuencia: **Ana siempre es la misma mona** — mismo gorro, misma liana, mismo vaivén,
semana tras semana. Nadie lo eligió a mano pero se siente deliberado.

```js
function hash(nombre) { /* FNV-1a de 32 bits, determinista */ }
// pelo    = PELOS[hash % PELOS.length]
// gorro   = GORROS[(hash >>> 8) % GORROS.length]
// liana   = 40 + ((hash >>> 16) % 70)      px de largo
// vaivén  = 2.6 + ((hash >>> 24) % 12) / 10   segundos por ciclo
```

Las paletas `PELOS` y `GORROS` se eligen para que dos personas contiguas casi nunca coincidan, y si
coinciden, el largo de liana y el nombre en la placa los distinguen igual.

## La secuencia del disparo

Un clic dispara todo. Duración total ~2.1 s: suficiente para crear tensión, no tanto como para
aburrir a la séptima vez.

| Tiempo | Qué pasa |
|---|---|
| 0 ms | Clic. `fase = 'disparando'`, botón bloqueado, se elige el índice |
| 0–450 ms | **Tensado.** El arquero jala la cuerda, el arco se dobla, el codo sube |
| 450–520 ms | **Suelta.** La cuerda vibra dos veces, la flecha arranca |
| 520–1350 ms | **Vuelo.** Parábola cuadrática de Bézier; la punta rota según la tangente |
| 1350–1450 ms | **Impacto.** Destello de líneas y sacudón corto de la liana |
| 1450–2100 ms | **Caída.** El mono se suelta, gira ~540° y sale de cuadro; llueven plátanos y hojas |
| 2100 ms | Cartel **LE TOCA A: {nombre}**. `fase = 'revelado'`, botón libre |

La parábola se traza desde la punta de la flecha del arquero hasta el centro del mono elegido, con
el punto de control levantado por encima de ambos, de modo que el arco de la trayectoria se ve
distinto para cada mono según su distancia y altura.

Si al terminar no quedan participantes, en vez de liberar el botón se entra a `finDeRonda`.

## Fin de ronda y reinicio

Al caer el último mono, la rama queda vacía y el cartel se convierte en el cierre de la ronda: el
orden completo en que habló el equipo, y un botón **Otra ronda** que devuelve a todos a la rama
—mismos monos, mismos gorros, mismas lianas— y limpia `yaPasaron`.

Aparte, un **Reiniciar** discreto en el panel está disponible en cualquier momento, no solo al
final: sirve para cuando alguien llegó tarde a la reunión y hay que rehacer el orden. Pide
confirmación solo si ya cayó al menos un mono.

Reiniciar no borra la lista de participantes. Para eso está la edición de la lista.

## Distribución en pantalla

Dos columnas.

**Izquierda (~70%)** — la escena: rama gruesa cruzando arriba, lianas de largos dispares, monos
meciéndose fuera de sincronía, hojas de fondo en silueta, suelo insinuado. El arquero abajo a la
izquierda. Debajo de la escena, el botón **DISPARAR** grande.

**Derecha (~30%)** — panel de papel con:
- La lista de participantes, editable: agregar uno por uno, o el campo de *pegar lista* (un nombre
  por línea) que reemplaza la lista completa
- Debajo, **Ya pasaron**: los nombres caídos, numerados, en el orden en que cayeron

El orden se muestra desde el primer disparo y se va llenando. No se exporta ni se guarda entre
ronda y ronda: al reiniciar, se limpia.

**Modo proyector** (botón, o tecla `F` cuando el foco no está en un campo de texto — si no, `F`
escribe una efe): esconde toda la edición de nombres, agranda la escena a pantalla completa y deja
*Ya pasaron* como una tira compacta al pie. El botón DISPARAR sigue visible y crece. `Escape` sale.

La barra espaciadora dispara, con la misma condición de foco. En una reunión con el cursor lejos, se
agradece.

## Bordes

| Situación | Comportamiento |
|---|---|
| Recarga a media reunión | Se reconstruye desde `localStorage`; no se pierde el orden |
| Doble clic en DISPARAR | El segundo se ignora: `fase === 'disparando'` bloquea |
| Lista vacía | Botón apagado con el texto "agrega a alguien primero" |
| Un solo participante | Dispara, cae y cierra la ronda igual que cualquier otro |
| Nombre de más de 14 caracteres | Se recorta con puntos en la placa de latón; completo en el cartel |
| Nombres duplicados | Se permiten; cada entrada tiene su propio `id`, así que son monos distintos |
| Más de 8 participantes | Los monos se encogen y la rama se parte en dos niveles |
| Más de 16 participantes | Se aceptan pero se advierte que la escena se ve apretada |
| `prefers-reduced-motion` | Sin balanceo continuo; la secuencia baja a ~700 ms total |
| Sin internet | Las tipografías caen a serif del sistema; todo lo demás idéntico |

## Pruebas

Sin framework, porque no hay build. La lógica pura de `app.js` se escribe separada de la animación
para poder verificarla, y `tests.html` corre aserciones en el navegador imprimiendo verde o rojo:

1. `elegirIndice(n)` siempre devuelve un entero en `[0, n)`
2. 10 000 sorteos sobre 5 participantes reparten con desvío menor al 5% — detecta sesgo de módulo
3. Una ronda completa agota a todos exactamente una vez, sin repetidos
4. `hash(nombre)` es estable entre llamadas y da identidades distintas a nombres distintos
5. El estado sobrevive un ciclo de guardar y cargar sin perder ni reordenar `yaPasaron`
6. `fase` nunca permite dos disparos simultáneos

La animación no se prueba automáticamente: se revisa a ojo, que es el único criterio que importa
para ella.

## Fuera de alcance

Sonido. Backend. Cuentas de usuario. Exportar el orden. Estadísticas históricas. Varias listas
guardadas. Móvil (se usa en una laptop conectada a la pantalla de la sala).
