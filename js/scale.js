(function () {
  const DESIGN_W = 1280;
  const DESIGN_H = 832; // высота одного экрана в макете
  const outer = document.getElementById('page');
  const inner = document.getElementById('page-inner');

  function rescale() {
    const w = document.documentElement.clientWidth;
    const h = document.documentElement.clientHeight;
    // масштаб, при котором и ширина, и один экран (832px) целиком влезают в вьюпорт
    const s = Math.min(w / DESIGN_W, h / DESIGN_H);
    inner.style.transform = 'scale(' + s + ')';
    outer.style.width = DESIGN_W * s + 'px';
    outer.style.height = inner.offsetHeight * s + 'px';
    outer.style.margin = '0 auto';
  }

  window.addEventListener('resize', rescale);
  window.addEventListener('load', rescale);
  rescale();
})();
