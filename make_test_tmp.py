#!/usr/bin/env python3
# ВРЕМЕННЫЙ генератор статических тест-страниц пина разбора: переносит .td-pin
# первым экраном, жёстко ставит класс состояния и глушит анимации — чтобы
# headless-скриншот показывал целевую раскладку без гонок виртуального времени
src = open('index.html', encoding='utf-8').read()

start = src.index('<!-- 8. TEARDOWN')
end = src.index('<!-- 9. CHECKLIST')
chunk = src[start:end]

inner_tag = '<div id="page-inner">'
assert inner_tag in src
out = src[:start] + src[end:]                      # пин убран с родного места
out = out.replace(inner_tag, inner_tag + '\n' + chunk, 1)

# s3-правила с !important — цели синхронны с css/style.css (вылет вычитается:
# база правых табов смещена на --td-bleed, посадка — в координатах холста)
s3css = (
    '<style>'
    '.td-left{transform:translateX(calc(-413px - var(--td-bleed,0px)))!important}'
    '.strip-pub,.tab-pub{transform:translateX(-413px)!important}'
    '.strip-ctx,.tab-ctx{transform:translateX(calc(-1093px - var(--td-bleed,0px)))!important}'
    '.strip-src,.tab-src{transform:translateX(calc(-1094px - var(--td-bleed,0px)))!important}'
    '.tab-vd{transform:translateX(calc(-1095px - var(--td-bleed,0px)))!important}'
    '.strip-vd{transform:translateX(calc(-1095px - var(--td-bleed,0px)))!important;opacity:0!important}'
    '.td-pub,.td-ctx,.td-src{opacity:0!important;transform:translateX(-60px)!important}'
    '.td-vd{opacity:1!important;transform:none!important}'
    '.tab-vd .tab-sq{background:var(--white)!important;border-color:transparent!important}'
    '.tab-vd .tab-label{color:var(--white)!important}'
    '</style>\n'
)
for st in ('0', '3'):
    page = out.replace('<div class="td-pin">', '<div class="td-pin s%s">' % st, 1)
    inject = (
        '<style>.td-strip,.td-tab,.td-view,.td-left,.sec-teardown{transition:none!important;animation:none!important}</style>\n'
        + (s3css if st == '3' else '')
        + '<script>window.setTimeout(function(){'
        'var g=function(s){var e=document.querySelector(s);if(!e)return s+":null";var r=e.getBoundingClientRect();'
        'var inner=document.getElementById("page-inner").getBoundingClientRect();'
        'return s+":"+Math.round((r.left-inner.left)/ (inner.width/1280))+".."+Math.round((r.right-inner.left)/(inner.width/1280));};'
        'var p=document.createElement("pre");p.id="measure";'
        'p.textContent=["MEASURE",g(".strip-pub"),g(".strip-ctx"),g(".strip-src"),g(".strip-vd"),'
        'g(".tab-pub"),g(".tab-ctx"),g(".tab-src"),g(".tab-vd"),g(".td-left"),g(".td-bar")].join("|");'
        'document.body.appendChild(p);},600);</script>\n'
    )
    page = page.replace('</body>', inject + '</body>', 1)
    open('test_td_s%s.html' % st, 'w', encoding='utf-8').write(page)
    print('written test_td_s%s.html' % st)
