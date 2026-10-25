(function () {
  // «Учёные доказали: [X] меняет вашу жизнь»: пятно фонарика на тёмной панели
  // следует за курсором (наведение), при уходе курсора плавно возвращается
  // в дефолтную позицию. Хвост пина .sci-pin — отдельный экран (макет
  // 1836:934): скролл растягивает маску-панель на весь экран. Это непрерывный
  // скраб от scrollY (как катыш в checklist.js): чем дальше прокручено, тем
  // больше маска, прокрутка назад всё отыгрывает — поэтому двойной путь
  // CSS/JS не нужен, вся геометрия живёт в одном var --p на обёртке пина
  // (наследуют маска, панель и текст), а CSS пересчитывает её через calc():
  // растяжение маски и панели, позиция текста, интерлиньяж
  const mask = document.querySelector('.sci-mask');
  const panel = document.querySelector('.sci-panel');
  const pin = document.querySelector('.sci-pin');
  const sec = document.querySelector('.sec-scientists');
  const pageInner = document.getElementById('page-inner');
  if (!mask) return;

  // хвост пина в px макета: STRETCH — скролла на растягивание маски,
  // HOLD — стоянка на фулскрин-экране, пока секция приколота. Вместе с самим
  // экраном (832) они дают высоту .sci-pin (2496px в CSS) — держать синхронно
  const STRETCH = 832;
  const HOLD = 832;
  const TAIL = STRETCH + HOLD; // весь хвост: столько секция и приколота

  // дефолт пятна в координатах маски: (226;177) — панель из макета, на
  // фулскрин-экране свет стоит в (326;416) — по вертикали он всегда по центру
  // текстового блока; между ними свет доезжает линейно вместе с растяжкой
  const DEF_X = 226, DEF_Y = 177;
  const DEF_DX = 100, DEF_DY = 239;

  let p = 0;          // прогресс растяжения 0..1
  let prevP = -1;     // p прошлого скролл-тика: без изменения p свет не трогаем
                      // (иначе любой скролл страницы обрывал бы .returning)
  let hovering = false;
  let lastEvt = null; // последняя позиция курсора (клиентские px): скролл двигает
                      // маску под неподвижным курсором — свет перепроецируем

  function scale() { return pageInner ? pageInner.getBoundingClientRect().width / 1280 : 1; }
  function pinTop() { return pin ? pin.getBoundingClientRect().top + window.scrollY : 0; }

  function defPoint() {
    return { x: DEF_X + DEF_DX * p, y: DEF_Y + DEF_DY * p };
  }

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
    hovering = true;
    lastEvt = e;
    const pt = local(e);
    set(pt.x, pt.y);
  }

  function leave() {
    hovering = false;
    lastEvt = null;
    mask.classList.add('returning');
    const d = defPoint();
    set(d.x, d.y);
  }

  // скраб растяжения: хвост пина делится на STRETCH (маска растёт 0..1) и
  // HOLD (фулскрин-экран стоит на месте); дальше пин отпускает секцию,
  // и экран уезжает вверх как обычный экран в потоке
  function scrub() {
    if (!pin || !sec) return;
    const s = scale();
    if (s <= 0) return;
    const y = window.scrollY;
    // ручной пин секции (как no-tl ветка teardown.js): сдвиг равен прокрутке
    // хвоста, после него секция едет со страницей. В px макета — внутри
    // #page-inner transform живёт в дизайн-координатах
    const offset = Math.min(Math.max(y - pinTop(), 0), TAIL * s);
    if (offset <= 0) sec.style.transform = '';
    else sec.style.transform = 'translateY(' + (offset / s) + 'px)';
    p = Math.min(Math.max((y - pinTop()) / (STRETCH * s), 0), 1);
    if (p === prevP) return;
    prevP = p;
    // --p на обёртке: его наследуют и маска, и панель-поверхность (сосед
    // маски в секции), и текст внутри маски
    pin.style.setProperty('--p', p.toFixed(4));
    // подложка хвоста и бока страницы темнеют, когда маска накрыла больше
    // половины экрана (класс читают css и js/sides.js)
    pin.classList.toggle('sciexp-dark', p > 0.5);
    // свет едет вместе с макетом, пока его не ведёт курсор
    if (hovering && lastEvt) {
      // маска уже в новой геометрии (--p выставлен выше) — перепроецируем
      const pt = local(lastEvt);
      set(pt.x, pt.y);
    } else {
      // дефолт меняется скроллом — анимировать возврат не к чему,
      // свет должен стоять ровно в точке макета для текущего p
      mask.classList.remove('returning');
      const d = defPoint();
      set(d.x, d.y);
    }
  }

  // маска и панель совпадают по геометрии; события ловим на обеих —
  // замаскированные области маски могут не получать хиты
  [panel, mask].forEach(function (el) {
    if (!el) return;
    el.addEventListener('mouseenter', function () { hovering = true; mask.classList.remove('returning'); });
    el.addEventListener('mousemove', move);
    el.addEventListener('mouseleave', leave);
  });

  window.addEventListener('scroll', scrub, { passive: true });
  window.addEventListener('resize', scrub);
  window.addEventListener('load', scrub);
  scrub();

  // превью фулскрин-экрана без прокрутки: #sci-step2 — середина стоянки
  // (#sci-step1 — панельное состояние, прыгает js/cards.js). Повтор по load
  // и fonts.ready: шрифты/картинки растят документ выше — прыжок уходит не
  // туда, как у всех хэш-превью проекта
  function hashJump() {
    if (!pin || !/^#sci-step2$/.test(location.hash)) return;
    window.scrollTo(0, Math.round(pinTop() + (STRETCH + HOLD / 2) * scale()));
    scrub();
  }
  hashJump();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { hashJump(); scrub(); });
  }
})();
