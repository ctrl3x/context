(function () {
  // Бока за пределами колонки красятся цветом того, что стоит в кадре — и
  // едут ВМЕСТЕ со страницей: слой absolute внутри #page-inner (координаты —
  // px макета), во всю высоту документа, с градиентом жёстких стопов по
  // LAYOUT-диапазонам цветных блоков. Слой скроллится нативно вместе с
  // колонкой, поэтому кромка бока совпадает с кромкой экрана при любой
  // скорости — пересчёт на каждый кадр не нужен (вариант с градиентом по
  // rect'ам и rAF отставал от скролла композитора на кадр — «разное
  // ускорение» на стыках). Слоя два; колонку слой не красит: под
  // непрозрачными секциями подлёг (см. UNDERLAP) скрыт, на прозрачных местах
  // (герой, финал) слой в этой зоне белый, как html.
  //
  // Диапазоны берутся из layout (offsetTop), а не из rect: экран в пине
  // стоит на месте transform'ом, и его rect «висит» у вьюпорта, пока
  // обёртка едет. Обёртка тёмного пина (.statement-pin, фон в CSS) несёт
  // цвет всего диапазона пина: пока экран приколот, он закрывает вьюпорт
  // целиком (высота экрана ≥ вьюпорта в px макета), а вход/выход совпадают
  // с краями обёртки. .sci-pin темнеет классом .sciexp-dark (ставит
  // js/scientists.js на хвосте пина) на весь свой диапазон; прозрачные
  // блоки пропускаются — под ними остаётся белый.
  var inner = document.getElementById('page-inner');
  var sources = Array.prototype.slice.call(
    document.querySelectorAll('.sec, .cl-blackband, .sci-pin, .statement-pin')
  );
  if (!inner || !sources.length) return;

  var SIDE = 4000; // запас ширины каждого бока, px макета: с запасом покрывает
  // самые широкие вьюпорты (бок вьюпорта = (vw − 1280·s)/2 / s < 4000)
  // Правый бок заведён на 2px ПОД колонку: кромка 1280·s после scale() —
  // дробное device-px, слой боков и колонку композитор растеризует по-разному,
  // и в шов пробивается белый html — светлая hairline на тёмных/оранжевых
  // экранах (с экрана «Если научный тезис…» до конца страницы; замер DPR2:
  // 2d2d2d на чёрном, fc7c54 на оранжевом). Под непрозрачными секциями
  // подлёг не виден, на белых слой там всё равно белый. Левый подлегать
  // не нужно: его кромка ровно в 0 — целое device-px, шва не бывает.
  var UNDERLAP = 2;
  var layers = [];
  for (var i = 0; i < 2; i++) {
    var el = document.createElement('div');
    el.style.cssText = 'position:absolute;top:0;width:' + SIDE + 'px;' +
      'z-index:-1;pointer-events:none;background:var(--white);';
    el.style.left = (i === 0 ? -SIDE : 1280 - UNDERLAP) + 'px';
    inner.insertBefore(el, inner.firstChild);
    layers.push(el);
  }

  // Протокол fade-гейтов (js/fades.js → hero.js/tdgates.js) сохранён: прыжок
  // происходит под непрозрачной вуалью, а слой теперь статичен между
  // пересборками — мгновенный флип не требует отключения transition.
  // Слушатели оставлены пустыми, чтобы контракт сторон (fades.js шлёт —
  // sides.js слушает) не ломать
  window.addEventListener('sidesinstant', function () {});
  window.addEventListener('sidesnatural', function () {});

  // Цвета читаются из computed style один раз и кешируются: фон блока меняет
  // только класс .sciexp-dark, о котором сообщает событие 'sciexp' — там кеш
  // сбрасывается
  var colors = null;
  function colorOf(el) {
    var c = el._sidesColor;
    if (c === undefined) {
      c = getComputedStyle(el).backgroundColor;
      // прозрачный блок не рисуем — под ним видно то, что ниже по слоям
      if (c === 'transparent' || c === 'rgba(0, 0, 0, 0)') c = null;
      el._sidesColor = c;
    }
    return c;
  }

  // верх элемента в px макета: сумма offsetTop до body — layout без учёта
  // transform'ов пинов (rect «висит» у вьюпорта, пока экран приколот)
  function layoutTop(el) {
    var y = 0;
    while (el && el !== document.body) {
      y += el.offsetTop;
      el = el.offsetParent;
    }
    return y;
  }

  // Вписать отрезок [top, bottom] цвета color в непересекающиеся полосы:
  // пересечённые полосы режутся, накрытая часть уходит новому цвету
  function stamp(bands, top, bottom, color) {
    var out = [];
    for (var i = 0; i < bands.length; i++) {
      var b = bands[i];
      if (b.bottom <= top || b.top >= bottom) { out.push(b); continue; }
      if (b.top < top) out.push({ top: b.top, bottom: top, color: b.color });
      if (b.bottom > bottom) out.push({ top: bottom, bottom: b.bottom, color: b.color });
    }
    out.push({ top: top, bottom: bottom, color: color });
    out.sort(function (a, b) { return a.top - b.top; });
    // соседние полосы одного цвета склеиваются — короче градиент
    var merged = [];
    for (i = 0; i < out.length; i++) {
      var last = merged[merged.length - 1];
      if (last && last.color === out[i].color) last.bottom = out[i].bottom;
      else merged.push(out[i]);
    }
    return merged;
  }

  function gradient(bands, height) {
    if (!bands.length) return 'var(--white)';
    // жёсткие стопы: каждая полоса окружается белым с двух сторон (пара
    // стопов на одной высоте даёт ровную кромку), зазор между полосами
    // остаётся белым, а не тянет рампу между цветами
    var stops = ['var(--white) 0px'];
    for (var i = 0; i < bands.length; i++) {
      stops.push('var(--white) ' + bands[i].top + 'px');
      stops.push(bands[i].color + ' ' + bands[i].top + 'px');
      stops.push(bands[i].color + ' ' + bands[i].bottom + 'px');
      stops.push('var(--white) ' + bands[i].bottom + 'px');
    }
    stops.push('var(--white) ' + height + 'px');
    return 'linear-gradient(to bottom, ' + stops.join(', ') + ')';
  }

  function update() {
    if (colors === null) colors = sources.map(colorOf);
    var height = inner.offsetHeight; // px макета, без множителя scale
    // Идём в обратном порядке DOM и красим через stamp: последний штамп
    // побеждает, а обёртка пина (.statement-pin) в DOM раньше своей
    // .sec-statement — при обратном ходе красится последней и несёт цвет
    // всего диапазона пина
    var bands = [];
    for (var i = sources.length - 1; i >= 0; i--) {
      if (!colors[i]) continue;
      var el = sources[i];
      var top = layoutTop(el);
      var bottom = top + el.offsetHeight; // layout-высота, transform не влияет
      if (bottom <= 0 || top >= height) continue;
      bands = stamp(bands, Math.max(top, 0), Math.min(bottom, height), colors[i]);
    }
    var paint = gradient(bands, height);
    for (i = 0; i < layers.length; i++) {
      layers[i].style.height = height + 'px';
      layers[i].style.background = paint;
    }
  }

  var raf = 0;
  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = 0; update(); });
  }

  window.addEventListener('resize', schedule);
  window.addEventListener('load', schedule);
  // разворот маски (js/scientists.js) переключает .sciexp-dark посреди
  // фиксированного твина — скролл к этому моменту может уже стоять, и
  // scroll-события не приходят; твин сообщает о переключении сам, заодно
  // сбрасываем кеш: фон .sci-pin сменился классом
  window.addEventListener('sciexp', function () {
    colors = null;
    schedule();
  });
  update();
})();
