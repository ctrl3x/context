(function () {
  const DESIGN_W = 1280;
  const DESIGN_H = 832; // высота одного экрана в макете
  // Допустимый подрез экрана снизу при заполнении ширины (доля высоты вьюпорта).
  // Экраны MacBook Air чуть «шире» макета 1280×832 (1.538): 13.3″ Air
  // (1440×900) даёт боковые поля ~27px, 15″ (~1647×1056) — ~11px. Когда
  // вьюпорт «шире» макета лишь немного, заполняем ширину целиком: экран
  // становится чуть выше вьюпорта, и его нижняя кромка (в макете — почти
  // всегда пустое поле) уходит за нижний край. Сильно непропорциональные
  // окна (подрез > FILL) остаются в режиме вписывания — иначе с экранов
  // срезалось бы заметное содержимое. Пины это переживают: их зоны
  // калибруются в px от измеренных позиций (hero.js/cards.js/teardown.js),
  // высота вьюпорта != 832·scale уже штатный случай.
  const FILL = 0.05;
  const outer = document.getElementById('page');
  const inner = document.getElementById('page-inner');

  function rescale() {
    const w = document.documentElement.clientWidth;
    const h = document.documentElement.clientHeight;
    const sw = w / DESIGN_W;
    const sh = h / DESIGN_H;
    // масштаб, при котором и ширина, и один экран (832px) целиком влезают в вьюпорт
    let s = Math.min(sw, sh);
    // вьюпорт «шире» макета и лишняя высота экрана мала — заполняем ширину:
    // боковых полей нет, низ экрана подрезается не больше чем на FILL·h
    if (sw > sh && DESIGN_H * sw - h <= FILL * h) s = sw;
    inner.style.transform = 'scale(' + s + ')';
    outer.style.width = DESIGN_W * s + 'px';
    outer.style.height = inner.offsetHeight * s + 'px';
    outer.style.margin = '0 auto';
  }

  window.addEventListener('resize', rescale);
  window.addEventListener('load', rescale);
  rescale();
})();
