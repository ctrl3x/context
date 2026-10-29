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
  // верх зоны перехода на учёных (обёртка .sci-pin) = низ карточки 04:
  // зона кроссфейда — [cardTop 04, zoneEnd], порог — её середина. Меряем
  // ОБЁРТКУ, не секцию: sec-scientists прячется классами sci-on (после
  // снятия visibility нет, но до снятия rect.top поймал бы приколотое к
  // вьюпорту положение — ze «плавал» бы вместе со скроллом, как меряют
  // обёртки hero.js/teardown.js)
  function zoneEnd() { return topOf(sciPin); }
  // верх карточки 04 независимо от её трансформов: карточку двигают ленты,
  // topOf секции во время ленты даёт сам scrollY. Обёртка .cards-pin не
  // трансформится никогда: меряем её и прибавляем шаг 04. Округление —
  // ОБЯЗАТЕЛЬНО и тем же способом, что и у позиции отдыха: страница стоит
  // на карточке в topOf(cards[LAST]) = Math.round(той же дробной величины),
  // дробная cardTop() была бы больше позиции отдыха на копейку — и колесо
  // вниз уходило бы в ветку карточек (goForward с idx === LAST молчал),
  // страница «залипала» на 04 при дробном scale
  function cardTop() { return Math.round(topOf(pinWrap) + LAST * ZH * scale()); }

  // фиксированная рука-лупа: прижата к вьюпорту, пока экран стоит ровно
  // на карточке; при нативном скролле между карточками — отпускается
  // и уезжает вместе со страницей. На карточке 04 (и в зоне перехода
  // под ней) рука едет вместе с приклеенной карточкой: к ступеньке
  // добавляется её сдвиг dy4 (его считает fadePin, поэтому в scroll-
  // хендлере fadePin вызывается раньше photoPin)
  const ZH = 832; // высота экрана в макете
  let dy4 = 0;    // текущий сдвиг приклейки карточки 04 (layout-px)
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
    const step = Math.max(0, Math.min(Math.round(rel / ZH), LAST));
    const stick = step * ZH + (step === LAST ? dy4 : 0);
    const active = y + ZH > zs && y < ze;
    pinWrap.classList.toggle('on-stage', active);
    photo.style.transform = 'translateY(' + stick + 'px)';
  }

  // ── переход 04 → «Учёные доказали»: триггер по скроллу ────────────────
  // Зона перехода — [cardTop 04, cardTop 04 + 832·scale] (ровно один экран
  // скролла), порог — её середина: cardTop 04 + 416·scale. Скролл проходит
  // зону свободно (нативно), пересечение порога в любую сторону играет
  // кроссфейд фиксированные 620 мс — скоростью скролла управлять нельзя.
  // Работает отовсюду: жесты wheel, стрелки, скроллбар, инерция тачпада.
  //
  // Всю зону оба экрана приклеены к вьюпорту: карточку 04 удерживает
  // translateY(+dy) (fadePin: поток уносит её вверх, сдвиг возвращает на
  // место), экран учёных на встречном ходе держит кламп −832 в scrub
  // js/scientists.js (его transform −832…0 накрывает вьюпорт, пока зона
  // не пройдена). К концу зоны карточка стоит приколотой ровно ЗА
  // непрозрачным экраном учёных — дальше она может «зависнуть» в приклейке
  // незаметно, поэтому кламп сверху не требует сброса. Число FADE держать
  // синхронным с js/scientists.js (FADE там) и комментарием к .sci-pin.
  const FADE = 832; // длина зоны перехода в px макета
  let flight = false; // идёт инерционный пролёт снизу вверх (см. catchFlight)

  let sciTh = Infinity; // порог состояния: середина зоны, px скролла

  function sciPlaying() { return next.classList.contains('sci-anim-in') || next.classList.contains('sci-anim-out'); }

  // пересчёт порога + состояние из скролла без анимации:
  // вход на страницу, пересчёт layout, финал анимации
  function syncSci() {
    // порог округлён до целых: scrollTo работает в целых пикселях, и ловля
    // пролёта (catchFlight) прыгает ровно на sciTh. Дробный порог давал бы
    // стоянку на копейку НИЖЕ порога — эхо снапа ловилось бы повторно (уже
    // с нулевой скоростью) и снимало бы удержание стоянки
    sciTh = Math.round(cardTop() + FADE * scale() * 0.5);
    sciPin.classList.toggle('sci-on', window.scrollY >= sciTh);
  }

  // приклейка карточки 04: пока вьюпорт проезжает зону [cardTop, cardTop+832],
  // карточку удерживает на месте translateY(+dy); вне зоны dy = 0 — в потоке.
  // Снизу зона сшита с потоком непрерывно (dy растёт из нуля); сверху —
  // карточка уже закрыта непрозрачным экраном учёных, скачков не видно
  function fadePin() {
    const s = scale();
    const y = window.scrollY;
    dy4 = Math.min(Math.max((y - cardTop()) / s, 0), FADE);
    cards[LAST].style.transform = dy4 > 0.01 ? 'translateY(' + dy4 + 'px)' : '';
  }

  function sciForward() {
    if (sciPlaying()) return;
    sciPin.classList.add('sci-on');      // секция видима всю анимацию
    next.classList.add('sci-anim-in');
    setTimeout(function () {
      next.classList.remove('sci-anim-in');
      syncSci();
      sciTick(); // скролл мог уйти за порог обратно во время анимации — доигрываем
    }, DUR + 30);
  }

  function sciBack() {
    if (sciPlaying()) return;
    next.classList.add('sci-anim-out');  // .sci-on ещё держит секцию видимой
    setTimeout(function () {
      next.classList.remove('sci-anim-out');
      syncSci();                         // снимает .sci-on — экран скрыт
      sciTick();
    }, DUR + 30);
  }

  // тик состояния: пересечение порога в любую сторону — сыграть кроссфейд.
  // Во время анимации и пролёта (flight) состояние не трогаем: финал
  // анимации и catchFlight выставят его по фактическому скроллу
  function sciTick() {
    if (!Number.isFinite(sciTh) || sciPlaying() || flight) return;
    const want = window.scrollY >= sciTh;
    if (want === sciPin.classList.contains('sci-on')) return;
    want ? sciForward() : sciBack();
  }

  // ── страховка от «наплыва» экрана учёных на экраны выше ────────────────
  // Кроссфейд играет фиксированные 620 мс, а зону скролл проходит свободно:
  // быстрый ход вверх выходит из зоны раньше фейда, и почти непрозрачный
  // экран уезжает вместе со страницей — «наплывает» на экраны выше. Пока
  // экран показан (.sci-on), страницу выше начала зоны (cardTop) не
  // отпускаем: scroll-событие возвращает её на cardTop, где состав ещё
  // статичен (оба экрана приколоты на всей зоне). Телепорт назад не виден:
  // в момент возврата экран непрозрачен и накрывает вьюпорт, а карточка 04
  // под ним приколота на тех же y. Фейд доигрывает над неподвижной
  // карточкой, как задумано; sciTick при y = cardTop видит want=false и
  // гасит экран (если фейд ещё не идёт), после снятия .sci-on зона
  // отпускает страницу. Медленный скролл клампа не замечает: фейд
  // успевает, пока страница доезжает до cardTop. Колёсный путь без дрожи:
  // non-passive wheel-слушатель заставляет браузер применять прокрутку
  // после хендлеров — промежуточная позиция не отрисовывается
  function sciClamp() {
    if (flight) return; // пролёт держит свою стоянку на пороге (catchFlight)
    if (!sciPin.classList.contains('sci-on')) return;
    if (window.scrollY >= cardTop()) return;
    window.scrollTo(0, cardTop());
  }

  window.addEventListener('scroll', function () { sciClamp(); fadePin(); photoPin(); sciTick(); settleArm(); }, { passive: true });
  window.addEventListener('resize', function () { fadePin(); photoPin(); sciTick(); });

  // ── дотяжка на покое: страница не должна застревать между карточками ────
  // Хвост плавного скролла (wheel-события уже кончились, Chrome дотаивает
  // анимацию сам) выезжает из-под клампа сразу после снятия .sci-on и может
  // ОСТАНОВИТЬСЯ посреди карточки: «добив» в wheel-обработчике ловит только
  // события, а их больше нет — экран замирает срезанным («поплыл»), виден
  // соседний. Когда внутри ленты карточек скролл затих на 180 мс, а страница
  // стоит не на верхней границе текущей карточки — снапим на неё: та же
  // семантика, что у «добива» (syncIdx + topOf, допуск 4px от дробного
  // scale). Вне ленты (выше zoneStart−4 или в зоне перехода y ≥ cardTop−4)
  // не вмешиваемся: там рулевые sciClamp/sciTick и нативный стык со
  // «стейтментом». Гварды sliding/flight/sci-on: пока позицию держат лента,
  // пролёт или кроссфейд, дотяжка не вооружается вовсе — таймер перевооружается
  // каждым scroll-событием, поэтому срабатывает только на настоящей тишине
  let settleT = 0;
  function settleArm() {
    if (settleT) { clearTimeout(settleT); settleT = 0; }
    if (sliding || flight || sciPlaying() || sciPin.classList.contains('sci-on')) return;
    const y = window.scrollY;
    if (y < zoneStart() - 4 || y >= cardTop() - 4) return;
    syncIdx();
    if (y <= topOf(cards[idx]) + 4) return; // уже на границе — нечего тянуть
    settleT = setTimeout(function () {
      settleT = 0;
      // за тишину могло всё поменяться — перечитываем состояние и layout
      if (sliding || flight || sciPlaying() || sciPin.classList.contains('sci-on')) return;
      const y2 = window.scrollY;
      if (y2 < zoneStart() - 4 || y2 >= cardTop() - 4) return;
      syncIdx();
      window.scrollTo(0, topOf(cards[idx]));
    }, 180);
  }

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
    if (now - lastWheelAt > 120) {
      used = false;
      // новый жест или инерция кончились: висящий флаг пролёта снимаем —
      // иначе он поймает и следующий медленный подход к экрану (а если
      // пролёт умер, не доехав до порога, то sciTick навсегда заблокирован)
      flight = false;
    }
    lastWheelAt = now;
  }

  // лента вверх — только когда страница реально остановилась: хвост
  // инерции продолжает двигать страницу (и растит паузы между wheel-тами),
  // поэтому «новый жест» по паузам он обманывает, а признак покоя — нет
  let lastScrollAt = 0;
  let lastScrollY = window.scrollY;
  let lastScrollT = 0; // время прошлого scroll-события — для скорости пролёта
  function noteScroll() { lastScrollAt = performance.now(); }

  // ловушка пролёта: свайп вверх с нижних экранов нативно проносит страницу
  // сквозь зону перехода и экран учёных к карточкам. Ловим момент, когда
  // пролёт ПЕРЕСЁК порог состояния (y стал меньше sciTh) — snap обратно на
  // порог: страница останавливается на экране «Учёные доказали» (состояние
  // не менялось — кроссфейд не дёргается), дальше наверх пользователь
  // уходит уже осознанным жестом через честный fade. Пока пролёт едет
  // снизу (y > порога), не мешаем: нативный скролл.
  //
  // Флаг после ловли НЕ снимается: scrollTo инерцию не гасит, и её хвост
  // нативно проносил бы страницу сквозь зону — экран учёных уезжал бы
  // вместе с ней, «наплывая» на экраны выше (sciTick флагом заблокирован,
  // кроссфейд не стартует). Стоянку держим, ПОКА пролёт быстрый: скорость
  // хода меряем по соседним scroll-событиям (px/ms), и когда хвост
  // инерции растягивается медленнее порога — отпускаем: дальше медленный
  // дрейф вверх зарабатывает честный кроссфейд (sciTick), и фейд за ним
  // успевает. Дрожь позиций во время стоянки не видна: экран учёных
  // приколот и накрывает вьюпорт целиком. Тишина 150 мс после последней
  // ловли значит, что пролёт кончился совсем, — флаг снимается и без
  // «медленного» события (иначе уцепившийся флаг ловил бы и следующий
  // медленный подход к экрану)
  const CATCH_V = 1; // порог скорости пролёта, px/ms (~1000 px/s — точно инерция)
  let holdT = 0;     // таймер тишины после последней ловли пролёта
  function catchFlight(v) {
    if (!flight) return;
    const y = window.scrollY;
    if (y >= sciTh) return;
    window.scrollTo(0, sciTh);
    if (holdT) { clearTimeout(holdT); holdT = 0; }
    if (v >= CATCH_V) {
      holdT = setTimeout(function () { holdT = 0; flight = false; }, 150);
    } else {
      flight = false;
    }
  }

  window.addEventListener('scroll', function () {
    const now = performance.now();
    noteScroll();
    // скорость хода вверх с прошлого события: меряем ТОЛЬКО по настоящему
    // движению (снап отражается событием с y = sciTh — там y не убывал)
    const v = lastScrollT && window.scrollY < lastScrollY
      ? (lastScrollY - window.scrollY) / Math.max(now - lastScrollT, 1) : 0;
    lastScrollT = now;
    // реальное движение вниз ниже порога сбрасывает флаг — иначе sciTick
    // навсегда заблокирован; снап вверх до sciTh движением вниз не считается
    if (window.scrollY > lastScrollY && window.scrollY > sciTh) flight = false;
    lastScrollY = window.scrollY;
    catchFlight(v);
  }, { passive: true });
  function syncIdx() {
    const y = window.scrollY;
    let s = 0;
    for (let i = 0; i <= LAST; i++) {
      if (y >= topOf(cards[i]) - 4) s = i;
    }
    idx = s;
  }

  // стартовое состояние без прокрутки: .sci-gate включает JS-режим
  // (секция учёных скрыта, состояниями рулит sciTick), hashJump выставляет
  // честное начальное состояние по скроллу
  function sciInit() {
    sciPin.classList.add('sci-gate');
    syncSci();
  }
  sciInit();

  window.addEventListener('wheel', function (e) {
    if (sliding) { e.preventDefault(); return; }
    noteWheel();
    const y = window.scrollY;
    const zs = zoneStart();
    const ze = zoneEnd();

    if (e.deltaY > 0) {
      // выше зоны (в т.ч. «Если научный тезис…») и от карточки 04 вниз —
      // нативный скролл: экран стейтмента — обычная секция над карточкой 01,
      // зона перехода на «Учёные доказали» и секции после неё — нативные
      // (порог внутри зоны ловит sciTick, экран учёных доклеивает scrub
      // js/scientists.js). Допуск 4px к cardTop: дробный scale даёт
      // копеечную пыль между cardTop() и позицией отдыха на карточке —
      // она не должна уводить колесо в ветку карточек (там goForward с
      // idx === LAST молчал, и с 04 дальше не шли)
      if (y < zs || y >= cardTop() - 4) return;
      syncIdx();
      const top = topOf(cards[idx]);
      // стоим не на верхней границе карточки — сначала добиваем до неё
      if (y > top + 4) { e.preventDefault(); window.scrollTo(0, top); return; }
      e.preventDefault();
      if (!gate(e)) return;
      goForward();
    } else {
      // ниже фейд-зоны — нативный скролл (вся нижняя часть страницы);
      // инерцию такого проезда наверх ловит catchFlight на пороге зоны
      if (y > ze) { flight = true; return; }
      // в зоне перехода — нативный скролл: sciTick ловит порог сам, сам
      // пролёт инерции догоняет catchFlight. Допуск 4px — зеркально ветке
      // вниз: копеечная пыль дробного scale не уводит колесо в карточки
      if (y > cardTop() - 4) return;
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
    if (sliding) { e.preventDefault(); return; }
    const fwd = e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ';
    const back = e.key === 'ArrowUp' || e.key === 'PageUp';
    if (!fwd && !back) return;
    const y = window.scrollY;
    const zs = zoneStart();
    const ze = zoneEnd();

    if (fwd) {
      // от карточки 04 вниз — нативный скролл (sciTick ловит порог зоны
      // перехода сам, экран учёных доклеивает scrub js/scientists.js).
      // Допуск 4px к cardTop — как у wheel: дробный scale не «глотает»
      // клавиши в состоянии «карточка 04»
      if (y < zs || y >= cardTop() - 4) return;
      syncIdx();
      const top = topOf(cards[idx]);
      if (y > top + 4) { e.preventDefault(); window.scrollTo(0, top); return; }
      e.preventDefault();
      goForward();
    } else {
      // ниже фейд-зоны и в самой зоне — нативный скролл вверх (sciTick
      // ловит порог сам, инерцию догоняет catchFlight). Допуск 4px —
      // зеркально ветке вниз
      if (y > cardTop() - 4) return;
      if (y < zs - 4) return;
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

  // превью состояния без прокрутки: #card-step1 .. #card-step4,
  // #sci-step1 — экран «Учёные доказали» (панельное состояние)
  // прыжок повторяется и по load: в момент парсинга скрипта картинки выше
  // ещё не загрузились, layout «не дотягивает» — первый скролл уходит не туда
  function hashJump() {
    syncSci(); // порог считаем ДО прыжка: sci-step1 прыгает ровно на него
    const m = location.hash.match(/^#card-step([1-4])$/);
    if (m) {
      idx = +m[1] - 1;
      window.scrollTo(0, topOf(cards[idx]));
    }
    // превью экрана «Учёные доказали»: #sci-step1 — порог состояния
    // (середина зоны перехода, экран уже показан); подскролл ниже —
    // хвост пина с растяжкой маски (#sci-step2 ведёт js/scientists.js)
    const ms = location.hash.match(/^#sci-step1$/);
    if (ms) window.scrollTo(0, Math.round(sciTh));
    fadePin();
    photoPin();
    sciTick();
  }
  hashJump();
  // web-шрифты (display=swap) меняют метрики текста уже ПОСЛЕ load: документ
  // растёт, границы зон уезжают, а событие scroll не приходит (scrollY не
  // менялся) — пины остаются с устаревшими трансформами. Пересчитываем прыжок
  // и пины руки/карточки 04 после load и после готовности шрифтов
  function settle() {
    hashJump();
  }
  window.addEventListener('load', settle);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);
  syncSci();
  fadePin();
  photoPin();
})();
