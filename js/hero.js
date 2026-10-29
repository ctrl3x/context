(function () {
  const hero = document.querySelector('.sec-hero');
  const statement = document.querySelector('.sec-statement');
  const pageInner = document.getElementById('page-inner');
  if (!hero || !statement || !pageInner) return;

  const MAX = 4;      // виджеты: оранжевый, белый, серый, чёрный
  const RESERVE = 1;  // запасные щелчки на чёрном виджете
  let step = 0;       // 0..MAX
  let hold = 0;       // 0..RESERVE

  const pinEl = statement.parentElement;
  const dotMain = statement.querySelector('.dot-white:not(.dot-piece)');
  const textEl = statement.querySelector('.statement-40');
  const p1 = statement.querySelector('.p1');
  const p2 = statement.querySelector('.p2');

  // основной путь — CSS scroll-driven animations (без дёрганья, композитор).
  // Fallback для старых браузеров — тот же скраб на rAF
  const supportsTimeline = !!(window.CSS && CSS.supports &&
    CSS.supports('animation-timeline', '--statement'));

  // PIN удлинён (1800 → 2700): в конце пина добавлена финальная фаза —
  // буквы исчезают, из центра растут 12 спиц (кадр 65 макета)
  const PIN = 2700;
  // шарик раздваивается при первом касании буквы (контакт краёв на 521.6px
  // скролла → 19.32%), окно расщепления — те же 54px, что и раньше
  const P1 = 0.1932; // контакт: шарик замирает и гаснет
  const P2 = 0.2131; // осколки отделились, летят к окружности
  // позиция шарика в контакте (tx) и текста в тот же момент
  const DOT_TX = -147.84;
  const TEXT_TX = -182.47;

  if (supportsTimeline) {
    pinEl.classList.add('tl');
    dotMain.style.transform = '';
    textEl.style.transform = '';
    p1.style.transform = '';
    p2.style.transform = '';
    dotMain.style.opacity = '';
    p1.style.opacity = '';
    p2.style.opacity = '';

    // Точная привязка зоны скраба к реальному скроллу. Chromium считает
    // границы view-timeline по layout-боксу элемента (не учитывая transform
    // scale страницы), а скроллпорт — в сырых px: на вьюпортах с высотой
    // != 832·scale проценты из CSS плывут, и тёмный экран встаёт со сдвигом
    // (белая щель сверху). scroll(root)-таймлайн от боксов элемента не
    // зависит, поэтому диапазон задаём в px от измеренного положения пина
    // и пересчитываем при ресайзе. CSS-проценты остаются запасным вариантом.
    const syncRange = function () {
      const s = scale();
      const top = stTopS();
      const rng = top.toFixed(2) + 'px ' + (top + PIN * s).toFixed(2) + 'px';
      pinEl.querySelectorAll('.sec-statement, .sec-statement *').forEach(function (el) {
        el.style.animationTimeline = 'scroll(root)';
        el.style.animationRange = rng;
      });
    };
    syncRange();
    var rangeRaf = 0;
    window.addEventListener('resize', function () {
      if (rangeRaf) return;
      rangeRaf = requestAnimationFrame(function () { rangeRaf = 0; syncRange(); });
    });

    // показать финальное кольцо, когда скролл дошёл до конца зоны пина
    const buildFn = function () { pinEl.classList.add('formed'); };
    if (stTopS() + PIN * scale() - scrollY <= 4) buildFn();
    else window.addEventListener('scroll', function onBuild() {
      if (scrollY >= stTopS() + PIN * scale() - 4) {
        buildFn();
        removeEventListener('scroll', onBuild);
      }
    }, { passive: true });
  } else {
    pinEl.classList.add('no-tl');
    setTimeout(function () { pinEl.classList.add('formed'); }, 700);
  }

  // fallback-скраб (браузеры без scroll-driven animations): пары кружков,
  // вопрос и финальные спицы рулятся по тем же порогам, что и CSS-таймлайн.
  // Порядок пар — слева направо, по x левого кружка (как в CSS): 1→3→2→4,
  // пара на экваторе (pair5) — последней. Окна пар 0.3–0.6333
  // (по 180px скролла при PIN=2700, как и раньше)
  var pairSteps = supportsTimeline ? null : [
    { els: statement.querySelectorAll('.pair1a, .pair1b'), a: 0.3,    b: 0.3667 },
    { els: statement.querySelectorAll('.pair3a, .pair3b'), a: 0.3667, b: 0.4333 },
    { els: statement.querySelectorAll('.pair2a, .pair2b'), a: 0.4333, b: 0.5 },
    { els: statement.querySelectorAll('.pair4a, .pair4b'), a: 0.5,    b: 0.5667 },
    { els: statement.querySelectorAll('.pair5a, .pair5b'), a: 0.5667, b: 0.6333 }
  ];
  var questionEl = supportsTimeline ? null : statement.querySelector('.statement-question');
  // спицы рисуются в fallback через JS (в tl-ветке их ведёт CSS-анимация)
  var spokes = supportsTimeline ? null : statement.querySelectorAll('.st-spokes line');
  // линейный подъём 0..1 на отрезке [a,b] — чтобы не копировать clamp везде
  function ramp(p, a, b) { return Math.max(0, Math.min(1, (p - a) / (b - a))); }

  // маска растворения фразы в fallback-ветке: полоса 60px стоит влево от левой
  // кромки шарика (322.16px) — позиция в локальных координатах текста = -263.84 - tx,
  // те же числа, что в @keyframes stTextMask (текст виден только правее полосы)
  function textMask(tx) {
    const m = (-263.84 - tx).toFixed(2) + 'px 0';
    textEl.style.webkitMaskPosition = m;
    textEl.style.maskPosition = m;
  }

  function applyProgress() {
    const s = scale();
    const start = stTopS();
    const p = Math.max(0, Math.min(1, (window.scrollY - start) / (PIN * s)));

    // Фазы (в долях PIN=2700; длины фаз в px сохранены от прежней версии):
    // подход 0–521.6 (шарик и текст съезжаются до первого касания),
    // расщепление 521.6–575.6, прилёт осколков 756, пары 810–1710,
    // текст улетает влево и растворяется на маске влево от левой кромки
    // шарика (буквы исчезают, уходя левее шарика), вопрос 1656–1728,
    // финал: вопрос держится до 1890, исчезает к 2052, спицы 1944–2322
    if (p <= P1) {
      const k = p / P1;
      dotMain.style.transform = 'translateX(' + (-370 + 222.16 * k) + 'px)';
      textEl.style.transform = 'translateX(' + (654 - 836.47 * k) + 'px)';
      // базовое правило .no-tl прячет фразу (opacity:0) — включаем её здесь
      textEl.style.opacity = '1';
      dotMain.style.opacity = '1';
      p1.style.opacity = '0';
      p2.style.opacity = '0';
      p1.style.transform = 'translate(0,0)';
      p2.style.transform = 'translate(0,0)';
      textMask(654 - 836.47 * k);
    } else if (p <= P2) {
      // окно расщепления (54px): шарик замер в точке контакта и гаснет,
      // на его месте проявляются осколки — линейно, как в CSS-таймлайне
      const k = (p - P1) / (P2 - P1);
      textEl.style.transform = 'translateX(' + TEXT_TX + 'px)';
      textEl.style.opacity = '1';
      dotMain.style.transform = 'translateX(' + DOT_TX + 'px)';
      dotMain.style.opacity = String(1 - k);
      const o = String(k);
      p1.style.opacity = o;
      p2.style.opacity = o;
      p1.style.transform = 'translate(0,0)';
      p2.style.transform = 'translate(0,0)';
      textMask(TEXT_TX);
    } else {
      // осколки летят до окружности (210° и 150°): прилёт на p=0.28 (756px)
      const k = ramp(p, P2, 0.28);
      const tx = TEXT_TX - 1471.53 * ramp(p, P2, 0.6667);
      textEl.style.transform = 'translateX(' + tx + 'px)';
      // буквы растворяются на маске влево от левой кромки шарика (322.16px),
      // как в CSS-таймлайне: позиция маски = -263.84 - tx; opacity больше не
      // участвует — правый край текста скрывается маской на tx=-1331.84
      textEl.style.opacity = '1';
      dotMain.style.transform = 'translateX(' + DOT_TX + 'px)';
      dotMain.style.opacity = '0';
      p1.style.opacity = '1';
      p2.style.opacity = '1';
      p1.style.transform = 'translate(' + (47.94 * k) + 'px,' + (-151.34 * k) + 'px)';
      p2.style.transform = 'translate(' + (47.94 * k) + 'px,' + (147.97 * k) + 'px)';
      textMask(tx);
    }

    if (pairSteps) {
      for (let i = 0; i < pairSteps.length; i++) {
        const st = pairSteps[i];
        const o = Math.max(0, Math.min(1, (p - st.a) / (st.b - st.a)));
        for (let j = 0; j < st.els.length; j++) st.els[j].style.opacity = String(o);
      }
      // вопрос появляется как раньше (1656–1728px), в финале пина исчезает,
      // уступая место кольцу со спицами (кадр 65 макета)
      questionEl.style.opacity = String(ramp(p, 0.6133, 0.64) * (1 - ramp(p, 0.7, 0.76)));
      // спицы вытягиваются от кружков к центру: stroke-dashoffset 275 → 0
      // (1944–2322px); линии направлены от точки к центру, поэтому
      // dash раскрывается с внешнего конца
      const spokeOffset = 275 * (1 - ramp(p, 0.72, 0.86));
      for (let i = 0; i < spokes.length; i++) {
        spokes[i].style.strokeDashoffset = String(spokeOffset);
      }
    }

    const y = window.scrollY;
    if (y > start && y <= start + PIN * s) {
      statement.style.transform = 'translateY(' + ((y - start) / s) + 'px)';
    } else if (y > start + PIN * s) {
      statement.style.transform = 'translateY(' + PIN + 'px)';
    } else {
      statement.style.transform = '';
    }
  }

  if (!supportsTimeline) {
    window.addEventListener('scroll', applyProgress, { passive: true });
    window.addEventListener('resize', applyProgress);
    (function loop() {
      applyProgress();
      requestAnimationFrame(loop);
    })();
  }

  function sync() {
    for (let i = 1; i <= MAX; i++) hero.classList.toggle('s' + i, i <= step);
  }

  // превью состояния без прокрутки: #hero-step1 ... #hero-step4
  const m = location.hash.match(/^#hero-step([1-4])$/);
  if (m) {
    step = +m[1];
    hold = RESERVE;
    hero.classList.add('no-anim');
    sync();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { hero.classList.remove('no-anim'); });
    });
  }

  // крестик закрывает виджет насовсем (в данной сессии):
  // состояние шагов скролла это не трогает
  hero.querySelectorAll('.hero-widget').forEach(function (w) {
    const x = w.querySelector('.w-close');
    if (!x) return;
    x.addEventListener('click', function () {
      w.classList.add('off');
      if (!hero.querySelector('.hero-widget:not(.off)')) hero.classList.add('clear');
    });
  });

  function scale() { return pageInner.getBoundingClientRect().width / 1280; }
  function atTop() { return window.scrollY < 4; }

  // визуальный Y вершины зоны пина (обёртка без transform — измерение стабильно)
  function stTopS() {
    return pinEl.getBoundingClientRect().top + window.scrollY;
  }

  // старт второго экрана: скролл отмотал экран до p=0
  function atStatementStart() {
    const y = window.scrollY;
    return y > 4 && y <= stTopS() + 4;
  }

  // переходы героя и второго экрана — только через белую вуаль.
  // Вуаль/шаблон перехода/дебаунс/гашение инерции — общие, см. js/fades.js
  // (sidesinstant/sidesnatural там же: бока переключаются под непрозрачной
  // вуалью и темнеют/светлеют ОДНОВРЕМЕННО со всем экраном — reveal
  // показывает их одним цветом с экраном)
  function fadeForward() {
    Fades.fade(stTopS, 400, {
      jump: function () { if (!supportsTimeline) applyProgress(); }
    });
  }
  function fadeBack() {
    Fades.fade(function () { return 0; }, 300);
  }

  // герой: вниз — виджеты, запас, переход; вверх — всё зеркально.
  // дальше скролл нативный: он сам рулит элементами второго экрана
  window.addEventListener('wheel', function (e) {
    if (Fades.damp(e)) return;
    const fwd = e.deltaY > 0;
    if (fwd) {
      if (!atTop()) return;
      e.preventDefault();
      if (!Fades.gate(e)) return;
      if (step < MAX) { step++; sync(); }
      else if (hold < RESERVE) { hold++; }
      else { fadeForward(); }
      return;
    }
    if (atTop()) {
      if (hold > 0 || step > 0) {
        e.preventDefault();
        if (Fades.gate(e)) {
          if (hold > 0) { hold--; } else { step--; sync(); }
        }
      }
      return;
    }
    if (atStatementStart()) {
      e.preventDefault();
      if (Fades.gate(e)) fadeBack();
    }
  }, { passive: false });

  window.addEventListener('keydown', function (e) {
    if (Fades.isFading()) { e.preventDefault(); return; }
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
      if (!atTop()) return;
      e.preventDefault();
      if (step < MAX) { step++; sync(); }
      else if (hold < RESERVE) { hold++; }
      else { fadeForward(); }
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      if (atTop()) {
        if (hold > 0 || step > 0) { e.preventDefault(); if (hold > 0) { hold--; } else { step--; sync(); } }
      } else if (atStatementStart()) {
        e.preventDefault();
        fadeBack();
      }
    }
  });
})();
