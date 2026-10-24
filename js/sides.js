(function () {
  var darks = Array.prototype.slice.call(
    document.querySelectorAll('.sec-dark, .cl-blackband')
  );
  if (!darks.length) return;

  function update() {
    var mid = window.innerHeight / 2;
    var dark = false;
    for (var i = 0; i < darks.length; i++) {
      var r = darks[i].getBoundingClientRect();
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
