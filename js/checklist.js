(function () {
  // тикер чек-листа «НЕ ВЕРЬТЕ ЗАГОЛОВКУ — ИЗУЧАЙТЕ [КОНТЕКСТ]»:
  // скролл только решает, когда строка в кадре (класс .in на .cl-ticker),
  // сам переход играют CSS-transition'ы фиксированной длительности —
  // скоростью скролла управлять нельзя (см. конвенции в AGENTS.md).
  const ticker = document.querySelector('.cl-ticker');
  if (!ticker) return;

  // стартовая поза скобок: левая стоит на финальном месте, правая наезжает
  // на неё в сомкнутом состоянии — сдвиг равен полной ширине слова.
  // ширину «КОНТЕКСТ» измеряем по факту и делим на scale страницы
  // (getBoundingClientRect даёт размер уже после transform: scale)
  const word = ticker.querySelector('.ctx-word');
  const pageInner = document.getElementById('page-inner');
  const brs = ticker.querySelectorAll('.br');
  function measure() {
    if (!word || !pageInner || !brs.length) return;
    const s = pageInner.getBoundingClientRect().width / 1280;
    if (s <= 0) return;
    const full = word.getBoundingClientRect().width / s;
    // подмену переменной делаем без анимации, иначе при перемеривании
    // после загрузки шрифта скобки «доедут» на пару пикселей
    brs.forEach(function (b) { b.style.transition = 'none'; });
    ticker.style.setProperty('--ctx-shift', full + 'px');
    void ticker.offsetWidth; // форсируем reflow, чтобы новый сдвиг применился сразу
    brs.forEach(function (b) { b.style.transition = ''; });
  }
  measure();
  // после загрузки IBM Plex Mono ширина слова меняется — перемеряем
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(measure);
  }
  window.addEventListener('load', measure);
  window.addEventListener('resize', measure);

  // без IntersectionObserver (совсем старые браузеры) просто показываем
  // строку уже раскрытой — лучше статика, чем навсегда сомкнутые скобки
  if (!('IntersectionObserver' in window)) {
    ticker.classList.add('in');
    return;
  }

  // пульс: пока строка в кадре, через паузу скобки схлопываются обратно
  // и снова раскрываются. Таймеры живут только пока экран виден —
  // ушёл со скроллом, цикл останавливается (иначе анимация гонялась бы впустую)
  const COLLAPSE = 1.4e3; // длительность «сжатия» + пауза сомкнутого состояния
  const PERIOD = 6.0e3;   // раз в сколько секунд повторяется пульс
  let loopT1 = null, loopT2 = null, reopenT = null, visible = false;

  function startLoop() {
    // первый пульс — после того, как доиграла стартовая анимация раскрытия
    loopT1 = setTimeout(function () {
      pulse();
      loopT2 = setInterval(pulse, PERIOD);
    }, 3.2e3);
  }
  function pulse() {
    // сжатие запускаем только если строка сейчас раскрыта
    if (!ticker.classList.contains('in')) return;
    ticker.classList.remove('in');
    clearTimeout(reopenT);
    reopenT = setTimeout(function () {
      // раскрываем обратно только если пользователь ещё на этом экране —
      // иначе «доигравший» таймер вруби раскрытие в скрытой секции
      if (visible) ticker.classList.add('in');
    }, COLLAPSE);
  }
  function stopLoop() {
    clearTimeout(loopT1);
    clearInterval(loopT2);
    clearTimeout(reopenT);
    loopT1 = loopT2 = reopenT = null;
  }

  // два порога: строка активируется, когда больше чем на 60% в кадре;
  // сброс — только когда строка целиком ушла с экрана, чтобы анимация
  // переигрывалась при каждом возвращении, но не мигала на границе
  const io = new IntersectionObserver(function (entries) {
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (!e.isIntersecting) {
        visible = false;
        ticker.classList.remove('in');
        stopLoop();
      } else if (e.intersectionRatio >= 0.6) {
        visible = true;
        ticker.classList.add('in');
        if (!loopT1) startLoop();
      }
    }
  }, { threshold: [0, 0.6] });
  io.observe(ticker);
})();

/* ============================================================
   Катыш чек-листа: шарик на основной линии коннекторов.
   Скролл двигает границу проявления svg: видно всё, что выше
   шарика, ниже — скрыто. Сам шарик катится строго по основной
   линии-зигзагу сверху вниз и не заходит на ответвления к пунктам
   01–05. Это непрерывный скраб от позиции скролла (как «фонарик»
   в scientists.js), полностью обратимый, поэтому двойной путь
   CSS/JS тут не нужен: скорость скролла на состояние не влияет.
   ============================================================ */
