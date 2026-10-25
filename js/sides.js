(function () {
  // .sci-pin в списке не самостоятельный тёмный экран: он темнеет, только
  // когда маска-панель растянулась на весь экран (класс .sciexp-dark ставит
  // js/scientists.js на хвосте пина) — до того бока остаются белыми,
  // как у самого экрана «Учёные доказали»
  var darks = Array.prototype.slice.call(
    document.querySelectorAll('.sec-dark, .cl-blackband, .sci-pin')
  );
  if (!darks.length) return;

  function update() {
    var mid = window.innerHeight / 2;
    var dark = false;
    for (var i = 0; i < darks.length; i++) {
      var el = darks[i];
      if (el.classList.contains('sci-pin') && !el.classList.contains('sciexp-dark')) continue;
      var r = el.getBoundingClientRect();
      if (r.height > 0 && r.top <= mid && r.bottom >= mid) { dark = true; break; }
    }
    document.body.classList.toggle('sides-dark', dark);
  }

  var raf = 0;
  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = 0; update(); });
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('load', schedule);
  update();
})();
