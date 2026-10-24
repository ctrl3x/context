(function () {
  const hero = document.querySelector('.sec-hero');
  const statement = document.querySelector('.sec-statement');
  const pageInner = document.getElementById('page-inner');
  if (!hero || !statement || !pageInner) return;

  const MAX = 4;      // виджеты: оранжевый, белый, серый, чёрный
  const RESERVE = 1;  // запасные щелчки на чёрном виджете
  let step = 0;       // 0..MAX
  let hold = 0;       // 0..RESERVE
  let fading = false;

  const pinEl = statement.parentElement;
  const dotMain = statement.querySelector('.dot-white:not(.dot-piece)');
  const textEl = statement.querySelector('.statement-40');
  const p1 = statement.querySelector('.p1');
  const p2 = statement.querySelector('.p2');

  // основной путь — CSS scroll-driven animations (без дёрганья, композитор).
  // Fallback для старых браузеров — тот же скраб на rAF
  const supportsTimeline = !!(window.CSS && CSS.supports &&
    CSS.supports('animation-timeline', '--statement'));

  const PIN = 1800;
  const P1 = 0.3;
  const P2 = 0.45;

  if (supportsTimeline) {
    pinEl.classList.add('tl');
    dotMain.style.transform = '';
    textEl.style.transform = '';
    p1.style.transform = '';
    p2.style.transform = '';
    dotMain.style.opacity = '';
    p1.style.opacity = '';
    p2.style.opacity = '';

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

  // fallback-скраб (браузеры без scroll-driven animations): пары кружков и
  // финальный вопрос появляются по тем же порогам, что и в CSS-таймлайне
  var pairSteps = supportsTimeline ? null : [
    { els: statement.querySelectorAll('.pair1a, .pair1b'), a: 0.45, b: 0.55 },
    { els: statement.querySelectorAll('.pair2a, .pair2b'), a: 0.55, b: 0.65 },
    { els: statement.querySelectorAll('.pair3a, .pair3b'), a: 0.65, b: 0.75 },
    { els: statement.querySelectorAll('.pair4a, .pair4b'), a: 0.75, b: 0.85 },
    { els: statement.querySelectorAll('.pair5a, .pair5b'), a: 0.85, b: 0.95 }
  ];
  var questionEl = supportsTimeline ? null : statement.querySelector('.statement-question');

  function applyProgress() {
    const s = scale();
    const start = stTopS();
    const p = Math.max(0, Math.min(1, (window.scrollY - start) / (PIN * s)));

    if (p <= P1) {
      const k = p / P1;
      dotMain.style.transform = 'translateX(' + (-370 + 230 * k) + 'px)';
      textEl.style.transform = 'translateX(' + (654 - 866 * k) + 'px)';
      dotMain.style.opacity = '1';
      p1.style.opacity = '0';
      p2.style.opacity = '0';
      p1.style.transform = 'translate(0,0)';
      p2.style.transform = 'translate(0,0)';
    } else if (p <= P2) {
      const k = (p - P1) / (P2 - P1);
      textEl.style.transform = 'translateX(-212px)';
      dotMain.style.transform = 'translateX(-140px)';
      dotMain.style.opacity = String(Math.max(0, 1 - k * 4));
      const o = String(Math.min(1, k * 4));
      p1.style.opacity = o;
      p2.style.opacity = o;
      p1.style.transform = 'translate(' + (54.7 * k) + 'px,' + (-126.1 * k) + 'px)';
      p2.style.transform = 'translate(' + (65.4 * k) + 'px,' + (162.6 * k) + 'px)';
    } else {
      const k = (p - P2) / (1 - P2);
      textEl.style.transform = 'translateX(' + (-212 - 1442 * k) + 'px)';
      dotMain.style.transform = 'translateX(-140px)';
      dotMain.style.opacity = '0';
      p1.style.opacity = '1';
      p2.style.opacity = '1';
      p1.style.transform = 'translate(54.7px,-126.1px)';
      p2.style.transform = 'translate(65.4px,162.6px)';
    }

    if (pairSteps) {
      for (let i = 0; i < pairSteps.length; i++) {
        const st = pairSteps[i];
        const o = Math.max(0, Math.min(1, (p - st.a) / (st.b - st.a)));
        for (let j = 0; j < st.els.length; j++) st.els[j].style.opacity = String(o);
      }
      questionEl.style.opacity = String(Math.max(0, Math.min(1, (p - 0.92) / 0.04)));
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

  // белая вуаль на весь вьюпорт
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

  // переходы героя и второго экрана — только через белый
  function fadeForward() {
    if (fading) return;
    fading = true;
    veil(1, 250, function () {
      window.scrollTo(0, stTopS());
      if (!supportsTimeline) applyProgress();
      veil(0, 400, function () { fading = false; });
    });
  }
  function fadeBack() {
    if (fading) return;
    fading = true;
    veil(1, 250, function () {
      window.scrollTo(0, 0);
      veil(0, 300, function () { fading = false; });
    });
  }

  // герой: вниз — виджеты, запас, переход; вверх — всё зеркально.
  // дальше скролл нативный: он сам рулит элементами второго экрана
  let last = 0;
  function gate(e) {
    if (performance.now() - last < 250) return false;
    if (Math.abs(e.deltaY) < 20) return false;
    last = performance.now();
    return true;
  }

  window.addEventListener('wheel', function (e) {
    if (fading) { e.preventDefault(); return; }
    const fwd = e.deltaY > 0;
    if (fwd) {
      if (!atTop()) return;
      e.preventDefault();
      if (!gate(e)) return;
      if (step < MAX) { step++; sync(); }
      else if (hold < RESERVE) { hold++; }
      else { fadeForward(); }
      return;
    }
    if (atTop()) {
      if (hold > 0 || step > 0) {
        e.preventDefault();
        if (gate(e)) {
          if (hold > 0) { hold--; } else { step--; sync(); }
        }
      }
      return;
    }
    if (atStatementStart()) {
      e.preventDefault();
      if (gate(e)) fadeBack();
    }
  }, { passive: false });

  window.addEventListener('keydown', function (e) {
    if (fading) { e.preventDefault(); return; }
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
