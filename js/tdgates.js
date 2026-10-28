(function () {
  // Гейты разбора поста «Учёные доказали: [X]»: оба стыка секции —
  // вход с тёмного фулскрина «вопросы» (хвост пина учёных) и выход с
  // оранжевого вердикта на чек-лист — переходят через белую вуаль,
  // в обе стороны. Та же механика, что у fadeForward/fadeBack в
  // js/hero.js и у гейтов мобильной версии; кроссфейд карточки 04 →
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

  let fading = false;  // идёт жестовый fade (колесо/клавиши)
  let last = 0;        // дебаунс жеста — как gate() в js/hero.js
  let coolUntil = 0;   // пауза fallback'а: перетаскивание скроллбара
                       // выставляет позицию каждый тик и «оспаривало» бы прыжок

  function gate(e) {
    if (performance.now() - last < 250) return false;
    if (Math.abs(e.deltaY) < 20) return false;
    last = performance.now();
    return true;
  }

  // белая вуаль — тот же приём, что в js/hero.js; id тот же: элемент
  // один на страницу, а зоны перехвата скриптов не пересекаются
  function veil(opacity, ms, cb) {
    let v = document.getElementById('white-veil');
    if (opacity === 0) {
      if (!v) { if (cb) cb(); return; }
      v.style.transition = 'opacity ' + ms + 'ms ease-out';
      v.getBoundingClientRect();
      v.style.opacity = '0';
      setTimeout(function () { v.remove(); if (cb) cb(); }, ms + 40);
      return;
    }
    if (!v) {
      v = document.createElement('div');
      v.id = 'white-veil';
      v.style.cssText = 'position:fixed;inset:0;z-index:999;background:#fff;opacity:0;pointer-events:none;';
      document.body.appendChild(v);
    }
    v.style.transition = 'opacity ' + ms + 'ms ease-out';
    v.getBoundingClientRect();
    v.style.opacity = '1';
    setTimeout(function () { if (cb) cb(); }, ms + 40);
  }

  // вуаль без фазы ввоза: слайд уже начался — под полупрозрачной вуалью
  // он был бы виден, поэтому укрытие мгновенное, reveal обычный
  function veilNow(cb) {
    let v = document.getElementById('white-veil');
    if (!v) {
      v = document.createElement('div');
      v.id = 'white-veil';
      v.style.cssText = 'position:fixed;inset:0;z-index:999;background:#fff;pointer-events:none;';
      document.body.appendChild(v);
    }
    v.style.transition = 'none';
    v.getBoundingClientRect();
    v.style.opacity = '1';
    if (cb) cb();
  }

  // переход через вуаль: цель прыжка берём ФУНКЦИЕЙ и измеряем в момент
  // прыжка — за 250 мс ввоза вуали layout может доехать (шрифты, картинки),
  // как у всех измерений проекта
  function fadeForwardTo(getTarget) {
    if (fading) return;
    fading = true;
    veil(1, 250, function () {
      window.scrollTo(0, getTarget());
      veil(0, 400, function () { fading = false; });
    });
  }
  function fadeBackTo(getTarget) {
    if (fading) return;
    fading = true;
    veil(1, 250, function () {
      window.scrollTo(0, getTarget());
      veil(0, 300, function () { fading = false; });
    });
  }

  // Зоны перехвата (px скролла, S — верх sci-пина, T — верх td-пина,
  // C — верх чек-листа):
  //  вниз из «вопросов» [S+STRETCH, T): вся стоянка фулскрина и слайд под
  //    ней — любой жест вниз значит «уйти к разбору», прыжок на начало
  //    пина табов (позиция #td-step0);
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

  window.addEventListener('wheel', function (e) {
    if (fading) { e.preventDefault(); return; }
    const z = zones();
    const y = window.scrollY;
    if (e.deltaY > 0) {
      if (y >= z.aDown && y < z.T) {
        e.preventDefault();
        if (gate(e)) fadeForwardTo(tdTop);
      } else if (y >= z.bDown && y < z.C) {
        e.preventDefault();
        if (gate(e)) fadeForwardTo(clTop);
      }
    } else {
      if (y > z.aUp && y <= z.T + 4) {
        e.preventDefault();
        if (gate(e)) fadeBackTo(function () { return sciTop() + (STRETCH + HOLD / 2) * scale(); });
      } else if (y > z.bUp && y <= z.C + 4) {
        e.preventDefault();
        if (gate(e)) fadeBackTo(function () { return tdTop() + (TD_PIN + RESERVE / 2) * scale(); });
      }
    }
  }, { passive: false });

  // клавиши — те же зоны, без дебаунса: одно нажатие = один переход,
  // как в js/hero.js. preventDefault обязателен: нативный скролл
  // стрелками/пробелом должен стоять, пока вуаль прыгает
  window.addEventListener('keydown', function (e) {
    if (fading) { e.preventDefault(); return; }
    const down = e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ';
    const up = e.key === 'ArrowUp' || e.key === 'PageUp';
    if (!down && !up) return;
    const z = zones();
    const y = window.scrollY;
    if (down && y >= z.aDown && y < z.T) { e.preventDefault(); fadeForwardTo(tdTop); }
    else if (down && y >= z.bDown && y < z.C) { e.preventDefault(); fadeForwardTo(clTop); }
    else if (up && y > z.aUp && y <= z.T + 4) { e.preventDefault(); fadeBackTo(function () { return sciTop() + (STRETCH + HOLD / 2) * scale(); }); }
    else if (up && y > z.bUp && y <= z.C + 4) { e.preventDefault(); fadeBackTo(function () { return tdTop() + (TD_PIN + RESERVE / 2) * scale(); }); }
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
    if (fading || performance.now() < coolUntil) return;
    const z = zones();
    let target = null;
    if (y >= z.aUp && y < z.T) {
      target = prev < z.aUp ? tdTop : (prev >= z.T ? function () { return z.aBack; } : null);
    } else if (y >= z.bUp && y < z.C) {
      target = prev < z.bUp ? clTop : (prev >= z.C ? function () { return z.bBack; } : null);
    }
    if (!target) return;
    coolUntil = performance.now() + 600;
    veilNow(function () {
      window.scrollTo(0, target());
      veil(0, 400);
    });
  }, { passive: true });
})();
