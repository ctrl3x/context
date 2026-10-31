(function () {
  // Скобки-тикер экрана 5 «Если научный тезис может убедить…» (мокап 1779-928):
  // та же механика, что у тикера чек-листа (js/checklist.js) и гигант-лого
  // финала (js/decor.js) — скролл только решает, когда экран в кадре (класс .in
  // на секции), сам переход играют CSS-transition'ы фиксированной длительности:
  // скобки сомкнуты чернилами в центре экрана и по .in разъезжаются в обе
  // стороны 0.8s linear, а фраза раскрывается между ними — clip-path с обоих
  // краёв на чернилах скобок (тоже 0.8s linear). Вся геометрия — константы,
  // прописанные в css §2/5: сомкнутые сдвиги ±430px зависят только от
  // чернильных отступов Roboto Mono (29/27/19), ширины боксов в них не
  // входят, — мерить по rect'ам нечего (в отличие от box-flush смыкания
  // финала, где ширина бокса меняется вместе со шрифтом)
  const sec = document.querySelector('.sec-statement2');
  if (!sec) return;

  // без IntersectionObserver (совсем старые браузеры) просто показываем
  // экран раскрытым — лучше статика, чем навсегда сомкнутые скобки
  if (!('IntersectionObserver' in window)) {
    sec.classList.add('in');
    return;
  }

  // пульс: пока экран в кадре, через паузу скобки схлопываются обратно
  // и снова раскрываются. Тайминги те же, что у тикера чек-листа и финала.
  // Таймеры живут только пока экран виден — ушёл со скроллом, цикл
  // останавливается (иначе анимация гонялась бы впустую)
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
    // сжатие запускаем только если экран сейчас раскрыт
    if (!sec.classList.contains('in')) return;
    sec.classList.remove('in');
    clearTimeout(reopenT);
    reopenT = setTimeout(function () {
      // раскрываем обратно только если экран ещё в кадре —
      // иначе «доигравший» таймер вруби раскрытие в скрытой секции
      if (visible) sec.classList.add('in');
    }, COLLAPSE);
  }
  function stopLoop() {
    clearTimeout(loopT1);
    clearInterval(loopT2);
    clearTimeout(reopenT);
    loopT1 = loopT2 = reopenT = null;
  }

  // пороги на СЕКЦИИ, а не на скобках: скобки — узкая полоса в середине
  // экрана, по ней «в кадре» наступило бы у самой кромки вьюпорта. 0.5 секции
  // ≈ экран наполовину в кадре — к этому моменту полоса скобок уже видна.
  // Сброс — только когда секция целиком ушла с экрана: при скролле вниз
  // нижняя (пустая) половина экрана ещё на виду, и схлопывание скобок
  // посреди неё выглядело бы рывком
  const io = new IntersectionObserver(function (entries) {
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (!e.isIntersecting) {
        visible = false;
        sec.classList.remove('in');
        stopLoop();
      } else if (e.intersectionRatio >= 0.5) {
        visible = true;
        sec.classList.add('in');
        if (!loopT1) startLoop();
      }
    }
  }, { threshold: [0, 0.5] });
  io.observe(sec);
})();
