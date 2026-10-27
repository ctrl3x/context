(function () {
  // «Учёные доказали: [X] меняет вашу жизнь»: пятно фонарика на тёмной панели
  // следует за курсором (наведение), при уходе курсора плавно возвращается
  // в дефолтную позицию. Хвост пина — отдельный экран (макет 1836:934):
  // разворачивание маски-панели в фулскрин — НЕ скраб от scrollY, а схема
  // «скролл переключает состояние, анимация играет сама» (как кроссфейд
  // 04 → учёные в js/cards.js и табы teardown.js): порог — середина зоны
  // STRETCH, его ловит любой скролл (колесо, скроллбар, инерция тачпада),
  // сам разворот всегда играет фиксированные 620 мс rAF-твином — скоростью
  // скролла управлять нельзя. Геометрия по-прежнему живёт в одном var --p
  // на обёртке пина (наследуют маска, панель и текст), CSS пересчитывает
  // её через calc(): растяжение маски и панели, позиция текста,
  // интерлиньяж. Двойной путь CSS/JS не нужен: твин чисто JS и одинаков
  // везде, где работает calc(var())
  const mask = document.querySelector('.sci-mask');
  const panel = document.querySelector('.sci-panel');
  const pin = document.querySelector('.sci-pin');
  const sec = document.querySelector('.sec-scientists');
  const pageInner = document.getElementById('page-inner');
  if (!mask) return;

  // FADE — зона перехода с карточки 04 НАД пином (scroll-диапазон
  // [pinTop - 832·scale, pinTop]): секция приколота и с отрицательным
  // сдвигом накрывает вьюпорт, пока скролл проходит зону. Число держится
  // синхронно с FADE в js/cards.js (там же — порог состояния .sci-on).
  // STRETCH — зона ТРИГГЕРА разворота (порог в её середине), HOLD —
  // стоянка на фулскрин-экране. Экран (832) в высоту пина не входит
  // отдельным слагаемым: зона перехода ложится на «естественный выход»
  // карточки 04
  const FADE = 832;
  const STRETCH = 832;
  const HOLD = 832;
  const TAIL = STRETCH + HOLD; // стоянка секции на вьюпорте после зоны

  const DUR = 620; // длительность разворота — как у всех переходов проекта
  // порог состояния — середина зоны STRETCH (px макета): как у порога
  // кроссфейда в js/cards.js, ровно экран скролла после него
  const TRIGGER = STRETCH / 2;

  // дефолт пятна в координатах маски: (226;177) — панель из макета, на
  // фулскрин-экране свет стоит в (326;416) — по вертикали он всегда по центру
  // текстового блока; между ними свет доезжает линейно вместе с растяжкой
  const DEF_X = 226, DEF_Y = 177;
  const DEF_DX = 100, DEF_DY = 239;

  let p = 0;          // ОТОБРАЖАЕМЫЙ прогресс 0..1 — его ведёт твин, не скролл
  let prevP = -1;     // p прошлой отрисовки: без изменения p свет не трогаем
                      // (иначе любой скролл страницы обрывал бы .returning)
  let target = 0;     // целевое состояние: 0 — панель, 1 — фулскрин
  let raf = 0, t0 = 0, from = 0;
  let hovering = false;
  let lastEvt = null; // последняя позиция курсора (клиентские px): анимация
                      // двигает маску под неподвижным курсором — свет
                      // перепроецируем

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

  // кривая кроссфейдов проекта cubic-bezier(.77,0,.18,1) (.ribbon,
  // sciFadeIn/Out): в JS её даёт решатель Безье (Ньютон по x), чтобы
  // разворот двигался в том же ритме, что соседние переходы
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    function sampleX(t) { return ((ax * t + bx) * t + cx) * t; }
    function sampleY(t) { return ((ay * t + by) * t + cy) * t; }
    function sampleDX(t) { return (3 * ax * t + 2 * bx) * t + cx; }
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i++) {
        const err = sampleX(t) - x;
        if (Math.abs(err) < 1e-5) break;
        const d = sampleDX(t);
        if (Math.abs(d) < 1e-6) break;
        t -= err / d;
      }
      return sampleY(t);
    };
  }
  const ease = bezier(0.77, 0, 0.18, 1);

  // отрисовка одного значения p: --p на обёртку (наследуют маска, панель
  // и текст), темнота подложки хвоста/боков, свет — за курсором
  // (перепроекция: геометрия-то поменялась) или в дефолтной точке макета
  function paint(v) {
    if (v === prevP) return;
    prevP = v;
    p = v;
    pin.style.setProperty('--p', v.toFixed(4));
    // подложка хвоста и бока страницы темнеют, когда маска накрыла больше
    // половины экрана (класс читают css и js/sides.js)
    const dark = v > 0.5;
    if (pin.classList.contains('sciexp-dark') !== dark) {
      pin.classList.toggle('sciexp-dark', dark);
      // sides.js перекрашивает бока по scroll-событиям, а переключение
      // случается посреди твина — скролл к этому моменту может уже стоять
      window.dispatchEvent(new CustomEvent('sciexp'));
    }
    if (hovering && lastEvt) {
      // маска уже в новой геометрии (--p выставлен выше) — перепроецируем
      const pt = local(lastEvt);
      set(pt.x, pt.y);
    } else {
      // дефолт меняется твином — анимировать возврат не к чему,
      // свет должен стоять ровно в точке макета для текущего p
      mask.classList.remove('returning');
      const d = defPoint();
      set(d.x, d.y);
    }
  }

  // переключение состояния: instant (инициализация, hash-превью) ставит
  // значение сразу, иначе — твин от текущего отображаемого p. Перезапуск
  // посреди анимации (порог перекрестили назад) без рывка: едет от
  // текущего p
  function setState(to, instant) {
    target = to;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (instant || target === p) { paint(target); return; }
    from = p;
    t0 = performance.now();
    raf = requestAnimationFrame(step);
  }

  function step(now) {
    const k = Math.min((now - t0) / DUR, 1);
    paint(from + (target - from) * ease(k));
    if (k < 1) raf = requestAnimationFrame(step);
    else { raf = 0; paint(target); }
  }

  // пин секции (как no-tl ветка teardown.js): на зоне перехода сдвиг
  // отрицательный (секция НАКРЫВАЕТ вьюпорт), на хвосте — положительный.
  // В px макета — внутри #page-inner transform живёт в дизайн-координатах.
  // Состояние разворота скролл только переключает (см. шапку файла):
  // пересечение TRIGGER в любую сторону запускает твин; instant-вызовы
  // (инициализация, hash-превью) ставят состояние без анимации
  function scrub(instant) {
    if (!pin || !sec) return;
    const s = scale();
    if (s <= 0) return;
    const y = window.scrollY;
    const offset = Math.min(Math.max(y - pinTop(), -FADE * s), TAIL * s);
    if (offset === 0) sec.style.transform = '';
    else sec.style.transform = 'translateY(' + (offset / s) + 'px)';
    const want = y - pinTop() >= TRIGGER * s ? 1 : 0;
    if (instant) setState(want, true);
    else if (want !== target) setState(want, false);
  }

  // маска и панель совпадают по геометрии; события ловим на обеих —
  // замаскированные области маски могут не получать хиты
  [panel, mask].forEach(function (el) {
    if (!el) return;
    el.addEventListener('mouseenter', function () { hovering = true; mask.classList.remove('returning'); });
    el.addEventListener('mousemove', move);
    el.addEventListener('mouseleave', leave);
  });

  window.addEventListener('scroll', function () { scrub(false); }, { passive: true });
  window.addEventListener('resize', function () { scrub(false); });
  window.addEventListener('load', function () { scrub(false); });
  scrub(true); // стартовое состояние — без анимации (в т.ч. после restore)

  // превью фулскрин-экрана без прокрутки: #sci-step2 — середина стоянки
  // (#sci-step1 — панельное состояние, прыгает js/cards.js). Повтор по load
  // и fonts.ready: шрифты/картинки растят документ выше — прыжок уходит не
  // туда, как у всех хэш-превью проекта
  function hashJump() {
    if (!pin || !/^#sci-step2$/.test(location.hash)) return;
    window.scrollTo(0, Math.round(pinTop() + (STRETCH + HOLD / 2) * scale()));
    scrub(true);
  }
  hashJump();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { hashJump(); scrub(false); });
  }
})();
