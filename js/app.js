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
      if (estado.participantes.length > 16) {
        el.aviso.textContent = 'Son ' + estado.participantes.length +
          ' monos: la rama se ve apretada, pero funciona.';
      }
    }
  }

  function pintar() {
    pintarLista();
    pintarOrden();
    pintarBoton();
    pintarCierre();
    document.body.classList.toggle('proyector', !!estado.proyector);
    Scene.render(estado.participantes);
  }

  function cartel(nombre) {
    el.cartelNombre.textContent = nombre;
    el.cartel.hidden = false;
  }
  function ocultarCartel() { el.cartel.hidden = true; }

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
    ocultarCartel();          // si no, el último "le toca a" se transparenta tras el velo
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
    var nuevo = Logic.crearEstado(texto.split(/\r?\n/));
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
    var elegido = estado.participantes[inicio.indice];
    estado = inicio.estado;                    // fase: 'disparando' -> botón bloqueado
    pintarBoton();
    // Ojo: no se llama a pintar() aquí. Repintar la escena a media animación
    // borraría el mono que está cayendo.

    // Se le pasa el id, no el índice: la escena no sabe (ni debe saber) en qué
    // posición del arreglo va cada quien.
    Scene.shoot(elegido.id).then(function () {
      var r = Logic.resolverDisparo(estado, inicio.indice);
      estado = r.estado;
      cartel(r.elegido.nombre);
      guardar();
      pintarLista();
      pintarOrden();
      pintarBoton();
      pintarCierre();
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
    el.cierre = $('cierre');
    el.cierreOrden = $('cierre-orden');
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
    document.addEventListener('keydown', atajos);

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
