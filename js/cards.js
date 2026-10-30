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
  const tdPin = document.querySelector('.td-pin'); // .td-pin — обёртка разбора поста

  function scale() { return pageInner.getBoundingClientRect().width / 1280; }
  // topOf с округлением: scrollTo работает в целых пикселях,
  // дробная копейка от scale() ломала границы зоны (y < ze давало true на границе)
  function topOf(el) { return Math.round(el.getBoundingClientRect().top + window.scrollY); }
  function zoneStart() { return topOf(cards[0]); }
  // верх зоны перехода на учёных (обёртка .sci-pin) = низ карточки 04:
  // зона перехода — [cardTop 04, zoneEnd], стоянка экрана учёных — zoneEnd.
  // Меряем ОБЁРТКУ, не секцию: sec-scientists прячется классами sci-on
  // (после снятия visibility нет, но до снятия rect.top поймал бы приколотое
  // к вьюпорту положение — ze «плавал» бы вместе со скроллом, как меряют
  // обёртки hero.js/teardown.js)
  function zoneEnd() { return topOf(sciPin); }
  // верх разбора поста — нижняя кромка зоны fade-гейта выхода из экрана
  // учёных (стык симметричен входному: зона [zoneEnd, tdTop], стоянка
  // разбора — tdTop). Меряем ОБЁРТКУ по тем же причинам, что и sciPin
  function tdTop() { return topOf(tdPin); }
  // режим «разворот выключен» (класс ставит js/scientists.js при
  // инициализации): хвост пина учёных — зона fade-гейта выхода, экран
  // приколот до tdTop. Проверяем лениво на каждом жесте: скрипт учёных
  // подключается ПОСЛЕ cards и класс на момент парсинга ещё не выставлен
  function sciFlat() { return sciPin.classList.contains('sci-flat'); }
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

  // ── переход 04 → «Учёные доказали»: fade-гейт через белую вуаль ─────────
  // Как переход герой → «Не спешите верить заголовку» (js/hero.js) и стыки
  // разбора поста (js/tdgates.js): жест (колесо/клавиши) на стоянке карточки
  // 04 или в зоне ниже играет вуаль 250 мс → прыжок на верх .sci-pin →
  // reveal 400 мс (js/fades.js, Fades.fade). Скроллом переход не управляется.
  //
  // Зона [cardTop 04, cardTop 04 + 832·scale] остаётся в документе как
  // нативный запас (скроллбар, как у слайдов tdgates): на всём её протяжении
  // карточка 04 приколота к вьюпорту translateY(+dy) (fadePin ниже), экран
  // учёных скрыт (.sci-on включается ровно на zoneEnd) и открывается только
  // под вуалью прыжка. Колесо/клавиши в зоне перехватываются (жест вниз —
  // на учёных, вверх — на карточку 04); не-колёсный вход в зону (скроллбар,
  // докатившая инерция) ловит fallback на scroll: мгновенная вуаль и прыжок
  // за зону в сторону хода. Инерция снизу вверх отдельно держится стоянкой
  // catchFlight (не уносится мимо экрана учёных в карточки).
  //
  // ЗЕРКАЛЬНЫЙ гейт на выходе из экрана учёных (стык с разбором поста,
  // только в режиме sci-flat — разворот маски выключен, класс ставит
  // js/scientists.js): хвост .sci-pin (832 px макета, EXIT там) — зона
  // [zoneEnd, tdTop]; экран учёных приколот scrub'ом (js/scientists.js),
  // разбор скрыт (.td-on включается ровно на tdTop). Жест вниз — вуаль и
  // прыжок на разбор, вверх (со стоянки разбора) — обратно на экран
  // учёных; fallback и ловля пролёта — те же, симметрично входу.
  // В режиме разворота хвост пина перехватывает js/tdgates.js.
  // Числа FADE/EXIT держать синхронными с js/scientists.js.
  const FADE = 832; // длина зоны перехода в px макета
  let flight = false; // идёт инерционный пролёт снизу вверх (см. catchFlight)

  // держак приземления перехода (fade/лента/fallback/пролёт): хвост разгона
  // (инерция тачпада — очередь wheel с паузами < 120 мс) после прыжка НЕ
  // должен нативно уносить страницу со стоянки — иначе разгон со учёных
  // доезжал до карточки 04 и уносил её в 03 (дотяжка защёлкивала), а разгон
  // с 03 — сквозь 04 на учёных и в разбор. Держак глотает события ТОЛЬКО
  // своего направления (holdSign): инерция направление не меняет, а
  // встречное колесо — сознательное желание («отмотать назад»), его глотать
  // нельзя — иначе с 04 вниз не перелистывается, пока крутится колесо.
  // Отпускают держак: встречное направление, пауза > 120 мс (новый жест,
  // см. noteWheel) и потолок HOLD_MAX — по образцу LOCK_MAX в js/fades.js
  //
  // Два сорта держака. ЖЁСТКИЙ (фейд, fallback, ловля пролёта): глотает
  // ВСЕ колёса своего направления до holdUntil — сразу после смены экрана
  // цепочка к следующему переходу «не долетая» не нужна (flicksci/flickout).
  // МЯГКИЙ (лента карточек, soft): глотает только хвост инерции (isTail) —
  // к моменту приземления ленты (650 мс) хвост затухает ниже половины пика
  // жеста, а РОВНОЕ кручение того же направления (тачпад без отрыва, мышь
  // нотчами) — живой скролл: держак его отпускает, следующая лента играет
  // через gate. Иначе непрерывный скролл замирал на ~2.5 с после КАЖДОЙ
  // ленты — жалоба «не работает, пока не пошевелишь курсором» (пауза в
  // потоке колеса и есть то «шевеление», noteWheel снимает флаги по ней)
  let zoneHold = false;
  let holdSign = 0;   // направление удерживаемого хвоста: +1 вниз, −1 вверх
  let holdSoft = false; // мягкий держак: глотает только хвост инерции (isTail)
  let holdUntil = 0;
  const HOLD_MAX = 2500;
  function armHold(sign, soft) {
    zoneHold = true;
    holdSign = sign;
    holdSoft = !!soft;
    holdUntil = performance.now() + HOLD_MAX;
  }

  // состояния видимости двух соседних экранов, зеркальные друг другу:
  // .sci-on — экран учёных В КАДРЕ: от стоянки (zoneEnd) до конца зоны
  // выхода (tdTop) — ниже его приколотый scrub'ом экран уже не показывают,
  // кадр занимает разбор; выше стоянки экран скрыт (входная зона гейта).
  // .td-on — разбор показан: ровно со стоянки (tdTop), всю зону выхода
  // скрыт — иначе в режиме вписывания он «подглядывал» бы в зазоре под
  // приколотым экраном и из-под вуали прыжка (зеркало .sci-gate/.sci-on).
  // В режиме разворота (без .sci-flat) экран учёных показан на всём хвосте
  // пина, как раньше, а разбор не прячем (гейты стыка — js/tdgates.js).
  // Под вуалями fade-гейтов состояния переключаются прыжком, нативный вход
  // в зоны (fallback ниже) до стоянок не доходит
  function syncSci() {
    const y = window.scrollY;
    const flat = sciFlat();
    sciPin.classList.toggle('sci-on', y >= zoneEnd() && (!flat || y < tdTop()));
    if (tdPin) tdPin.classList.toggle('td-on', !flat || y >= tdTop());
  }

  // страховка от «наплыва» экрана учёных на экраны выше: пока экран показан
  // (.sci-on), страницу выше начала зоны (cardTop) не отпускаем — scroll-
  // событие возвращает её на cardTop, где состав ещё статичен (карточка 04
  // приколота fadePin'ом на всей зоне). Телепорт назад не виден: в момент
  // возврата вуаль fallback'а или прыжка уже непрозрачна, а экран учёных
  // скрыт до zoneEnd. Колёсный путь без дрожи: non-passive wheel-слушатель
  // заставляет браузер применять прокрутку после хендлеров — промежуточная
  // позиция не отрисовывается
  function sciClamp() {
    if (flight) return; // пролёт держит свою стоянку на экране (catchFlight)
    if (!sciPin.classList.contains('sci-on')) return;
    if (window.scrollY >= cardTop()) return;
    window.scrollTo(0, cardTop());
  }

  // приклейка карточки 04: пока вьюпорт проезжает зону [cardTop, cardTop+832],
  // карточку удерживает на месте translateY(+dy); вне зоны dy = 0 — в потоке.
  // Снизу зона сшита с потоком непрерывно (dy растёт из нуля); сверху —
  // карточка уходит ровно за экран учёных, вставший на стоянке zoneEnd,
  // скачков не видно
  function fadePin() {
    const s = scale();
    const y = window.scrollY;
    dy4 = Math.min(Math.max((y - cardTop()) / s, 0), FADE);
    cards[LAST].style.transform = dy4 > 0.01 ? 'translateY(' + dy4 + 'px)' : '';
  }

  // fallback для скроллбара и не перехваченного нативного скролла: вход в
  // зону перехода — мгновенная вуаль и прыжок за зону в сторону хода (та же
  // схема, что у fallback'а js/tdgates.js). Пролёт (flight, ловит
  // catchFlight ниже) не трогаем вовсе: он останавливается СТАВЯНКОЙ на
  // экране учёных, а не проносится сквозь зону. Прыжок против активного
  // перетаскивания скроллбара тот отыгрывает следующим тиком — от
  // повторных срабатываний гасит кулдаун. Стоянки по краям зоны (y = cardTop
  // и y = zoneEnd) — легитимные состояния, fallback их не ловит
  let prevY = window.scrollY;
  let coolUntil = 0;
  function fallbackZone() {
    const y = window.scrollY;
    const prev = prevY;
    prevY = y;
    if (sliding || flight || Fades.isFading() || performance.now() < coolUntil) return;
    const ct = cardTop(), ze = zoneEnd();
    if (y > ct + 4 && y < ze) {
      // Допуск 4px у нижней кромки: приземление ленты на карточку 04 может
      // лечь на копейку внутрь зоны (cardTop() и topOf(cards[3]) округляют
      // по-разному) — вспышкой вуали это отвечать нельзя. Направление — по
      // прошлой позиции: стояли выше (карточки, пыль, середина зоны после
      // останова) — завершаем переход на учёных; вошли снизу (из разбора,
      // prev >= ze) — возвращаемся на карточку 04. Цель прыжка меряем в
      // момент прыжка (за вуаль layout может доехать)
      const target = prev >= ze ? cardTop : zoneEnd;
      coolUntil = performance.now() + 600;
      // fallback-вуаль — тоже fade-переход: хвост инерции после прыжка
      // глотаем тем же окном, что и у жестовых fade (Fades.quiet), а дальше
      // страницу держит держак приземления — в сторону хода прыжка
      Fades.quiet(Fades.GAP);
      armHold(target === cardTop ? -1 : 1);
      Fades.veilNow(function () {
        window.scrollTo(0, target());
        Fades.veil(0, 400);
      });
    } else if (sciFlat() && y > ze + 4 && y < tdTop()) {
      // зеркальная зона выхода из экрана учёных (стык с разбором поста):
      // стояли выше (стоянка экрана, середина зоны) — завершаем переход на
      // разбор; вошли снизу (из разбора, prev >= tdTop) — возвращаемся на
      // экран учёных. Медленный хвост инерции пролёта, доехавший до зоны,
      // тоже ловится здесь — как у входного гейта ловится дрейф до зоны входа
      const target = prev >= tdTop() ? zoneEnd : tdTop;
      coolUntil = performance.now() + 600;
      Fades.quiet(Fades.GAP);
      armHold(target === zoneEnd ? -1 : 1);
      Fades.veilNow(function () {
        window.scrollTo(0, target());
        Fades.veil(0, 400);
      });
    }
  }

  window.addEventListener('scroll', function () {
    fallbackZone();
    syncSci();
    sciClamp();
    fadePin();
    photoPin();
    settleArm();
  }, { passive: true });
  window.addEventListener('resize', function () { fadePin(); photoPin(); syncSci(); });

  // ── дотяжка на покое: страница не должна застревать между карточками ────
  // Хвост плавного скролла (wheel-события уже кончились, Chrome дотаивает
  // анимацию сам) может ОСТАНОВИТЬСЯ посреди карточки: «добив» в wheel-
  // обработчике ловит только события, а их больше нет — экран замирает
  // срезанным («поплыл»), виден соседний. Когда внутри ленты карточек скролл
  // затих на 180 мс, а страница стоит не на верхней границе текущей карточки
  // — снапим на неё: та же семантика, что у «добива» (syncIdx + topOf,
  // допуск 4px от дробного scale). Вне ленты (выше zoneStart−4 или в зоне
  // перехода y ≥ cardTop−4) не вмешиваемся: там рулевые fallback/sciClamp
  // и нативный стык со «стейтментом». Гварды sliding/flight/sci-on: пока
  // позицию держат лента, пролёт или экран учёных, дотяжка не вооружается
  // вовсе — таймер перевооружается каждым scroll-событием, поэтому
  // срабатывает только на настоящей тишине
  let settleT = 0;
  function settleArm() {
    if (settleT) { clearTimeout(settleT); settleT = 0; }
    if (sliding || flight || sciPin.classList.contains('sci-on')) return;
    const y = window.scrollY;
    if (y < zoneStart() - 4 || y >= cardTop() - 4) return;
    syncIdx();
    if (y <= topOf(cards[idx]) + 4) return; // уже на границе — нечего тянуть
    settleT = setTimeout(function () {
      settleT = 0;
      // за тишину могло всё поменяться — перечитываем состояние и layout
      if (sliding || flight || sciPin.classList.contains('sci-on')) return;
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
      // следующую (иначе «преждевременные» анимации при скролле вверх);
      // держак доигрывает хвост разгона на приземлении — в сторону ленты.
      // Держак ленты МЯГКИЙ (см. armHold): ровное кручение не глотает
      last = performance.now();
      armHold(dir > 0 ? 1 : -1, true);
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

  // вверх: один жест = одна лента — механика зеркальна ветке вниз (внизу
  // лента играется первым же жестом с границы карточки, добив жеста не
  // «тратит»). Трекпад после свайпа шлёт инерцию очередью событий с паузами
  // < 120 мс — раньше такая очередь успевала прогнать 04→03→02→01 за один
  // свайп; теперь хвост инерции глотает мягкий держак (armHold(..., true)
  // после каждой ленты), а пауза длиннее 120 мс — новый жест
  let lastWheelAt = 0;
  // «хвост инерции vs намерение»: инерция всегда СЛАБЕЕ пика жеста (дельты
  // затухают) и НЕ меняет направление. gRef — пиковая |deltaY| текущего
  // жеста; событие считаем хвостом (isTail), если оно слабже половины пика
  // и того же направления. Ровная прокрутка колесом не «хвост» относительно
  // собственного пика — она действует сразу, а не после паузы 120 мс
  let gRef = 0;
  let gSign = 0;
  function isTail(e) {
    if (!gRef || !e.deltaY || (e.deltaY > 0 ? 1 : -1) !== gSign) return false;
    return Math.abs(e.deltaY) < gRef / 2;
  }
  function noteWheel(e) {
    const now = performance.now();
    if (now - lastWheelAt > 120) {
      // новый жест или инерция кончились: висящий флаг пролёта снимаем —
      // иначе catchFlight поймает и следующий медленный подход к экрану;
      // вместе с ним снимается держак приземления и пик жеста
      flight = false;
      zoneHold = false;
      gRef = 0;
    }
    const dy = Math.abs(e.deltaY);
    if (dy > 0) {
      if (!gRef) {
        gRef = dy;
        gSign = e.deltaY > 0 ? 1 : -1;
      } else if (dy > gRef) {
        gRef = dy;
      }
    }
    lastWheelAt = now;
  }

  let lastScrollY = window.scrollY;
  let lastScrollT = 0; // время прошлого scroll-события — для скорости пролёта

  // ловушка пролёта: свайп вверх с нижних экранов нативно проносит страницу
  // сквозь экран учёных к карточкам. Ловим момент, когда пролёт ПЕРЕСЁК
  // стоянку экрана (y стал меньше zoneEnd) — snap обратно на стоянку:
  // страница останавливается на экране «Учёные доказали», дальше наверх
  // пользователь уходит уже осознанным жестом через fade-гейт. Пока пролёт
  // едет снизу (y > стоянки), не мешаем: нативный скролл.
  //
  // Флаг после ловли НЕ снимается: scrollTo инерцию не гасит, и её хвост
  // нативно проносил бы страницу сквозь зону — «наплывая» на карточки.
  // Стоянку держим, ПОКА пролёт быстрый: скорость хода меряем по соседним
  // scroll-событиям (px/ms), и когда хвост инерции растягивается медленнее
  // порога — отпускаем: дальше медленный дрейф вверх ловит fallbackZone
  // (вуаль и прыжок на карточку 04). Дрожь позиций во время стоянки не
  // видна: карточка 04 приколота fadePin'ом на всей зоне, а экран учёных
  // скрыт до стоянки. Тишина 150 мс после последней ловли значит, что
  // пролёт кончился совсем, — флаг снимается и без «медленного» события
  // (иначе уцепившийся флаг ловил бы и следующий медленный подход к экрану)
  const CATCH_V = 1; // порог скорости пролёта, px/ms (~1000 px/s — точно инерция)
  let holdT = 0;     // таймер тишины после последней ловли пролёта
  function catchFlight(v) {
    if (!flight) return;
    // стоянка ловли: в flat-режиме — стоянка разбора поста (нижняя кромка
    // зоны выхода; зеркально ловле на стоянке учёных у входного гейта) —
    // мёртвую зону гейта пролёт не проезжает, дальше наверх пользователь
    // уходит осознанным fade'ом. В режиме разворота — стоянка учёных, как
    // раньше
    const stop = sciFlat() ? tdTop() : zoneEnd();
    const y = window.scrollY;
    if (y >= stop) return;
    window.scrollTo(0, stop);
    // стоянку держит и держак: хвост инерции после ловли — вверх (в его
    // сторону), встречное колесо его снимает
    if (!zoneHold) armHold(-1);
    if (holdT) { clearTimeout(holdT); holdT = 0; }
    if (v >= CATCH_V) {
      holdT = setTimeout(function () { holdT = 0; flight = false; }, 150);
    } else {
      flight = false;
    }
  }

  window.addEventListener('scroll', function () {
    const now = performance.now();
    // скорость хода вверх с прошлого события: меряем ТОЛЬКО по настоящему
    // движению (снап отражается событием с y = стоянке ловли — там y не убывал)
    const v = lastScrollT && window.scrollY < lastScrollY
      ? (lastScrollY - window.scrollY) / Math.max(now - lastScrollT, 1) : 0;
    lastScrollT = now;
    // реальное движение вниз ниже стоянки ловли сбрасывает флаг — иначе
    // catchFlight навсегда заблокирован; снап вверх до стоянки движением
    // вниз не считается
    if (window.scrollY > lastScrollY && window.scrollY > (sciFlat() ? tdTop() : zoneEnd())) flight = false;
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
  // (секция учёных скрыта вне стоянки, состоянием рулит syncSci), .td-gate —
  // то же для разбора поста (скрыт до стоянки tdTop); hashJump выставляет
  // честное начальное состояние по скроллу
  function sciInit() {
    sciPin.classList.add('sci-gate');
    if (tdPin) tdPin.classList.add('td-gate');
    syncSci();
  }
  sciInit();

  window.addEventListener('wheel', function (e) {
    // часы жеста тикают ДО всех глоталок: лента и вуаль проглатывают
    // события, но сам жест длится — иначе его хвост после приземления
    // выглядел бы новым жестом (последний учтённый wheel остался до анимации)
    noteWheel(e);
    if (sliding) { e.preventDefault(); return; }
    // держак приземления перехода: пока он активен, колёса ТОГО ЖЕ
    // направления глотаются целиком (см. armHold); МЯГКИЙ держак ленты
    // глотает только хвост инерции (isTail) — ровное кручение отпускает.
    // Встречное колесо держак снимает и проходит дальше — это уже желание
    // пользователя
    if (zoneHold && e.deltaY !== 0) {
      if (performance.now() < holdUntil && (e.deltaY > 0 ? 1 : -1) === holdSign && (!holdSoft || isTail(e))) {
        e.preventDefault();
        return;
      }
      zoneHold = false;
    }
    // хвост инерции после чужих и своих fade-гейтов глотается (js/fades.js):
    // без этого догоняющие колёса сразу после вуали нативно уносили бы
    // страницу со стоянки (в слайд sci → разбор или обратно в карточки)
    if (Fades.damp(e)) return;
    const y = window.scrollY;
    const zs = zoneStart();
    const ze = zoneEnd();

    if (e.deltaY > 0) {
      // зона перехода и стоянка карточки 04: любой жест вниз значит «уйти
      // на экран учёных» — вуаль и прыжок на zoneEnd. Допуск 4px к cardTop:
      // дробный scale даёт копеечную пыль между cardTop() и позицией отдыха
      // на карточке — она не должна уводить колесо в ветку карточек (там
      // goForward с idx === LAST молчал, и с 04 дальше не шли)
      if (y >= cardTop() - 4 && y < ze) {
        e.preventDefault();
        // Локальный gate(e) рядом с Fades.gate: хвост жеста, играющего
        // ленту, докатывается до приземления уже ПОСЛЕ снятия sliding.
        // isTail отсекает инерцию (дельты затухают, направление одно) —
        // ровная прокрутка колесом слабее собственного пика не бывает и
        // fade играет сразу, без паузы
        if (!isTail(e) && Fades.gate(e) && gate(e) && Fades.fade(zoneEnd, 400)) armHold(1);
        return;
      }
      // стоянка экрана учёных и зона выхода вниз (flat-режим): жест вниз
      // значит «уйти к разбору поста» — вуаль и прыжок на верх .td-pin,
      // зеркально входу с карточки 04. В режиме разворота ветки нет —
      // хвост пина перехватывает js/tdgates.js
      if (sciFlat() && y >= ze && y < tdTop()) {
        e.preventDefault();
        if (!isTail(e) && Fades.gate(e) && gate(e) && Fades.fade(tdTop, 400)) armHold(1);
        return;
      }
      // выше зоны (в т.ч. «Если научный тезис…») и ниже зоны выхода —
      // нативный скролл: разбор поста живёт своими пинами и гейтами
      // (js/tdgates.js). Без отсечки колесо на стоянке учёных проваливалось
      // бы в «добив» карточки 04 и возвращало страницу назад
      if (y >= (sciFlat() ? tdTop() : ze) || y < zs) return;
      syncIdx();
      const top = topOf(cards[idx]);
      // стоим не на верхней границе карточки — сначала добиваем до неё
      if (y > top + 4) { e.preventDefault(); window.scrollTo(0, top); return; }
      e.preventDefault();
      if (!gate(e)) return;
      goForward();
    } else {
      // глубже зоны выхода (в flat-режиме — от стоянки разбора, в режиме
      // разворота — от стоянки учёных): нативный скролл по табам и ниже;
      // инерцию такого проезда наверх ловит catchFlight на стоянке ловли.
      // Допуск 4px к кромке — как у cardTop: дробный scale не должен
      // уводить колесо с пыли над стоянкой в пролёт мимо fade-гейта
      if (sciFlat() ? y > tdTop() + 4 : y > ze) { flight = true; return; }
      // пролёт уже пойман и держится стоянкой — не мешаем его нативному
      // ходу (catchFlight сам остановит, когда инерция растянется)
      if (flight) return;
      // зона выхода и стоянка разбора (flat): жест вверх — фейд на экран
      // учёных, зеркально выходу с карточки 04 (isTail — как у входного
      // гейта: инерция, доехавшая до стоянки, fade не играет)
      if (sciFlat() && y > ze) {
        e.preventDefault();
        if (!isTail(e) && Fades.gate(e) && gate(e) && Fades.fade(zoneEnd, 400)) armHold(-1);
        return;
      }
      // зона входа и стоянка учёных: жест вверх — фейд на карточку 04
      // (isTail — как в ветке вниз: инерция пролёта, доехавшая до стоянки,
      // fade не играет — наверх пользователь уходит новым жестом)
      if (y > cardTop()) {
        e.preventDefault();
        if (!isTail(e) && Fades.gate(e) && gate(e) && Fades.fade(cardTop, 400)) armHold(-1);
        return;
      }
      // стоянка карточки 04 и пыль допуска: хвост инерции глотаем (isTail —
      // разгон со учёных после приземления фейда не должен сам листать
      // карту), новый жест играет ленту 04 → 03 СРАЗУ — зеркально жесту
      // вниз с карточки 01. Прежде здесь первый жест вверх оставался
      // нативным: рывок и мгновенный добив вместо анимации, лента — только
      // следующим жестом
      if (y > cardTop() - 4) {
        e.preventDefault();
        if (isTail(e)) return;
        syncIdx();
        if (!gate(e)) return;
        goBack();
        return;
      }
      if (y < zs - 4) return;
      syncIdx();
      const top = topOf(cards[idx]);
      // карточка не полностью на экране — сначала добиваем её до верхней
      // границы (y == top); добив жеста не «тратит»: дальнейшие события
      // того же жеста (ровное кручение) играют ленту через gate, как вниз
      if (y > top + 4) { e.preventDefault(); window.scrollTo(0, top); return; }
      // с карточки 01 вверх — нативный скролл на «Если научный тезис…»
      if (idx <= 0) return;
      e.preventDefault();
      if (!gate(e)) return;
      goBack();
    }
  }, { passive: false });

  window.addEventListener('keydown', function (e) {
    if (sliding) { e.preventDefault(); return; }
    // пока вуаль играет — клавиши глотаются (автоповтор не должен
    // переигрывать гейт посреди перехода), как в js/hero.js
    if (Fades.isFading()) { e.preventDefault(); return; }
    const fwd = e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ';
    const back = e.key === 'ArrowUp' || e.key === 'PageUp';
    if (!fwd && !back) return;
    const y = window.scrollY;
    const zs = zoneStart();
    const ze = zoneEnd();

    if (fwd) {
      // зона перехода и стоянка карточки 04: нажатие вниз — на экран учёных
      // (одно нажатие = один переход, без дебаунса — как в js/hero.js).
      // Допуск 4px к cardTop — как у wheel: дробный scale не «глотает»
      // клавиши в состоянии «карточка 04»
      if (y >= cardTop() - 4 && y < ze) { e.preventDefault(); if (Fades.fade(zoneEnd, 400)) armHold(1); return; }
      // стоянка экрана учёных и зона выхода (flat): нажатие вниз — на разбор
      // поста, зеркально входу (одно нажатие = один переход, без дебаунса)
      if (sciFlat() && y >= ze && y < tdTop()) { e.preventDefault(); if (Fades.fade(tdTop, 400)) armHold(1); return; }
      // ниже зоны выхода — нативно: разбор поста живёт своими гейтами
      if (y >= (sciFlat() ? tdTop() : ze) || y < zs) return;
      syncIdx();
      const top = topOf(cards[idx]);
      if (y > top + 4) { e.preventDefault(); window.scrollTo(0, top); return; }
      e.preventDefault();
      goForward();
    } else {
      // глубже зоны выхода — нативно; пролёт (flight) не перехватываем —
      // его остановит catchFlight
      if (sciFlat() ? y > tdTop() + 4 : y > ze) return;
      if (flight) return;
      // зона выхода и стоянка разбора (flat): нажатие вверх — фейд на экран
      // учёных, зеркально выходу с карточки 04
      if (sciFlat() && y > ze) { e.preventDefault(); if (Fades.fade(zoneEnd, 400)) armHold(-1); return; }
      // зона входа и стоянка учёных: нажатие вверх — фейд на карточку 04
      if (y > cardTop()) { e.preventDefault(); if (Fades.fade(cardTop, 400)) armHold(-1); return; }
      // стоянка карточки 04 и пыль допуска: нажатие вверх — лента 04 → 03
      // сразу, зеркально клавише вниз с карточки 01 (без нативного рывка)
      if (y > cardTop() - 4) { e.preventDefault(); syncIdx(); goBack(); return; }
      if (y < zs - 4) return;
      syncIdx();
      const top = topOf(cards[idx]);
      // карточка не полностью на экране — сначала добиваем до верхней границы,
      // лента 04 → 03 только следующим нажатием
      if (y > top + 4) { e.preventDefault(); window.scrollTo(0, top); return; }
      // с карточки 01 вверх — нативный скролл на «Если научный тезис…»
      if (idx <= 0) return;
      e.preventDefault();
      goBack();
    }
  });

  // превью состояния без прокрутки: #card-step1 .. #card-step4,
  // #sci-step1 — экран «Учёные доказали» (стоянка экрана)
  // прыжок повторяется и по load: в момент парсинга скрипта картинки выше
  // ещё не загрузились, layout «не дотягивает» — первый скролл уходит не туда
  function hashJump() {
    syncSci(); // состояние по текущему скроллу до прыжка
    const m = location.hash.match(/^#card-step([1-4])$/);
    if (m) {
      idx = +m[1] - 1;
      window.scrollTo(0, topOf(cards[idx]));
    }
    // превью экрана «Учёные доказали»: #sci-step1 — стоянка экрана (верх
    // пина, .sci-on включается); подскролл ниже — зона fade-гейта выхода
    // на разбор поста (#sci-step2 ведёт js/scientists.js)
    const ms = location.hash.match(/^#sci-step1$/);
    if (ms) window.scrollTo(0, zoneEnd());
    fadePin();
    photoPin();
    syncSci(); // состояние по приземлившейся позиции (scroll-событие придёт позже)
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
