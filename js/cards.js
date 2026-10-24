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

  function scale() { return pageInner.getBoundingClientRect().width / 1280; }
  // topOf с округлением: scrollTo работает в целых пикселях,
  // дробная копейка от scale() ломала границы зоны (y < ze давало true на границе)
  function topOf(el) { return Math.round(el.getBoundingClientRect().top + window.scrollY); }
  function zoneStart() { return topOf(cards[0]); }
  // зона вниз заканчивается на первом пикселе следующей секции:
  // с неё скролл снова нативный
  function zoneEnd() { return topOf(next); }

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
    const stick = Math.max(0, Math.min(Math.round(rel / ZH), LAST)) * ZH;
    const active = y + ZH > zs && y < ze;
    pinWrap.classList.toggle('on-stage', active);
    photo.style.transform = 'translateY(' + stick + 'px)';
  }
  window.addEventListener('scroll', photoPin, { passive: true });
  window.addEventListener('resize', photoPin);

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

  function syncIdx() {
    const y = window.scrollY;
    let s = 0;
    for (let i = 0; i <= LAST; i++) {
      if (y >= topOf(cards[i]) - 4) s = i;
    }
    idx = s;
  }

  window.addEventListener('wheel', function (e) {
    if (sliding) { e.preventDefault(); return; }
    const y = window.scrollY;
    const zs = zoneStart();
    const ze = zoneEnd();

    if (e.deltaY > 0) {
      // выше зоны (в т.ч. «Если научный тезис…») и ниже неё — нативный скролл:
      // экран стейтмента — обычная секция над карточкой 01
      if (y < zs || y >= ze) return;
      syncIdx();
      // с карточки 04 вниз — нативный скролл к «Учёные доказали»
      if (idx >= LAST) return;
      const top = topOf(cards[idx]);
      // стоим не на верхней границе карточки — сначала добиваем до неё
      if (y > top + 4) { e.preventDefault(); window.scrollTo(0, top); return; }
      e.preventDefault();
      if (!gate(e)) return;
      goForward();
    } else {
      // с «Учёные доказали» вверх — лента уводит на карточку 04
      if (y >= ze && y < ze + 40) {
        e.preventDefault();
        if (gate(e)) { idx = LAST; ribbon(next, cards[LAST], topOf(cards[LAST]), -1); }
        return;
      }
      if (y < zs - 4 || y >= ze) return;
      syncIdx();
      const top = topOf(cards[idx]);
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
    const fwd = e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ';
    const back = e.key === 'ArrowUp' || e.key === 'PageUp';
    if (!fwd && !back) return;
    const y = window.scrollY;
    const zs = zoneStart();
    const ze = zoneEnd();

    if (fwd) {
      if (y < zs || y >= ze) return;
      syncIdx();
      // с карточки 04 вниз — нативный скролл к «Учёные доказали»
      if (idx >= LAST) return;
      const top = topOf(cards[idx]);
      if (y > top + 4) { e.preventDefault(); window.scrollTo(0, top); return; }
      e.preventDefault();
      goForward();
    } else {
      // с «Учёные доказали» вверх — лента уводит на карточку 04
      if (y >= ze && y < ze + 40) { e.preventDefault(); idx = LAST; ribbon(next, cards[LAST], topOf(cards[LAST]), -1); return; }
      if (y < zs - 4 || y >= ze) return;
      syncIdx();
      const top = topOf(cards[idx]);
      if (y > top + 4) { e.preventDefault(); window.scrollTo(0, top); return; }
      // с карточки 01 вверх — нативный скролл на «Если научный тезис…»
      if (idx <= 0) return;
      e.preventDefault();
      goBack();
    }
  });

  // превью состояния без прокрутки: #card-step1 .. #card-step4
  const m = location.hash.match(/^#card-step([1-4])$/);
  if (m) {
    idx = +m[1] - 1;
    window.scrollTo(0, topOf(cards[idx]));
  }
  photoPin();
})();
