(function () {
  // «Учёные доказали: [X] меняет вашу жизнь»: пятно фонарика на тёмной панели
  // следует за курсором (наведение), при уходе курсора плавно возвращается
  // в позицию из макета (226/177 относительно маски)
  const mask = document.querySelector('.sci-mask');
  const panel = document.querySelector('.sci-panel');
  if (!mask) return;

  const DEF_X = 226;
  const DEF_Y = 177;

  function local(e) {
    const r = mask.getBoundingClientRect();
    // масштаб страницы (scale.js) учитывается отношением offset/rect
    const k = r.width ? mask.offsetWidth / r.width : 1;
    return {
      x: Math.round((e.clientX - r.left) * k),
      y: Math.round((e.clientY - r.top) * (r.width ? mask.offsetHeight / r.height : 1))
    };
  }

  function set(x, y) {
    mask.style.setProperty('--mx', x + 'px');
    mask.style.setProperty('--my', y + 'px');
  }

  function move(e) {
    mask.classList.remove('returning');
    const p = local(e);
    set(p.x, p.y);
  }

  function leave() {
    mask.classList.add('returning');
    set(DEF_X, DEF_Y);
  }

  // маска и панель совпадают по геометрии; события ловим на обеих —
  // замаскированные области маски могут не получать хиты
  [panel, mask].forEach(function (el) {
    if (!el) return;
    el.addEventListener('mouseenter', function () { mask.classList.remove('returning'); });
    el.addEventListener('mousemove', move);
    el.addEventListener('mouseleave', leave);
  });
})();