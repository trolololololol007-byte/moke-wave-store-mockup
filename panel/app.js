/* Smoke Wave manager panel mockup: sign-in, order queue, order card with its actions, tasks, chats and settings
   (PRD 5.2, A-1 to A-31).
   Pricing, rounding, sign-in limits and message text live in core.js (window.SWP); this file is UI only. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = SWP.esc, money = SWP.money;

  var ui = {
    filter: { q: '', status: '', delivery: '', from: '', to: '', sort: 'receivedAt', dir: 'desc' },
    menu: null,      // line id whose price-list menu is open
    tab: 'note',     // order card tab: 'note' | 'dispatch'
    files: [],       // mock attachments on the "Dispatch" tab
    refundFile: {},  // tasks: mock receipt attached to a refund, keyed by refund id
    chatFiles: [],   // chats: mock attachments of the message being written
    chatDraft: '',   // chats: the message being typed; a leading "/" opens quick commands
    taskSort: 'old', // tasks: 'old' (default, oldest first) | 'new'
    citiesOpen: false, setErr: '', red: {}, // settings: cities list and form error; red: lines flagged after "apply customer prices"
    chatQ: '', chatFolder: 'all', // chats: search and folder ('all' | 'marked')
    setTab: 'site', cityErr: '', newKey: '', rep: { from: '2026-10-01', to: '2026-10-10' }, // settings
    blockQ: '',      // settings: search for a customer to block
    postOpen: false, // tasks: the list of Belposhta parcels to confirm is open
    trackErr: false, // "Process" was pressed with a wrong Belposhta tracking code
    showKey: false,  // sign-in: show the typed key
    open: {},        // expanded product lines, keyed "orderNumber:lineId"
    addQ: '',        // product search at the bottom of the delivery note
    dialog: null,    // { type: 'preview' | 'packing' | 'conflict' | 'customer' | 'ask', n, error, text, q, name, title, options }
    loginError: '',
    demoOpen: false,
    undo: null       // last removed item: { n, item }
  };

  var I = {
    list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></svg>',
    tasks: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="17" rx="3"/><path d="m8 10 2 2 4-4M8 16h8"/></svg>',
    flag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 21V4h11l-2 4 2 4H6"/></svg>',
    clip: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5 12.3 19a5 5 0 0 1-7-7.1l8-7.9a3.4 3.4 0 0 1 4.8 4.8l-7.9 7.8a1.8 1.8 0 0 1-2.5-2.5l7.2-7.1"/></svg>',
    send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12 20 4.5 16.5 20l-4-6.5L4 12Z"/><path d="m12.5 13.5 7.5-9"/></svg>',
    bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
    chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4V5Z"/></svg>',
    gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>',
    out: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h9"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>',
    eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/></svg>',
    eyeOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4l16 16M9.9 6A9 9 0 0 1 12 5.5c6 0 9.500 6.500 9.500 6.500a15 15 0 0 1-3 3.700M6.200 7.700A15 15 0 0 0 2.500 12S6 18.500 12 18.500a9 9 0 0 0 3.300-.6"/></svg>',
    chev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    warn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4 2.8 19.5h18.4L12 4Z"/><path d="M12 10v4.5M12 17v.5"/></svg>',
    flask: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6M10 3v6L5 18a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3"/><path d="M7.5 14h9"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/></svg>',
    file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6V3Z"/><path d="M14 3v4h4M9 13h6M9 17h6"/></svg>'
  };
  var PILL = { new: '', details: '', phone: 'is-warn', accepted: 'is-act', queue: 'is-act', processed: 'is-soft', payment: 'is-warn', packing: 'is-soft', packed: 'is-ok', dispatched: 'is-ok', delivered: 'is-ok' };

  /* ---------- routes ---------- */
  function route() {
    var parts = (location.hash || '#/').slice(1).split('/').filter(Boolean);
    var name = parts[0] || 'queue';
    if (name === 'notifications') name = 'tasks';
    if (['order', 'tasks', 'chats', 'settings'].indexOf(name) < 0) name = 'queue';
    if (name === 'order' && !SWP.order(parts[1])) name = 'queue';
    return { name: name, n: name === 'order' ? +parts[1] : null, id: name === 'chats' ? parts[1] || null : null };
  }
  function go(h) { if (location.hash === h) render(); else location.hash = h; }

  /* ---------- re-render while keeping focus ---------- */
  var rendering = 0; // replacing a focused, edited field fires "change" on it; handlers skip events raised by a re-render
  function patch(el, html) {
    if (!el) return;
    var a = document.activeElement, fk = a && el.contains(a) && a.getAttribute('data-fk'), pos = null;
    try { pos = fk && a.selectionStart; } catch (e) {}
    rendering++;
    try { el.innerHTML = html; } finally { rendering--; }
    if (!fk) return;
    var n = el.querySelector('[data-fk="' + fk + '"]');
    if (n && !n.disabled) { n.focus({ preventScroll: true }); try { if (pos != null) n.setSelectionRange(pos, pos); } catch (e) {} }
  }

  function pill(o) { return '<span class="pill ' + PILL[o.status] + '">' + esc(SWP.status(o.status).label) + '</span>'; }
  function kindTag(o) { return o.kind === 'addon' ? ' <span class="tag">дозаказ' + (o.original ? ' к ' + o.original : '') + '</span>' : ''; }
  function deliveryText(o) { var d = SWP.delivery(o.delivery.type); return d.label + (o.delivery.type === 'minibus' && o.delivery.city ? ', ' + o.delivery.city : ''); }
  function who(o) { var c = SWP.customer(o); return c.id === 'retail' && o.siteTag ? c.name + ' (' + o.siteTag + ')' : c.name; }
  function options(list, cur, empty) {
    return (empty ? '<option value="">' + empty + '</option>' : '') + list.map(function (x) {
      return '<option value="' + esc(x.id) + '"' + (x.id === cur ? ' selected' : '') + '>' + esc(x.label) + '</option>';
    }).join('');
  }

  /* ---------- sign-in (A-1) ---------- */
  var muteTimer = null;
  function clock(ms) { var s = Math.ceil(ms / 1000); return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }
  function loginHTML() {
    var left = SWP.muteLeft();
    return '<div class="login"><form class="login-card" id="login" autocomplete="off">' +
      '<div class="login-brand"><span class="mark">SW</span><div><h1>Панель менеджера</h1><p class="muted small" style="margin:0">Smoke Wave</p></div></div>' +
      (left ? '<div class="mute" role="alert">Ключ введён неверно ' + SWP.MAX_TRIES + ' раза. Вход с этого адреса закрыт ещё на <b id="mute-left">' + clock(left) + '</b>.</div>' : '') +
      '<div class="field"><label for="key">Ключ доступа</label>' +
      '<div class="key-in"><input id="key" name="key" type="' + (ui.showKey ? 'text' : 'password') + '" autocomplete="off" spellcheck="false" data-fk="key"' + (left ? ' disabled' : '') + (ui.loginError ? ' aria-invalid="true" aria-describedby="key-err"' : '') + '>' +
      '<button type="button" class="icon-btn" data-act="toggle-key" aria-pressed="' + ui.showKey + '" aria-label="' + (ui.showKey ? 'Скрыть ключ' : 'Показать ключ') + '">' + (ui.showKey ? I.eyeOff : I.eye) + '</button></div>' +
      (ui.loginError && !left ? '<p class="err" id="key-err" role="alert">' + esc(ui.loginError) + '</p>' : '') +
      '<p class="help">Сессия длится 12 часов, затем ключ нужно ввести снова.</p></div>' +
      '<button class="btn btn-primary btn-lg btn-block" type="submit"' + (left ? ' disabled' : '') + '>Войти</button>' +
      '<div class="demo-note"><b>Макет</b>' +
      '<button type="button" data-act="fill-key" data-k="manager">Подставить ключ менеджера</button>' +
      '<button type="button" data-act="fill-key" data-k="admin">Подставить ключ супер-админа</button>' +
      (left ? '<button type="button" data-act="end-mute">Снять блокировку, не дожидаясь 5 минут</button>' : '<span>Три неверных ввода подряд закрывают вход на 5 минут. Вторая блокировка за сутки создаёт уведомление супер-админу.</span>') +
      '</div></form></div>';
  }
  function watchMute() {
    clearInterval(muteTimer);
    if (!SWP.muteLeft()) return;
    muteTimer = setInterval(function () {
      var left = SWP.muteLeft(), el = $('#mute-left');
      if (!left) { clearInterval(muteTimer); ui.loginError = ''; render(); } else if (el) el.textContent = clock(left);
    }, 1000);
  }

  /* ---------- shell ---------- */
  function tabsHTML(r) {
    var s = SWP.session(), alerts = SWP.tasks(s.level).length;
    var act = r.name === 'order' ? 'queue' : r.name;
    return [['queue', '#/', 'Заказы', I.list], ['tasks', '#/tasks', 'Задачи', I.tasks], ['chats', '#/chats', 'Чаты', I.chat], ['settings', '#/settings', 'Настройки', I.gear]].map(function (t) {
      var on = act === t[0];
      var badge = t[0] === 'tasks' && alerts ? '<span class="tab-badge" aria-label="Открытых задач: ' + alerts + '">' + alerts + '</span>' : '';
      return '<a class="tab' + (on ? ' is-active' : '') + '" href="' + t[1] + '"' + (on ? ' aria-current="page"' : '') + '><span class="tab-ic">' + t[3] + badge + '</span><span class="tab-txt">' + t[2] + '</span></a>';
    }).join('');
  }
  function themeIcon() {
    var t = document.documentElement.getAttribute('data-theme');
    var dark = t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    $$('[data-act="theme"]').forEach(function (b) { b.innerHTML = dark ? I.sun : I.moon; b.setAttribute('aria-label', dark ? 'Светлая тема' : 'Тёмная тема'); });
    $$('[data-ic="out"]').forEach(function (b) { b.innerHTML = I.out; });
  }

  /* ---------- queue (A-2, AC-39, AC-93, AC-95) ---------- */
  var SORTS = [['number', 'Номер'], ['receivedAt', 'Дата и время'], ['name', 'Контрагент'], ['total', 'Стоимость'], ['delivery', 'Тип заказа'], ['status', 'Статус']];
  function queueListHTML() {
    var f = ui.filter, list = SWP.queue(f);
    if (!list.length) return '<div class="empty"><span class="empty-ic">' + I.search + '</span><h2>Заказов не найдено</h2><p>Измените поиск или сбросьте фильтры.</p><button class="btn" type="button" data-act="filter-reset">Сбросить фильтры</button></div>';
    var rows = list.map(function (o) { return { o: o, href: '#/order/' + o.number, sum: money(SWP.compute(o).total) }; });
    var head = SORTS.map(function (s) {
      var on = f.sort === s[0];
      return '<th' + (s[0] === 'total' ? ' class="num"' : '') + ' aria-sort="' + (on ? (f.dir === 'asc' ? 'ascending' : 'descending') : 'none') + '">' +
        '<button type="button" class="th-sort' + (on ? ' is-on' : '') + '" data-act="sort" data-s="' + s[0] + '" data-fk="sort-' + s[0] + '">' + s[1] + '<span class="th-arrow' + (on && f.dir === 'asc' ? ' is-asc' : '') + '">' + I.down + '</span></button></th>';
    }).join('');
    return '<p class="q-count">Найдено: ' + list.length + '</p>' +
      '<table class="q-table"><thead><tr>' + head + '</tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr data-href="' + r.href + '"><td class="q-n"><a href="' + r.href + '"><b>' + r.o.number + '</b></a>' + kindTag(r.o) + '</td><td><time>' + SWP.dateTime(r.o.receivedAt) + '</time></td><td class="q-who">' + esc(who(r.o)) + '</td>' +
          '<td class="num">' + r.sum + '</td><td>' + esc(deliveryText(r.o)) + '</td><td>' + pill(r.o) + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<ul class="q-cards">' + rows.map(function (r) {
        return '<li><a class="q-card" href="' + r.href + '"><span><span class="q-num">' + r.o.number + '</span>' + kindTag(r.o) + '</span>' + pill(r.o) +
          '<span class="q-name">' + esc(who(r.o)) + '</span><span class="q-sum">' + r.sum + '</span>' +
          '<span class="q-meta">' + SWP.dateTime(r.o.receivedAt) + ' · ' + esc(deliveryText(r.o)) + '</span></a></li>';
      }).join('') + '</ul>';
  }
  function queueHTML() {
    var f = ui.filter;
    return '<div class="pg"><div class="pg-head"><h1>Заказы</h1></div>' +
      '<div class="filters">' +
      '<div class="search">' + I.search + '<input type="search" id="q" data-fk="q" value="' + esc(f.q) + '" placeholder="Номер заказа или клиент" aria-label="Поиск по номеру заказа или клиенту" enterkeyhint="search"></div>' +
      '<div class="field"><label for="f-status">Статус</label><select id="f-status" data-filter="status" data-fk="f-status">' + options(SWP.STATUSES, f.status, 'Все статусы') + '</select></div>' +
      '<div class="field"><label for="f-delivery">Тип заказа</label><select id="f-delivery" data-filter="delivery" data-fk="f-delivery">' + options(SWP.DELIVERY, f.delivery, 'Любая доставка') + '</select></div>' +
      '<div class="field"><label for="f-from">Поступил с</label><input id="f-from" type="date" data-filter="from" data-fk="f-from" value="' + esc(f.from) + '"></div>' +
      '<div class="field"><label for="f-to">по</label><input id="f-to" type="date" data-filter="to" data-fk="f-to" value="' + esc(f.to) + '"></div>' +
      '<button class="ghost-btn" type="button" data-act="filter-reset">Сбросить</button>' +
      '</div><div id="q-list">' + queueListHTML() + '</div></div>';
  }

  /* ---------- order card: "Delivery note" tab (A-3 to A-10, A-15, A-21, A-29) ---------- */
  function stepper(n, row, dis) {
    var k = 'q-' + row.product.id;
    return '<div class="stepper sm"><button type="button" data-act="qty" data-id="' + row.product.id + '" data-d="-1" data-fk="' + k + ':m"' + (dis || row.qty <= 1 ? ' disabled' : '') + ' aria-label="Убрать 1 шт: ' + esc(row.name) + '">−</button>' +
      '<input type="text" inputmode="numeric" value="' + row.qty + '" data-qty="' + row.product.id + '" data-fk="' + k + ':i"' + (dis ? ' disabled' : '') + ' aria-label="Количество, шт: ' + esc(row.name) + '">' +
      '<button type="button" data-act="qty" data-id="' + row.product.id + '" data-d="1" data-fk="' + k + ':p"' + (dis ? ' disabled' : '') + ' aria-label="Добавить 1 шт: ' + esc(row.name) + '">+</button></div>';
  }
  function lineHTML(o, l, ro) {
    var key = o.number + ':' + l.id, open = !!ui.open[key], dis = ro ? ' disabled' : '';
    var menuOpen = ui.menu === l.id && !ro;
    // The four website tier prices sit behind one button to keep the row short (A-5).
    var menu = menuOpen ? '<div class="pmenu" role="menu" aria-label="Цены из прайса">' + l.tiers.map(function (t) {
      return '<button type="button" role="menuitem" class="pmenu-i' + (l.price === t.price ? ' is-on' : '') + '" data-act="line-tier" data-line="' + l.id + '" data-t="' + t.tier + '" data-fk="t-' + l.id + '-' + t.tier + '">' +
        '<span>от ' + t.tier + ' шт</span><b>' + SWP.price(t.price) + '</b></button>';
    }).join('') + '</div>' : '';
    // The customer's price sits right under the manual price field (A-6, A-7).
    var cust = l.customer
      ? '<button type="button" class="pchip is-cust' + (l.price === l.customer.price ? ' is-on' : '') + '" data-act="line-cust" data-line="' + l.id + '" data-fk="c-' + l.id + '"' + dis +
        ' title="Из заказа ' + l.customer.order + '">Цена клиента: ' + SWP.price(l.customer.price) + '</button>'
      : '<small class="pl-none">нет цены клиента</small>';
    var flagged = !ro && ui.red[o.number] && ui.red[o.number][l.id];
    return '<div class="pl' + (open ? ' is-open' : '') + (l.missing || flagged ? ' is-missing' : '') + '">' +
      '<div class="pl-top"><button type="button" class="ln-toggle" data-act="line-toggle" data-line="' + l.id + '" data-fk="lt-' + l.id + '" aria-expanded="' + open + '">' +
      '<span class="ln-chev">' + I.chev + '</span><span class="acc-t"><span class="acc-name">' + esc(l.name) + '</span>' +
      '<span class="acc-meta">' + l.qty + ' шт · ' + (l.missing ? 'нет цены' : money(l.sum)) + '</span></span></button>' +
      '<div class="lp"><div class="lp-row"><button type="button" class="pchip pl-btn" data-act="price-menu" data-line="' + l.id + '" data-fk="pm-' + l.id + '" aria-haspopup="menu" aria-expanded="' + menuOpen + '"' + dis + ' aria-label="Цены из прайса для линейки ' + esc(l.name) + '">Прайс' + I.down + '</button>' +
      '<input type="text" inputmode="decimal" enterkeyhint="next" value="' + (l.price === undefined ? '' : SWP.price(l.price)) + '" placeholder="' + (l.price === undefined ? 'разные' : '0') + '" data-line-price="' + l.id + '" data-fk="lp-' + l.id + '"' + dis +
      (l.missing ? ' aria-invalid="true"' : '') + ' aria-label="Цена за штуку для линейки ' + esc(l.name) + ', BYN"></div>' + cust + menu + '</div></div>' +
      (open ? '<ul class="pl-items">' + l.items.map(function (r) {
        return '<li class="pi"><span class="pi-name">' + esc(r.name) + (r.short ? ' <span class="low">на складе ' + r.product.stock + ' шт</span>' : '') + '</span>' + stepper(o.number, r, ro) +
          '<span class="pi-sum">' + (r.price == null ? '—' : money(r.sum)) + '</span>' +
          (ro ? '<span class="pi-x"></span>' : '<button type="button" class="ci-x pi-x" data-act="item-remove" data-id="' + r.product.id + '" data-fk="x-' + r.product.id + '" aria-label="Убрать из накладной: ' + esc(r.name) + '">' + I.close + '</button>') + '</li>';
      }).join('') + '</ul>' : '') + '</div>';
  }
  function deliveryHTML(o, ro) {
    var d = o.delivery, dis = ro ? ' disabled' : '';
    function field(id, label, extra) {
      return '<div class="field"><label for="d-' + id + '">' + label + '</label><input id="d-' + id + '" data-dfield="' + id + '" data-fk="d-' + id + '" value="' + esc(d[id] || '') + '"' + (extra || '') + dis + '></div>';
    }
    var fields = '';
    if (d.type === 'minibus') fields = '<div class="field"><label for="d-city">Город</label><select id="d-city" data-dfield="city" data-fk="d-city"' + dis + '>' + options(SWP.CITIES.map(function (c) { return { id: c, label: c }; }), d.city, 'Выберите город') + '</select></div>';
    if (d.type === 'minsk-minibus') fields = field('phone', 'Телефон для водителя', ' type="tel"') +
      '<p class="alert ' + (o.phoneApproved ? 'notice' : 'alert-warn') + ' wide" style="margin:0">' + (o.phoneApproved ? I.check + '<span>Телефон согласован</span>' : I.warn + '<span>Телефон ещё не согласован. Обработать заказ можно только после согласования.</span>') + '</p>';
    if (d.type === 'minsk-address') fields = field('address', 'Адрес доставки');
    if (d.type === 'post') fields = field('fullName', 'ФИО получателя') + field('postcode', 'Индекс', ' inputmode="numeric"') + field('address', 'Адрес с городом') +
      '<div class="field"><label for="tracking">Трек-код Белпочты</label><input id="tracking" data-ofield="tracking" data-fk="tracking" value="' + esc(o.tracking) + '" placeholder="PC123456789BY"' + dis +
      ' autocapitalize="characters" autocomplete="off" spellcheck="false"' + (ui.trackErr && !ro ? ' aria-invalid="true" aria-describedby="track-err"' : '') + '>' +
      (ui.trackErr && !ro ? '<p class="err" id="track-err" role="alert">Трек-код введён неверно. Нужны 2 латинские буквы, 9 цифр и BY, например PC123456789BY.</p>' : '<p class="help">2 латинские буквы, 9 цифр и BY.</p>') + '</div>';
    var addon = '';
    if (o.kind === 'addon') {
      var targets = SWP.addonTargets(o).map(function (x) { return { id: String(x.number), label: x.number + ' · ' + SWP.status(x.status).label }; });
      if (o.original && !targets.some(function (t) { return t.id === String(o.original); })) targets.unshift({ id: String(o.original), label: o.original + (SWP.order(o.original) ? ' · ' + SWP.status(SWP.order(o.original).status).label : '') });
      addon = '<div class="field wide"><label for="d-orig">Дозаказ к заказу</label><select id="d-orig" data-original data-fk="d-orig"' + dis + '>' + options(targets, String(o.original || ''), targets.length ? '' : 'Нет подходящего заказа') + '</select>' +
        '<p class="help">Подставлен автоматически: последний неотправленный заказ этого клиента.</p></div>';
    }
    return '<section class="sec s-del"><h2 class="h2">Доставка</h2><div class="grid2">' +
      '<div class="field"><label for="d-type">Тип заказа</label><select id="d-type" data-delivery data-fk="d-type"' + dis + '>' + options(SWP.DELIVERY, d.type) + '</select></div>' +
      '<div class="field"><label id="kind-l">Вид заказа</label><div class="seg seg-2" role="group" aria-labelledby="kind-l">' +
      ['main', 'addon'].map(function (k) {
        return '<button type="button" class="seg-btn' + (o.kind === k ? ' is-on' : '') + '" data-act="kind" data-k="' + k + '" data-fk="kind-' + k + '" aria-pressed="' + (o.kind === k) + '"' + dis + '>' + (k === 'main' ? 'Основной' : 'Дозаказ') + '</button>';
      }).join('') + '</div></div>' + addon + fields + '</div><p class="help">' + esc(SWP.delivery(d.type).note) + '</p></section>';
  }
  function totalsHTML(o, c) {
    var due = c.surcharge ? '<div><dt>Доплата за доставку <small>вне накладной</small></dt><dd>+' + SWP.price(c.surcharge) + ' BYN</dd></div>' : '';
    return '<dl class="totals"><div><dt>Сумма по ценам</dt><dd>' + money(c.sum) + '</dd></div>' +
      (c.deduction ? '<div class="t-save"><dt>Скидка на заказ</dt><dd>−' + money(c.deduction) + '</dd></div>' : '') +
      (c.roundDiff ? '<div><dt>Округление до 5 BYN</dt><dd>' + (c.roundDiff > 0 ? '+' : '−') + money(Math.abs(c.roundDiff)) + '</dd></div>' : '') +
      '<div class="t-sum"><dt>Итог накладной <small>' + c.units + ' шт</small></dt><dd>' + money(c.total) + '</dd></div>' + due + '</dl>';
  }
  function orderHTML(o) {
    var c = SWP.compute(o), ro = !SWP.editable(o), dis = ro ? ' disabled' : '', cust = SWP.customer(o);
    var banners = '';
    if (o.remoteChanged) banners += '<div class="alert alert-warn">' + I.warn + '<p>Другой менеджер изменил этот заказ после того, как вы его открыли. Перед обработкой панель спросит, что делать.</p></div>';
    if (o.pendingRetry) banners += '<div class="alert alert-warn">' + I.warn + '<p><b>Ожидает повтора.</b> МойСклад недоступен, запись стоит в очереди и повторится автоматически. <span class="undecided">Не решено в PRD: после скольких попыток уведомлять (7.3)</span></p></div>';
    if (o.status === 'processed') banners += '<div class="alert alert-warn">' + I.warn + '<p>Отгрузка создана, но накладная ещё не отправлена ни клиенту, ни упаковщикам.</p><button class="btn btn-sm" type="button" data-act="open-packing">Отправить накладную</button></div>';
    var orig = o.kind === 'addon' && o.original ? SWP.order(o.original) : null;
    if (o.status === 'phone') banners += '<div class="alert alert-warn">' + I.warn + '<p>Клиент указал телефон для маршрутки по Минску: <b>' + esc(o.delivery.phone || '') + '</b>. Проверьте номер и согласуйте.</p>' +
      '<button class="btn btn-primary btn-sm" type="button" data-act="phone-ok" data-fk="phone-ok">Согласовать</button><button class="btn btn-sm" type="button" data-act="phone-no" data-fk="phone-no">Отклонить</button></div>';
    if (o.status === 'details' && o.offered) banners += '<div class="alert alert-warn">' + I.warn + '<p>Клиенту предложен другой способ доставки. Он выбирает его в боте, заказ вернётся в «Принят» сам.</p></div>';
    if (orig && !ro) banners += '<div class="alert alert-warn">' + I.warn + '<p>Это дозаказ к заказу <a href="#/order/' + orig.number + '">' + orig.number + '</a> («' + esc(SWP.status(orig.status).label) + '»). ' +
      (SWP.mergeTarget(o) ? 'Основной заказ ещё не упакован: после обработки дозаказ сам объединится с ним, упаковщики получат одно новое сообщение.'
        : ['packed', 'dispatched'].indexOf(orig.status) >= 0 ? 'Основной заказ уже упакован, объединить нельзя: дозаказ уйдёт упаковщикам отдельным сообщением «Добавить к ' + orig.number + '».'
        : 'Он оформляется отдельным заказом со своей накладной.') + '</p></div>';
    if (o.merged) banners += '<div class="alert alert-warn">' + I.warn + '<p>В этот заказ добавлен дозаказ ' + o.merged + '.' + (o.status === 'processed' ? '' : ' Проверьте цены и обработайте заказ.') + '</p></div>';
    if (o.changedInMs) banners += '<div class="alert alert-warn">' + I.warn + '<p><b>Изменено в МойСклад.</b> Состав или цены заказа поменяли напрямую после обработки.</p>' +
      '<button class="btn btn-sm" type="button" data-act="resend" data-fk="resend">Отправить накладную заново</button></div>';
    if (o.status === 'dispatched') banners += '<div class="alert alert-warn">' + I.check + '<p>Заказ отправлен, клиент получил уведомление.' + (SWP.canRevertDispatch(o) ? ' Если почту отметили по ошибке, статус можно вернуть в течение суток.' : '') + '</p>' +
      (SWP.canRevertDispatch(o) ? '<button class="btn btn-sm" type="button" data-act="dispatch-revert" data-fk="dispatch-revert">Вернуть статус «Упакован»</button>' : '') + '</div>';
    if (o.status === 'packing') banners += '<div class="alert alert-warn">' + I.warn + '<p>Заказ у упаковщиков. Его можно править: после сохранения старое сообщение с накладной в группе удалится и уйдёт новое.' +
      (c.blockers.length ? ' Сейчас сохранить нельзя: ' + esc(c.blockers[0]) + '.' : '') + '</p></div>';
    if (o.status === 'packed') banners += '<div class="alert alert-warn">' + I.check + '<p>Заказ упакован. Чтобы его изменить, верните его упаковщикам.</p>' +
      '<button class="btn btn-sm" type="button" data-act="to-packing" data-fk="to-packing">Вернуть в «Передан на упаковку»</button></div>';
    if (o.status === 'payment') banners += '<div class="alert alert-warn">' + I.warn + '<p>Заказ ждёт оплаты. Клиент прислал чек: <span class="pdf">' + I.file + 'Чек об оплате.jpg</span></p>' +
      '<button class="btn btn-primary btn-sm" type="button" data-act="receipt-ok" data-fk="receipt-ok">Подтвердить чек и отправить в группу</button><button class="btn btn-sm" type="button" data-act="receipt-no" data-fk="receipt-no">Отклонить чек</button></div>';
    if (ro && ['processed', 'payment', 'dispatched'].indexOf(o.status) < 0) banners += '<div class="alert alert-warn">' + I.warn + '<p>Заказ обработан, накладная закрыта для правок.</p></div>';
    if (cust.id === 'retail') banners += '<div class="alert alert-warn">' + I.warn + '<p>Клиент ещё не подтвердил заказ в боте, поэтому контрагент «Розничный покупатель». Тег с сайта: ' + esc(o.siteTag) + '.</p></div>';

    var suggest = c.suggest && !ro ? '<div class="notice is-warn">' + I.warn + '<span>В заказе ' + c.units + ' шт, это уровень «от ' + c.suggest + '», а цены стоят по уровню «от ' + o.tier + '». Цены сами не меняются.</span>' +
      '<button class="btn btn-sm" type="button" data-act="tier-all" data-t="' + c.suggest + '" data-fk="tier-all">Поставить цены от ' + c.suggest + '</button></div>' : '';
    var found = ui.addQ ? SWP.searchProducts(ui.addQ, o) : [];
    var add = ro ? '' : '<div class="search">' + I.search + '<input type="search" id="add-q" data-fk="add-q" value="' + esc(ui.addQ) + '" placeholder="Добавить товар: вкус или линейка" aria-label="Поиск товара для добавления в накладную"></div>' +
      (ui.addQ ? (found.length ? '<ul class="add-res">' + found.map(function (p) {
        return '<li><span>' + esc(SWP.flavor(p)) + '<small>' + esc(SWP.lineName(p.folderId)) + ' · на складе ' + p.stock + ' шт</small></span><button type="button" class="add" data-act="item-add" data-id="' + p.id + '" data-fk="add-' + p.id + '" aria-label="Добавить в накладную: ' + esc(SWP.flavor(p)) + '">+</button></li>';
      }).join('') + '</ul>' : '<p class="muted small" style="margin:0">Ничего не найдено среди товаров в наличии.</p>') : '');

    var cta;
    if (o.status === 'packing') cta = '<div class="sticky-cta s-cta">' +
      '<button class="btn btn-primary btn-lg btn-block" type="button" data-act="resend-edit" data-fk="resend-edit"' + (!o.dirty || c.blockers.length || c.trackingBad ? ' disabled' : '') + '>' + (o.dirty ? 'Сохранить и отправить новую накладную' : 'Изменений нет') + '</button></div>';
    else cta = ro ? '' : '<div class="sticky-cta s-cta">' +
      (c.blockers.length ? '<ul class="blockers" id="blockers">' + c.blockers.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>' : '') +
      (c.warnings.length ? '<ul class="blockers">' + c.warnings.map(function (b) { return '<li>' + esc(b) + '. Обработка не блокируется.</li>'; }).join('') + '</ul>' : '') +
      '<button class="btn btn-primary btn-lg btn-block' + (c.trackingBad && !c.blockers.length ? ' is-off' : '') + '" type="button" data-act="process" data-fk="process"' + (c.blockers.length ? ' disabled aria-describedby="blockers"' : '') + '>Обработать · ' + money(c.total) + '</button></div>';

    // A-27: after processing a minibus order gets the "Dispatch" tab; Belposhta is dispatched from the daily task (A-31).
    var hasTabs = o.delivery.type !== 'post' && ['packing', 'packed', 'dispatched'].indexOf(o.status) >= 0;
    var tab = hasTabs && ui.tab === 'dispatch' ? 'dispatch' : 'note';
    var tabs = hasTabs ? '<div class="seg o-tabs" role="tablist">' + [['note', 'Накладная'], ['dispatch', 'Отправка']].map(function (t) {
      return '<button type="button" role="tab" class="seg-btn' + (tab === t[0] ? ' is-on' : '') + '" data-act="tab" data-t="' + t[0] + '" data-fk="tab-' + t[0] + '" aria-selected="' + (tab === t[0]) + '">' + t[1] + '</button>';
    }).join('') + '</div>' : '';
    var head = '<div class="pg o-pg"><a class="back" href="#/">' + I.chev + 'Заказы</a>' +
      '<div class="o-head"><div class="o-title"><h1>Заказ ' + o.number + '</h1>' + pill(o) + kindTag(o) + '</div>' +
      '<p class="o-who"><button type="button" class="who-btn" data-act="customer" data-fk="who">' + I.user + '<b>' + esc(who(o)) + '</b></button>' + (cust.blocked ? '<span class="tag is-bad">заблокирован</span>' : '') + (cust.person ? '<span>' + esc(cust.person) + '</span>' : '') +
      '<span class="muted">поступил ' + SWP.dateTime(o.receivedAt) + '</span></p>' +
      '<button class="btn btn-sm btn-danger o-del" type="button" data-act="delete" data-fk="delete-top">' + I.trash + 'Удалить заказ</button></div>' + banners + tabs;
    if (tab === 'dispatch') return head + dispatchHTML(o) + '</div>';
    return head +
      '<div class="o-grid">' +
      '<div class="o-main"><section class="sec s-goods"><div class="sec-row"><h2 class="h2">Товары <small class="muted">' + c.lines.length + ' лин. · ' + c.units + ' шт</small></h2>' +
      '<button class="ghost-btn" type="button" data-act="cust-all" data-fk="cust-all"' + (ro || !c.hasHistory ? ' disabled' : '') + '>Применить цены клиента</button></div>' +
      (!c.hasHistory ? '<p class="muted small" style="margin:0">У клиента нет истории цен по линейкам этого заказа.</p>' : '') + suggest +
      (c.lines.length ? '<div class="pl-list">' + c.lines.map(function (l) { return lineHTML(o, l, ro); }).join('') + '</div>' : '<p class="muted">В накладной нет товаров.</p>') + add + '</section>' +
      '<section class="sec s-sum"><h2 class="h2">Скидка и итог</h2>' +
      '<div class="ded"><label for="ded">Скидка на весь заказ, BYN</label><span class="lp"><input id="ded" type="text" inputmode="decimal" data-ofield="deduction" data-fk="ded" value="' + (o.deduction ? SWP.price(o.deduction) : '') + '" placeholder="0"' + dis + (c.rows.length && c.after < 0 ? ' aria-invalid="true"' : '') + '></span></div>' +
      (o.delivery.type === 'minsk-address' ? '<div class="ded"><label for="sur">Доплата за доставку на адрес, BYN</label><span class="lp"><input id="sur" type="text" inputmode="decimal" data-ofield="surcharge" data-fk="sur" value="' + SWP.price(c.surcharge) + '"' + dis + '></span></div>' : '') +
      totalsHTML(o, c) + '<p class="help">Скидка и округление делятся между всеми товарами пропорционально.</p></section></div>' +
      '<aside class="o-side" aria-label="Доставка и заметки">' + deliveryHTML(o, ro) +
      '<section class="sec s-notes"><h2 class="h2">Заметки</h2>' +
      '<div class="field"><label for="n-c">Заметка клиента</label><textarea id="n-c" data-ofield="customerNote" data-fk="n-c"' + dis + '>' + esc(o.customerNote) + '</textarea></div>' +
      '<div class="field"><label for="n-m">Заметка менеджера</label><textarea id="n-m" data-ofield="managerNote" data-fk="n-m"' + dis + '>' + esc(o.managerNote) + '</textarea></div>' +
      '<p class="help">Обе заметки попадут в сообщение упаковщикам.</p></section>' + actionsHTML(o) + cta + '</aside></div></div>';
  }

  /* ---------- order actions and the "Dispatch" tab (A-13, A-18, A-26, A-27) ---------- */
  function actionsHTML(o) {
    var b = [];
    if (SWP.canReturn(o)) b.push('<button class="btn btn-sm" type="button" data-act="return-edit" data-fk="return-edit">Вернуть на редактирование</button>');
    var only = !b.length;
    b.push('<button class="btn btn-sm btn-danger a-del" type="button" data-act="delete" data-fk="delete">Удалить заказ</button>'); // A-18: at any stage
    return b.length ? '<section class="sec s-acts' + (only ? ' only-del' : '') + '"><h2 class="h2">Действия</h2><div class="task-acts">' + b.join('') + '</div></section>' : '';
  }
  function dispatchHTML(o) {
    if (o.status === 'dispatched') return '<section class="sec"><h2 class="h2">Информация об отправке</h2><p class="msg-ro">' + esc(o.dispatchText || 'Отправлено без текста.') + '</p></section>';
    return '<section class="sec"><h2 class="h2">Информация об отправке</h2>' +
      (o.status === 'packing' ? '<div class="alert alert-warn" style="margin:0">' + I.warn + '<p>Заказ ещё не отмечен упакованным. Отправить можно, панель переспросит.</p></div>' : '') +
      '<div class="field"><label for="dsp">Сообщение клиенту</label><textarea class="msg" id="dsp" data-fk="dsp" placeholder="Например: маршрутка Минск–Лида, отправление в 15:30, водитель +375 29 000-00-00"></textarea></div>' +
      '<div class="task-acts">' + ui.files.map(function (f, i) { return '<span class="pdf">' + I.file + esc(f) + '<button type="button" class="chip-x" data-act="file-x" data-i="' + i + '" aria-label="Убрать файл ' + esc(f) + '">' + I.close + '</button></span>'; }).join('') +
      '<button class="btn btn-sm" type="button" data-act="file-add" data-fk="file-add"' + (ui.files.length >= 5 ? ' disabled' : '') + '>Прикрепить фото или файл</button></div>' +
      '<p class="help">До 5 файлов: фото до 10 МБ, другие файлы до 20 МБ. Файлы больше не примутся.</p>' +
      '<button class="btn btn-primary btn-lg" type="button" data-act="dispatch-send" data-fk="dispatch-send">Отправить информацию об отправке</button>' +
      '<p class="help">Клиент получит сообщение в боте, заказ станет «Отправлен», дозаказ к нему будет закрыт.</p></section>';
  }
  // One dialog for confirmations and for "what next" choices.
  function ask(n, title, text, options) { ui.dialog = { type: 'ask', n: n, title: title, text: text, options: options }; renderDialog(); }
  function askHTML(d, head) {
    return head(esc(d.title)) + '<div class="sheet-body dlg-body"><p>' + esc(d.text) + '</p></div><div class="sheet-foot ask-foot">' +
      d.options.map(function (o, i) { return '<button class="btn ' + (o.kind === 'danger' ? 'btn-danger' : o.kind === 'plain' ? '' : 'btn-primary') + '" type="button" data-act="ask-pick" data-i="' + i + '" data-fk="ask-' + i + '">' + esc(o.label) + '</button>'; }).join('') +
      '<button class="btn" type="button" data-act="dialog-close">Отмена</button></div>';
  }

  /* ---------- counterparty card (A-29) ---------- */
  function customerDialogHTML(d, o, head) {
    var c = SWP.customer(o), retail = c.id === 'retail', ro = !SWP.editable(o);
    var past = retail ? [] : SWP.customerOrders(c.id).filter(function (x) { return x.number !== o.number; });
    var others = SWP.findCustomers(d.q || '', c.id);
    return head('Контрагент') + '<div class="sheet-body dlg-body">' +
      (retail ? '<p>Заказ пока записан на «Розничный покупатель»: клиент не подтвердил его в боте. Тег с сайта: <b>' + esc(o.siteTag) + '</b>.</p>'
        : '<div class="field"><label for="c-name">Имя или тег в Telegram</label><input id="c-name" data-fk="c-name" value="' + esc(d.name != null ? d.name : c.name) + '" autocomplete="off" spellcheck="false"' + (d.error ? ' aria-invalid="true" aria-describedby="c-err"' : '') + '>' +
          (d.error ? '<p class="err" id="c-err" role="alert">' + esc(d.error) + '</p>' : '') +
          '<p class="help">Telegram ID ' + c.tgId + ' не меняется, поэтому заказы и история цен останутся у этого контрагента.</p></div>' +
          '<button class="btn btn-primary" type="button" data-act="customer-save" data-fk="c-save">Сохранить имя</button>' +
          '<div><h3 class="h3">Предыдущие заказы</h3>' + (past.length ? '<ul class="hist">' + past.map(function (x) {
            return '<li>' + (x.open ? '<a href="#/order/' + x.number + '"><b>' + x.number + '</b></a>' : '<b>' + x.number + '</b>') + '<span>' + x.date.split('-').reverse().join('.') + '</span><span>' + esc(x.status) + '</span><span class="num">' + (x.total == null ? '' : money(x.total)) + '</span></li>';
          }).join('') + '</ul>' : '<p class="muted small">Это первый заказ контрагента.</p>') + '</div>') +
      (c.blocked ? '<p class="alert alert-warn" style="margin:0">' + I.warn + '<span>Клиент заблокирован. Разблокировать можно в <a href="#/settings">настройках</a>.</span></p>' : '') +
      '<div><h3 class="h3">Записать заказ на другого контрагента</h3>' +
      (ro ? '<p class="muted small">Заказ уже обработан, сменить контрагента нельзя.</p>'
        : '<div class="search">' + I.search + '<input type="search" id="c-q" data-fk="c-q" value="' + esc(d.q || '') + '" placeholder="Тег, имя или Telegram ID" aria-label="Поиск контрагента"></div>' +
          '<ul class="add-res">' + (others.length ? others.map(function (x) {
            return '<li><span>' + esc(x.name) + '<small>' + esc(x.person) + ' · ID ' + x.tgId + '</small></span><button type="button" class="btn btn-sm" data-act="customer-pick" data-id="' + x.id + '" data-fk="pick-' + x.id + '">Выбрать</button></li>';
          }).join('') : '<li><span class="muted">Никого не найдено.</span></li>') + '</ul>') + '</div></div>';
  }

  /* ---------- chats (A-22, A-18) ---------- */
  // Quick commands: a draft that starts with "/" lists the matching commands from settings.
  function cmdsHTML() {
    if (ui.chatDraft[0] !== '/' || /\s/.test(ui.chatDraft)) return '';
    var list = SWP.findCommands(ui.chatDraft);
    return '<div class="cmds" role="listbox" aria-label="Быстрые команды">' + (list.length ? list.map(function (c) {
      return '<button type="button" role="option" class="cmd" data-act="cmd-pick" data-id="' + c.id + '"><b>/' + esc(c.cmd) + '</b><span>' + esc(c.text) + '</span></button>';
    }).join('') : '<p class="muted small">Такой команды нет. Команды настраиваются в «Настройки → Настройка чатов».</p>') + '</div>';
  }
  function pickCommand(id) {
    var c = SWP.settings().commands.filter(function (x) { return x.id === id; })[0]; if (!c) return;
    ui.chatDraft = c.text; render();
    var t = $('#ch-msg'); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); }
  }
  function chatsHTML(r) {
    var list = SWP.chatList(ui.chatQ, ui.chatFolder === 'marked'), cur = r.id && SWP.chatOf(r.id) ? r.id : null;
    var marked = SWP.chatList('', true).length;
    var items = list.length ? '<ul class="ch-list">' + list.map(function (ch) {
      var c = SWP.customerById(ch.customer), last = ch.messages[ch.messages.length - 1];
      return '<li><a class="ch-item' + (cur === c.id ? ' is-on' : '') + '" href="#/chats/' + c.id + '"><span class="ch-top"><b>' + esc(c.name) + '</b><time>' + SWP.dateTime(last.at).slice(0, 5) + ' ' + SWP.dateTime(last.at).slice(11) + '</time></span>' +
        '<span class="ch-prev">' + (last.from === 'm' ? 'Вы: ' : '') + esc(last.text) + '</span>' +
        '<span class="ch-flags">' + (ch.unread ? '<span class="pill is-act">ждёт ответа</span>' : '') + (ch.marked ? '<span class="pill is-warn">нужно проверить</span>' : '') + (c.blocked ? '<span class="pill">заблокирован</span>' : '') + '</span></a></li>';
    }).join('') + '</ul>' : '<p class="muted small">Чатов не найдено.</p>';
    var side = '<div class="ch-side"><div class="search">' + I.search + '<input type="search" id="ch-q" data-fk="ch-q" value="' + esc(ui.chatQ) + '" placeholder="Ник или тег клиента" aria-label="Поиск чата по нику или тегу"></div>' +
      '<div class="seg seg-2 ch-folders" role="group" aria-label="Папка">' + [['all', 'Все чаты'], ['marked', 'Нужно проверить' + (marked ? ' · ' + marked : '')]].map(function (f) {
        return '<button type="button" class="seg-btn' + (ui.chatFolder === f[0] ? ' is-on' : '') + '" data-act="chat-folder" data-f="' + f[0] + '" data-fk="cf-' + f[0] + '" aria-pressed="' + (ui.chatFolder === f[0]) + '">' + f[1] + '</button>';
      }).join('') + '</div>' + items + '</div>';
    var thread = '<div class="ch-thread ch-empty"><p class="muted">Выберите чат слева.</p></div>';
    if (cur) {
      var ch = SWP.chatOf(cur), c = SWP.customerById(cur);
      thread = '<div class="ch-thread"><div class="ch-head"><a class="back" href="#/chats">' + I.chev + 'Чаты</a><b>' + esc(c.name) + '</b>' + (c.person ? '<span class="muted small">' + esc(c.person) + '</span>' : '') +
        '<div class="ch-btns"><button type="button" class="ghost-btn' + (ch.marked ? ' is-on' : '') + '" data-act="chat-mark" data-fk="chat-mark" aria-pressed="' + ch.marked + '" aria-label="' + (ch.marked ? 'Убрать из папки «Нужно проверить»' : 'Отметить чат: нужно проверить') + '">' + I.flag + 'Нужно проверить</button>' +
        '<button type="button" class="ghost-btn" data-act="chat-task" data-fk="chat-task">' + I.tasks + 'Добавить задачу</button></div></div>' +
        '<ol class="ch-msgs" id="ch-msgs">' + ch.messages.map(function (m) {
          var files = (m.files || []).map(function (f) { return '<span class="pdf">' + I.file + esc(f) + '</span>'; }).join('');
          return '<li class="m m-' + m.from + '"><p>' + (m.from === 'm' && !m.cmd ? '<b class="m-pre">Сообщение от менеджера:</b>' : '') + esc(m.text) + (files ? '<span class="m-files">' + files + '</span>' : '') + '</p><small>' + (m.from === 'bot' ? 'Бот автоматически · ' : m.from === 'm' ? (m.cmd ? 'Быстрая команда · ' : 'Менеджер · ') : '') + SWP.dateTime(m.at) +
            (m.order ? ' · ' + (SWP.order(m.order) ? '<a href="#/order/' + m.order + '">заказ ' + m.order + '</a>' : 'заказ ' + m.order) : '') + '</small></li>';
        }).join('') + '</ol>' +
        (c.blocked ? '<p class="alert alert-warn" style="margin:0">' + I.warn + '<span>Клиент заблокирован, бот ему не пишет. Разблокировать можно в <a href="#/settings">настройках</a>.</span></p>'
          : '<form class="ch-form" id="ch-form">' +
            (ui.chatFiles.length ? '<div class="ch-files">' + ui.chatFiles.map(function (f, i) { return '<span class="pdf">' + I.file + esc(f) + '<button type="button" class="chip-x" data-act="chat-file-x" data-i="' + i + '" aria-label="Убрать файл ' + esc(f) + '">' + I.close + '</button></span>'; }).join('') + '</div>' : '') +
            '<div class="ch-bar"><button type="button" class="icon-btn ch-clip" data-act="chat-file" data-fk="chat-file" aria-label="Прикрепить файл или фото"' + (ui.chatFiles.length >= 5 ? ' disabled' : '') + '>' + I.clip + '</button>' +
            '<label class="sr-only" for="ch-msg">Сообщение клиенту</label><div class="ch-in">' + cmdsHTML() + '<textarea id="ch-msg" data-fk="ch-msg" rows="1" enterkeyhint="send" placeholder="Сообщение. / для команд">' + esc(ui.chatDraft) + '</textarea></div>' +
            '<button class="ch-send" type="submit" data-fk="ch-send" aria-label="Отправить сообщение">' + I.send + '</button></div>' +
            '<p class="help">Enter отправляет, Shift+Enter переносит строку. Можно приложить до 5 файлов: накладную, фото.</p></form>') + '</div>';
    }
    return '<div class="pg"><div class="pg-head"><h1>Чаты</h1></div><div class="ch' + (cur ? ' has-cur' : '') + '">' + side + thread + '</div></div>';
  }

  /* ---------- settings (A-16, A-18, A-20, A-1) ---------- */
  var SET_TABS = [['site', 'Сайт'], ['pay', 'Белпочта'], ['texts', 'Настройка чатов'], ['block', 'Блокировка'], ['report', 'Упаковщики'], ['key', 'Приватность']];
  function settingsHTML() {
    var st = SWP.settings(), admin = SWP.session().level === 'admin', tab = ui.setTab, body = '';
    var tabs = '<div class="chips"><div class="chips-in" role="tablist">' + SET_TABS.map(function (t) {
      return '<button type="button" role="tab" class="chip' + (tab === t[0] ? ' is-on' : '') + '" data-act="set-tab" data-t="' + t[0] + '" data-fk="st-' + t[0] + '" aria-selected="' + (tab === t[0]) + '">' + t[1] + '</button>';
    }).join('') + '</div></div>';
    if (tab === 'site') {
      body = '<section class="sec set"><button type="button" class="ln-toggle acc-btn' + (ui.citiesOpen ? ' is-open' : '') + '" data-act="cities-toggle" data-fk="cities-toggle" aria-expanded="' + ui.citiesOpen + '">' +
        '<span class="ln-chev">' + I.chev + '</span><span class="acc-t"><span class="acc-name">Города маршруток</span><span class="acc-meta">В списке на сайте: ' + st.cities.length + '</span></span></button>' +
        (ui.citiesOpen ? '<div class="acc-body"><form class="row-form" id="city-form"><div class="field"><label class="sr-only" for="city-new">Новый город</label><input id="city-new" data-fk="city-new" placeholder="Новый город" autocomplete="off"' + (ui.cityErr ? ' aria-invalid="true" aria-describedby="city-err"' : '') + '></div>' +
          '<button class="btn" type="submit" data-fk="city-add">Добавить</button></form>' + (ui.cityErr ? '<p class="err" id="city-err" role="alert">' + esc(ui.cityErr) + '</p>' : '') +
          '<ul class="add-res">' + st.cities.map(function (c) { return '<li><span>' + esc(c) + '</span><button type="button" class="btn btn-sm" data-act="city-x" data-c="' + esc(c) + '" data-fk="cx-' + esc(c) + '">Убрать</button></li>'; }).join('') + '</ul></div>' : '') + '</section>' +
        '<section class="sec set"><h2 class="h2">Неподтверждённые заказы</h2><div class="ded"><label for="auto-del">Удалять заказ, не подтверждённый в боте, через, часов</label><span class="lp"><input id="auto-del" type="text" inputmode="numeric" data-set="autoDelete" data-fk="auto-del" value="' + st.autoDelete + '"></span></div>' +
        '<p class="help">Вместе с заказом снимается резерв товара. По умолчанию 168 часов, это 7 дней.</p></section>';
    } else if (tab === 'pay') {
      var off = st.postOff || !st.payment.trim();
      body = '<section class="sec set"><h2 class="h2">Белпочта</h2>' +
        '<div class="' + (off ? 'alert alert-warn' : 'notice') + '" style="margin:0">' + (off ? I.warn : I.check) + '<p style="margin:0;flex:1">' +
        (!st.payment.trim() ? 'Реквизитов нет, поэтому Белпочта отключена автоматически. Бот и сайт пишут клиенту, что способ временно недоступен.' : st.postOff ? 'Белпочта отключена. Бот и сайт пишут клиенту, что способ временно недоступен.' : 'Белпочта включена, клиенты могут её выбирать.') + '</p></div>' +
        (st.payment.trim() ? '<button class="btn' + (st.postOff ? ' btn-primary' : ' btn-danger') + '" type="button" data-act="post-switch" data-fk="post-switch">' + (st.postOff ? 'Включить Белпочту' : 'Отключить Белпочту') + '</button>'
          : '<button class="btn" type="button" disabled>Включить Белпочту</button><p class="help">Сначала заполните реквизиты ниже: без них включить Белпочту нельзя.</p>') + '</section>' +
        '<section class="sec set"><h2 class="h2">Реквизиты для предоплаты</h2><p class="help">Бот отправляет этот текст клиенту вместе с накладной. Сохраняется, когда вы выходите из поля.</p>' +
        '<div class="field"><label class="sr-only" for="pay">Реквизиты</label><textarea id="pay" class="msg" data-set="payment" data-fk="pay">' + esc(st.payment) + '</textarea></div></section>' +
        '<section class="sec set"><h2 class="h2">Проверка отправок</h2><div class="ded"><label for="pc-time">Время ежедневной задачи «Проверить отправку почты»</label><span class="lp"><input id="pc-time" type="time" data-set="postCheckTime" data-fk="pc-time" value="' + esc(st.postCheckTime) + '"></span></div>' +
        '<p class="help">Задача приходит каждый день, с понедельника по воскресенье, если есть упакованные почтовые заказы.</p></section>';
    } else if (tab === 'texts') {
      var cmdErr = ui.setErr.indexOf('cmd:') === 0 ? ui.setErr.slice(4) : '', faqErr = ui.setErr.indexOf('faq:') === 0 ? ui.setErr.slice(4) : '';
      var rowErr = ui.setErr && !cmdErr && !faqErr ? '<p class="err" role="alert">' + esc(ui.setErr) + '</p>' : '';
      body = '<section class="sec set"><h2 class="h2">Быстрые команды</h2><p class="help">В чате наберите «/» и название: текст команды подставится в сообщение. Изменения сохраняются, когда вы выходите из поля.</p>' + rowErr +
        '<ul class="items">' + st.commands.map(function (c) {
          return '<li data-row="' + c.id + '"><div class="item-top"><span class="slash">/</span><input data-item="commands" data-f="cmd" data-fk="cm-' + c.id + '" value="' + esc(c.cmd) + '" aria-label="Название команды">' +
            '<button type="button" class="btn btn-sm" data-act="item-x" data-k="commands" data-id="' + c.id + '" data-fk="cmx-' + c.id + '">Удалить</button></div>' +
            '<textarea data-item="commands" data-f="text" data-fk="ct-' + c.id + '" aria-label="Текст команды /' + esc(c.cmd) + '">' + esc(c.text) + '</textarea></li>';
        }).join('') + '</ul>' +
        '<form class="item-new" id="cmd-form"><h3 class="h3">Новая команда</h3><div class="item-top"><span class="slash">/</span><input id="cmd-new" data-fk="cmd-new" placeholder="название" autocomplete="off" aria-label="Название новой команды"></div>' +
        '<textarea id="cmd-text" data-fk="cmd-text" placeholder="Текст, который получит клиент" aria-label="Текст новой команды"></textarea>' + (cmdErr ? '<p class="err" role="alert">' + esc(cmdErr) + '</p>' : '') +
        '<button class="btn" type="submit" data-fk="cmd-add">Добавить команду</button></form></section>' +
        '<section class="sec set"><h2 class="h2">Ответы на частые вопросы</h2><p class="help">Клиент видит их в боте в разделе «Частые вопросы».</p>' +
        '<ul class="items">' + st.faq.map(function (f) {
          return '<li data-row="' + f.id + '"><div class="item-top"><input data-item="faq" data-f="q" data-fk="fq-' + f.id + '" value="' + esc(f.q) + '" aria-label="Вопрос">' +
            '<button type="button" class="btn btn-sm" data-act="item-x" data-k="faq" data-id="' + f.id + '" data-fk="fx-' + f.id + '">Удалить</button></div>' +
            '<textarea data-item="faq" data-f="a" data-fk="fa-' + f.id + '" aria-label="Ответ на вопрос: ' + esc(f.q) + '">' + esc(f.a) + '</textarea></li>';
        }).join('') + '</ul>' +
        '<form class="item-new" id="faq-form"><h3 class="h3">Новый вопрос</h3><div class="item-top"><input id="faq-q" data-fk="faq-q" placeholder="Вопрос" autocomplete="off" aria-label="Новый вопрос"></div>' +
        '<textarea id="faq-a" data-fk="faq-a" placeholder="Ответ" aria-label="Ответ на новый вопрос"></textarea>' + (faqErr ? '<p class="err" role="alert">' + esc(faqErr) + '</p>' : '') +
        '<button class="btn" type="submit" data-fk="faq-add">Добавить вопрос</button></form></section>' +
        '<section class="sec set"><h2 class="h2">Предупреждения бота</h2><p class="help">Тексты, которые бот показывает при выборе доставки и дозаказа. Сохраняются, когда вы выходите из поля.</p>' +
        '<p><span class="undecided">Не решено в PRD: полный перечень текстов бота (A-16)</span></p>' +
        st.texts.map(function (t) { return '<div class="field"><label for="tx-' + t.id + '">' + esc(t.title) + '</label><textarea id="tx-' + t.id + '" data-text="' + t.id + '" data-fk="tx-' + t.id + '">' + esc(t.text) + '</textarea></div>'; }).join('') + '</section>';
    } else if (tab === 'block') {
      var blocked = SWP.findCustomers('', null).filter(function (c) { return c.blocked; });
      var found = ui.blockQ ? SWP.findCustomers(ui.blockQ, null).filter(function (c) { return !c.blocked; }) : [];
      var row = function (c, act, label, cls) {
        return '<li><span>' + esc(c.name) + '<small>' + esc(c.person) + ' · ID ' + c.tgId + '</small></span><button type="button" class="btn btn-sm' + cls + '" data-act="' + act + '" data-id="' + c.id + '" data-fk="' + act + '-' + c.id + '">' + label + '</button></li>';
      };
      body = '<section class="sec set"><h2 class="h2">Блокировка клиентов</h2><p class="help">Заблокированному клиенту бот не отвечает и не принимает от него заказы.</p>' +
        '<div class="search">' + I.search + '<input type="search" id="b-q" data-fk="b-q" value="' + esc(ui.blockQ) + '" placeholder="Кого заблокировать: тег, имя или Telegram ID" aria-label="Поиск клиента для блокировки"></div>' +
        (ui.blockQ ? '<ul class="add-res">' + (found.length ? found.map(function (c) { return row(c, 'block-add', 'Заблокировать', ' btn-danger'); }).join('') : '<li><span class="muted">Никого не найдено.</span></li>') + '</ul>' : '') +
        '<h3 class="h3">Заблокированы: ' + blocked.length + '</h3>' +
        (blocked.length ? '<ul class="add-res">' + blocked.map(function (c) { return row(c, 'block-off', 'Разблокировать', ''); }).join('') + '</ul>' : '<p class="muted small" style="margin:0">Заблокированных клиентов нет.</p>') + '</section>';
    } else if (tab === 'report') {
      var rep = SWP.packerReport();
      body = '<section class="sec set"><h2 class="h2">Выгрузка по упаковщикам</h2><p class="help">Сколько заказов каждый упаковщик упаковал, переупаковал и разобрал за период.</p>' +
        '<div class="grid2"><div class="field"><label for="rp-from">С</label><input id="rp-from" type="date" data-rep="from" data-fk="rp-from" value="' + esc(ui.rep.from) + '"></div>' +
        '<div class="field"><label for="rp-to">По</label><input id="rp-to" type="date" data-rep="to" data-fk="rp-to" value="' + esc(ui.rep.to) + '"></div></div>' +
        '<table class="pc rp"><thead><tr><th>Упаковщик</th><th class="num">Упаковано</th><th class="num">Переупаковано</th><th class="num">Разобрано</th></tr></thead><tbody>' +
        rep.map(function (p) { return '<tr><td>' + esc(p.user) + '</td><td class="num">' + p.packed + '</td><td class="num">' + p.repacked + '</td><td class="num">' + p.dismantled + '</td></tr>'; }).join('') + '</tbody></table>' +
        '<button class="btn btn-primary" type="button" data-act="report-dl" data-fk="report-dl"' + (ui.rep.from && ui.rep.to && ui.rep.from <= ui.rep.to ? '' : ' disabled') + '>' + I.file + 'Скачать Excel</button></section>';
    } else {
      body = '<section class="sec set"><h2 class="h2">Ключ обычного менеджера</h2>' + (admin
        ? '<p class="help">Новый ключ создаёт система, свой ключ ввести нельзя. Старый ключ сразу перестаёт работать, все менеджеры входят заново.</p>' +
          (ui.newKey ? '<div class="notice">' + I.check + '<span>Новый ключ создан. Передайте его менеджерам, он показывается только сейчас.</span></div><p class="key-show" id="new-key">' + esc(ui.newKey) + '</p>' +
            '<button class="btn" type="button" data-act="key-copy" data-fk="key-copy">Скопировать ключ</button>' : '<button class="btn btn-danger" type="button" data-act="key-new" data-fk="key-new">Создать новый ключ</button>') +
          '<p><span class="undecided">Не решено в PRD: что ещё доступно только супер-админу (O-14)</span></p>'
        : '<div class="alert alert-warn" style="margin:0">' + I.warn + '<p>Менять ключ может только супер-админ.</p></div>') + '</section>';
    }
    return '<div class="pg"><div class="pg-head"><h1>Настройки</h1></div>' + tabs + body + '</div>';
  }

  /* ---------- tasks (A-24, A-28, A-31) ---------- */
  function ago(iso) {
    var h = Math.max(0, Math.round((new Date(SWP_DATA.now) - new Date(iso)) / 3600000));
    return h < 1 ? 'меньше часа' : h < 24 ? h + ' ч' : Math.floor(h / 24) + ' дн';
  }
  function postCheckHTML() {
    var list = SWP.postList();
    var head = '<div class="task-h"><h2 class="h2">Проверить отправку почты</h2><p class="muted small">Каждый день в ' + esc(SWP.settings().postCheckTime) + ' · упаковано почтовых заказов: ' + list.length + '</p></div>';
    if (!ui.postOpen) {
      return '<section class="task is-main">' + head + '<div class="task-acts">' +
        '<button class="btn btn-primary" type="button" data-act="post-open" data-fk="post-open">Подтвердить отправки</button>' +
        '<button class="btn" type="button" data-act="post-none" data-fk="post-none">Отправок сегодня не было</button></div></section>';
    }
    return '<section class="task is-main">' + head +
      '<p class="help">Сверьте трек-коды с квитанциями почты и подтвердите те посылки, которые ушли. Клиент получит уведомление об отправке через 10 секунд, за это время нажатие можно отменить.</p>' +
      '<table class="pc"><thead><tr><th>Трек-код</th><th>ФИО получателя</th><th><span class="sr-only">Действие</span></th></tr></thead><tbody>' + list.map(function (o) {
        return '<tr><td class="pc-track">' + esc(o.tracking) + '</td><td><a href="#/order/' + o.number + '">' + esc(o.delivery.fullName || SWP.customer(o).name) + '</a><small>заказ ' + o.number + ' · ' + esc(SWP.customer(o).name) + '</small></td>' +
          '<td><button class="btn btn-sm" type="button" data-act="post-confirm" data-n="' + o.number + '" data-fk="pc-' + o.number + '">Подтвердить</button></td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="task-acts"><button class="btn" type="button" data-act="post-done" data-fk="post-done">Закончить на сегодня</button><span class="muted small">Неподтверждённые посылки перейдут в завтрашнюю задачу.</span></div></section>';
  }
  function taskBtns(t) {
    var chat = t.cid ? '<a class="btn btn-sm" href="#/chats/' + t.cid + '">Открыть чат</a>' : '';
    if (t.type === 'refund') {
      if (t.stage === 'new') return '<button class="btn btn-primary btn-sm" type="button" data-act="refund-ask" data-id="' + t.rid + '" data-fk="ra-' + t.rid + '">Запросить реквизиты у клиента</button>';
      var f = ui.refundFile[t.rid];
      return chat + (f ? '<span class="pdf">' + I.file + esc(f) + '<button type="button" class="chip-x" data-act="refund-file-x" data-id="' + t.rid + '" aria-label="Убрать чек">' + I.close + '</button></span>'
        : '<button class="btn btn-sm" type="button" data-act="refund-file" data-id="' + t.rid + '" data-fk="rfl-' + t.rid + '">' + I.clip + 'Приложить чек</button>') +
        '<button class="btn btn-primary btn-sm" type="button" data-act="refund-paid" data-id="' + t.rid + '" data-fk="rp-' + t.rid + '">Возврат оплачен</button>';
    }
    if (t.type === 'custom') return chat + '<button class="btn btn-primary btn-sm" type="button" data-act="custom-done" data-id="' + t.uid + '" data-fk="cd-' + t.uid + '">Готово</button>';
    return t.n ? '<a class="btn btn-sm" href="#/order/' + t.n + '">Открыть заказ</a>' : chat;
  }
  function taskDialogHTML(d, head) { // a manager's own task tied to a chat
    return head('Новая задача по чату') + '<form class="sheet-body dlg-body" id="task-form"><p class="muted small">Клиент: ' + esc(SWP.customerById(d.cid).name) + '. Задача появится в разделе «Задачи» у всех менеджеров.</p>' +
      '<div class="field"><label for="task-text">Что нужно сделать</label><textarea id="task-text" data-fk="task-text" placeholder="Например: перезвонить клиенту после 15:00"' + (d.error ? ' aria-invalid="true"' : '') + '></textarea>' +
      (d.error ? '<p class="err" role="alert">' + esc(d.error) + '</p>' : '') + '</div></form>' +
      '<div class="sheet-foot dlg-foot"><button class="btn btn-primary" type="submit" form="task-form" data-fk="task-save">Добавить задачу</button><button class="btn" type="button" data-act="dialog-close">Отмена</button></div>';
  }
  function tasksHTML() {
    var list = SWP.tasks(SWP.session().level);
    var post = list.filter(function (t) { return t.type === 'post-check'; }).length ? postCheckHTML() : '';
    var rest = list.filter(function (t) { return t.type !== 'post-check'; }).sort(function (a, b) { var d = a.when < b.when ? -1 : a.when > b.when ? 1 : 0; return ui.taskSort === 'new' ? -d : d; });
    var sort = rest.length > 1 ? '<div class="seg seg-2 task-sort" role="group" aria-label="Порядок задач">' + [['old', 'Сначала старые'], ['new', 'Сначала новые']].map(function (x) {
      return '<button type="button" class="seg-btn' + (ui.taskSort === x[0] ? ' is-on' : '') + '" data-act="task-sort" data-s="' + x[0] + '" data-fk="ts-' + x[0] + '" aria-pressed="' + (ui.taskSort === x[0]) + '">' + x[1] + '</button>';
    }).join('') + '</div>' : '';
    return '<div class="pg"><div class="pg-head"><h1>Задачи</h1></div>' + post + sort +
      (rest.length ? '<ul class="tasks">' + rest.map(function (t) {
        var meta = t.n ? 'Заказ ' + t.n + ' · ' + esc(t.who) + ' · ждёт ' + ago(t.since) : t.cid || t.rid ? esc(t.who) + ' · ждёт ' + ago(t.since) : SWP.dateTime(new Date(t.at).toISOString());
        return '<li class="task"><div class="task-h"><b>' + esc(t.title) + '</b><span class="muted small">' + meta + '</span><span class="muted small">' + esc(t.text) + '</span></div>' +
          '<div class="task-acts">' + taskBtns(t) + '</div>' + '</li>';
      }).join('') + '</ul>' : '') +
      (!list.length ? '<div class="empty"><span class="empty-ic">' + I.check + '</span><h2>Задач нет</h2><p>Здесь появится всё, что требует вашего действия: чеки, телефоны, проверка почты.</p></div>' : '') +
      '<p class="muted small">Запросы клиентов на отмену посылок тоже будут приходить сюда; в макете они ещё не готовы.</p></div>';
  }

  /* ---------- dialogs: conflict, preview (A-11), packing message (A-12) ---------- */
  function dialogHTML() {
    var d = ui.dialog, o = d.n ? SWP.order(d.n) : null, c = o ? SWP.compute(o) : null;
    var head = function (t) { return '<div class="dlg-head"><h2 id="dialog-title">' + t + '</h2><button class="icon-btn" type="button" data-act="dialog-close" aria-label="Закрыть">' + I.close + '</button></div>'; };
    if (d.type === 'ask') return askHTML(d, head);
    if (d.type === 'task') return taskDialogHTML(d, head);
    if (d.type === 'customer') return customerDialogHTML(d, o, head);
    if (d.type === 'conflict') {
      return head('Заказ изменён') + '<div class="sheet-body dlg-body"><p>Другой менеджер изменил или обработал заказ ' + o.number + ' после того, как вы его открыли. Если продолжить, ваши цены заменят его правки.</p></div>' +
        '<div class="sheet-foot dlg-foot"><button class="btn btn-primary" type="button" data-act="conflict-reload">Загрузить свежую версию</button><button class="btn btn-danger" type="button" data-act="conflict-keep">Продолжить со своими правками</button></div>';
    }
    if (d.type === 'preview') {
      var rows = c.lines.map(function (l) {
        return '<tr><th colspan="2">' + esc(l.name) + '</th></tr>' + l.items.map(function (r) {
          return '<tr><td>' + esc(r.name) + '<br><small>' + r.qty + ' шт × ' + SWP.price(r.finalPrice) + '</small></td><td>' + money(r.finalSum) + '</td></tr>';
        }).join('');
      }).join('');
      var notes = [o.customerNote && 'Клиент: ' + o.customerNote, o.managerNote && 'Менеджер: ' + o.managerNote].filter(Boolean);
      return head('Проверьте накладную ' + o.number) + '<div class="sheet-body dlg-body">' +
        (d.error ? '<div class="alert alert-err" role="alert">' + I.warn + '<div><b>Не получилось</b><p>' + esc(d.error) + '</p></div></div>' : '') +
        '<p class="muted small">' + esc(who(o)) + ' · ' + esc(deliveryText(o)) + '. В МойСклад пока ничего не записано. При записи цены и состав попадут в заказ, а отгрузка создастся по нему автоматически.</p>' +
        '<table class="pv"><tbody>' + rows + '</tbody></table>' + totalsHTML(o, c) +
        (notes.length ? '<p class="small">' + notes.map(esc).join('<br>') + '</p>' : '') +
        (c.warnings.length ? '<ul class="blockers">' + c.warnings.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' : '') + '</div>' +
        '<div class="sheet-foot dlg-foot"><button class="btn btn-primary" type="button" data-act="write" data-fk="write">' + (d.error ? 'Повторить запись' : 'Записать в МойСклад') + '</button><button class="btn" type="button" data-act="dialog-close">Вернуться к правке</button></div>';
    }
    var post = o.delivery.type === 'post';
    return head('Сообщение упаковщикам') + '<div class="sheet-body dlg-body">' +
      '<div class="notice">' + I.check + '<span>Отгрузка создана. Накладная пока никому не отправлена.</span></div>' +
      '<span class="pdf">' + I.file + 'Накладная ' + o.number + '.pdf</span>' +
      '<label class="sr-only" for="msg">Текст сообщения в группу упаковщиков</label><textarea class="msg" id="msg" data-fk="msg">' + esc(d.text) + '</textarea>' +
      '<p class="help">' + (post ? 'Клиент получит накладную и реквизиты сразу. В группу упаковщиков это сообщение уйдёт, когда вы нажмёте «Подтвердить чек и отправить в группу» в карточке заказа.' : 'Одна кнопка отправляет накладную клиенту в бот и это сообщение с накладной в группу упаковщиков.') + ' Текст для группы можно поправить.</p></div>' +
      '<div class="sheet-foot dlg-foot"><button class="btn btn-primary" type="button" data-act="send" data-fk="send">' + (post ? 'Отправить клиенту' : 'Отправить клиенту и в группу') + '</button><button class="btn" type="button" data-act="dialog-close">Позже</button></div>';
  }
  function renderDialog() {
    var sheet = $('#sheet');
    if (ui.dialog && ui.dialog.n && !SWP.order(ui.dialog.n)) ui.dialog = null; // its order was merged or deleted meanwhile
    if (!ui.dialog) { sheet.classList.remove('is-open'); sheet.hidden = true; document.body.classList.remove('no-scroll'); return; }
    var was = sheet.hidden;
    patch($('#sheet-in'), dialogHTML());
    sheet.hidden = false; document.body.classList.add('no-scroll');
    if (was) { void sheet.offsetWidth; sheet.classList.add('is-open'); var f = $('#sheet-in [data-fk]'); if (f) f.focus(); }
  }
  function closeDialog() { ui.dialog = null; renderDialog(); }

  /* ---------- toast ---------- */
  var snackTimer = null;
  function toast(text, undo, ms, label) { // undo: true for a removed item, or a function to call
    var w = $('#snack');
    w.innerHTML = '<div class="snack">' + I.check + '<span>' + esc(text) + '</span>' + (undo ? '<button type="button" class="snack-undo" data-act="undo">' + (label || 'Вернуть') + '</button>' : '') +
      '<button type="button" class="snack-x" data-act="snack-close" aria-label="Закрыть">' + I.close + '</button></div>';
    requestAnimationFrame(function () { var s = $('.snack', w); if (s) s.classList.add('is-in'); });
    if (typeof undo === 'function') ui.undo = undo;
    clearTimeout(snackTimer); snackTimer = setTimeout(function () { w.innerHTML = ''; ui.undo = null; }, ms || 5000);
  }

  /* ---------- demo scenarios (PRD 7.2, 7.3) ---------- */
  function demoHTML() {
    if (!SWP.session()) return '';
    if (!ui.demoOpen) return '<button type="button" class="demo-pill" data-act="demo-toggle" aria-expanded="false">' + I.flask + 'Демо</button>';
    var f = SWP.flags, item = function (id, title, text) { return '<button type="button" data-act="demo" data-d="' + id + '"><b>' + title + '</b><small>' + text + '</small></button>'; };
    return '<div class="demo-card"><div class="demo-h"><span>' + I.flask + 'Демо</span><button class="icon-btn" type="button" data-act="demo-toggle" aria-label="Закрыть демо">' + I.close + '</button></div>' +
      item('no-price', 'Линейка без цены', '«Обработать» выключена, линейка подсвечена') +
      item('deduction', 'Скидка больше суммы', 'Отрицательный итог сохранить нельзя') +
      item('stock', 'Товара не хватает', f.strictStock ? 'Сейчас блокирует обработку' : 'Сейчас только предупреждает') +
      item('fail', 'Сбой создания отгрузки', f.failShipment ? 'Включено для следующей записи' : 'Ошибка при следующей записи в МойСклад') +
      item('down', 'МойСклад недоступен', f.moyskladDown ? 'Включено: запись встаёт в очередь' : 'Запись встаёт в очередь на повтор') +
      item('conflict', 'Заказ изменил другой менеджер', 'Предупреждение перед обработкой') +
      item('expire', 'Сессия истекла', 'Через 12 часов панель снова просит ключ') +
      item('ms', 'Изменён в МойСклад', 'Обработанный заказ поменяли напрямую в МойСклад') +
      item('nine', 'Наступило 21:00', 'Снова создать задачу проверки почты') +
      item('reset', 'Сбросить данные', 'Вернуть заказы к исходному виду') + '</div>';
  }
  function demoOrder() { // scenarios run on the open editable order, otherwise on 1124
    var r = route(), o = r.n && SWP.order(r.n);
    return o && SWP.editable(o) && o.status === 'accepted' ? o : SWP.order(1124);
  }
  function runDemo(id) {
    ui.demoOpen = false;
    if (id === 'reset') { SWP.reset(); ui.open = {}; ui.addQ = ''; toast('Данные макета сброшены'); return go('#/'); }
    if (id === 'expire') return SWP.expireSession();
    if (id === 'ms') { SWP.setChangedInMs(1118, true); return go('#/order/1118'); }
    if (id === 'nine') { ui.postOpen = false; SWP.openPostCheck(); return go('#/tasks'); }
    if (id === 'fail') { SWP.setFlag('failShipment', !SWP.flags.failShipment); return; }
    if (id === 'down') { SWP.setFlag('moyskladDown', !SWP.flags.moyskladDown); return; }
    var o = demoOrder();
    if (!o || !SWP.editable(o)) { toast('Сначала сбросьте данные: заказ 1124 уже обработан'); return render(); }
    var c = SWP.compute(o);
    if (id === 'no-price') SWP.setLinePrice(o.number, c.lines[0].id, '');
    if (id === 'deduction') SWP.patchOrder(o.number, { deduction: c.sum + 10 });
    if (id === 'conflict') SWP.markRemoteChange(o.number);
    if (id === 'stock') {
      if (!c.rows.some(function (r) { return r.short; })) { var row = c.rows[0]; ui.open[o.number + ':' + row.product.folderId] = true; SWP.setQty(o.number, row.product.id, row.product.stock + 5); }
      else SWP.setFlag('strictStock', !SWP.flags.strictStock);
    }
    go('#/order/' + o.number);
  }

  /* ---------- render ---------- */
  function render() {
    var s = SWP.session(), main = $('#main');
    document.body.classList.toggle('is-login', !s);
    if (!s) { ui.dialog = null; renderDialog(); patch(main, loginHTML()); patch($('#demo'), ''); watchMute(); var k = $('#key'); if (k && !k.disabled && document.activeElement !== k) k.focus(); return; }
    var r = route();
    $$('[data-tabs]').forEach(function (el) { el.innerHTML = tabsHTML(r); });
    $$('[data-level]').forEach(function (el) { el.textContent = s.level === 'admin' ? 'супер-админ' : 'менеджер'; });
    var html = r.name === 'order' ? orderHTML(SWP.order(r.n))
      : r.name === 'tasks' ? tasksHTML()
      : r.name === 'chats' ? chatsHTML(r)
      : r.name === 'settings' ? settingsHTML()
      : queueHTML();
    patch(main, html);
    patch($('#demo'), demoHTML());
    themeIcon(); renderDialog();
  }

  /* ---------- actions ---------- */
  function focusPrice(lineId) { // put the caret on a line price with its value selected, ready to be overtyped
    var el = lineId ? $('[data-line-price="' + lineId + '"]') : null;
    if (el && !el.disabled) { el.focus(); el.select(); }
    return el;
  }
  function undoPrice(n) { if (SWP.undoPrice(n)) toast('Предыдущая цена возвращена'); }
  function changeOriginal(n, num) { // A-21: the original of an add-on can be changed, with a warning
    var o = SWP.order(n);
    if (String(o.original || '') === String(num)) return;
    ui.dialog = { type: 'ask', n: n, title: 'Изменить заказ для дозаказа?', text: 'Система подставила заказ ' + (o.original || '') + ' автоматически. Если выбрать другой, дозаказ может быть оформлен неправильно: попасть не в ту посылку или не тому получателю.',
      options: [{ label: 'Привязать к заказу ' + num, kind: 'danger', run: function () { SWP.setOriginal(n, num); toast('Дозаказ привязан к заказу ' + num); } }] };
    render();
  }
  function scrollChat() { var m = $('#ch-msgs'); if (m) m.scrollTop = m.scrollHeight; }
  function unflag(n, lineId) { if (ui.red[n]) delete ui.red[n][lineId]; } // the manager priced the line, the red mark goes away
  function startProcess(n) { ui.dialog = { type: 'preview', n: n }; renderDialog(); }
  var ACT = {
    theme: function () {
      var cur = document.documentElement.getAttribute('data-theme'), dark = cur ? cur === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches, next = dark ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next); try { localStorage.setItem('sw-final-theme', JSON.stringify(next)); } catch (e) {} themeIcon();
    },
    signout: function () { SWP.signOut(); },
    'fill-key': function (b) { var k = $('#key'); if (k && !k.disabled) { k.value = SWP.KEYS[b.getAttribute('data-k')]; k.focus(); } },
    'end-mute': function () { ui.loginError = ''; SWP.endMute(); },
    'toggle-key': function (b) { // toggled in place so the typed key is kept
      ui.showKey = !ui.showKey;
      var k = $('#key'); k.type = ui.showKey ? 'text' : 'password';
      b.innerHTML = ui.showKey ? I.eyeOff : I.eye; b.setAttribute('aria-pressed', ui.showKey); b.setAttribute('aria-label', ui.showKey ? 'Скрыть ключ' : 'Показать ключ');
    },
    'filter-reset': function () { ui.filter = { q: '', status: '', delivery: '', from: '', to: '', sort: ui.filter.sort, dir: ui.filter.dir }; render(); },
    sort: function (b) {
      var k = b.getAttribute('data-s'), f = ui.filter;
      if (f.sort === k) f.dir = f.dir === 'asc' ? 'desc' : 'asc';
      else { f.sort = k; f.dir = ['name', 'delivery', 'status'].indexOf(k) >= 0 ? 'asc' : 'desc'; }
      render();
    },
    customer: function (b, n) { ui.dialog = { type: 'customer', n: n }; renderDialog(); },
    'customer-save': function () {
      var d = ui.dialog, o = SWP.order(d.n), res = SWP.renameCustomer(o.customer, $('#c-name').value);
      if (res.error) { d.error = res.error; d.name = $('#c-name').value; return renderDialog(); }
      ui.dialog = null; render(); toast('Имя контрагента изменено, заказы и цены сохранены');
    },
    'customer-pick': function (b) {
      var d = ui.dialog, c = SWP.customerById(b.getAttribute('data-id'));
      SWP.setOrderCustomer(d.n, c.id); ui.dialog = null; render(); toast('Заказ ' + d.n + ' записан на ' + c.name);
    },
    'line-toggle': function (b, n) { var k = n + ':' + b.getAttribute('data-line'); ui.open[k] = !ui.open[k]; render(); },
    'price-menu': function (b) { var id = b.getAttribute('data-line'); ui.menu = ui.menu === id ? null : id; render(); },
    'line-tier': function (b, n) { var id = b.getAttribute('data-line'); unflag(n, id); ui.menu = null; SWP.applyTier(n, +b.getAttribute('data-t'), id); render(); focusPrice(id); },
    'line-cust': function (b, n) { SWP.applyCustomerPrice(n, b.getAttribute('data-line')); },
    'cust-all': function (b, n) {
      var none = {}, cnt = 0;
      SWP.compute(SWP.order(n)).lines.forEach(function (l) { if (!l.customer) { none[l.id] = true; cnt++; } });
      ui.red[n] = none; SWP.applyCustomerPrice(n); render();
      toast(cnt ? 'Цены клиента применены. Красным подсвечены линейки без цены клиента: ' + cnt : 'Цены клиента применены ко всем линейкам');
    },
    'tier-all': function (b, n) { SWP.applyTier(n, +b.getAttribute('data-t')); },
    kind: function (b, n) { SWP.setKind(n, b.getAttribute('data-k')); },
    qty: function (b, n) {
      var id = b.getAttribute('data-id'), o = SWP.order(n), it = o.items.filter(function (x) { return x.id === id; })[0];
      if (it) SWP.setQty(n, id, Math.max(1, it.qty + +b.getAttribute('data-d')));
    },
    'item-remove': function (b, n) {
      var id = b.getAttribute('data-id'), o = SWP.order(n), it = o.items.filter(function (x) { return x.id === id; })[0];
      if (!it) return;
      ui.undo = { n: n, item: JSON.parse(JSON.stringify(it)) };
      SWP.setQty(n, id, 0); toast('Убрано из накладной: ' + SWP.flavor(SWP.product(id)), true);
    },
    undo: function () {
      var u = ui.undo; if (!u) return;
      ui.undo = null; $('#snack').innerHTML = '';
      if (typeof u === 'function') u(); else SWP.restoreItem(u.n, u.item);
    },
    'snack-close': function () { $('#snack').innerHTML = ''; },
    'item-add': function (b, n) { var p = SWP.product(b.getAttribute('data-id')); ui.open[n + ':' + p.folderId] = true; SWP.addItem(n, p.id); toast('Добавлено: ' + SWP.flavor(p)); },
    process: function (b, n) {
      if (SWP.compute(SWP.order(n)).trackingBad) { // send the manager back to the tracking code
        ui.trackErr = true; render();
        var t = $('#tracking'); if (t) { t.scrollIntoView({ block: 'center' }); t.focus(); t.select(); }
        return;
      }
      if (SWP.order(n).remoteChanged) { ui.dialog = { type: 'conflict', n: n }; renderDialog(); } else startProcess(n);
    },
    'conflict-reload': function () { var n = ui.dialog.n; SWP.clearRemoteChange(n); closeDialog(); toast('Загружена свежая версия заказа'); },
    'conflict-keep': function () { var n = ui.dialog.n; SWP.clearRemoteChange(n); startProcess(n); },
    write: function () {
      var d = ui.dialog, res = SWP.writeToMoySklad(d.n);
      if (res.error) { d.error = res.error; return renderDialog(); }
      if (res.queued) { closeDialog(); return toast('МойСклад недоступен: запись поставлена в очередь'); }
      if (res.merged) { // the add-on was merged into its unpacked original (BR-5)
        ui.dialog = null; ui.nextDialog = res.shipped ? { type: 'packing', n: res.merged, text: SWP.order(res.merged).packingDraft } : null; // opened after navigation
        toast('Дозаказ ' + d.n + ' объединён с заказом ' + res.merged + (res.shipped ? '. Отправьте общую накладную' : '. Обработайте заказ ' + res.merged));
        return go('#/order/' + res.merged);
      }
      ui.dialog = { type: 'packing', n: d.n, text: SWP.order(d.n).packingDraft }; render();
    },
    'receipt-ok': function (b, n) { if (SWP.approveReceipt(n)) toast('Чек подтверждён. Заказ ' + n + ' отправлен в группу упаковщиков'); },
    tab: function (b) { ui.tab = b.getAttribute('data-t'); render(); },
    'ask-pick': function (b) { var o = ui.dialog.options[+b.getAttribute('data-i')]; ui.dialog = null; renderDialog(); o.run(); },
    'phone-ok': function (b, n) { SWP.approvePhone(n); toast('Телефон согласован, заказ ' + n + ' можно обрабатывать'); },
    'phone-no': function (b, n) {
      ask(n, 'Телефон не подходит', 'Что предложить клиенту вместо маршрутки по Минску? Он выберет способ доставки в боте заново.', [
        { label: 'Предложить доставку на адрес', run: function () { SWP.offerOtherDelivery(n, 'minsk-address'); toast('Клиенту предложена доставка на адрес'); } },
        { label: 'Предложить Белпочту', kind: 'plain', run: function () { SWP.offerOtherDelivery(n, 'post'); toast('Клиенту предложена Белпочта'); } },
        { label: 'Заблокировать клиента', kind: 'danger', run: function () { SWP.setBlocked(SWP.order(n).customer, true); toast('Клиент заблокирован. Заказ остался в очереди, решите, удалять ли его'); } }
      ]);
    },
    'receipt-no': function (b, n) {
      ask(n, 'Чек не подходит', 'Клиент получит сообщение в боте. Возврат денег, если он нужен, оформляется вручную.', [
        { label: 'Попросить новый чек', run: function () { toast('Клиента попросили прислать новый чек. Заказ ждёт оплаты'); } },
        { label: 'Перевести на маршрутку', kind: 'plain', run: function () { SWP.receiptToMinibus(n); toast('Заказ ' + n + ' переведён на маршрутку. Выберите город и обработайте заново'); } }
      ]);
    },
    'return-edit': function (b, n) {
      ask(n, 'Вернуть на редактирование?', 'Отгрузка в МойСклад и сообщение в группе упаковщиков удалятся, заказ вернётся в «Принят». После повторной обработки клиент получит новую накладную.', [
        { label: 'Вернуть на редактирование', run: function () { if (SWP.returnForEditing(n)) toast('Заказ ' + n + ' возвращён на редактирование'); } }
      ]);
    },
    'delete': function (b, n) { // A-18: allowed at every stage; what happens depends on the stage
      var o = SWP.order(n), st = o.status, text, done = 'Заказ ' + n + ' удалён. Из МойСклад он уйдёт через 10 секунд';
      if (['processed', 'payment', 'packing'].indexOf(st) >= 0) text = 'Отгрузка и заказ в МойСклад удалятся, товар вернётся на остаток. Сообщение с накладной в группе упаковщиков удалится.';
      else if (st === 'packed') { text = 'Заказ уже упакован. Упаковщики получат «Разобрать» в ответ на сообщение заказа, отгрузка и заказ в МойСклад удалятся, товар вернётся на остаток.'; done = 'Заказ ' + n + ' удалён. Через 10 секунд упаковщики получат «Разобрать»'; }
      else if (st === 'dispatched' || st === 'delivered') text = 'Заказ уже отправлен клиенту. Отгрузка и заказ в МойСклад удалятся, и товар вернётся на остаток, поэтому удаляйте только если посылка вернулась на склад.';
      else text = 'Заказ удалится из панели и из МойСклад, резерв товара снимется.';
      if (o.delivery.type === 'post' && ['packing', 'packed', 'dispatched', 'delivered'].indexOf(st) >= 0) text += ' Заказ оплачен: появится задача вернуть клиенту деньги.';
      ask(n, 'Удалить заказ ' + n + '?', text + ' В течение 10 секунд удаление можно отменить.', [
        { label: 'Удалить заказ', kind: 'danger', run: function () {
          var gone = SWP.removeOrder(n); go('#/');
          toast(done, function () { SWP.restoreOrder(gone); toast('Заказ ' + n + ' возвращён'); }, 10000, 'Вернуть');
        } }
      ]);
    },
    resend: function (b, n) {
      ask(n, 'Отправить накладную заново?', 'Старое сообщение с накладной в группе упаковщиков удалится, вместо него уйдёт новое. Отгрузка в МойСклад обновится по заказу.', [
        { label: 'Отправить заново', run: function () { SWP.setChangedInMs(n, false); toast('Новая накладная по заказу ' + n + ' отправлена в группу'); } }
      ]);
    },
    'chat-file': function () { var names = ['Накладная 1124.pdf', 'Фото посылки.jpg', 'Квитанция.jpg', 'Прайс.pdf', 'Фото 2.jpg']; ui.chatDraft = $('#ch-msg').value; ui.chatFiles.push(names[ui.chatFiles.length]); render(); $('#ch-msg').focus(); },
    'chat-file-x': function (b) { ui.chatDraft = $('#ch-msg').value; ui.chatFiles.splice(+b.getAttribute('data-i'), 1); render(); },
    'chat-folder': function (b) { ui.chatFolder = b.getAttribute('data-f'); render(); },
    'chat-mark': function () { SWP.toggleMark(route().id); },
    'set-tab': function (b) { ui.setTab = b.getAttribute('data-t'); ui.cityErr = ''; ui.setErr = ''; ui.newKey = ''; render(); },
    'city-x': function (b) {
      var c = b.getAttribute('data-c'), used = SWP.cityInUse(c);
      ask(null, 'Убрать город ' + c + '?', 'Клиенты больше не смогут выбрать его на сайте.' + (used ? ' Сейчас в работе заказов в этот город: ' + used + ', они останутся как есть.' : ''), [
        { label: 'Убрать город', kind: 'danger', run: function () { SWP.removeCity(c); toast('Город ' + c + ' убран из списка на сайте'); } }
      ]);
    },
    'key-new': function () {
      ask(null, 'Создать новый ключ менеджера?', 'Старый ключ сразу перестанет работать. Все менеджеры будут вынуждены войти заново с новым ключом.', [
        { label: 'Создать новый ключ', kind: 'danger', run: function () { ui.newKey = SWP.newManagerKey(); render(); } }
      ]);
    },
    'key-copy': function () { try { navigator.clipboard.writeText(ui.newKey); } catch (e) {} toast('Ключ скопирован'); },
    'report-dl': function () { toast('Файл «Упаковщики ' + ui.rep.from.split('-').reverse().join('.') + '–' + ui.rep.to.split('-').reverse().join('.') + '.xlsx» скачан'); },
    'block-add': function (b) {
      var c = SWP.customerById(b.getAttribute('data-id'));
      ask(null, 'Заблокировать ' + c.name + '?', 'Бот перестанет отвечать клиенту и принимать от него заказы. Уже принятые заказы останутся в очереди, решите по ним сами.', [
        { label: 'Заблокировать', kind: 'danger', run: function () { ui.blockQ = ''; SWP.setBlocked(c.id, true); toast('Клиент ' + c.name + ' заблокирован'); } }
      ]);
    },
    'block-off': function (b) { var c = SWP.customerById(b.getAttribute('data-id')); SWP.setBlocked(c.id, false); toast('Клиент ' + c.name + ' разблокирован'); },
    'file-add': function () { var names = ['Посылка.jpg', 'Квитанция.jpg', 'Маршрутка.jpg', 'Чек водителя.pdf', 'Фото 2.jpg']; ui.files.push(names[ui.files.length]); render(); },
    'file-x': function (b) { ui.files.splice(+b.getAttribute('data-i'), 1); render(); },
    'dispatch-send': function (b, n) {
      var o = SWP.order(n), text = $('#dsp').value.trim();
      var send = function () { if (SWP.sendDispatch(n, text)) { ui.files = []; toast('Клиент получил информацию об отправке. Заказ ' + n + ' отправлен'); } };
      if (o.status === 'packing') ask(n, 'Заказ не отмечен упакованным', 'Упаковщики ещё не нажали «Упаковано». Отправить клиенту информацию всё равно?', [{ label: 'Отправить всё равно', run: send }]);
      else send();
    },
    'dispatch-revert': function (b, n) { if (SWP.revertDispatch(n)) toast('Заказ ' + n + ' снова «Упакован» и вернётся в задачу проверки почты'); },
    'to-packing': function (b, n) { if (SWP.backToPacking(n)) toast('Заказ ' + n + ' снова у упаковщиков, его можно править'); },
    'resend-edit': function (b, n) {
      ask(n, 'Отправить новую накладную?', 'Старое сообщение с накладной в группе упаковщиков удалится, вместо него уйдёт новое. Отгрузка в МойСклад обновится сама, клиент получит новую накладную.', [
        { label: 'Сохранить и отправить', run: function () { if (SWP.resendEdited(n)) toast('Заказ ' + n + ' изменён. Новая накладная отправлена клиенту и в группу'); } }
      ]);
    },
    'task-sort': function (b) { ui.taskSort = b.getAttribute('data-s'); render(); },
    'cities-toggle': function () { ui.citiesOpen = !ui.citiesOpen; render(); },
    'post-switch': function () { var off = !SWP.settings().postOff; SWP.setSetting('postOff', off); toast(off ? 'Белпочта отключена: клиенты не смогут её выбрать' : 'Белпочта включена'); },
    'item-x': function (b) { SWP.removeItem(b.getAttribute('data-k'), b.getAttribute('data-id')); toast('Удалено'); },
    'cmd-pick': function (b) { pickCommand(b.getAttribute('data-id')); },
    'refund-ask': function (b) { if (SWP.askRefundDetails(b.getAttribute('data-id'))) toast('Бот попросил клиента прислать реквизиты для возврата'); },
    'refund-file': function (b) { ui.refundFile[b.getAttribute('data-id')] = 'Чек возврата.jpg'; render(); },
    'refund-file-x': function (b) { delete ui.refundFile[b.getAttribute('data-id')]; render(); },
    'refund-paid': function (b) {
      var id = b.getAttribute('data-id'), f = ui.refundFile[id];
      if (SWP.payRefund(id, f)) { delete ui.refundFile[id]; toast('Возврат отмечен оплаченным' + (f ? ', чек отправлен клиенту' : '') + '. Задача закрыта'); }
    },
    'custom-done': function (b) { SWP.closeCustomTask(b.getAttribute('data-id')); toast('Задача закрыта'); },
    'chat-task': function () { ui.dialog = { type: 'task', cid: route().id }; renderDialog(); },
    'post-open': function () { ui.postOpen = true; render(); },
    'post-none': function () { ui.postOpen = false; SWP.closePostCheck(); toast('Задача закрыта. Упакованные посылки появятся в задаче завтра в 21:00'); },
    'post-done': function () { ui.postOpen = false; SWP.closePostCheck(); toast('Проверка почты на сегодня закончена'); },
    'post-confirm': function (b) {
      var n = +b.getAttribute('data-n');
      // The customer is notified 10 seconds later, so a wrong press can still be cancelled (A-31).
      if (SWP.confirmDispatch(n)) toast('Заказ ' + n + ' отправлен. Клиент получит уведомление через 10 секунд', function () { ui.postOpen = true; SWP.revertDispatch(n); }, 10000, 'Отменить');
      if (!SWP.postList().length) ui.postOpen = false;
      render();
    },
    'open-packing': function (b, n) { var o = SWP.order(n); ui.dialog = { type: 'packing', n: n, text: o.packingDraft || SWP.packingMessage(o) }; renderDialog(); },
    send: function () {
      var d = ui.dialog, o = SWP.order(d.n), post = o.delivery.type === 'post';
      SWP.sendPacking(d.n, $('#msg').value); ui.dialog = null;
      toast(post ? 'Накладная отправлена клиенту. Заказ ' + d.n + ' ждёт оплаты' : 'Накладная отправлена клиенту и в группу. Заказ ' + d.n + ' передан на упаковку');
      go('#/');
    },
    'dialog-close': function () { closeDialog(); render(); },
    'demo-toggle': function () { ui.demoOpen = !ui.demoOpen; patch($('#demo'), demoHTML()); },
    demo: function (b) { runDemo(b.getAttribute('data-d')); }
  };

  document.addEventListener('click', function (e) {
    if (ui.menu && !e.target.closest('.lp')) { ui.menu = null; render(); }
    var b = e.target.closest('[data-act]');
    if (b) { if (b.disabled) return; var fn = ACT[b.getAttribute('data-act')]; if (fn) fn(b, route().n); return; }
    var tr = e.target.closest('tr[data-href]');
    if (tr && !e.target.closest('a')) location.hash = tr.getAttribute('data-href');
  });
  document.addEventListener('submit', function (e) {
    if (e.target.id === 'task-form') {
      e.preventDefault();
      var td = ui.dialog;
      if (SWP.addCustomTask(td.cid, $('#task-text').value)) { ui.dialog = null; render(); toast('Задача добавлена в раздел «Задачи»'); }
      else { td.error = 'Напишите, что нужно сделать'; renderDialog(); }
      return;
    }
    if (e.target.id === 'ch-form') {
      e.preventDefault();
      var sent = $('#ch-msg').value, files = ui.chatFiles; ui.chatDraft = ''; ui.chatFiles = [];
      var how = SWP.sendChat(route().id, sent, files);
      if (how) { toast(how === 'cmd' ? 'Быстрая команда отправлена клиенту без пометки' : 'Отправлено клиенту с пометкой «Сообщение от менеджера»'); scrollChat(); var again = $('#ch-msg'); if (again) again.focus(); }
      return;
    }
    if (e.target.id === 'cmd-form' || e.target.id === 'faq-form') {
      e.preventDefault();
      var isCmd = e.target.id === 'cmd-form';
      var rs = isCmd ? SWP.saveCommand(null, $('#cmd-new').value, $('#cmd-text').value) : SWP.saveFaq(null, $('#faq-q').value, $('#faq-a').value);
      ui.setErr = rs.error ? (isCmd ? 'cmd:' : 'faq:') + rs.error : '';
      if (rs.error) { var keep = isCmd ? [$('#cmd-new').value, $('#cmd-text').value] : [$('#faq-q').value, $('#faq-a').value]; render(); var ids = isCmd ? ['#cmd-new', '#cmd-text'] : ['#faq-q', '#faq-a']; $(ids[0]).value = keep[0]; $(ids[1]).value = keep[1]; }
      else { render(); toast(isCmd ? 'Команда добавлена' : 'Вопрос добавлен в FAQ бота'); }
      return;
    }
    if (e.target.id === 'city-form') {
      e.preventDefault();
      var res = SWP.addCity($('#city-new').value);
      ui.cityErr = res.error || ''; ui.citiesOpen = true; render();
      if (res.ok) toast('Город добавлен в список на сайте');
      return;
    }
    if (e.target.id !== 'login') return;
    e.preventDefault();
    var res = SWP.signIn($('#key').value.trim());
    if (res.ok) { ui.loginError = ''; return go('#/'); }
    ui.loginError = res.muted ? '' : 'Неверный ключ. Осталось попыток: ' + res.left;
    render(); var k = $('#key'); if (k && !k.disabled) { k.value = ''; k.focus(); }
  });
  // Search fields filter as you type; they re-render only their own results.
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'q') { ui.filter.q = t.value; patch($('#q-list'), queueListHTML()); }
    if (t.id === 'add-q') { ui.addQ = t.value; render(); }
    if (t.id === 'tracking') { // "Process" lights up as soon as the code matches the format
      var v = t.value.toUpperCase().replace(/\s+/g, '');
      if (SWP.TRACK_RE.test(v)) ui.trackErr = false;
      SWP.patchOrder(route().n, { tracking: v });
    }
    if (t.id === 'b-q') { ui.blockQ = t.value; render(); }
    if (t.id === 'pay') SWP.setSetting('payment', t.value); // Belposhta switches off the moment the details become empty (S-15)
    if (t.id === 'ch-q') { ui.chatQ = t.value; render(); }
    if (t.id === 'ch-msg') { var was = ui.chatDraft[0] === '/'; ui.chatDraft = t.value; if (was || t.value[0] === '/') render(); }
    if (t.id === 'c-q' && ui.dialog) { ui.dialog.q = t.value; ui.dialog.name = $('#c-name') ? $('#c-name').value : null; renderDialog(); }
  });
  // Other fields commit on change (blur or Enter), so typing a price is not interrupted.
  document.addEventListener('change', function (e) {
    if (rendering) return;
    var t = e.target, n = route().n, num = function (v) { return String(v).replace(',', '.').trim(); };
    if (t.hasAttribute('data-filter')) { ui.filter[t.getAttribute('data-filter')] = t.value; return render(); }
    if (t.hasAttribute('data-rep')) { ui.rep[t.getAttribute('data-rep')] = t.value; return render(); }
    if (t.hasAttribute('data-item')) { // a quick command or a FAQ entry edited in place
      var row = t.closest('[data-row]'), kind = t.getAttribute('data-item'), val = function (k) { return row.querySelector('[data-f="' + k + '"]').value; };
      var r2 = kind === 'commands' ? SWP.saveCommand(row.getAttribute('data-row'), val('cmd'), val('text')) : SWP.saveFaq(row.getAttribute('data-row'), val('q'), val('a'));
      ui.setErr = r2.error || ''; render();
      return toast(r2.error ? 'Не сохранено: ' + r2.error : 'Сохранено');
    }
    if (t.hasAttribute('data-text')) { SWP.setText(t.getAttribute('data-text'), t.value); return toast('Текст сохранён'); }
    if (t.hasAttribute('data-set')) {
      var sk = t.getAttribute('data-set');
      SWP.setSetting(sk, sk === 'autoDelete' ? Math.max(1, parseInt(t.value, 10) || 168) : sk === 'postCheckTime' ? t.value || '21:00' : t.value);
      return toast('Сохранено');
    }
    if (!n) return;
    if (t.hasAttribute('data-line-price')) { unflag(n, t.getAttribute('data-line-price')); return SWP.setLinePrice(n, t.getAttribute('data-line-price'), num(t.value)); }
    if (t.hasAttribute('data-original')) return changeOriginal(n, t.value);
    if (t.hasAttribute('data-qty')) return SWP.setQty(n, t.getAttribute('data-qty'), Math.max(1, parseInt(t.value, 10) || 1));
    if (t.hasAttribute('data-delivery')) return SWP.setDelivery(n, t.value);
    if (t.hasAttribute('data-dfield')) return SWP.setDeliveryField(n, t.getAttribute('data-dfield'), t.value);
    if (t.hasAttribute('data-ofield')) {
      var k = t.getAttribute('data-ofield'), f = {};
      f[k] = k === 'deduction' || k === 'surcharge' ? Math.max(0, +num(t.value) || 0) : k === 'tracking' ? t.value.toUpperCase().replace(/\s+/g, '') : t.value;
      return SWP.patchOrder(n, f);
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ui.dialog) { closeDialog(); render(); }
    if (e.key === 'Escape' && ui.menu) { ui.menu = null; render(); }
    if (e.key === 'Enter' && !e.shiftKey && e.target.id === 'ch-msg') { // Enter sends, Shift+Enter makes a new line
      e.preventDefault();
      var first = $('.cmds .cmd');
      if (first) pickCommand(first.getAttribute('data-id')); else if (e.target.value.trim() || ui.chatFiles.length) $('#ch-form').requestSubmit();
      return;
    }
    var t = e.target;
    var n = route().n;
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.code === 'KeyZ' && n && !ui.dialog) {
      // Ctrl+Z returns the previous price; other text fields keep the browser's own undo.
      if (t.matches('textarea, input') && !t.matches('[data-line-price]')) return;
      e.preventDefault();
      if (t.matches('[data-line-price]') && t.value !== t.defaultValue) { t.value = t.defaultValue; t.select(); return; }
      var cur = t.matches('[data-line-price]') ? t.getAttribute('data-line-price') : null;
      undoPrice(n); focusPrice(cur);
      return;
    }
    if (e.key === 'Enter' && t.matches('[data-line-price]')) { // Enter saves the price and selects the next line's price
      e.preventDefault();
      var all = $$('[data-line-price]'), next = all[all.indexOf(t) + 1], nextId = next && next.getAttribute('data-line-price');
      unflag(n, t.getAttribute('data-line-price'));
      SWP.setLinePrice(n, t.getAttribute('data-line-price'), t.value.replace(',', '.').trim());
      if (!nextId) { if (document.activeElement) document.activeElement.blur(); return; }
      focusPrice(nextId);
      requestAnimationFrame(function () { focusPrice(nextId); });
    } else if (e.key === 'Enter' && t.matches('.lp input, .stepper input')) t.blur();
  });
  window.addEventListener('hashchange', function () { ui.chatDraft = ''; ui.chatFiles = []; ui.taskSort = 'old'; ui.setErr = ''; var rc = route(); if (rc.name === 'chats' && rc.id) SWP.readChat(rc.id); ui.tab = 'note'; ui.files = []; ui.addQ = ''; ui.menu = null; ui.trackErr = false; ui.dialog = ui.nextDialog || null; ui.nextDialog = null; render(); window.scrollTo(0, 0); });

  SWP.on(render);
  render();
})();
