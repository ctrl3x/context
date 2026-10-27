(function () {
  // Упрощённый scale.js для мобильного лонг-рида (мокап 414×15964):
  // страница всегда вписывается по ширине вьюпорта, высота — нативный скролл.
  // Никаких пинов и пересчётов по высоте: контент статичен.
  var DESIGN_W = 414;
  var outer = document.getElementById('m-page');
  var inner = document.getElementById('m-inner');

  function rescale() {
    var s = document.documentElement.clientWidth / DESIGN_W;
    inner.style.transform = 'scale(' + s + ')';
    outer.style.width = DESIGN_W * s + 'px';
    // высота = дизайн-высота контента × масштаб (внутренние 10 секций по 414px)
    outer.style.height = inner.offsetHeight * s + 'px';
  }

  window.addEventListener('resize', rescale);
  // после load: web-шрифты меняют высоту контента, пересчитываем
  window.addEventListener('load', rescale);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(rescale);
  }
  rescale();
})();