(function () {
  const sec = document.querySelector('.sec-checklist');
  const svg = sec && sec.querySelector('.lines-svg');
  const ball = sec && sec.querySelector('.cl-ball');
  const pageInner = document.getElementById('page-inner');
  if (!sec || !svg || !ball || !pageInner) return;

  const H = 3903;      // высота секции в макете
  const SCREEN = 832;  // один экран макета
  const START_Y = 390; // старт границы: шарик в начальной точке полностью
                     // спрятан под оранжевым виджетом «Краткий чек-лист…»
                     // (его низ ~405–427px в зависимости от переносов) и
                     // выезжает из-под него при прокрутке. Не 416 (середина
                     // экрана), потому что при 416 низ шарика (426) упирается
                     // в кромку виджета; между 390 и 416 чернил вне виджета
                     // нет — видимый результат не меняется, скрыто по-прежнему
                     // чуть больше нижней половины экрана
  // ход границы: 0 — верх секции дошёл до верха вьюпорта,
  // 1 — низ секции дошёл до низа вьюпорта; к концу раскрыт весь svg
  const SPAN = H - SCREEN;

  // «хребет» checklist.svg: старт под правым краем тикера, узлы-кружки
  // пунктов 01–05, точка (826;3733) и хвост до нижнего края секции.
  // Ответвления (горизонтали к пунктам 01/03/05 влево и выносы 02/04
  // вправо) в путь не входят — шарик по ним не ходит. Путь монотонно
  // спускается по y, поэтому точку на высоте y ищем проходом по сегментам.
  const SPINE = [
    [1180.472395926382, 212.02611064834616], [578.5, 782], [565, 796],
    [569.4973169038217, 814.9975014025249], [710.5, 1402], [715, 1421],
    [710.5, 1440], [569.4895292816227, 2028.0290274703978], [565, 2046],
    [569.4966960964616, 2064.963949236426], [709.5, 2652], [715, 2671],
    [711.5, 2690], [571.4966960964616, 3277.036050763574], [565, 3296],
    [568.5009864915598, 3314.998101020613], [826, 3733], [826, 3902]
  ];
  const LAST_Y = SPINE[SPINE.length - 1][1];

  function pointAtY(y) {
    if (y <= SPINE[0][1]) return SPINE[0];
    for (let i = 1; i < SPINE.length; i++) {
      const a = SPINE[i - 1], b = SPINE[i];
      if (y <= b[1]) {
        // сегменты хребта всегда идут вниз — деление безопасно
        const t = (y - a[1]) / (b[1] - a[1]);
        return [a[0] + (b[0] - a[0]) * t, y];
      }
    }
    return SPINE[SPINE.length - 1];
  }

  function scale() { return pageInner.getBoundingClientRect().width / 1280; }

  function update() {
    const s = scale();
    if (s <= 0) return;
    // верх секции на странице в макетных пикселях (как pinTop в teardown.js);
    // делём на масштаб, т.к. пороги хранятся в координатах макета
    const top = (sec.getBoundingClientRect().top + window.scrollY) / s;
    const p = Math.min(Math.max((window.scrollY / s - top) / SPAN, 0), 1);
    const yEdge = START_Y + (H - START_Y) * p;
    const pt = pointAtY(Math.min(yEdge, LAST_Y));
    // clip-path инлайном, без var()/calc() — надёжнее в старых браузерах.
    // Пока js не выполнился, стиль отсутствует и svg полностью виден (фолбэк)
    svg.style.clipPath = 'inset(0px 0px ' + (H - yEdge) + 'px 0px)';
    // у стыка с экраном «Вывод» (нижняя кромка секции) шарик растворяется
    // на хвосте линии: пока он катится по вертикальному отрезку к кромке,
    // плавно гаснет и к «контакту» уже невидим. Гаснет ровно с момента,
    // когда шарик проходит точку (826;3733) — дальше только хвост
    ball.style.opacity = Math.max(Math.min((H - yEdge) / 170, 1), 0);
    // в CSS у .cl-ball сдвиг на -10px (половина размера): в точку пути
    // попадает центр шарика
    ball.style.transform = 'translate(' + pt[0] + 'px, ' + pt[1] + 'px)';
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  window.addEventListener('load', update);
  update();
})();
