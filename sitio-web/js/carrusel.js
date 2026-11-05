/* Carrusel automático — Caribbean Travel
 * Busca fotos numeradas (1.jpg, 2.jpg, 3.webp…) en la carpeta indicada
 * y las rota solas. Para añadir fotos: súbelas a la carpeta con el
 * siguiente número y vuelve a desplegar. No hay que tocar código.
 * Enlaces opcionales: data-enlaces en el mismo orden que las fotos.
 */
(function () {
  const EXTENSIONES = ['jpg', 'jpeg', 'webp', 'png'];
  const MAXIMO = 40; // tope de fotos que buscará

  function probar(src) {
    return new Promise((resolver) => {
      const img = new Image();
      img.onload = () => resolver(src);
      img.onerror = () => resolver(null);
      img.src = src;
    });
  }

  async function buscarFoto(carpeta, n) {
    for (const ext of EXTENSIONES) {
      const src = await probar(`${carpeta}${n}.${ext}`);
      if (src) return src;
    }
    return null;
  }

  async function iniciar(el) {
    const carpeta = el.dataset.carpeta || 'img/carrusel/';
    const intervalo = Number(el.dataset.intervalo) || 2000;
    const leyendas = (el.dataset.leyendas || '')
      .split('|')
      .map((t) => t.trim());
    const hayLeyendas = leyendas.some(Boolean);
    const enlaces = (el.dataset.enlaces || '')
      .split('|')
      .map((t) => t.trim());

    const marco = el.querySelector('.carrusel-marco');
    const respaldo = marco.querySelector('img'); // foto que se ve mientras carga
    const leyendaEl = el.querySelector('.carrusel-leyenda');
    const enlaceEl = el.querySelector('.carrusel-enlace');
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const slides = [];
    let actual = 0;
    let temporizador = null;

    function mostrar(i) {
      if (slides[actual]) slides[actual].classList.remove('activa');
      actual = i;
      slides[actual].classList.add('activa');
      if (leyendaEl && hayLeyendas) leyendaEl.textContent = leyendas[i] || '';
      if (enlaceEl) {
        if (enlaces[i]) {
          enlaceEl.href = enlaces[i];
          enlaceEl.setAttribute('aria-label', `Ver paquete: ${leyendas[i] || 'destino'}`);
        } else {
          enlaceEl.removeAttribute('href'); // foto sin enlace: no se puede hacer clic
          enlaceEl.removeAttribute('aria-label');
        }
      }
    }

    function arrancar() {
      if (temporizador || reducido) return;
      temporizador = setInterval(() => {
        if (document.hidden || slides.length < 2) return;
        mostrar((actual + 1) % slides.length);
      }, intervalo);
    }

    for (let n = 1; n <= MAXIMO; n++) {
      const src = await buscarFoto(carpeta, n);
      if (!src) break; // se detiene en el primer número que falte

      const img = document.createElement('img');
      img.className = 'carrusel-foto';
      img.src = src;
      img.alt = leyendas[n - 1] || '';
      img.decoding = 'async';
      marco.appendChild(img);
      slides.push(img);

      if (slides.length === 1) {
        mostrar(0);
        if (respaldo) setTimeout(() => respaldo.remove(), 700);
      }
      if (slides.length === 2) arrancar();
    }
  }

  document.querySelectorAll('[data-carrusel]').forEach(iniciar);
})();
