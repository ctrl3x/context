// js/fades.js — общая белая вуаль и fade-переходы (неймспейс window.Fades).
// До 2026-10-29 veil/fadeForward/gate/гашение инерции копировались в
// js/hero.js и js/tdgates.js байт-в-байт; тайминги (250 ввоз / 400 reveal /
// GAP 150) должны меняться в одном месте, а не в копиях.
//
// Это единственное исключение из правила «IIFE без глобалов»: модуль
// разделяется несколькими скриптами, подключается раньше всех потребителей
// (scale → fades → hero → … → tdgates; в мобильной версии — перед mobile.js).
//
// Протокол sidesinstant/sidesnatural (см. js/sides.js) живёт здесь: бока
// страницы переключаются мгновенно под непрозрачной вуалью и возвращаются
// к плавным 0.3s после reveal'а — иначе их transition отставал от экрана
// в середине fade'а. Мобильная версия слушателей у этих событий не имеет —
// диспатч там безвреден.
// Тайминги (см. fade() ниже) симметричны: ввоз 250 мс, reveal 400 мс в обе
// стороны (до 2026-10-30 назад было 300 — «исторические», убрали при
// зеркалировании стыков экрана «Учёные доказали»).
(function () {
  // белая вуаль на весь вьюпорт; элемент один на страницу (#white-veil),
  // живёт на body, поэтому transform-масштаб колонки на него не влияет.
  // Ищем через getElementById на каждый вызов, а не кэшируем: устойчивее
  // к стороннему удалению узла, а зоны перехвата скриптов не пересекаются
  function ensure() {
    let v = document.getElementById('white-veil');
    if (!v) {
      v = document.createElement('div');
      v.id = 'white-veil';
      v.style.cssText = 'position:fixed;inset:0;z-index:999;background:#fff;opacity:0;pointer-events:none;';
      document.body.appendChild(v);
    }
    return v;
  }

  // плавная фаза вуали: opacity=1 — ввоз (под непрозрачной прыгаем), 0 —
  // reveal с удалением элемента. getBoundingClientRect перед сменой opacity
  // фиксирует стартовое значение, иначе переход не сыграет
  function veil(opacity, ms, cb) {
    if (opacity === 0) {
      const v = document.getElementById('white-veil');
      if (!v) { if (cb) cb(); return; }
      v.style.transition = 'opacity ' + ms + 'ms ease-out';
      v.getBoundingClientRect();
      v.style.opacity = '0';
      // конец reveal'а = точка отсчёта потолка продления damp (LOCK_MAX):
      // до него окно гашения живёт свободно, после — не дольше LOCK_MAX
      setTimeout(function () {
        lockCap = performance.now() + LOCK_MAX;
        v.remove();
        if (cb) cb();
      }, ms + 40);
      return;
    }
    const v = ensure();
    v.style.transition = 'opacity ' + ms + 'ms ease-out';
    v.getBoundingClientRect();
    v.style.opacity = '1';
    setTimeout(function () { if (cb) cb(); }, ms + 40);
  }

  // вуаль без фазы ввоза: слайд уже начался — под полупрозрачной вуалью
  // он был бы виден, поэтому укрытие мгновенное, reveal обычный
  function veilNow(cb) {
    const v = ensure();
    // сброс потолка: продления текущего гашения не должны зажиматься
    // устаревшим cap от предыдущего fade (свой cap поставит veil(0) в конце)
    lockCap = Infinity;
    v.style.transition = 'none';
    v.getBoundingClientRect();
    v.style.opacity = '1';
    if (cb) cb();
  }

  // идёт жестовый fade (колесо/клавиши) — потребители узнают через
  // isFading(), чтобы глотать события, пока вуаль прыгает
  let fading = false;
  function isFading() { return fading; }

  // полный fade-переход: вуаль 250 мс → sidesinstant + прыжок → reveal.
  // Цель прыжка берём ФУНКЦИЕЙ и измеряем в момент прыжка — за 250 мс
  // ввоза вуали layout может доехать (шрифты, картинки), как у всех
  // измерений проекта. outMs: 400 в обе стороны — тайминги гейта
  // симметричны (раньше назад было 300, «исторические»).
  // hooks: jump — сразу после прыжка (скраб-крайние случаи), done — после
  // reveal'а. Возвращает false, если fade уже идёт.
  function fade(getTarget, outMs, hooks) {
    if (fading) return false;
    fading = true;
    lockCap = Infinity; // свой потолок поставит конец reveal'а — veil(0)
    veil(1, 250, function () {
      window.dispatchEvent(new CustomEvent('sidesinstant'));
      window.scrollTo(0, getTarget());
      if (hooks && hooks.jump) hooks.jump();
      veil(0, outMs, function () {
        window.dispatchEvent(new CustomEvent('sidesnatural'));
        fading = false;
        if (hooks && hooks.done) hooks.done();
      });
    });
    return true;
  }

  // дебаунс жеста: не чаще раза в 250 мс и только настоящие колёса
  // (|deltaY| >= 20) — отсекает микродрожь тачпада
  let last = 0;
  function gate(e) {
    if (performance.now() - last < 250) return false;
    if (Math.abs(e.deltaY) < 20) return false;
    last = performance.now();
    return true;
  }

  // Гашение инерции тачпада при fade-переходах: колесо глотается не только
  // во время вуали, но и на её хвосте — пока события идут очередью с паузами
  // < GAP, это ещё хвост инерции (новый жест узнаём по паузе, как в
  // js/mobile.js). Без этого хвост проскакивает сразу после снятия вуали:
  // докручивает скраб/табы или запускает следующий переход. GAP с запасом
  // к очереди инерции cards.js (там паузы < 120 мс)
  const GAP = 150;
  // Предохранитель от вечного запирания: dampUntil продлевается КАЖДЫМ
  // догоняющим wheel-ом, и пока жест непрерывен (палец не оторван от
  // трекпада / крутится колесо), пауз > GAP не бывает — окно продлевало
  // само себя до конца жеста, и колесо оставалось мёртвым после fade на
  // второй экран (спасала только пауза, воспринимавшаяся как «шевеление
  // мышкой»; клавиши работали — keydown damp не вызывает). Поэтому
  // продление зажато потолком LOCK_MAX после конца reveal'а: плотный хвост
  // инерции в первые полсекунды после вуали по-прежнему глотается, а
  // непрерывный осознанный скролл возобновляется, не дожидаясь паузы.
  const LOCK_MAX = 500;
  let dampUntil = 0;
  let lockCap = Infinity; // потолок продления; выставляет конец reveal'а (veil(0))
  // возвращает true, если событие надо проглотить (и глотает его сама)
  function damp(e) {
    const now = performance.now();
    if (fading || now < dampUntil) {
      dampUntil = Math.min(Math.max(dampUntil, now + GAP), lockCap);
      e.preventDefault();
      return true;
    }
    return false;
  }
  // продлить окно гашения без события (fallback скроллбара в js/tdgates.js:
  // прыжок под veilNow — тот же fade, его хвост глотается так же)
  function quiet(ms) { dampUntil = performance.now() + ms; lockCap = Infinity; }

  window.Fades = { veil: veil, veilNow: veilNow, fade: fade, isFading: isFading, gate: gate, damp: damp, quiet: quiet, GAP: GAP };
})();
