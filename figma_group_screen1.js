// ПРУФ-ОФ-КОНЦЕПТ: группировка ТОЛЬКО внутри первого экрана (1779:572)
// Порядок слоёв (z) сохранён, визуально ничего не меняется.
// Как запустить: Figma → меню → Plugins → Development → Console (или через плагин),
// выделить экран 1779:572 не обязательно — скрипт сам найдёт его по id.

const groups = {
  'Заголовок':   ['1779:573', '1779:574'],
  'Карточка 01': ['1779:582', '1779:585', '1779:586', '1779:597', '1779:601', '1779:619'],
  'Карточка 02': ['1779:583', '1779:587', '1779:588', '1779:589', '1779:592', '1779:595', '1779:599', '1779:607', '1779:611', '1779:616', '1779:618', '1779:620'],
  'Карточка 03': ['1779:584', '1779:590', '1779:591', '1779:593', '1779:594', '1779:596', '1779:603', '1779:609', '1779:613', '1779:615', '1779:617', '1779:621'],
};

const screen = figma.getNodeById('1779:572');
if (!screen) throw new Error('Экран 1779:572 не найден');
if (screen.parent.type !== 'PAGE') throw new Error('Родитель экрана — не страница, abort');

for (const [name, ids] of Object.entries(groups)) {
  const nodes = ids.map(id => figma.getNodeById(id)).filter(Boolean);
  if (nodes.length !== ids.length) throw new Error('Не все ноды найдены в группе ' + name);

  // вставляем группу на позицию самого нижнего (по z) её элемента,
  // чтобы порядок отрисовки не изменился
  const idx = Math.min(...nodes.map(n => screen.children.indexOf(n)));
  const g = figma.group(nodes, screen, idx);
  g.name = name;
}

figma.viewport.scrollAndZoomIntoView([screen]);
console.log('Готово: создано групп — ' + Object.keys(groups).length);
