(function () {
  // Упрощённый scale.js для мобильного лонг-рида (мокап 414×15832):
  // страница всегда вписывается по ширине вьюпорта, высота — нативный скролл.
  // Никаких пинов и пересчётов по высоте: контент статичен.
  var DESIGN_W = 414;
  var outer = document.getElementById('m-page');
  var inner = document.getElementById('m-inner');

  function rescale() {
    var s = document.documentElement.clientWidth / DESIGN_W;
    inner.style.transform = 'scale(' + s + ')';
    outer.style.width = DESIGN_W * s + 'px';
    // высота = дизайн-высота контента × масштаб (внутренние 10 секций по 414px)
    outer.style.height = inner.offsetHeight * s + 'px';
  }

  window.addEventListener('resize', rescale);
  // после load: web-шрифты меняют высоту контента, пересчитываем
  window.addEventListener('load', rescale);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(rescale);
  }
  rescale();
})();

// TikTok-механика скролла + гейты с вуалью на всех границах экранов со
// сменой цвета фона. Wheel и touch обрабатываются сами (preventDefault):
// нативного скролла и его инерции нет — «разогнать» страницу и проскочить
// экран нельзя. Один жест = один шаг: внутри экрана палец/колесо ведут
// страницу 1:1 без доводки, а гейт поглощает жест целиком (остаток дельты
// игнорируется до следующего жеста), поэтому за один жест невозможно
// пройти две границы подряд. Гейты стоят на границах блоков разного цвета:
// соседние секции одного цвета склеиваются в один экран (statement+card —
// чёрные без шва, sci+list — белые). На границе (текущий экран заполняет
// вьюпорт, следующий ровно под сгибом) жест стопорится, через белую вуаль
// страница подменяется следующим экраном, вуаль уходит; обратный ход
// зеркален. Если экран короче вьюпорта (крупные телефоны), стоп-позиция
// прижимается к его верху: экран показывается целиком, следующий шаг —
// снова через вуаль. На входе в тёмный экран «Не спешите верить
// заголовку…» поверх того же гейта играется сценарий фраз (первый раз —
// фраза → вопрос, при возврате снизу вверх экран «отматывается»: вопрос
// гаснет и фраза выплывает снова). Класс .m-anim ставит только скрипт:
// без JS фразы видны статично.
(function () {
  var sections = [].slice.call(document.querySelectorAll('.m-sec'));
  var quest = document.querySelector('.m-quest');
  if (sections.length < 2 || !quest) return;
  var st = quest.querySelectorAll('.m-st');
  if (st.length < 2) return;
  var phrase = st[0];
  var question = st[1];

  var IN = 600;    // выплывание фразы
  var HOLD = 1400; // первая фраза держится на экране
  var OUT = 400;   // первая фраза гаснет
  var VEIL_IN = 250, VEIL_OUT = 400; // тайминги вуали — как у fadeForward
  var GESTURE_GAP = 250; // тишина между wheel-событиями = жест закончился

  var played = false;
  var questState = 'question'; // фраза | вопрос: чем отвечает тёмный экран при возврате
  var locked = false;
  var lockY = 0;
  var prevY = window.scrollY;

  // белая вуаль на весь вьюпорт; живёт на body, поэтому transform-масштаб
  // #m-inner на неё не влияет (как #white-veil на десктопе)
  var veilEl = null;
  function veil(opacity, ms, cb) {
    if (!veilEl) {
      veilEl = document.createElement('div');
      veilEl.style.cssText = 'position:fixed;inset:0;z-index:999;background:#fff;opacity:0;pointer-events:none;';
      document.body.appendChild(veilEl);
    }
    veilEl.style.transition = 'opacity ' + ms + 'ms ease-out';
    // фиксируем стартовое значение до смены opacity, иначе переход не сыграет
    veilEl.getBoundingClientRect();
    veilEl.style.opacity = String(opacity);
    setTimeout(cb, ms + 40);
  }

  function lockAt(y) {
    locked = true;
    lockY = y;
    // overflow:hidden глушит новые касания; force-scroll в onScroll добивает
    // всё, что могло просочиться
    document.documentElement.style.overflow = 'hidden';
    window.scrollTo(0, y);
  }
  function unlock() {
    locked = false;
    document.documentElement.style.overflow = '';
  }

  function playSequence(done) {
    questState = 'question';
    phrase.classList.add('m-in');
    setTimeout(function () {
      phrase.classList.remove('m-in');
      phrase.classList.add('m-out');
      setTimeout(function () {
        question.classList.add('m-in');
        setTimeout(done, IN); // отпускаем скролл, когда вопрос доехал
      }, OUT);
    }, HOLD + IN);
  }

  // реверс (вход в тёмный экран снизу вверх): вопрос гаснет, на его месте
  // снова выплывает первая фраза — экран «отматывается» к своему началу
  function playReverse(done) {
    questState = 'phrase';
    question.classList.add('m-out');
    setTimeout(function () {
      // снимаем с вопроса ОБА класса: .m-in держал его видимым, и без
      // снятия вопрос остался бы на экране под проявляющейся фразой
      // (задвоение — два центрированных текста друг на друге)
      question.classList.remove('m-out', 'm-in');
      phrase.classList.remove('m-out');
      phrase.classList.add('m-in');
      setTimeout(done, IN);
    }, OUT);
  }

  // статичная смена состояния без анимации (повторный вход через вуаль):
  // фраза скрыта, вопрос виден. Переходы на время подмены гасим: они длились
  // бы 400 мс и проступили бы сквозь ещё полупрозрачную вуаль (призрак фразы)
  function showQuestion() {
    questState = 'question';
    phrase.style.transition = 'none';
    question.style.transition = 'none';
    phrase.classList.remove('m-in');
    phrase.classList.add('m-out');
    question.classList.remove('m-out');
    question.classList.add('m-in');
    // force reflow, чтобы гашение переходов точно применилось до
    // возвращения стилей (вызывается и вне вуали — при загрузке ниже экрана)
    phrase.getBoundingClientRect();
    phrase.style.transition = '';
    question.style.transition = '';
  }

  // экраны: соседние секции одного цвета фона склеиваются в блок.
  // Цвета читаю из computed style один раз при старте — новые секции
  // подхватываются без правки этого списка. offsetTop/offsetHeight —
  // layout-px без учёта transform-масштаба, при использовании умножаем на s.
  var blocks = [];
  sections.forEach(function (sec) {
    var color = getComputedStyle(sec).backgroundColor;
    var prev = blocks[blocks.length - 1];
    if (prev && prev.color === color) {
      prev.end = sec.offsetTop + sec.offsetHeight;
    } else {
      blocks.push({ top: sec.offsetTop, end: sec.offsetTop + sec.offsetHeight, color: color, sec: sec });
    }
  });

  // гейты: только границы блоков разного цвета (edge — верх следующего блока).
  // story — следующий блок тёмный (вход в сценарий), fromQuest — предыдущий
  // тёмный (выход из него вверх: там экран «отматывается» к первой фразе)
  var gates = [];
  blocks.forEach(function (b, i) {
    if (i && b.color !== blocks[i - 1].color) {
      gates.push({
        edge: b.top,
        prevTop: blocks[i - 1].top,
        story: b.sec === quest,
        fromQuest: blocks[i - 1].sec === quest
      });
    }
  });
  if (!gates.length) return;
  var storyEdge = quest.offsetTop; // верх тёмного экрана с фразами (layout px)

  function scale() { return document.documentElement.clientWidth / 414; }

  // вниз: предыдущий экран остановлен под вуалью → следующий экран.
  // На входе в «Не спешите верить…»: первый раз после вуали играется
  // сценарий фраз, повторный вход — вопрос уже виден (статично, под вуалью)
  function gateDown(g, holdY, edgeY) {
    lockAt(holdY);
    veil(1, VEIL_IN, function () {
      lockY = edgeY;
      window.scrollTo(0, edgeY);
      if (g.story && played) showQuestion(); // смена невидима под вуалью
      veil(0, VEIL_OUT, function () {
        if (g.story && !played) { played = true; playSequence(unlock); }
        else { unlock(); }
      });
    });
  }

  // вверх: следующий экран остановлен под вуалью → возврат к стоп-позиции
  // предыдущего экрана (зеркало gateDown). При выходе из тёмного экрана
  // вверх он «отматывается»: вопрос гаснет, снова выплывает первая фраза
  function gateUp(g, holdY, edgeY) {
    lockAt(edgeY);
    veil(1, VEIL_IN, function () {
      lockY = holdY;
      window.scrollTo(0, holdY);
      veil(0, VEIL_OUT, function () {
        if (g.fromQuest && questState === 'question') { playReverse(unlock); }
        else { unlock(); }
      });
    });
  }

  // ловим пересечение границы: вниз — первый (нижний) стопор, даже если
  // дельта жеста перелетела и edgeY (проскочить нельзя); вверх — последний
  // (верхний) край. Стоп-позиция — где текущий экран ещё заполняет вьюпорт,
  // а следующий ровно под сгибом; если экран короче вьюпорта, она
  // прижимается к верху блока (max с prevTop)
  function detect(y, newY) {
    var s = scale(), vh = window.innerHeight;
    var i, g, edgeY, holdY, hit = null;
    for (i = 0; i < gates.length && !hit; i++) {
      g = gates[i];
      edgeY = g.edge * s;
      holdY = Math.max(g.prevTop * s, edgeY - vh);
      if (y <= holdY && newY > holdY) hit = { g: g, holdY: holdY, edgeY: edgeY, down: true };
    }
    for (i = gates.length - 1; i >= 0 && !hit; i--) {
      g = gates[i];
      edgeY = g.edge * s;
      if (y >= edgeY && newY < edgeY) {
        holdY = Math.max(g.prevTop * s, edgeY - vh);
        hit = { g: g, holdY: holdY, edgeY: edgeY, down: false };
      }
    }
    return hit;
  }

  // шаг от жеста (wheel/touchmove/клавиши): гейт поглощает жест целиком,
  // свободный шаг двигает страницу ровно на дельту — без инерции
  function step(delta) {
    if (locked) return true;
    var y = window.scrollY;
    var hit = detect(y, y + delta);
    if (hit) {
      if (hit.down) gateDown(hit.g, hit.holdY, hit.edgeY);
      else gateUp(hit.g, hit.holdY, hit.edgeY);
      return true; // жест съеден гейтом: остаток дельты игнорируем
    }
    var maxScroll = Math.max(0, document.getElementById('m-page').offsetHeight - window.innerHeight);
    window.scrollTo(0, Math.min(Math.max(0, y + delta), maxScroll));
    prevY = window.scrollY;
    return false;
  }

  // страховка: scroll-события от нашего же scrollTo (гейты уже отработали
  // в step) — только держим стоп-позицию против rubber-band/инерции
  function onScroll() {
    var y = window.scrollY;
    if (locked) {
      if (Math.abs(y - lockY) > 1) { window.scrollTo(0, lockY); y = lockY; }
      prevY = y;
      return;
    }
    // если позиция изменилась без жеста (найти-на-странице, якорь,
    // восстановление скролла) — ловим пересечённый гейт как обычно
    var hit = detect(prevY, y);
    if (hit) {
      if (hit.down) gateDown(hit.g, hit.holdY, hit.edgeY);
      else gateUp(hit.g, hit.holdY, hit.edgeY);
    } else if (!played && y >= storyEdge * scale()) {
      // страховка (восстановленный скролл после загрузки): тёмный экран
      // на виду, а сценарий не играл — показываем финальное состояние
      played = true;
      showQuestion();
    }
    prevY = window.scrollY;
  }

  (function init() {
    quest.classList.add('m-anim');
    var s = scale();
    var edgeY = storyEdge * s;
    var y = window.scrollY;
    if (y >= edgeY) {
      // загрузка ниже перехода: вопрос уже виден, сценарий не переигрываем
      played = true;
      showQuestion();
    } else if (y > Math.max(0, edgeY - window.innerHeight)) {
      // восстановились внутри зоны перехода: фразы доигрывают на месте
      played = true;
      playSequence(function () {});
    }
    prevY = window.scrollY;
    window.addEventListener('scroll', onScroll, { passive: true });
  })();

  // жесты. Wheel: события одной прокрутки склеиваются в жест — после
  // гейта все события жеста игнорируются до паузы GESTURE_GAP, поэтому
  // «разогнаться» между экранами нельзя. Touch: жест живёт от touchstart
  // до touchend, preventDefault на touchmove гасит нативный скролл и
  // инерцию — страница движется только от наших шагов.
  var lastWheel = 0, wheelConsume = false, touchConsume = false, touchLast = 0;

  window.addEventListener('wheel', function (e) {
    e.preventDefault();
    var now = Date.now();
    if (now - lastWheel > GESTURE_GAP) wheelConsume = false;
    lastWheel = now;
    if (wheelConsume) return;
    var d = e.deltaY;
    // deltaMode: 1 — строки, 2 — страницы; приводим к пикселям
    if (e.deltaMode === 1) d *= 16;
    else if (e.deltaMode === 2) d *= window.innerHeight;
    if (!d) return;
    if (step(d)) wheelConsume = true;
  }, { passive: false });

  window.addEventListener('touchstart', function (e) {
    if (e.touches.length === 1) {
      touchConsume = false;
      touchLast = e.touches[0].clientY;
    } else {
      touchConsume = true; // мультитач/пинч — жест не наш
    }
  }, { passive: false });

  window.addEventListener('touchmove', function (e) {
    // preventDefault гасит нативный скролл, резинку и инерцию —
    // страница движется только от наших шагов (1:1 за палец)
    e.preventDefault();
    if (touchConsume || e.touches.length !== 1) return;
    var cur = e.touches[0].clientY;
    var d = touchLast - cur;
    touchLast = cur;
    if (Math.abs(d) < 0.5) return;
    if (step(d)) touchConsume = true;
  }, { passive: false });

  // клавиши тоже через наш движок: нативного скролла нет вообще
  window.addEventListener('keydown', function (e) {
    var vh = window.innerHeight, d = 0;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') d = vh * 0.8;
    else if (e.key === 'ArrowUp' || e.key === 'PageUp') d = -vh * 0.8;
    if (!d) return;
    e.preventDefault();
    step(d);
  });
})();
