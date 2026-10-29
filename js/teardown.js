(function () {
  // разбор поста: пин на 3200px скролла (3 перехода + запас на вердикте), табы публикация → контекст → первоисточник → вердикт.
  // скролл только выбирает состояние (пороги — середины переходов), сам переход
  // всегда играет фиксированные 0.8 с: скоростью скролла управлять нельзя
  const pin = document.querySelector('.td-pin');
  const section = pin && pin.querySelector('.sec-teardown');
  const pageInner = document.getElementById('page-inner');
  if (!pin || !section || !pageInner) return;

  const TRANS = 800;        // скролла на один переход таба
  const PIN = TRANS * 3;    // переходы
  const RESERVE = TRANS;    // запас на вердикте: экран держится ещё один «скролл»

  const supportsTimeline = !!(window.CSS && CSS.supports &&
    CSS.supports('animation-timeline', 'scroll(root)'));

  let th1 = Infinity, th2 = Infinity, th3 = Infinity;  // пороги смены состояния, px скролла

  function scale() { return pageInner.getBoundingClientRect().width / 1280; }
  function pinTop() { return pin.getBoundingClientRect().top + window.scrollY; }

  // границы пина в долях корневого скролла — только для пина секции;
  // пороги состояний считаем в пикселях скролла
  function calibrate() {
    const s = scale();
    // вылет чёрной панели в боковое поле окна (--td-bleed в css): на широких
    // экранах колонка центрируется с полями (scale вписывает по высоте), и
    // панель должна доходить до настоящего левого края экрана. Ширина поля
    // в px макета; на вписанных по ширине окнах поле нулевое
    const bleed = Math.max(0, (document.documentElement.clientWidth - 1280 * s) / 2 / s);
    pin.style.setProperty('--td-bleed', bleed.toFixed(2) + 'px');
    th1 = pinTop() + TRANS * s * 0.5;
    th2 = pinTop() + TRANS * s * 1.5;
    th3 = pinTop() + TRANS * s * 2.5;
    if (!supportsTimeline) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (max <= 0) return;
    const a = pinTop() / max;
    const b = (pinTop() + (PIN + RESERVE) * s) / max;
    // запись только при изменении: calibrate зовётся на каждом scroll
    // (см. ниже), одинаковая строка не должна плодить мутаций стиля
    const range = (a * 100).toFixed(3) + '% ' + (b * 100).toFixed(3) + '%';
    if (section.style.getPropertyValue('animation-range') !== range)
      section.style.setProperty('animation-range', range);
  }

  function syncState(y) {
    const st = y < th1 ? 0 : y < th2 ? 1 : y < th3 ? 2 : 3;
    pin.classList.toggle('s0', st === 0);
    pin.classList.toggle('s1', st === 1);
    pin.classList.toggle('s2', st === 2);
    pin.classList.toggle('s3', st === 3);
  }

  // ручной пин для браузеров без scroll-driven animations: скраб = линейная
  // ветка tdPin-анимации, translateY догоняет скролл весь диапазон
  // (PIN+RESERVE, как to в @keyframes — экран приколот и на запасе
  // вердикта), дальше замирает и секция уезжает сама
  function applyProgress() {
    const y = window.scrollY;
    syncState(y);
    if (pin.classList.contains('tl')) return;
    const s = scale();
    const start = pinTop();
    if (y <= start) section.style.transform = '';
    else if (y - start <= (PIN + RESERVE) * s) section.style.transform = 'translateY(' + (Math.min(y - start, (PIN + RESERVE) * s) / s) + 'px)';
    else section.style.transform = 'translateY(' + (PIN + RESERVE) + 'px)';
  }

  if (supportsTimeline) pin.classList.add('tl');
  calibrate();
  // calibrate и на scroll: высота документа доезжает ПОСЛЕ load — sci-pin
  // режется в js/scientists.js (скрипт ниже по порядку), а слои боков
  // js/sides.js на load перестраиваются ПОСЛЕ этого скрипта и до тех пор
  // торчат ниже #page, завышая scrollHeight. Проценты animation-range —
  // доли ТЕКУЩЕГО диапазона скролла: max, замеренный в момент, когда docH
  // ещё старый, молча сдвигает весь пин (экран разбора «тонет» под
  // вьюпорт — белая пустота, гейт выбрасывает на чек-лист). К первому
  // scroll docH уже осел, строка выше не меняется — лишней записи нет
  window.addEventListener('scroll', function () { calibrate(); applyProgress(); }, { passive: true });
  window.addEventListener('resize', function () { calibrate(); applyProgress(); });
  window.addEventListener('load', function () {
    calibrate(); applyProgress();
    // повтор ПОСЛЕ чужих load-обработчиков: слои боков js/sides.js
    // перестраиваются в rAF, отложенном на load, — первый rAF тут ещё
    // соседний с ними, второй уже после перестройки, docH осел
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { calibrate(); applyProgress(); });
    });
  });
  applyProgress();

  // превью состояний без прокрутки: #td-step0 (публикация), 1 (контекст), 2 (первоисточник), 3 (вердикт)
  // повтор по load: до загрузки картинок выше layout меньше, первый прыжок уходит не туда
  function hashJump() {
    const m = location.hash.match(/^#td-step([0-3])$/);
    if (m) {
      window.scrollTo(0, pinTop() + TRANS * scale() * (+m[1]));
      applyProgress();
    }
  }
  hashJump();
  // шрифты (display=swap) доезжают после load и растят документ: прыжок по
  // хэшу уходит не туда — повторяем после готовности шрифтов
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { calibrate(); hashJump(); applyProgress(); });
  }
})();
