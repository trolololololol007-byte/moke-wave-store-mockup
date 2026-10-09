/* Smoke Wave customer store mockup (final version).
   Catalog "All" view as a flat list under line headers; category view with collapsible lines.
   PRD section 5.4 rules: W-5 (catalog shows selected-tier prices, repricing only in the basket), W-6, W-17, W-18, W-19.
   All pricing, basket, minimum, delivery and search logic lives in core.js (window.SW); this file is UI only. */
(function () {
  'use strict';
  SW.init('customer-store');

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = SW.esc, money = SW.money;
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('sw-final-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('sw-final-' + k, JSON.stringify(v)); } catch (e) {} }
  };
  var DESKTOP = window.matchMedia('(min-width: 1100px)');
  var EMPTY_FORM = function () { return { telegram: '', delivery: '', comment: '' }; };

  var ui = {
    sheet: false,
    booting: true,
    menu: null,          // product id whose "⋯" menu (+5 / +10) is open
    open: store.get('open', {}), // expanded lines in the category view
    form: Object.assign(EMPTY_FORM(), SW.loadForm()),
    errors: {},
    sending: false,
    netError: false,
    failNext: false,
    demoOpen: false,
    copied: false,
    confirmNew: false,
    undo: null,          // { id, qty } of the last item removed with the cross
    lastCatalog: '#/'
  };

  /* ---------- icons ---------- */
  var I = {
    list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 8Z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>',
    receipt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>',
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>',
    chev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
    expand: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5-5 5 5M7 15l5 5 5-5"/></svg>',
    collapse: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 4 5 5 5-5M7 20l5-5 5 5"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="3"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
    tg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 4 3 11l6 2.2M21 4l-3.5 16-8.5-6.8M21 4 9 13.2v5.3l3-3"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/></svg>',
    gift: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h16v4H4zM6 14v6h12v-6M12 10v10"/><path d="M12 10c-2-4-6-4-6-1.5S10 10 12 10Zm0 0c2-4 6-4 6-1.5S14 10 12 10Z"/></svg>',
    warn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4 2.8 19.5h18.4L12 4Z"/><path d="M12 10v4.5M12 17v.5"/></svg>',
    wifi: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0M3 3l18 18"/></svg>',
    flask: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6M10 3v6L5 18a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3"/><path d="M7.5 14h9"/></svg>',
    more: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18.5" cy="12" r="1.2"/></svg>',
    truck: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    box: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/></svg>'
  };

  function pcs(n) { return n + ' шт'; }
  function posWord(n) { return SW.plural(n, 'позиция', 'позиции', 'позиций'); }

  /* ---------- routes ---------- */
  function route() {
    var h = location.hash || '#/';
    var s = h.slice(1).split('?'), parts = s[0].split('/').filter(Boolean);
    var q = ''; try { q = new URLSearchParams(s[1] || '').get('q') || ''; } catch (e) {}
    var name = parts[0] || 'home';
    if (['catalog', 'search', 'cart', 'checkout', 'done'].indexOf(name) < 0) name = 'home';
    if (name === 'catalog' && !(parts[1] && SW.folder(decodeURIComponent(parts[1])))) name = 'home';
    return { name: name, id: parts[1] ? decodeURIComponent(parts[1]) : null, q: q };
  }
  function isList(r) { return r.name === 'home' || r.name === 'catalog' || r.name === 'search'; }
  function go(h) { if (location.hash === h) render(); else location.hash = h; }

  /* ---------- re-render while keeping focus ---------- */
  var rendering = 0;
  function patch(el, html) {
    if (!el) return;
    var a = document.activeElement, fk = a && el.contains(a) && a.getAttribute('data-fk');
    var selStart = null; try { selStart = fk && a.selectionStart; } catch (e) {}
    rendering++;
    try { el.innerHTML = html; } finally { rendering--; }
    if (fk) {
      var n = el.querySelector('[data-fk="' + fk + '"]');
      if (n && !n.disabled) { n.focus({ preventScroll: true }); try { if (selStart != null) n.setSelectionRange(selStart, selStart); } catch (e) {} }
      else {
        var row = fk.split(':')[0], alt = el.querySelector('[data-fk^="' + row + ':"]:not([disabled])');
        if (alt) alt.focus({ preventScroll: true });
      }
    }
  }

  // Only Catalog and Basket: search lives in the header field, checkout opens from the basket.
  function tabsHTML(r) {
    var q = SW.quote(), act = r.name === 'checkout' || r.name === 'done' ? 'cart' : (r.name === 'catalog' || r.name === 'search' ? 'home' : r.name);
    var tabs = [
      ['home', r.name === 'catalog' ? '#/' : ui.lastCatalog, 'Каталог', I.list], // inside a category: back to "All"
      ['cart', '#/cart', 'Корзина', I.bag]
    ];
    return tabs.map(function (t) {
      var on = act === t[0];
      var badge = t[0] === 'cart' && q.units ? '<span class="tab-badge" aria-label="' + q.units + ' шт в корзине">' + q.units + '</span>' : '';
      return '<a class="tab' + (on ? ' is-active' : '') + '" href="' + t[1] + '"' + (on ? ' aria-current="page"' : '') + '>' +
        '<span class="tab-ic">' + t[3] + badge + '</span><span class="tab-txt">' + t[2] + '</span></a>';
    }).join('');
  }
  // Selected price tier. No "tier went up" highlight: repricing is visible only in the basket (W-5).
  function tiersHTML() {
    return SW.TIERS.map(function (t) {
      var on = SW.tier === t;
      return '<button type="button" class="seg-btn' + (on ? ' is-on' : '') + '" data-act="tier" data-t="' + t + '" aria-pressed="' + on + '" data-fk="tier-' + t + '">от ' + t + '</button>';
    }).join('');
  }
  function themeIcon() {
    var t = document.documentElement.getAttribute('data-theme');
    var dark = t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    $$('[data-act="theme"]').forEach(function (b) { b.innerHTML = dark ? I.sun : I.moon; b.setAttribute('aria-label', dark ? 'Светлая тема' : 'Тёмная тема'); });
  }

  /* ---------- product row: characteristic on the left, price on the right, then controls (W-18, W-19) ---------- */
  function stepper(p, n, k, small) {
    var name = SW.flavor(p), full = n >= p.stock;
    return '<div class="stepper' + (small ? ' sm' : '') + '">' +
      '<button type="button" data-act="add" data-id="' + p.id + '" data-d="-1" data-fk="' + k + ':m" aria-label="Убрать 1 шт: ' + esc(name) + '">' + (n === 1 ? I.trash : '−') + '</button>' +
      '<input type="number" inputmode="numeric" min="0" max="' + p.stock + '" step="1" value="' + n + '" data-qty="' + p.id + '" data-fk="' + k + ':i" aria-label="Количество, шт: ' + esc(name) + '">' +
      '<button type="button" data-act="add" data-id="' + p.id + '" data-d="1" data-fk="' + k + ':p"' + (full ? ' disabled' : '') + ' aria-label="Добавить 1 шт: ' + esc(name) + '">+</button></div>';
  }
  function quickBtns(p, n, k) {
    var left = p.stock - n;
    return [5, 10].map(function (d) {
      return '<button type="button" class="quick" data-act="add" data-id="' + p.id + '" data-d="' + d + '" data-fk="' + k + ':p' + d + '"' + (left <= 0 ? ' disabled' : '') + ' aria-label="Добавить ' + d + ' шт: ' + esc(SW.flavor(p)) + '">+' + d + '</button>';
    }).join('');
  }

  function row(p, ctx) {
    var n = SW.qty(p.id), name = SW.flavor(p), k = ctx + '-' + p.id;
    var low = p.stock <= 10 ? '<span class="low">' + (n >= p.stock ? 'взяли весь остаток' : 'осталось ' + pcs(p.stock)) + '</span>' : '';
    var ctl;
    if (n) {
      ctl = '<div class="r-ctl">' + stepper(p, n, k) + '</div>';
    } else {
      var menu = ui.menu === p.id ? '<div class="menu" role="group" aria-label="Добавить сразу: ' + esc(name) + '">' + quickBtns(p, n, k) + '</div>' : '';
      ctl = '<div class="r-ctl">' +
        '<button type="button" class="more" data-act="menu" data-id="' + p.id + '" data-fk="' + k + ':more" aria-expanded="' + (ui.menu === p.id) + '" aria-label="Добавить сразу 5 или 10 шт: ' + esc(name) + '">' + I.more + '</button>' +
        '<button type="button" class="add" data-act="add" data-id="' + p.id + '" data-d="1" data-fk="' + k + ':p" aria-label="Добавить 1 шт: ' + esc(name) + '">+</button>' + menu + '</div>';
    }
    return '<li class="r' + (n ? ' is-in' : '') + '">' +
      '<div class="r-info"><span class="r-name">' + esc(name) + '</span>' + low +
        (n ? '<span class="r-quick">' + quickBtns(p, n, k) + '</span>' : '') +
      '</div>' +
      '<span class="r-price" aria-label="Цена за шт">' + money(SW.catalogPrice(p)) + '</span>' + ctl + '</li>';
  }

  function fillHTML(l, ctx, short) {
    var ps = SW.productsIn(l.id);
    if (ps.length < 2) return '';
    return '<div class="fill" role="group" aria-label="Добавить по N шт каждой позиции: ' + esc(l.name) + '"><span class="fill-l">' + (short ? 'Каждой позиции' : 'По N шт каждой позиции') + '</span>' +
      [5, 10].map(function (n) { return '<button type="button" class="fill-btn" data-act="fill" data-id="' + l.id + '" data-n="' + n + '" data-fk="' + ctx + '-fill-' + l.id + '-' + n + '" aria-label="По ' + n + ' шт каждой позиции: ' + esc(l.name) + '">по ' + n + '</button>'; }).join('') + '</div>';
  }
  function inCart(q, l) { var ql = q.lines.filter(function (x) { return x.line.id === l.id; })[0]; return ql ? ql.qty : 0; }
  function parentPath(l, skip) { return SW.path(l.id).slice(skip, -1).map(function (f) { return f.name; }).filter(function (nm) { return nm !== l.name; }).join(' · '); }

  // "All" and search: line header (name only) and product rows.
  function lineBlock(l, ps, q, ctx) {
    var all = SW.productsIn(l.id), n = inCart(q, l);
    var meta = parentPath(l, 1);
    return '<section class="ln" aria-labelledby="ln-' + ctx + '-' + l.id + '">' +
      '<header class="ln-head"><div class="ln-t"><h2 id="ln-' + ctx + '-' + l.id + '">' + esc(l.name) + '</h2>' +
        (meta ? '<p class="ln-meta">' + esc(meta) + '</p>' : '') + '</div>' +
      '</header>' + (ps.length === all.length ? fillHTML(l, ctx) : '') +
      '<ul class="rows">' + ps.map(function (p) { return row(p, ctx); }).join('') + '</ul></section>';
  }

  // Selected category: collapsible lines.
  function lineAcc(l, q, skip) {
    var all = SW.productsIn(l.id), n = inCart(q, l), open = !!ui.open[l.id];
    var parent = parentPath(l, skip);
    var bodyId = 'lb-' + l.id;
    return '<section class="ln ln-acc' + (open ? ' is-open' : '') + (n ? ' has-cart' : '') + '">' +
      '<h2 class="acc-h"><button type="button" class="ln-toggle" data-act="toggle" data-id="' + l.id + '" aria-expanded="' + open + '" aria-controls="' + bodyId + '" data-fk="t-' + l.id + '">' +
        '<span class="ln-chev">' + I.chev + '</span>' +
        '<span class="acc-t"><span class="acc-name">' + esc(l.name) + '</span>' +
        (parent ? '<span class="acc-meta"><span class="acc-path">' + esc(parent) + '</span></span>' : '') + '</span>' +
      '</button></h2>' +
      (open ? '<div class="ln-body" id="' + bodyId + '">' + fillHTML(l, 'c', true) + '<ul class="rows">' + all.map(function (p) { return row(p, 'c'); }).join('') + '</ul></div>' : '') +
      '</section>';
  }

  function skeleton(n) {
    var s = '<div class="chips-sk"><i></i><i></i><i></i><i></i></div>';
    for (var i = 0; i < n; i++) s += '<div class="sk"><i class="sk-t"></i><i class="sk-r"></i><i class="sk-r"></i></div>';
    return '<div class="view" aria-busy="true" aria-label="Загрузка каталога">' + s + '</div>';
  }

  function chipsHTML(sel) {
    var chain = sel ? SW.path(sel) : [], root = chain[0];
    var a = function (href, label, on, n) { return '<a class="chip' + (on ? ' is-on' : '') + '" href="' + href + '"' + (on ? ' aria-current="true"' : '') + '>' + esc(label) + (n != null ? '<span class="chip-n">' + n + '</span>' : '') + '</a>'; };
    var html = '<nav class="chips" aria-label="Категории"><div class="chips-in">' + a('#/', 'Все', !root, null) +
      SW.roots().map(function (f) { return a('#/catalog/' + f.id, f.name, root && root.id === f.id, SW.countIn(f.id)); }).join('') + '</div></nav>';
    if (root) {
      var kids = SW.children(root.id);
      if (kids.length > 1) {
        var sub = chain[1];
        html += '<nav class="chips chips-sub" aria-label="Бренды"><div class="chips-in">' + a('#/catalog/' + root.id, 'Все бренды', !sub, null) +
          kids.map(function (f) { return a('#/catalog/' + f.id, f.name, sub && sub.id === f.id, null); }).join('') + '</div></nav>';
      }
    }
    return html;
  }

  function renderList(r) {
    var q = SW.quote(), sel = r.name === 'catalog' ? r.id : null;
    var lines = SW.lines(sel);
    if (!sel) {
      var head = '<div class="sec-head"><h1>Всё в наличии</h1></div>';
      return '<div class="view">' + chipsHTML(null) + head + '<div class="list">' + lines.map(function (l) { return lineBlock(l, SW.productsIn(l.id), q, 'c'); }).join('') + '</div></div>';
    }
    if (lines.length === 1 && ui.open[lines[0].id] === undefined) ui.open[lines[0].id] = true;
    var ids = lines.map(function (l) { return l.id; });
    var allOpen = ids.length && ids.every(function (id) { return ui.open[id]; });
    var skip = Math.max(1, SW.path(sel).length);
    var head2 = '<div class="sec-head row"><div><h1>' + esc(SW.folder(sel).name) + '</h1></div>' +
      (ids.length > 1 ? '<button type="button" class="ghost-btn" data-act="toggle-all" data-v="' + (allOpen ? '0' : '1') + '" data-fk="toggle-all">' + (allOpen ? I.collapse + 'Свернуть все' : I.expand + 'Развернуть все') + '</button>' : '') + '</div>';
    var list = lines.length ? '<div class="list acc-list">' + lines.map(function (l) { return lineAcc(l, q, skip); }).join('') + '</div>' :
      empty(I.box, 'Здесь пока пусто', 'В этой категории сейчас нет товаров в наличии.', '<a class="btn" href="#/">Весь каталог</a>');
    return '<div class="view">' + chipsHTML(sel) + head2 + list + '</div>';
  }

  function renderSearch(r) {
    var q = SW.quote(), query = r.q.trim();
    if (!query) {
      var sugg = ['sour', 'elfbar', 'малина', 'ytkm', 'xros'];
      return '<div class="view"><div class="sec-head"><h1>Поиск</h1><p class="muted small">Вкус, линейка или бренд. Раскладку исправим сами.</p></div>' +
        '<div class="sugg">' + sugg.map(function (s) { return '<a class="chip" href="#/search?q=' + encodeURIComponent(s) + '">' + esc(s) + '</a>'; }).join('') + '</div></div>';
    }
    var groups = SW.search(query);
    var total = groups.reduce(function (a, g) { return a + g.products.length; }, 0);
    var head = '<div class="sec-head"><h1>«' + esc(query) + '»</h1><p class="muted small">' + (total ? 'Найдено ' + total + ' ' + posWord(total) : 'Ничего не нашлось') + '</p></div>';
    if (!groups.length) {
      return '<div class="view">' + head + empty(I.search, 'Ничего не найдено', 'Проверьте написание или поищите по бренду. Мы также искали «' + esc(SW.swapLayout(query.toLowerCase())) + '» в другой раскладке.', '<a class="btn" href="#/">Весь каталог</a>') + '</div>';
    }
    return '<div class="view">' + head + '<div class="list">' + groups.map(function (g) { return lineBlock(g.line, g.products, q, 's'); }).join('') + '</div></div>';
  }

  function empty(icon, title, text, action) {
    return '<div class="empty"><div class="empty-ic">' + icon + '</div><h2>' + title + '</h2><p>' + text + '</p>' + (action || '') + '</div>';
  }

  /* ---------- basket: the only place where prices are recalculated (W-5) ---------- */
  function cartLines(q, k) {
    return q.lines.map(function (l) {
      var one = l.items.every(function (it) { return it.price === l.items[0].price; }) ? l.items[0].price : null;
      return '<section class="cl"><header class="cl-head"><b>' + esc(l.line.name) + '</b>' + (one != null ? '<span>' + money(one) + ' за шт</span>' : '') + '</header>' +
        l.items.map(function (it) {
          var p = it.product;
          return '<div class="ci"><button type="button" class="ci-x" data-act="remove" data-id="' + p.id + '" data-fk="' + k + '-x-' + p.id + '" aria-label="Убрать из корзины: ' + esc(SW.flavor(p)) + '">' + I.close + '</button><div class="ci-info"><span class="ci-name">' + esc(SW.flavor(p)) + '</span>' +
            (one == null ? '<span class="ci-meta">' + money(it.price) + ' за шт</span>' : '') + '</div>' +
            stepper(p, it.qty, k + '-' + p.id, true) + '<b class="ci-sum">' + money(it.sum) + '</b></div>';
        }).join('') + '</section>';
    }).join('');
  }
  function noticeHTML(q) {
    if (q.short) return '<div class="notice is-warn" role="status">' + I.warn + '<span>Вы выбрали цены ' + SW.tierLabel(q.short.tier) + ': добавьте ещё <b>' + pcs(q.short.need) + '</b>. Сейчас в заказе ' + pcs(q.units) + ', поэтому цены ' + SW.tierLabel(q.tier) + '.</span></div>';
    var t = SW.cartNotice(q);
    return t ? '<div class="notice" role="status">' + I.gift + '<span>' + esc(t) + '</span></div>' : '';
  }
  function minHTML(q) {
    var m = q.min;
    if (m.ok) return '<div class="minbox is-ok">' + I.check + '<span>Минимум заказа набран</span></div>';
    var p = Math.round(Math.min(m.sumProgress, m.unitsProgress) * 100);
    return '<div class="minbox"><div class="minbox-t"><b>' + esc(m.message) + '</b><small>Минимум: ' + m.minSum + ' BYN и ' + m.minUnits + ' шт</small></div>' +
      '<div class="bar" role="progressbar" aria-label="Минимум заказа" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + p + '"><i style="width:' + p + '%"></i></div></div>';
  }
  function nextHTML(q) {
    if (!q.next) return '';
    return '<p class="next">' + I.up + '<span>До цен ' + SW.tierLabel(q.next.tier) + ' осталось <b>' + pcs(q.next.need) + '</b> (−' + money(q.next.perUnit) + '/шт)</span></p>';
  }
  function totalsHTML(q) {
    return '<dl class="totals">' +
      (q.savings > 0 ? '<div><dt>Сумма по выбранным ценам <small>(' + SW.tierLabel(q.selected) + ')</small></dt><dd>' + money(q.baseSum) + '</dd></div>' +
        '<div class="t-save"><dt>Скидка за объём <small>(цены ' + SW.tierLabel(q.tier) + ')</small></dt><dd>−' + money(q.savings) + '</dd></div>' : '') +
      '<div class="t-sum"><dt>Итого <small>· ' + pcs(q.units) + '</small></dt><dd>' + money(q.sum) + '</dd></div></dl>';
  }
  function ctaHTML(q) {
    return '<button type="button" class="btn btn-primary btn-block" data-act="checkout"' + (q.min.ok ? '' : ' disabled aria-describedby="min-why"') + '>Перейти к оформлению</button>' +
      (q.min.ok ? '' : '<p class="why" id="min-why">Станет активной, когда наберёте минимум</p>');
  }
  function cartHead(q, id) {
    return '<div class="cart-head"><h2' + (id ? ' id="' + id + '"' : '') + '>Корзина</h2>' +
      (q.units ? '<button type="button" class="text-btn" data-act="clear" data-fk="clear-' + (id || 'x') + '">' + I.trash + '<span>Очистить</span></button>' : '') + '</div>';
  }
  function cartEmpty(compact) {
    return empty(I.bag, 'Корзина пуста', 'Добавляйте позиции из списка. Минимальный заказ — от ' + SW.MIN_SUM + ' BYN и ' + SW.MIN_UNITS + ' шт.', compact ? '' : '<a class="btn btn-primary" href="' + ui.lastCatalog + '">К списку товаров</a>');
  }
  function summaryHTML(q) { return minHTML(q) + nextHTML(q) + totalsHTML(q); }

  function renderCartPage() {
    var q = SW.quote();
    if (!q.lines.length) return '<div class="view"><div class="sec-head"><h1>Корзина</h1></div>' + cartEmpty() + '</div>';
    return '<div class="view cart-page"><div class="sec-head row"><h1>Корзина</h1><button type="button" class="text-btn" data-act="clear" data-fk="clear-page">' + I.trash + '<span>Очистить</span></button></div>' +
      noticeHTML(q) +
      '<div class="cart-lines">' + cartLines(q, 'pg') + '</div>' +
      '<div class="page-sum">' + summaryHTML(q) + '<div class="sticky-cta">' + ctaHTML(q) + '</div></div></div>';
  }

  /* ---------- checkout (W-6, W-17) ---------- */
  function err(k) { return ui.errors[k] ? '<p class="err" id="err-' + k + '">' + esc(ui.errors[k]) + '</p>' : ''; }
  function inv(k, help) { return ui.errors[k] ? ' aria-invalid="true" aria-describedby="err-' + k + '"' : (help ? ' aria-describedby="' + help + '"' : ''); }
  function fieldHTML(f) {
    var v = ui.form[f.id] || '', id = 'f-' + f.id, ctl;
    if (f.type === 'select') {
      ctl = '<select id="' + id + '" name="' + f.id + '" data-field="' + f.id + '" data-fk="fd-' + f.id + '"' + inv(f.id) + '><option value="">Выберите город</option>' +
        f.options.map(function (o) { return '<option' + (v === o ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>';
    } else {
      var t = f.type === 'tel' ? 'tel' : 'text';
      var im = f.inputmode ? ' inputmode="' + f.inputmode + '"' : (f.type === 'tel' ? ' inputmode="tel"' : '');
      var ac = { phone: 'tel', fullName: 'name', postcode: 'postal-code', address: 'street-address' }[f.id];
      ctl = '<input id="' + id + '" name="' + f.id + '" type="' + t + '"' + im + (ac ? ' autocomplete="' + ac + '"' : '') + ' placeholder="' + esc(f.placeholder || '') + '" value="' + esc(v) + '" data-field="' + f.id + '" data-fk="fd-' + f.id + '"' + inv(f.id) + '>';
    }
    return '<div class="field"><label for="' + id + '">' + esc(f.label) + '</label>' + ctl + err(f.id) + '</div>';
  }
  function renderCheckout() {
    var q = SW.quote(), f = ui.form;
    if (!q.lines.length) {
      var lo = SW.lastOrder();
      return '<div class="view"><div class="sec-head"><h1>Оформление</h1></div>' +
        empty(I.receipt, 'Нечего оформлять', 'Корзина пуста. Соберите заказ в списке товаров.',
          '<a class="btn btn-primary" href="' + ui.lastCatalog + '">К списку товаров</a>' + (lo ? '<a class="btn" href="#/done">Последний заказ № ' + lo.number + '</a>' : '')) + '</div>';
    }
    var d = SW.delivery(f.delivery);
    var deliv = SW.DELIVERY.map(function (x) {
      var on = f.delivery === x.id;
      return '<label class="opt' + (on ? ' is-on' : '') + '"><input type="radio" name="delivery" value="' + x.id + '"' + (on ? ' checked' : '') + ' data-fk="dl-' + x.id + '"><span class="opt-dot"></span><span class="opt-t"><b>' + esc(x.title) + '</b><small>' + esc(x.hint) + '</small></span></label>';
    }).join('');
    var fields = d ? '<div class="dfields">' + d.fields.map(fieldHTML).join('') +
      (d.warning ? '<div class="alert alert-warn">' + I.warn + '<p>' + esc(d.warning) + '</p></div>' : '') + '</div>' : '';
    var netErr = ui.netError ? '<div class="alert alert-err" role="alert">' + I.wifi + '<div><b>Не удалось отправить заказ</b><p>Похоже, пропало соединение. Корзина и данные сохранены.</p></div><button type="button" class="btn btn-sm" data-act="retry" data-fk="retry">Повторить</button></div>' : '';
    var compact = q.lines.map(function (l) { return '<li><span>' + esc(l.line.name) + ' <small>· ' + pcs(l.qty) + '</small></span><b>' + money(l.sum) + '</b></li>'; }).join('');
    return '<div class="view"><div class="sec-head"><h1>Оформление</h1><p class="muted small">Без регистрации. Подтверждение заказа — в Telegram.</p></div>' + netErr +
      '<form id="co" class="co" novalidate>' +
      '<section class="blk"><h2 class="h2">Контакт</h2><div class="field"><label for="f-tg">Ник в Telegram</label>' +
        '<div class="tg-in"><span aria-hidden="true">' + I.tg + '</span><input id="f-tg" name="telegram" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="@username" value="' + esc(f.telegram || '') + '" data-fk="tg"' + inv('telegram', 'tg-hint') + '></div>' +
        (ui.errors.telegram ? err('telegram') : '<p class="help" id="tg-hint">Сюда придут статус заказа и вопросы менеджера</p>') + '</div></section>' +
      '<section class="blk"><h2 class="h2">Доставка</h2><div class="opts" role="radiogroup" aria-label="Способ доставки">' + deliv + '</div>' + err('delivery') + fields + '</section>' +
      '<section class="blk"><h2 class="h2">Комментарий <small class="muted">необязательно</small></h2><div class="field"><label for="f-cm" class="sr-only">Комментарий к заказу</label><textarea id="f-cm" name="comment" rows="2" placeholder="Например, удобное время" data-fk="cm">' + esc(f.comment || '') + '</textarea></div></section>' +
      '<section class="blk co-sum"><h2 class="h2">Ваш заказ</h2><ul class="compact">' + compact + '</ul>' + noticeHTML(q) + (q.min.ok ? '' : minHTML(q)) + totalsHTML(q) +
        (ui.errors.basket ? '<p class="err" role="alert">' + esc(ui.errors.basket) + '</p>' : '') +
        '<button type="submit" class="btn btn-primary btn-block btn-lg btn-tg" aria-describedby="submit-hint"' + (q.min.ok && !ui.sending ? '' : ' disabled') + ' data-fk="submit">' +
          (ui.sending ? '<span class="spin" aria-hidden="true"></span>Отправляем…' : I.tg + '<span>Оформить заказ и подтвердить в Telegram</span>') + '</button>' +
        '<p class="why" id="submit-hint">Откроется бот с вашим заказом, нажмите в нём «Старт». Номер тоже скопируется на всякий случай.</p>' +
      '</section></form></div>';
  }

  // Everything that needs a user gesture (copying, opening the bot) runs synchronously in the handler.
  function submitOrder() {
    if (ui.sending) return;
    ui.errors = SW.validate(ui.form);
    if (Object.keys(ui.errors).length) {
      render();
      var first = $('[aria-invalid="true"]') || $('.err'); if (first) { if (first.focus) first.focus(); first.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      return;
    }
    if (ui.failNext) { // demo: network error
      ui.failNext = false; ui.sending = true; render();
      setTimeout(function () { ui.sending = false; ui.netError = true; render(); var a = $('.alert-err'); if (a) a.scrollIntoView({ block: 'center' }); }, 700);
      return;
    }
    ui.netError = false;
    var res = SW.placeOrder(ui.form);
    if (res.errors) { ui.errors = res.errors; render(); return; }
    SW.copyNumber(res.order.number);
    ui.copied = true; ui.confirmNew = false;
    try { window.open(SW.botLink(res.order.token), '_blank'); } catch (e) {}
    ui.form.comment = ''; SW.saveForm(ui.form);
    go('#/done');
  }

  /* ---------- order created, waiting for confirmation in the bot (W-17) ---------- */
  function renderDone() {
    var o = SW.lastOrder();
    if (!o) return '<div class="view">' + empty(I.receipt, 'Заказов пока нет', 'После оформления здесь появится номер заказа.', '<a class="btn btn-primary" href="#/">К списку товаров</a>') + '</div>';
    var q = o.quote, d = SW.delivery(o.form.delivery);
    var details = d ? d.fields.map(function (f) { return o.form[f.id]; }).filter(Boolean).map(esc).join(', ') : '';
    var items = q.lines.map(function (l) { return '<li><span>' + esc(l.line.name) + ' <small>· ' + pcs(l.qty) + '</small></span><b>' + money(l.sum) + '</b></li>'; }).join('');
    var newBlock = ui.confirmNew ?
      '<div class="confirm" role="group" aria-labelledby="confirm-t"><p id="confirm-t">Корзина и ваши данные будут очищены. Начать новый заказ?</p>' +
        '<div class="confirm-acts"><button type="button" class="btn btn-sm btn-danger" data-act="new-yes" data-fk="new-yes">Да, начать</button>' +
        '<button type="button" class="btn btn-sm" data-act="new-no" data-fk="new-no">Отмена</button></div></div>' :
      '<button type="button" class="link-2" data-act="new-ask" data-fk="new-ask">Оформить новый заказ</button>';
    return '<div class="view done">' +
      '<div class="done-hero">' +
        '<p class="done-status">' + I.clock + '<span>' + esc(o.status || 'Ждёт подтверждения в Telegram') + '</span></p>' +
        '<h1 class="done-num">Заказ № <span>' + o.number + '</span></h1>' +
        '<p class="done-lead">Чтобы подтвердить заказ, откройте бота и нажмите «Старт»: номер уже подставлен. Если бот не открылся, вставьте скопированный номер в чат с ботом.</p>' +
        '<div class="done-acts">' +
          '<button type="button" class="btn' + (ui.copied ? ' is-copied' : '') + '" data-act="copy" data-v="' + o.number + '" data-fk="copy">' + (ui.copied ? I.check + '<span>Скопировано</span>' : I.copy + '<span>Скопировать номер</span>') + '</button>' +
          '<a class="btn btn-primary" href="' + esc(SW.botLink(o.token)) + '" target="_blank" rel="noopener" data-act="bot">' + I.tg + '<span>Открыть бота</span></a>' +
        '</div></div>' +
      '<section class="blk"><h2 class="h2">Состав заказа</h2><ul class="compact">' + items + '</ul>' + totalsHTML(q) + '</section>' +
      (d ? '<section class="blk"><h2 class="h2">Доставка</h2><p class="done-dl">' + I.truck + '<span><b>' + esc(d.title) + '</b>' + (details ? '<br>' + details : '') + '<br><small>Telegram: ' + esc(o.form.telegram) + '</small></span></p></section>' : '') +
      '<div class="done-new">' + newBlock + '</div></div>';
  }

  /* ---------- side panel, mini bar, bottom sheet ---------- */
  function renderPanel(r) {
    var q = SW.quote();
    return ''; // No side basket: the bottom bar leads to the basket page.
    if (!q.lines.length) return '<div class="panel-in">' + cartHead(q, 'panel-title') + cartEmpty(true) + '</div>';
    if (r.name === 'cart' || r.name === 'checkout' || r.name === 'done') {
      return '<div class="panel-in"><div class="cart-head"><h2>Итог</h2></div>' + (r.name === 'cart' ? '' : noticeHTML(q)) + summaryHTML(q) + (r.name === 'cart' ? ctaHTML(q) : '<a class="btn btn-block" href="#/cart">Изменить корзину</a>') + '</div>';
    }
    return '<div class="panel-in">' + cartHead(q, 'panel-title') + noticeHTML(q) +
      '<div class="panel-lines">' + cartLines(q, 'pn') + '</div>' +
      '<div class="panel-foot">' + summaryHTML(q) + ctaHTML(q) + '</div></div>';
  }
  function renderMinibar(q) {
    var p = Math.round(Math.min(q.min.sumProgress, q.min.unitsProgress) * 100);
    return '<a class="minibar-btn" href="#/cart" data-fk="minibar">' +
      '<span class="mb-t"><b>' + pcs(q.units) + ' · ' + money(q.sum) + '</b>' +
      '<small>' + (q.min.ok ? 'Минимум набран' : esc(q.min.message)) + '</small>' +
      '<span class="bar' + (q.min.ok ? ' is-ok' : '') + '"><i style="width:' + p + '%"></i></span></span>' +
      '<span class="mb-go">Корзина' + I.chev + '</span></a>';
  }
  function renderSheet(q) {
    var x = '<button type="button" class="icon-btn" data-act="sheet-close" aria-label="Закрыть" data-fk="sheet-x">' + I.close + '</button>';
    if (!q.lines.length) return '<div class="sheet-head">' + cartHead(q, 'sheet-title') + x + '</div><div class="sheet-body">' + cartEmpty(true) + '</div>';
    return '<div class="sheet-head">' + cartHead(q, 'sheet-title') + x + '</div>' +
      '<div class="sheet-body">' + noticeHTML(q) + cartLines(q, 'sh') + '</div>' +
      '<div class="sheet-foot">' + summaryHTML(q) + ctaHTML(q) + '</div>';
  }
  function openSheet(v) {
    ui.sheet = v;
    var s = $('#sheet');
    if (v) { s.hidden = false; requestAnimationFrame(function () { s.classList.add('is-open'); var c = $('.sheet-card'); if (c) c.focus({ preventScroll: true }); }); document.body.classList.add('no-scroll'); }
    else { s.classList.remove('is-open'); document.body.classList.remove('no-scroll'); setTimeout(function () { if (!ui.sheet) s.hidden = true; }, 220); var mb = $('.minibar-btn'); if (mb) mb.focus({ preventScroll: true }); }
    refreshCart(SW.quote());
  }

  /* ---------- toast ---------- */
  var snackTimer;
  function snack(text, kind, undo) {
    var el = $('#snack');
    el.innerHTML = '<div class="snack ' + (kind || '') + '">' + (kind === 'gift' ? I.gift : I.check) + '<span>' + esc(text) + '</span>' +
      (undo ? '<button type="button" class="snack-undo" data-act="undo">Вернуть</button>' : '') +
      '<button type="button" class="snack-x" data-act="snack-x" aria-label="Скрыть уведомление">' + I.close + '</button></div>';
    var s = el.firstChild; requestAnimationFrame(function () { s.classList.add('is-in'); });
    clearTimeout(snackTimer); snackTimer = setTimeout(function () { ui.undo = null; hideSnack(); }, undo ? 5000 : 6000);
  }
  function hideSnack() { var s = $('#snack .snack'); if (!s) return; s.classList.remove('is-in'); setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 250); }
  function cartVisible() { return ui.sheet || route().name === 'cart'; }

  /* ---------- demo ---------- */
  function renderDemo() {
    if (!ui.demoOpen) return '<button type="button" class="demo-pill" data-act="demo-toggle" aria-expanded="false">' + I.flask + 'Демо</button>';
    var b = function (act, t, s) { return '<button type="button" data-act="' + act + '"><b>' + t + '</b><small>' + s + '</small></button>'; };
    return '<div class="demo-card" role="region" aria-label="Демо-панель"><div class="demo-h"><span>' + I.flask + 'Демо</span><button type="button" class="icon-btn sm" data-act="demo-toggle" aria-expanded="true" aria-label="Свернуть демо-панель">' + I.close + '</button></div>' +
      b('demo-upgrade', 'от 10 → 50 шт в заказе', 'каталог от 10, корзина от 50') +
      b('demo-individual', 'от 100, 10 шт', 'цены от 10, не хватает 90 шт') +
      b('demo-below', 'Ниже минимума', '3 шт, оформить нельзя') +
      b('demo-single', '11 шт одного вкуса', 'минимум набран') +
      b('demo-clear', 'Очистить', 'пустая корзина') +
      b('demo-net', 'Ошибка сети', 'при оформлении, с «Повторить»') + '</div>';
  }

  /* ---------- render ---------- */
  var lastRouteKey = '';
  function render() {
    var r = route(), q = SW.quote();
    if (r.name === 'home' || r.name === 'catalog') ui.lastCatalog = r.name === 'catalog' ? '#/catalog/' + r.id : '#/';
    var key = r.name + '|' + r.id;
    var routeChanged = key !== lastRouteKey; lastRouteKey = key;
    if (routeChanged) { ui.menu = null; ui.confirmNew = false; }
    document.body.setAttribute('data-route', r.name);

    var html;
    if (ui.booting && isList(r)) html = skeleton(4);
    else if (r.name === 'search') html = renderSearch(r);
    else if (r.name === 'cart') html = renderCartPage();
    else if (r.name === 'checkout') html = renderCheckout();
    else if (r.name === 'done') html = renderDone();
    else html = renderList(r);
    patch($('#main'), html);

    var qi = $('#q');
    if (r.name === 'search' && document.activeElement !== qi) qi.value = r.q;
    if (r.name !== 'search' && document.activeElement !== qi && routeChanged) qi.value = '';
    $('.search-clear').hidden = !qi.value;

    patch($('#tiers'), tiersHTML());
    refreshCart(q);
    if (routeChanged) {
      if (ui.sheet && !isList(r)) openSheet(false);
      window.scrollTo(0, 0);
      var titles = { home: 'Каталог', catalog: 'Каталог', search: 'Поиск', cart: 'Корзина', checkout: 'Оформление', done: 'Заказ создан' };
      document.title = titles[r.name] + ' · Smoke Wave опт';
    }
  }
  function refreshCart(q) {
    var r = route();
    $$('[data-tabs]').forEach(function (el) { patch(el, tabsHTML(r)); });
    patch($('#panel'), renderPanel(r));
    var showBar = q.units > 0 && isList(r);
    document.body.classList.toggle('has-bar', showBar);
    patch($('#minibar'), showBar ? renderMinibar(q) : '');
    if (ui.sheet) patch($('#sheet-in'), renderSheet(q));
    patch($('#demo'), renderDemo());
  }

  /* ---------- events ---------- */
  // Ignore tier upgrades in the catalog (W-5); show a short toast only while the basket is open.
  SW.on(function (q, events) {
    render();
    events.forEach(function (ev) { if (ev.type === 'upgrade' && cartVisible()) snack(SW.cartNotice(q), 'gift'); });
  });

  setTimeout(function () { ui.booting = false; render(); }, 250);
  window.addEventListener('hashchange', render);
  if (DESKTOP.addEventListener) DESKTOP.addEventListener('change', function () { if (DESKTOP.matches && ui.sheet) openSheet(false); render(); });
  var DARK = window.matchMedia('(prefers-color-scheme: dark)');
  if (DARK.addEventListener) DARK.addEventListener('change', themeIcon);
  themeIcon();

  function commitQty(input) {
    var id = input.getAttribute('data-qty'), p = SW.product(id), v = Math.max(0, Math.floor(+input.value || 0));
    if (v > p.stock) snack('В наличии только ' + pcs(p.stock) + ', поставили максимум');
    if (v === SW.qty(id)) { render(); return; }
    SW.setQty(id, v);
  }
  function setOpenAll(v) {
    var r = route(); if (r.name !== 'catalog') return;
    SW.lines(r.id).forEach(function (l) { ui.open[l.id] = v; });
    store.set('open', ui.open); render();
  }
  function resetCheckoutUI() { ui.form = EMPTY_FORM(); ui.errors = {}; ui.netError = false; ui.copied = false; ui.confirmNew = false; }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]');
    if (ui.menu && !(t && (t.closest('.menu') || t.getAttribute('data-act') === 'menu'))) { ui.menu = null; if (!t) { render(); return; } }
    if (!t) return;
    var a = t.getAttribute('data-act'), id = t.getAttribute('data-id');
    switch (a) {
      case 'tier': SW.setTier(+t.getAttribute('data-t')); break;
      case 'menu': ui.menu = ui.menu === id ? null : id; render(); { var m = $('.menu .quick'); if (ui.menu && m) m.focus(); } break;
      case 'add': {
        var p = SW.product(id), d = +t.getAttribute('data-d');
        if (SW.qty(id) + d > p.stock) snack('В наличии только ' + pcs(p.stock) + ', поставили максимум');
        ui.menu = null; SW.addQty(id, d); break;
      }
      case 'fill': {
        var before = SW.quote().units; SW.fillLine(id, +t.getAttribute('data-n'));
        var added = SW.quote().units - before;
        snack(added ? 'Добавили ' + pcs(added) + ' в корзину' : 'Весь остаток линейки уже в корзине'); break;
      }
      case 'toggle': ui.open[id] = !ui.open[id]; store.set('open', ui.open); render(); break;
      case 'toggle-all': setOpenAll(t.getAttribute('data-v') === '1'); break;
      case 'clear': SW.clearCart(); snack('Корзина очищена'); break;
      case 'checkout': if (ui.sheet) openSheet(false); go('#/checkout'); break;
      case 'sheet-open': openSheet(true); break;
      case 'sheet-close': openSheet(false); break;
      case 'theme': {
        var cur = document.documentElement.getAttribute('data-theme');
        var dark = cur ? cur === 'dark' : DARK.matches;
        document.documentElement.setAttribute('data-theme', dark ? 'light' : 'dark'); store.set('theme', dark ? 'light' : 'dark'); themeIcon(); break;
      }
      case 'clear-q': $('#q').value = ''; $('#q').focus(); if (route().name === 'search') go('#/search'); $('.search-clear').hidden = true; break;
      case 'copy': SW.copyNumber(t.getAttribute('data-v')); ui.copied = true; render(); break;
      case 'new-ask': ui.confirmNew = true; render(); { var y = $('[data-act="new-no"]'); if (y) y.focus(); } break;
      case 'new-no': ui.confirmNew = false; render(); { var n = $('[data-act="new-ask"]'); if (n) n.focus(); } break;
      case 'new-yes': SW.newOrder(); resetCheckoutUI(); go('#/'); snack('Корзина и данные очищены. Можно собирать новый заказ'); break;
      case 'retry': submitOrder(); break;
      case 'snack-x': ui.undo = null; hideSnack(); break;
      case 'remove': {
        var rid = t.getAttribute('data-id'), rp = SW.product(rid);
        ui.undo = { id: rid, qty: SW.qty(rid) };
        SW.setQty(rid, 0);
        snack('Убрали «' + SW.flavor(rp) + '»', '', true); break;
      }
      case 'undo': if (ui.undo) SW.setQty(ui.undo.id, ui.undo.qty); ui.undo = null; hideSnack(); break;
      case 'demo-toggle': ui.demoOpen = !ui.demoOpen; refreshCart(SW.quote()); { var f = ui.demoOpen ? $('.demo-card button') : $('.demo-pill'); if (f) f.focus(); } break;
      case 'demo-upgrade': SW.demo('upgrade'); if (cartVisible()) snack(SW.cartNotice(), 'gift'); else snack('В корзине 50 шт: в каталоге цены от 10, в корзине пересчитаны'); break;
      case 'demo-individual': SW.demo('individual'); snack('Выбрано «от 100», в заказе 10 шт: в корзине цены от 10 и подсказка, сколько добрать'); break;
      case 'demo-below': SW.demo('below'); snack('3 шт на ' + money(SW.quote().sum) + ': оформление недоступно'); break;
      case 'demo-single': SW.demo('single'); snack('11 шт одного вкуса: минимум набран'); break;
      case 'demo-clear': SW.clearCart(); break;
      case 'demo-net': {
        if (!SW.quote().min.ok) SW.demo('upgrade');
        if (!/^@[A-Za-z0-9_]{5,}$/.test(ui.form.telegram || '')) ui.form.telegram = '@demo_client';
        if (!SW.delivery(ui.form.delivery)) ui.form.delivery = 'minsk-address';
        if (ui.form.delivery === 'minsk-address' && !ui.form.address) ui.form.address = 'ул. Притыцкого, 29, кв. 12';
        SW.saveForm(ui.form);
        ui.failNext = true; ui.demoOpen = false;
        go('#/checkout'); setTimeout(submitOrder, 50); break;
      }
    }
  });

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.matches('[data-qty]')) { if (rendering) setTimeout(function () { commitQty(t); }, 0); else commitQty(t); }
    if (t.name === 'delivery') {
      ui.form.delivery = t.value; delete ui.errors.delivery;
      SW.delivery(t.value).fields.forEach(function (f) { delete ui.errors[f.id]; });
      SW.saveForm(ui.form); render();
    }
    if (t.matches('select[data-field]')) { ui.form[t.name] = t.value; delete ui.errors[t.name]; SW.saveForm(ui.form); render(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.matches('[data-qty]')) { e.preventDefault(); commitQty(e.target); }
    if (e.key === 'Escape') {
      if (ui.menu) { var id = ui.menu; ui.menu = null; render(); var b = $('[data-act="menu"][data-id="' + id + '"]'); if (b) b.focus(); }
      else if (ui.sheet) openSheet(false);
      else if (ui.confirmNew) { ui.confirmNew = false; render(); }
      else if (ui.demoOpen) { ui.demoOpen = false; refreshCart(SW.quote()); }
    }
  });
  document.addEventListener('focusin', function (e) {
    if (e.target.id === 'f-tg' && !e.target.value) { e.target.value = '@'; ui.form.telegram = '@'; }
    if (ui.sheet && !$('#sheet').contains(e.target)) { var c = $('.sheet-card'); if (c) c.focus({ preventScroll: true }); }
  });
  function clearErr(k, t) { if (!ui.errors[k]) return; delete ui.errors[k]; t.removeAttribute('aria-invalid'); t.removeAttribute('aria-describedby'); var er = $('#err-' + k); if (er) er.remove(); }
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'f-tg') { var v = t.value.replace(/\s/g, ''); if (v) v = '@' + v.replace(/^@+/, ''); if (v !== t.value) t.value = v; ui.form.telegram = v; SW.saveForm(ui.form); clearErr('telegram', t); }
    if (t.matches('input[data-field]')) { ui.form[t.name] = t.value; SW.saveForm(ui.form); clearErr(t.name, t); }
    if (t.id === 'f-cm') { ui.form.comment = t.value; SW.saveForm(ui.form); }
    if (t.id === 'q') { $('.search-clear').hidden = !t.value; debounceSearch(t.value); }
  });
  document.addEventListener('submit', function (e) {
    if (e.target.id === 'co') { e.preventDefault(); submitOrder(); }
    if (e.target.id === 'search-form') { e.preventDefault(); clearTimeout(searchTimer); doSearch($('#q').value); }
  });
  var searchTimer;
  function debounceSearch(v) { clearTimeout(searchTimer); searchTimer = setTimeout(function () { doSearch(v); }, 200); }
  function doSearch(v) {
    var h = '#/search' + (v.trim() ? '?q=' + encodeURIComponent(v.trim()) : '');
    if (route().name === 'search') { history.replaceState(null, '', h); render(); }
    else location.hash = h;
  }
})();
