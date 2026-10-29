(function () {
  // Гейты разбора поста «Учёные доказали: [X]»: оба стыка секции —
  // вход с тёмного фулскрина «вопросы» (хвост пина учёных) и выход с
  // оранжевого вердикта на чек-лист — переходят через белую вуаль,
  // в обе стороны. Та же механика, что у fade-переходов героя
  // (js/fades.js) и у гейтов мобильной версии; кроссфейд карточки 04 →
  // панель учёных (js/cards.js) закрывает стык выше, здесь закрыт
  // последний «слайд» на пути секции.
  //
  // Почему вуаль поверх готовых пинов, а не кроссфейд-зона как у
  // 04 → учёные: стыки зажаты между хвостом пина учёных (кламп scrub
  // в js/scientists.js) и пином табов (js/teardown.js) — удлинение
  // любого пина сдвинуло бы пороги табов и хребты катышей ниже по
  // странице. Поэтому 832px «слайда» на каждом стыке остаются
  // нативным скролл-запасом (скроллбар проезжает их как раньше), а
  // колесо/клавиши перехватываются на СТАТИЧНЫХ участках по обе
  // стороны слайда: вуаль 250 мс → прыжок за слайд → вуаль 400 мс.
  // Случайный проскок в слайд (скроллбар, докатившая инерция) ловит
  // fallback на scroll: мгновенное укрытие и такой же прыжок.
  const sciPin = document.querySelector('.sci-pin');
  const tdPin = document.querySelector('.td-pin');
  const pageInner = document.getElementById('page-inner');
  if (!sciPin || !tdPin || !pageInner) return;

  // константы зон в px макета — держать синхронными с js/scientists.js
  // (STRETCH/HOLD) и js/teardown.js (TRANS/PIN/RESERVE)
  const STRETCH = 832;   // зона триггера разворота маски
  const HOLD = 832;      // стоянка фулскрина «вопросы»
  const TD_TRANS = 800;  // скролла на один переход табов
  const TD_PIN = TD_TRANS * 3; // три перехода табов
  const RESERVE = 800;   // запас на вердикте

  function scale() { return pageInner.getBoundingClientRect().width / 1280; }
  // Границы меряем с округлением, как topOf в js/cards.js. Причина та же,
  // но с другим проявлением: scrollTo работает в целых пикселях, и прыжок
  // fade-гейта приземляется на Math.round(цели). Если цель дробная (scale
  // почти всегда дробный), посадка может остаться ВНУТРИ зоны перехвата —
  // например round(C) < C при дробной части больше нуля: тогда каждый
  // следующий жест вниз снова ловит гейт с прыжком на то же место, экран
  // мигает белым и не скроллится. С округлением зона кончается ровно на
  // позиции отдыха, и приземление из неё выпадает.
  function topOf(el) { return Math.round(el.getBoundingClientRect().top + window.scrollY); }
  function sciTop() { return topOf(sciPin); }
  function tdTop() { return topOf(tdPin); }
  // низ обёртки = верх чек-листа (следующей секции) — округляем так же
  function clTop() { return Math.round(tdPin.getBoundingClientRect().bottom + window.scrollY); }

  let coolUntil = 0;   // пауза fallback'а: перетаскивание скроллбара
                       // выставляет позицию каждый тик и «оспаривало» бы прыжок

  // Вуаль, шаблон fade-перехода, дебаунс gate() и гашение инерции — общие
  // с js/hero.js, живут в js/fades.js (подключён раньше всех потребителей)

  // Зоны перехвата (px скролла, S — верх sci-пина, T — верх td-пина,
  // C — верх чек-листа):
  //  вниз из «вопросов» [S+STRETCH, T): вся стоянка фулскрина и слайд под
  //    ней — любой жест вниз значит «уйти к разбору», прыжок на начало
  //    пина табов (позиция #td-step0); исключение — пока играет твин
  //    разворота (.sci-expanding), тогда жест нативный (см. expanding());
  //  вверх из публикации (S+STRETCH+HOLD, T+4]: слайд и первые пиксели s0;
  //    глубже в табы колесо не перехватываем — там свои переходы-полосы;
  //  вниз из вердикта [T+TD_PIN, C): запас (вердикт уже собран) и слайд —
  //    жест вниз = уход на чек-лист;
  //  вверх из чек-листа (T+TD_PIN+RESERVE, C+4]: слайд и первые пиксели.
  // Из стоянки «вопросов» ВВЕРХ колесо не перехвачено: экран честно
  // сворачивается маской (обратный разворот), как и задумано; из запаса
  // вердикта вверх — нативно, табы отыгрываются полосами обратно.
  function zones() {
    const s = scale();
    const S = sciTop(), T = tdTop(), C = clTop();
    return {
      s: s, S: S, T: T, C: C,
      // вниз из «вопросов» / вверх из публикации
      aDown: S + STRETCH * s,
      aUp: S + (STRETCH + HOLD) * s,
      aBack: S + (STRETCH + HOLD / 2) * s, // середина стоянки «вопросов»
      // вниз из вердикта / вверх из чек-листа
      bDown: T + TD_PIN * s,
      bUp: T + (TD_PIN + RESERVE) * s,
      bBack: T + (TD_PIN + RESERVE / 2) * s // середина запаса вердикта
    };
  }

  // Гашение инерции тачпада при fade-переходах — общее с js/hero.js,
  // см. js/fades.js (damp(): колесо глотается во время вуали и на её
  // хвосте — хвост инерции иначе докручивает табы teardown.js или
  // запускает следующий гейт)
  //
  // Уступание развороту: пока на sci-пине висит .sci-expanding (форвард-твин
  // растяжки маски ещё играет — класс ставит js/scientists.js), стык вниз
  // НЕ перехватываем: жест уходит в нативный скролл, вуаль не срезает
  // недоигравший разворот, и фулскрин «вопросы» показывается целиком.
  // Следующий жест после завершения твина уже выходит на разбор. Fallback
  // на y >= aUp не ждёт: там секция уже отпускается — прятать нечего
  function expanding() { return sciPin.classList.contains('sci-expanding'); }

  window.addEventListener('wheel', function (e) {
    if (Fades.damp(e)) return;
    const z = zones();
    const y = window.scrollY;
    if (e.deltaY > 0) {
      if (y >= z.aDown && y < z.T) {
        if (expanding()) return;
        e.preventDefault();
        if (Fades.gate(e)) Fades.fade(tdTop, 400);
      } else if (y >= z.bDown && y < z.C) {
        e.preventDefault();
        if (Fades.gate(e)) Fades.fade(clTop, 400);
      }
    } else {
      if (y > z.aUp && y <= z.T + 4) {
        e.preventDefault();
        if (Fades.gate(e)) Fades.fade(function () { return sciTop() + (STRETCH + HOLD / 2) * scale(); }, 300);
      } else if (y > z.bUp && y <= z.C + 4) {
        e.preventDefault();
        if (Fades.gate(e)) Fades.fade(function () { return tdTop() + (TD_PIN + RESERVE / 2) * scale(); }, 300);
      }
    }
  }, { passive: false });

  // клавиши — те же зоны, без дебаунса: одно нажатие = один переход,
  // как в js/hero.js. preventDefault обязателен: нативный скролл
  // стрелками/пробелом должен стоять, пока вуаль прыгает
  window.addEventListener('keydown', function (e) {
    if (Fades.isFading()) { e.preventDefault(); return; }
    const down = e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ';
    const up = e.key === 'ArrowUp' || e.key === 'PageUp';
    if (!down && !up) return;
    const z = zones();
    const y = window.scrollY;
    if (down && y >= z.aDown && y < z.T) { if (expanding()) return; e.preventDefault(); Fades.fade(tdTop, 400); }
    else if (down && y >= z.bDown && y < z.C) { e.preventDefault(); Fades.fade(clTop, 400); }
    else if (up && y > z.aUp && y <= z.T + 4) { e.preventDefault(); Fades.fade(function () { return sciTop() + (STRETCH + HOLD / 2) * scale(); }, 300); }
    else if (up && y > z.bUp && y <= z.C + 4) { e.preventDefault(); Fades.fade(function () { return tdTop() + (TD_PIN + RESERVE / 2) * scale(); }, 300); }
  });

  // fallback для скроллбара и не перехваченного нативного скролла: вход
  // в слайд-зону с любой стороны — мгновенная вуаль и прыжок за слайд.
  // prev до начала зоны — шли вниз (прыжок вперёд), prev от её конца —
  // шли вверх (прыжок назад); движение ВНУТРИ зоны не трогаем. Прыжок
  // против активного перетаскивания скроллбара тот отыгрывает следующим
  // тиком — от повторных срабатываний гасит кулдаун
  let prevY = window.scrollY;
  window.addEventListener('scroll', function () {
    const y = window.scrollY;
    const prev = prevY;
    prevY = y;
    if (Fades.isFading() || performance.now() < coolUntil) return;
    const z = zones();
    let target = null;
    if (y >= z.aUp && y < z.T) {
      target = prev < z.aUp ? tdTop : (prev >= z.T ? function () { return z.aBack; } : null);
    } else if (y >= z.bUp && y < z.C) {
      target = prev < z.bUp ? clTop : (prev >= z.C ? function () { return z.bBack; } : null);
    }
    if (!target) return;
    coolUntil = performance.now() + 600;
    // fallback-вуаль — тоже fade-переход: хвост инерции после прыжка
    // глотаем тем же окном, что и у жестовых fade (Fades.quiet)
    Fades.quiet(Fades.GAP);
    Fades.veilNow(function () {
      window.scrollTo(0, target());
      Fades.veil(0, 400);
    });
  }, { passive: true });
})();
