(function () {
  const cards = Array.prototype.slice.call(document.querySelectorAll('.sec-card'));
  if (cards.length < 2) return;
  const next = document.querySelector('.sec-scientists');
  const pageInner = document.getElementById('page-inner');
  if (!next || !pageInner) return;

  const LAST = cards.length - 1;
  const DUR = 620;
  let idx = 0;
  let sliding = false;

  const pinWrap = cards[0].parentElement; // .cards-pin
  const photo = pinWrap.querySelector('.cards-photo');
  const sciPin = next.parentElement;      // .sci-pin — обёртка секции учёных

  function scale() { return pageInner.getBoundingClientRect().width / 1280; }
  // topOf с округлением: scrollTo работает в целых пикселях,
  // дробная копейка от scale() ломала границы зоны (y < ze давало true на границе)
  function topOf(el) { return Math.round(el.getBoundingClientRect().top + window.scrollY); }
  function zoneStart() { return topOf(cards[0]); }
  // зона карточек заканчивается на первом пикселе секции учёных (обёртка
  // .sci-pin): с неё скролл нативный. Меряем ОБЁРТКУ, не секцию:
  // sec-scientists несёт transform fade-анимации (после сброса класса её нет,
  // но до сброса rect.top поймал бы приколотое к вьюпорту положение —
  // ze «плавал» бы вместе со скроллом, как меряют обёртки hero.js/teardown.js)
  function zoneEnd() { return topOf(sciPin); }
  // верх карточки 04 независимо от её трансформов: карточку двигают ленты,
  // topOf секции во время ленты даёт сам scrollY. Обёртка .cards-pin не
  // трансформится никогда: меряем её и прибавляем шаг 04
  function cardTop() { return topOf(pinWrap) + LAST * ZH * scale(); }

  // фиксированная рука-лупа: прижата к вьюпорту, пока экран стоит ровно
  // на карточке; при нативном скролле между карточками — отпускается
  // и уезжает вместе со страницей
  const ZH = 832; // высота экрана в макете
  function photoPin() {
    if (!photo) return;
    const s = scale();
    const y = window.scrollY / s;      // в координатах макета (1280x832)
    const zs = zoneStart() / s;
    const ze = zoneEnd() / s;
    const rel = y - zs;
    // «ступенька»: ближайшая карточка. Math.round, а не floor:
    // границы дробные (scale), и пыль 0.001px у границы 832.0 сбрасывала
    // ступень на предыдущую карточку — рука пропадала на 02/03
    let stick = Math.max(0, Math.min(Math.round(rel / ZH), LAST)) * ZH;
    // во время fade-перехода рука приколота вместе с карточкой 04: белый
    // экран проявляется поверх, и она не должна уезжать со страницей
    if (fading) stick = LAST * ZH;
    const active = y + ZH > zs && y < ze;
    pinWrap.classList.toggle('on-stage', active);
    photo.style.transform = 'translateY(' + stick + 'px)';
  }

  // ── fade-переход 04 → «Учёные доказали» ─────────────────────────────
  // Дискретный (как ленты): один жест = одно переключение, скролл прогрессом
  // не рулит. Вниз с карточки 04 — белый экран проявляется поверх (карточка
  // стоит в потоке), в конце мгновенный скролл на верх .sci-pin и сброс
  // класса. Вверх с «Учёные доказали» — наоборот: мгновенный скролл на
  // карточку 04 (экран ещё накрыт классом), затем экран растворяется
  let fading = false;

  function sciForward() {
    if (fading) return;
    fading = true;
    pinWrap.classList.add('on-stage'); // рука видна всю анимацию
    next.classList.add('sci-fade-in');
    setTimeout(function () {
      // к этому моменту экран непрозрачен и висит на -832 (компенсация
      // собственного положения в потоке) — визуально он ровно на вьюпорте:
      // мгновенный скролл на верх .sci-pin ничего не двигает, класс сброс
      window.scrollTo(0, topOf(sciPin));
      next.classList.remove('sci-fade-in');
      fading = false;
      // гасим хвост инерции: колёса сразу после перехода не запускают
      // следующий (как после лент)
      last = performance.now();
    }, DUR + 30);
  }

  function sciBack() {
    if (fading) return;
    fading = true;
    pinWrap.classList.add('on-stage');
    // экран ещё лежит в потоке на верхе .sci-pin — визуально на вьюпорте.
    // Класс накрывает его с -832 (тот же кадр) и растворяет: мгновенный
    // скролл обратно на карточку 04 проходит незаметно
    next.classList.add('sci-fade-out');
    next.getBoundingClientRect(); // фиксируем стартовый кадр до скролла
    window.scrollTo(0, cardTop());
    setTimeout(function () {
      next.classList.remove('sci-fade-out');
      fading = false;
      last = performance.now();
    }, DUR + 30);
  }

  window.addEventListener('scroll', function () { photoPin(); }, { passive: true });
  window.addEventListener('resize', function () { photoPin(); });

  // лента: A уезжает влево/вправо, B въезжает с противоположной стороны,
  // в конце мгновенный скролл на targetY и сброс трансформов
  function ribbon(A, B, targetY, dir, done) {
    sliding = true;
    // если в ленте участвует карточка, рука должна быть видна всю анимацию
    const cardsArr = cards;
    if (cardsArr.indexOf(A) > -1 || cardsArr.indexOf(B) > -1) pinWrap.classList.add('on-stage');
    const s = scale();
    const y = window.scrollY;
    const dyA = (y - topOf(A)) / s;
    const dyB = (y - topOf(B)) / s;

    // 1) стартовое состояние БЕЗ transition: A на месте, B за краем экрана
    A.classList.remove('ribbon');
    B.classList.remove('ribbon');
    A.style.transform = 'translate(0px,' + dyA + 'px)';
    B.style.transform = 'translate(' + (dir > 0 ? '1280px' : '-1280px') + ',' + dyB + 'px)';
    A.getBoundingClientRect();

    // 2) включаем transition и едем: вниз A влево/B справа, вверх A вправо/B слева
    A.classList.add('ribbon');
    B.classList.add('ribbon');
    A.getBoundingClientRect();
    A.style.transform = 'translate(' + (dir > 0 ? '-1280px' : '1280px') + ',' + dyA + 'px)';
    B.style.transform = 'translate(0px,' + dyB + 'px)';

    // 3) в конце — мгновенный скролл и сброс
    setTimeout(function () {
      window.scrollTo(0, targetY);
      A.classList.remove('ribbon');
      B.classList.remove('ribbon');
      A.style.transform = '';
      B.style.transform = '';
      sliding = false;
      // гасим хвост инерции: колёса сразу после ленты не должны запускать
      // следующую (иначе «преждевременные» анимации при скролле вверх)
      last = performance.now();
      if (done) done();
    }, DUR + 30);
  }

  function goForward() {
    if (idx >= LAST) return;
    const to = idx + 1;
    ribbon(cards[idx], cards[to], topOf(cards[to]), 1, function () { idx = to; });
  }
  function goBack() {
    if (idx <= 0) return;
    const from = cards[idx];
    const to = idx - 1;
    ribbon(from, cards[to], topOf(cards[to]), -1, function () { idx = to; });
  }

  let last = 0;
  function gate(e) {
    if (performance.now() - last < 250) return false;
    if (Math.abs(e.deltaY) < 20) return false;
    last = performance.now();
    return true;
  }

  // вверх: один жест = одна лента. Трекпад после свайпа шлёт инерцию
  // очередью событий с паузами < 120 мс — раньше такая очередь успевала
  // прогнать 04→03→02→01 за один свайп. Пауза длиннее 120 мс — новый жест
  let lastWheelAt = 0;
  let used = false;   // жест уже потрачен (добив или лента)
  function noteWheel() {
    const now = performance.now();
    if (now - lastWheelAt > 120) { used = false; }
    lastWheelAt = now;
  }

  // лента вверх — только когда страница реально остановилась: хвост
  // инерции продолжает двигать страницу (и растит паузы между wheel-тами),
  // поэтому «новый жест» по паузам он обманывает, а признак покоя — нет
  let lastScrollAt = 0;
  function noteScroll() { lastScrollAt = performance.now(); }

  // ловушка пролёта: свайп вверх с нижних экранов нативно проносит страницу
  // сквозь экран учёных к карточкам. Ловим момент, когда пролёт ПЕРЕСЁК
  // верх экрана (y стал меньше topOf(sciPin)) — snap обратно на экран.
  // Пока пролёт едет снизу (y > top), не мешаем: обычный нативный скролл
  // снизу вверх должен проходить все нижние экраны как обычно
  function catchFlight() {
    if (!flight) return;
    const top = topOf(sciPin);
    if (window.scrollY >= top) return;
    window.scrollTo(0, top);
    flight = false;
  }

  window.addEventListener('scroll', function () {
    noteScroll();
    catchFlight();
  }, { passive: true });
  function syncIdx() {
    const y = window.scrollY;
    let s = 0;
    for (let i = 0; i <= LAST; i++) {
      if (y >= topOf(cards[i]) - 4) s = i;
    }
    idx = s;
  }

  window.addEventListener('wheel', function (e) {
    if (sliding || fading) { e.preventDefault(); return; }
    noteWheel();
    const y = window.scrollY;
    const zs = zoneStart();
    const ze = zoneEnd();

    if (e.deltaY > 0) {
      // выше зоны (в т.ч. «Если научный тезис…») и ниже неё — нативный скролл:
      // экран стейтмента — обычная секция над карточкой 01, секции после
      // «Учёные доказали» — после её верха
      if (y < zs || y >= ze) return;
      syncIdx();
      // с карточки 04 вниз — fade-переход на «Учёные доказали»
      if (idx >= LAST) {
        e.preventDefault();
        if (gate(e)) sciForward();
        return;
      }
      const top = topOf(cards[idx]);
      // стоим не на верхней границе карточки — сначала добиваем до неё
      if (y > top + 4) { e.preventDefault(); window.scrollTo(0, top); return; }
      e.preventDefault();
      if (!gate(e)) return;
      goForward();
    } else {
      const t4 = cardTop();
      // ниже экрана учёных — нативный скролл (вся нижняя часть страницы);
      // инерцию такого проезда наверх ловит catchFlight на верхе экрана
      if (y > ze) { flight = true; return; }
      if (y > t4 + 4) {
        // экран учёных в кадре (или щель между ним и карточкой 04): щель
        // дотягиваем до верха экрана — инерционный проезд из-под низа
        // останавливается здесь, а не проскакивает к карточкам. Сам fade
        // на 04 — только когда страница РЕАЛЬНО остановилась (признак
        // покоя, как у ленты вверх): инерционные паузы между колёсами
        // бывают > 120 мс и обманывают used, а хвост инерции, дотащивший
        // страницу из-под низа, не должен сразу же уводить её на 04
        e.preventDefault();
        const rest = performance.now() - lastScrollAt > 150;
        if (y < ze || used || !rest) { used = true; window.scrollTo(0, ze); return; }
        if (gate(e)) { used = true; sciBack(); }
        return;
      }
      if (y < zs - 4) return;
      syncIdx();
      const top = topOf(cards[idx]);
      // карточка не полностью на экране — сначала добиваем её до верхней
      // границы (y == top), и только следующий жест запускает ленту 04 → 03
      if (y > top + 4) {
        e.preventDefault();
        used = true; // жест потрачен на добив
        window.scrollTo(0, top);
        return;
      }
      // с карточки 01 вверх — нативный скролл на «Если научный тезис…»
      if (idx <= 0) return;
      e.preventDefault();
      const rest = performance.now() - lastScrollAt > 150;
      if (!gate(e) || used || !rest) return;
      used = true;
      goBack();
    }
  }, { passive: false });

  window.addEventListener('keydown', function (e) {
    if (sliding || fading) { e.preventDefault(); return; }
    const fwd = e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ';
    const back = e.key === 'ArrowUp' || e.key === 'PageUp';
    if (!fwd && !back) return;
    const y = window.scrollY;
    const zs = zoneStart();
    const ze = zoneEnd();

    if (fwd) {
      if (y < zs || y >= ze) return;
      syncIdx();
      // с карточки 04 вниз — fade-переход на «Учёные доказали»
      if (idx >= LAST) {
        e.preventDefault();
        sciForward();
        return;
      }
      const top = topOf(cards[idx]);
      if (y > top + 4) { e.preventDefault(); window.scrollTo(0, top); return; }
      e.preventDefault();
      goForward();
    } else {
      // ниже экрана учёных — нативный скролл (вся нижняя часть страницы)
      if (y > ze) return;
      // экран учёных в кадре — fade-переход обратно на карточку 04
      if (y > cardTop() + 4) {
        e.preventDefault();
        sciBack();
        return;
      }
      if (y < zs - 4 || y >= ze) return;
      syncIdx();
      const top = topOf(cards[idx]);
      // карточка не полностью на экране — сначала добиваем до верхней границы,
      // лента 04 → 03 только следующим жестом
      if (y > top + 4) { e.preventDefault(); window.scrollTo(0, top); return; }
      // с карточки 01 вверх — нативный скролл на «Если научный тезис…»
      if (idx <= 0) return;
      e.preventDefault();
      goBack();
    }
  });

  // превью состояния без прокрутки: #card-step1 .. #card-step4
  // прыжок повторяется и по load: в момент парсинга скрипта картинки выше
  // ещё не загрузились, layout «не дотягивает» — первый скролл уходит не туда
  function hashJump() {
    const m = location.hash.match(/^#card-step([1-4])$/);
    if (m) {
      idx = +m[1] - 1;
      window.scrollTo(0, topOf(cards[idx]));
    }
    // превью экрана «Учёные доказали»: #sci-step1 — экран в кадре
    const ms = location.hash.match(/^#sci-step1$/);
    if (ms) window.scrollTo(0, topOf(sciPin));
  }
  hashJump();
  // web-шрифты (display=swap) меняют метрики текста уже ПОСЛЕ load: документ
  // растёт, границы зон уезжают, а событие scroll не приходит (scrollY не
  // менялся) — пины остаются с устаревшими трансформами. Пересчитываем прыжок
  // и пин руки после load и после готовности шрифтов
  function settle() {
    hashJump();
    photoPin();
  }
  window.addEventListener('load', settle);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);
  photoPin();
})();
