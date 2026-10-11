/* Smoke Wave manager panel mockup: shared core (PRD 5.2: A-1 to A-12, A-15, A-21; S-4; BR-3, BR-4, BR-8).
   - Sign-in: two access keys, 12-hour session, 3 failed entries -> 5-minute lockout per address (A-1).
   - Pricing: one price per product line, four website tiers, customer's latest line price (A-4 to A-7).
   - Deduction and rounding: the total is rounded to 5 BYN and the difference is spread over item rows (A-8, S-4).
   - Packing-group message text follows BR-4.
   Load after ../data.js and data.js; the UI in app.js only renders this state. */
(function () {
  'use strict';
  var C = window.SW_DATA, D = window.SWP_DATA;
  var TIERS = [10, 30, 50, 100];
  var SESSION_MS = 12 * 60 * 60 * 1000;
  var MUTE_MS = 5 * 60 * 1000;
  var MAX_TRIES = 3;
  var KEY = 'swp-mock-v9';
  var TRACK_RE = /^[A-Z]{2}\d{9}BY$/; // Belposhta tracking code: two letters, nine digits, BY (A-15)

  var STATUSES = [
    { id: 'new', label: 'Новый' },
    { id: 'details', label: 'Ожидает данные', deferred: true },
    { id: 'phone', label: 'Ждёт согласования телефона' },
    { id: 'accepted', label: 'Принят' },
    { id: 'queue', label: 'В очереди менеджера', deferred: true },
    { id: 'processed', label: 'Обработан' },
    { id: 'payment', label: 'Ожидает оплаты' },
    { id: 'packing', label: 'Передан на упаковку' },
    { id: 'packed', label: 'Упакован' },
    { id: 'dispatched', label: 'Отправлен' },
    { id: 'delivered', label: 'Доставлен', deferred: true }
  ];
  // BR-3: surcharges stay outside the delivery note (INV-4).
  var DELIVERY = [
    { id: 'minibus', label: 'Маршрутка', group: 'minibus', surcharge: 0, note: 'Около 10 BYN клиент отдаёт водителю сверх накладной' },
    { id: 'post', label: 'Почта', group: 'post', surcharge: 10, note: 'Белпочта: предоплата, к оплате сумма накладной + 10 BYN' },
    { id: 'minsk-minibus', label: 'Минск', group: 'minibus', surcharge: 5, note: 'Доплата 5 BYN, нужен согласованный телефон' },
    { id: 'minsk-address', label: 'Адрес', group: 'minibus', surcharge: 15, note: 'Минск, курьер на адрес: доплата 15 BYN' }
  ];
  var CITIES = ['Брест', 'Витебск', 'Гомель', 'Гродно', 'Могилёв', 'Барановичи', 'Бобруйск', 'Борисов', 'Лида', 'Молодечно', 'Мозырь', 'Новополоцк', 'Орша', 'Пинск', 'Полоцк', 'Солигорск'];

  /* ---------- catalog ---------- */
  var folders = {}, products = {}, byLine = {};
  C.folders.forEach(function (f) { folders[f.id] = f; });
  C.products.forEach(function (p) { products[p.id] = p; (byLine[p.folderId] = byLine[p.folderId] || []).push(p); });
  function lineName(id) { // line = the product's parent folder in MoySklad (A-3)
    var f = folders[id], parent = f && folders[f.parentId];
    return f ? (parent && parent.parentId ? parent.name + ' · ' : '') + f.name : '';
  }
  function flavor(p) {
    var parts = p.name.split(' - ');
    return parts.length < 2 ? p.name : parts.slice(1).join(' - ').replace(/\s*-\s*\d+$/, '');
  }
  function norm(s) { return String(s).toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim(); }
  function searchProducts(q, order) { // A-9: every available item can be added
    q = norm(q); if (!q) return [];
    var have = {}; order.items.forEach(function (it) { have[it.id] = true; });
    return C.products.filter(function (p) {
      if (p.stock <= 0 || have[p.id]) return false;
      var hay = norm(p.name + ' ' + lineName(p.folderId));
      return q.split(' ').every(function (t) { return hay.indexOf(t) >= 0; });
    }).slice(0, 12);
  }

  /* ---------- state ---------- */
  var state, subs = [];
  function seed() {
    return {
      orders: D.orders.map(function (o) {
        var fixed = {}; (o.prices || []).forEach(function (p) { fixed[p[0]] = p[1]; });
        var items = o.items.map(function (it) {
          var p = byLine[it[0]][it[1]];
          return { id: p.id, qty: it[2], price: fixed[it[0]] != null ? fixed[it[0]] : p.prices[o.tier] };
        });
        return { number: o.number, receivedAt: o.receivedAt, customer: o.customer, siteTag: o.siteTag || '', kind: o.kind, original: o.original || null,
          status: o.status, tier: o.tier, delivery: JSON.parse(JSON.stringify(o.delivery)), items: items, deduction: 0,
          customerNote: o.customerNote || '', managerNote: '', tracking: o.tracking || '', surcharge: 15, phoneApproved: o.status !== 'phone' && o.delivery.type === 'minsk-minibus',
          packingText: '', remoteChanged: false, pendingRetry: false };
      }),
      customers: JSON.parse(JSON.stringify(D.customers)),
      session: null,
      guard: { fails: 0, mutedUntil: 0, mutes: [], hourFails: [] },
      security: [],
      priceUndo: {},
      custom: [],  // tasks a manager created from a chat (A-28)
      refunds: [], // paid Belposhta orders that were deleted and wait for a manual refund (BR-10)
      chats: JSON.parse(JSON.stringify(D.chats)),
      managerKey: D.keys.manager,
      settings: { // A-16
        cities: CITIES.slice(), autoDelete: 168,
        postOff: false, postCheckTime: '21:00', // Belposhta switch and the time of the daily dispatch task (A-31)
        commands: [ // quick replies called with "/" in a chat
          { id: 'k1', cmd: 'тег', text: 'Чтобы мы могли оформить заказ, добавьте себе имя пользователя в Telegram: Настройки → Изменить профиль → Имя пользователя. После этого напишите нам ещё раз.' },
          { id: 'k2', cmd: 'оплата', text: 'Реквизиты для оплаты бот отправил вместе с накладной. После оплаты пришлите сюда чек фотографией или файлом.' },
          { id: 'k3', cmd: 'сроки', text: 'Маршрутка идёт 1–2 дня, Белпочта 3–5 дней. В Гродно и Витебск маршрутки отправляются в понедельник, среду и пятницу.' }
        ],
        faq: [ // "Frequently asked questions" in the bot (C-21)
          { id: 'f1', q: 'Какая минимальная сумма заказа?', a: 'Минимальный заказ 100 BYN и не меньше 5 штук.' },
          { id: 'f2', q: 'Как оплатить заказ?', a: 'Маршрутка и доставка на адрес оплачиваются при получении. Белпочта только по предоплате, реквизиты пришлёт бот.' },
          { id: 'f3', q: 'Можно ли добавить товар к заказу?', a: 'Да, в течение 24 часов после принятия заказа и до его отправки. Нажмите «Мои заказы» и выберите дозаказ.' }
        ],
        payment: 'Получатель: ИП Образец О. О.\nIBAN: BY00 XXXX 0000 0000 0000 0000 0000\nНазначение: оплата заказа, номер заказа',
        texts: [
          { id: 'minibus', title: 'Маршрутка в областной город', text: 'Водителю нужно будет отдать около 10 BYN сверх суммы накладной.' },
          { id: 'minsk', title: 'Минск, маршрутка', text: 'Доплата за доставку 5 BYN. Укажите телефон, по которому водитель точно дозвонится.' },
          { id: 'address', title: 'Доставка на адрес в Минске', text: 'Доплата за доставку 15 BYN, в том числе за МКАД.' },
          { id: 'post', title: 'Белпочта', text: 'Срок доставки 3–5 дней. К оплате сумма накладной и 10 BYN за доставку. Отправим после подтверждения оплаты.' },
          { id: 'addon', title: 'Дозаказ', text: 'Дозаказ можно положить в ту же посылку или отправить отдельной. Отдельная посылка оплачивается как новая доставка.' }
        ]
      },
      postCheck: { due: true }, // the daily 21:00 Belposhta dispatch check is waiting (A-31)
      flags: { failShipment: false, moyskladDown: false, strictStock: false }
    };
  }
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.orders && s.guard && s.customers && s.priceUndo && s.postCheck && s.settings && s.settings.commands && s.chats && s.refunds && s.custom) { state = s; return; } } catch (e) {}
    state = seed();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function emit() { save(); subs.forEach(function (f) { f(); }); }
  function on(fn) { subs.push(fn); }
  function reset() { var old = state; state = seed(); state.session = old.session; state.guard = old.guard; state.security = old.security; emit(); }

  /* ---------- sign-in (A-1, AC-38, AC-89, AC-90) ---------- */
  function session() {
    if (state.session && state.session.expires <= Date.now()) { state.session = null; save(); }
    return state.session;
  }
  function muteLeft() { return Math.max(0, state.guard.mutedUntil - Date.now()); }
  function signIn(key) {
    var g = state.guard, now = Date.now();
    if (muteLeft()) return { muted: muteLeft() };
    var level = key === D.keys.admin ? 'admin' : key === state.managerKey ? 'manager' : null;
    if (level) {
      g.fails = 0;
      state.session = { level: level, expires: now + SESSION_MS };
      emit(); return { ok: true, level: level };
    }
    g.fails++;
    g.hourFails = g.hourFails.filter(function (t) { return now - t < 3600000; }); g.hourFails.push(now);
    if (g.hourFails.length === 21) state.security.unshift({ at: now, text: 'Больше 20 неверных вводов ключа за час со всех адресов' });
    if (g.fails < MAX_TRIES) { emit(); return { error: true, left: MAX_TRIES - g.fails }; }
    g.fails = 0; g.mutedUntil = now + MUTE_MS;
    g.mutes = g.mutes.filter(function (t) { return now - t < 86400000; }); g.mutes.push(now);
    if (g.mutes.length >= 2) state.security.unshift({ at: now, text: 'Адрес 203.0.113.24 заблокирован ' + g.mutes.length + ' раза за сутки при вводе ключа' });
    emit(); return { muted: MUTE_MS };
  }
  function signOut() { state.session = null; emit(); }
  function expireSession() { if (state.session) state.session.expires = Date.now() - 1; emit(); }
  function endMute() { state.guard.mutedUntil = 0; emit(); }

  /* ---------- orders ---------- */
  function order(n) { return state.orders.filter(function (o) { return o.number === +n; })[0] || null; }
  function customerById(id) { return state.customers.filter(function (c) { return c.id === id; })[0]; }
  function customer(o) { return customerById(o.customer); }
  // A-29: the Telegram ID stays the key, so a new name keeps orders and price history.
  function renameCustomer(id, name) {
    var c = customerById(id); name = String(name || '').trim();
    if (!c || c.id === 'retail') return { error: 'Этого контрагента переименовать нельзя' };
    if (!name) return { error: 'Укажите имя или тег контрагента' };
    if (/^@/.test(name) && !/^@[A-Za-z0-9_]{5,32}$/.test(name)) return { error: 'Тег в формате @username: латиница, цифры и «_», от 5 символов' };
    var same = state.customers.filter(function (x) { return x.id !== id && norm(x.name) === norm(name); })[0];
    if (same) return { error: 'Контрагент с таким именем уже есть. Если это один человек, смените контрагента в заказе.' };
    c.name = name; emit(); return { ok: true };
  }
  function setOrderCustomer(n, id) { touch(order(n), function (o) { if (customerById(id)) o.customer = id; }); }
  function customerOrders(id) { // current orders plus earlier ones known from the price history
    var out = state.orders.filter(function (o) { return o.customer === id; }).map(function (o) {
      return { number: o.number, date: o.receivedAt.slice(0, 10), status: status(o.status).label, total: compute(o).total, open: true };
    });
    var seen = {};
    customerById(id).history.forEach(function (h) { if (!seen[h[2]]) { seen[h[2]] = true; out.push({ number: h[2], date: h[3], status: 'Доставлен', total: null, open: false }); } });
    return out.sort(function (a, b) { return b.number - a.number; });
  }
  function findCustomers(q, skip) {
    q = norm(q).replace(/^@/, '');
    return state.customers.filter(function (c) { return c.id !== skip && c.id !== 'retail' && (!q || norm(c.name + ' ' + c.person + ' ' + c.tgId).indexOf(q) >= 0); });
  }
  function status(id) { return STATUSES.filter(function (s) { return s.id === id; })[0]; }
  function delivery(id) { return DELIVERY.filter(function (d) { return d.id === id; })[0]; }
  // An order with the packers can still be edited; saving replaces the group message (A-32).
  function editable(o) { return ['new', 'details', 'phone', 'accepted', 'queue', 'packing'].indexOf(o.status) >= 0; }
  function customerPrice(o, lineId) { // A-6: line price from the customer's most recent order containing that line
    var h = customer(o).history.filter(function (x) { return x[0] === lineId; })[0];
    return h ? { price: h[1], order: h[2], date: h[3] } : null;
  }
  function qtyTier(q) { return q >= 100 ? 100 : q >= 50 ? 50 : q >= 30 ? 30 : 10; }
  function round5(n) { return Math.floor((n + 2.5) / 5) * 5; } // S-4: nearest 5 BYN, ties up
  function r2(n) { return Math.round(n * 100) / 100; }

  // A-8: spread the deduction and the S-4 rounding difference proportionally over item rows.
  // Leftover kopecks go to the row with the highest unit price, so rows add up exactly to the total.
  function distribute(rows, target) {
    var sum = rows.reduce(function (a, r) { return a + r.sum; }, 0);
    if (sum <= 0) return rows.map(function () { return 0; });
    var out = rows.map(function (r) { return Math.floor(r.sum * target / sum * 100 + 1e-6) / 100; });
    var left = Math.round((target - out.reduce(function (a, v) { return a + v; }, 0)) * 100);
    var top = 0; rows.forEach(function (r, i) { if (r.price > rows[top].price || (r.price === rows[top].price && r.sum > rows[top].sum)) top = i; });
    out[top] = r2(out[top] + left / 100);
    return out;
  }

  function compute(o) {
    var map = {}, ids = [], units = 0, sum = 0, noPrice = false;
    o.items.forEach(function (it) {
      var p = products[it.id], l = map[p.folderId];
      if (!l) { l = map[p.folderId] = { id: p.folderId, name: lineName(p.folderId), items: [], qty: 0, sum: 0 }; ids.push(p.folderId); }
      var row = { product: p, name: flavor(p), qty: it.qty, price: it.price, sum: it.price == null ? 0 : r2(it.price * it.qty), short: it.qty > p.stock };
      if (it.price == null) noPrice = true;
      l.items.push(row); l.qty += it.qty; l.sum = r2(l.sum + row.sum); units += it.qty; sum = r2(sum + row.sum);
    });
    // S-2: lines alphabetically, items alphabetically inside each line
    var lines = ids.map(function (id) { return map[id]; }).sort(function (a, b) { return a.name.localeCompare(b.name, 'ru'); });
    var rows = [];
    lines.forEach(function (l) {
      l.items.sort(function (a, b) { return a.name.localeCompare(b.name, 'ru'); });
      var first = l.items[0].price;
      l.price = l.items.every(function (r) { return r.price === first; }) ? first : undefined; // undefined = mixed prices
      l.missing = l.items.some(function (r) { return r.price == null; });
      l.customer = customerPrice(o, l.id);
      l.tiers = TIERS.map(function (t) { return { tier: t, price: l.items[0].product.prices[t] }; });
      rows = rows.concat(l.items);
    });
    var deduction = Math.max(0, +o.deduction || 0);
    var after = r2(sum - deduction);
    var total = after > 0 ? round5(after) : 0; // a deduction equal to the sum gives a zero total, which is allowed
    var finals = distribute(rows, total);
    rows.forEach(function (r, i) { r.finalSum = finals[i]; r.finalPrice = r.qty ? finals[i] / r.qty : 0; });
    var d = delivery(o.delivery.type), tierNow = qtyTier(units);
    var res = { lines: lines, rows: rows, units: units, sum: sum, deduction: deduction, after: after, total: total, roundDiff: r2(total - after),
      surcharge: d.id === 'minsk-address' ? Math.max(0, +o.surcharge || 0) : 0, delivery: d, trackingBad: false, suggest: units > 0 && tierNow !== o.tier ? tierNow : null,
      hasHistory: lines.some(function (l) { return l.customer; }), blockers: [], warnings: [] };

    if (o.status === 'new') res.blockers.push('Клиент ещё не подтвердил заказ в боте');
    else if (o.status === 'phone' || (o.delivery.type === 'minsk-minibus' && !o.phoneApproved)) res.blockers.push('Телефон для доставки по Минску не согласован');
    else if (!editable(o)) res.blockers.push('Заказ уже обработан');
    if (!rows.length) res.blockers.push('В накладной нет товаров');
    lines.forEach(function (l) { if (l.missing) res.blockers.push('Нет цены: ' + l.name); });
    if (rows.length && !noPrice && after < 0) res.blockers.push('Скидка больше суммы заказа');
    // A wrong tracking code is reported on "Process" itself, so it is kept apart from the other blockers.
    if (d.id === 'post' && !TRACK_RE.test(String(o.tracking).trim())) res.trackingBad = true;
    rows.forEach(function (r) {
      if (!r.short) return;
      var text = 'На складе ' + r.product.stock + ' шт, в заказе ' + r.qty + ': ' + r.name;
      (state.flags.strictStock ? res.blockers : res.warnings).push(text);
    });
    return res;
  }

  function touch(o, fn) { if (o && editable(o)) { fn(o); if (o.status === 'packing') o.dirty = true; emit(); } }
  // Every price change keeps the previous prices so the manager can step back (Ctrl+Z).
  function pricesOf(o) { return { tier: o.tier, prices: o.items.map(function (it) { return [it.id, it.price]; }) }; }
  function priced(n, fn) {
    touch(order(n), function (o) {
      var before = pricesOf(o), stack = state.priceUndo[o.number] = state.priceUndo[o.number] || [];
      fn(o);
      if (JSON.stringify(before) !== JSON.stringify(pricesOf(o))) { stack.push(before); if (stack.length > 50) stack.shift(); }
    });
  }
  function canUndoPrice(n) { var o = order(n); return !!(o && editable(o) && (state.priceUndo[n] || []).length); }
  function undoPrice(n) {
    if (!canUndoPrice(n)) return false;
    var o = order(n), prev = state.priceUndo[n].pop(), map = {};
    prev.prices.forEach(function (p) { map[p[0]] = p[1]; });
    o.items.forEach(function (it) { if (it.id in map) it.price = map[it.id]; });
    o.tier = prev.tier; emit(); return true;
  }
  function setLinePrice(n, lineId, price) {
    priced(n, function (o) {
      var v = price === '' || price == null || isNaN(+price) || +price < 0 ? null : r2(+price);
      o.items.forEach(function (it) { if (products[it.id].folderId === lineId) it.price = v; });
    });
  }
  function applyTier(n, tier, lineId) { // A-5: only on the manager's explicit action
    priced(n, function (o) {
      o.items.forEach(function (it) { var p = products[it.id]; if (!lineId || p.folderId === lineId) it.price = p.prices[tier]; });
      if (!lineId) o.tier = tier;
    });
  }
  function applyCustomerPrice(n, lineId) { // A-7: one line or all lines
    priced(n, function (o) {
      o.items.forEach(function (it) {
        var id = products[it.id].folderId, h = customerPrice(o, id);
        if (h && (!lineId || id === lineId)) it.price = h.price;
      });
    });
  }
  function setQty(n, id, qty) {
    touch(order(n), function (o) {
      qty = Math.max(0, Math.floor(+qty || 0));
      if (!qty) o.items = o.items.filter(function (it) { return it.id !== id; });
      else o.items.forEach(function (it) { if (it.id === id) it.qty = qty; });
    });
  }
  function addItem(n, id) {
    touch(order(n), function (o) {
      var p = products[id], same = o.items.filter(function (it) { return products[it.id].folderId === p.folderId; })[0];
      o.items.push({ id: id, qty: 1, price: same ? same.price : p.prices[o.tier] }); // a new item takes its line's current price
    });
  }
  function restoreItem(n, item) { touch(order(n), function (o) { o.items.push(item); }); }
  function patchOrder(n, fields) { touch(order(n), function (o) { Object.keys(fields).forEach(function (k) { o[k] = fields[k]; }); }); }
  function setDelivery(n, type) {
    touch(order(n), function (o) {
      o.delivery.type = type;
      if (type === 'minibus' && !o.delivery.city) o.delivery.city = '';
      if (type !== 'minsk-minibus') o.phoneApproved = false;
    });
  }
  function setDeliveryField(n, field, value) { touch(order(n), function (o) { o.delivery[field] = value; }); }

  /* ---------- packing-group message (BR-4, S-5, S-6) ---------- */
  function intBYN(n) { return String(r2(n)).replace('.', ','); }
  function packingMessage(o, c) {
    c = c || compute(o);
    var who = customer(o).name, d = o.delivery, rows;
    var orig = o.kind === 'addon' && o.original ? order(o.original) : null;
    // BR-4: an add-on to an already packed order goes to the group as its own short message.
    if (orig && ['packed', 'dispatched'].indexOf(orig.status) >= 0) rows = [o.number, 'Добавить к ' + orig.number, '+' + intBYN(c.total) + ' BYN'];
    else if (d.type === 'post') rows = [o.number, d.fullName, d.address, d.postcode, o.tracking];
    else if (d.type === 'minsk-address') rows = [o.number, who, d.address, intBYN(c.total) + (c.surcharge ? '+' + intBYN(c.surcharge) : '') + ' BYN'];
    else if (d.type === 'minsk-minibus') rows = [o.number, 'Минск', who, intBYN(c.total) + '+5 BYN'];
    else rows = [o.number, d.city, who, intBYN(c.total) + ' BYN'];
    if (o.customerNote.trim()) rows.push(o.customerNote.trim());
    if (o.managerNote.trim()) rows.push(o.managerNote.trim());
    return rows.filter(function (x) { return x !== '' && x != null; }).join('\n');
  }

  /* ---------- processing (A-11, A-12, S-3, INV-1, INV-8) ---------- */
  function writeToMoySklad(n) { // step 1: prices, sorting, shipment, PDF
    var o = order(n), c = compute(o);
    if (c.blockers.length || c.trackingBad) return { error: c.blockers[0] || 'Трек-код Белпочты введён неверно' };
    if (state.flags.moyskladDown) { o.pendingRetry = true; emit(); return { queued: true }; }
    if (state.flags.failShipment) { state.flags.failShipment = false; emit(); return { error: 'МойСклад не создал отгрузку. Изменения отменены, сообщение упаковщикам не отправлено.' }; }
    o.pendingRetry = false; o.remoteChanged = false;
    var orig = mergeTarget(o);
    if (orig) { var shipped = mergeInto(o, orig); emit(); return { ok: true, merged: orig.number, shipped: shipped }; }
    o.status = 'processed'; o.packingDraft = packingMessage(o, c);
    emit(); return { ok: true };
  }
  function sendPacking(n, text) { // step 2: one confirmation sends the PDF to the customer and the message to the group (A-12)
    var o = order(n); if (!o || o.status !== 'processed') return;
    o.packingText = text;
    o.status = o.delivery.type === 'post' ? 'payment' : 'packing'; // BR-6: Belposhta waits for the receipt
    emit();
  }

  /* ---------- order actions (A-13, A-14, A-15, A-17, A-18, A-23, A-26, A-27) ---------- */
  function approvePhone(n) { var o = order(n); if (!o || o.status !== 'phone') return; o.status = 'accepted'; o.phoneApproved = true; emit(); }
  // "Offer another method" restarts only the delivery choice in the bot (A-14).
  function offerOtherDelivery(n, type) { var o = order(n); if (!o) return; o.status = 'details'; o.offered = type; o.phoneApproved = false; emit(); }
  function setBlocked(id, on) { var c = customerById(id); if (c && c.id !== 'retail') { c.blocked = !!on; emit(); } }
  function receiptToMinibus(n) { // rejected receipt, the customer switches to a minibus (AJ-3)
    var o = order(n); if (!o || o.status !== 'payment') return;
    o.delivery.type = 'minibus'; o.tracking = ''; o.status = 'accepted'; emit();
  }
  function canReturn(o) { return ['processed', 'payment', 'packing'].indexOf(o.status) >= 0; }
  function returnForEditing(n) { var o = order(n); if (!o || !canReturn(o)) return false; o.status = 'accepted'; o.packingText = ''; o.changedInMs = false; emit(); return true; }
  // BR-10: Belposhta is prepaid, so deleting an order after the receipt was approved leaves a refund to make.
  function removeOrder(n) {
    var o = order(n); if (!o) return null;
    if (o.delivery.type === 'post' && ['packing', 'packed', 'dispatched', 'delivered'].indexOf(o.status) >= 0) {
      state.refunds.push({ id: 'r' + o.number, n: o.number, cid: o.customer, who: customer(o).name, amount: compute(o).total + 10, at: D.now, stage: 'new' });
    }
    state.orders = state.orders.filter(function (x) { return x.number !== +n; }); emit(); return o;
  }
  function restoreOrder(o) {
    if (!o || order(o.number)) return;
    state.orders.push(o); state.refunds = state.refunds.filter(function (r) { return r.n !== o.number; }); emit();
  }
  function botSay(cid, text, files) { // an automated message in the customer's chat
    var ch = chatOf(cid);
    if (!ch) { ch = { customer: cid, marked: false, unread: false, messages: [] }; state.chats.push(ch); }
    ch.messages.push({ from: 'bot', at: D.now, text: text, files: files || [] });
  }
  // A refund has two steps: ask the customer for payment details, then mark it paid (a receipt is optional).
  function refundById(id) { return state.refunds.filter(function (r) { return r.id === id; })[0]; }
  function askRefundDetails(id) {
    var r = refundById(id); if (!r || r.stage !== 'new') return false;
    botSay(r.cid, 'Заказ ' + r.n + ' отменён. Чтобы вернуть ' + money(r.amount) + ', пришлите, пожалуйста, реквизиты: номер карты или счёта и ФИО получателя.');
    r.stage = 'asked'; emit(); return true;
  }
  function payRefund(id, file) {
    var r = refundById(id); if (!r || r.stage !== 'asked') return false;
    botSay(r.cid, 'Возврат ' + money(r.amount) + ' по заказу ' + r.n + ' отправлен.', file ? [file] : []);
    state.refunds = state.refunds.filter(function (x) { return x !== r; }); emit(); return true;
  }
  function addCustomTask(cid, text) {
    text = String(text || '').trim(); if (!text || !customerById(cid)) return false;
    state.custom.push({ id: 'u' + Date.now(), cid: cid, text: text, at: D.now }); emit(); return true;
  }
  function closeCustomTask(id) { state.custom = state.custom.filter(function (t) { return t.id !== id; }); emit(); }
  // A-21: an add-on names its original; the system picks the customer's latest undispatched order.
  function addonTargets(o) {
    return state.orders.filter(function (x) { return x !== o && x.customer === o.customer && x.customer !== 'retail' && x.kind !== 'addon' && ['dispatched', 'delivered'].indexOf(x.status) < 0; })
      .sort(function (a, b) { return a.receivedAt < b.receivedAt ? 1 : -1; });
  }
  function setKind(n, kind) {
    touch(order(n), function (o) {
      o.kind = kind;
      if (kind === 'main') o.original = null;
      else if (!o.original || !order(o.original)) { var t = addonTargets(o)[0]; o.original = t ? t.number : null; }
    });
  }
  function setOriginal(n, num) { touch(order(n), function (o) { o.original = +num || null; }); }
  // A-32: a packed order can go back to the packers, and an order with the packers is edited in place.
  function backToPacking(n) { var o = order(n); if (!o || o.status !== 'packed') return false; o.status = 'packing'; emit(); return true; }
  function resendEdited(n) {
    var o = order(n); if (!o || o.status !== 'packing' || !o.dirty) return false;
    var c = compute(o); if (c.blockers.length || c.trackingBad) return false;
    o.dirty = false; o.packingText = packingMessage(o, c); emit(); return true;
  }
  // A-17, S-11: an add-on to an unpacked original is merged into the earlier number and priced again.
  // BR-5: an add-on to an unpacked original is merged into it automatically when the add-on is processed.
  // A packed original is never reopened, and a Belposhta original with an approved receipt keeps its own document.
  function mergeTarget(o) {
    var orig = o.kind === 'addon' && o.original ? order(o.original) : null;
    if (!orig || ['accepted', 'queue', 'processed', 'payment', 'packing'].indexOf(orig.status) < 0) return null;
    if (orig.delivery.type === 'post' && orig.status === 'packing') return null;
    return orig;
  }
  function mergeInto(o, orig) { // prices of the added items were just confirmed by the manager in the add-on
    o.items.forEach(function (it) {
      var same = orig.items.filter(function (x) { return x.id === it.id; })[0];
      if (same) same.qty += it.qty; else orig.items.push({ id: it.id, qty: it.qty, price: it.price });
    });
    if (o.customerNote) orig.customerNote = (orig.customerNote ? orig.customerNote + ' ' : '') + o.customerNote;
    if (o.managerNote) orig.managerNote = (orig.managerNote ? orig.managerNote + ' ' : '') + o.managerNote;
    var shipped = ['processed', 'payment', 'packing'].indexOf(orig.status) >= 0; // the old shipment and group message are replaced
    orig.merged = o.number; orig.packingText = ''; orig.dirty = false;
    if (shipped) { orig.status = 'processed'; orig.packingDraft = packingMessage(orig); }
    state.orders = state.orders.filter(function (x) { return x !== o; });
    return shipped;
  }
  function sendDispatch(n, text) { var o = order(n); if (!o || ['packing', 'packed'].indexOf(o.status) < 0) return false; o.dispatchText = text; o.status = 'dispatched'; emit(); return true; }
  function setChangedInMs(n, on) { var o = order(n); if (o) { o.changedInMs = !!on; emit(); } }

  function approveReceipt(n) { // A-15, BR-6: approving the receipt is what sends a Belposhta order to the packing group
    var o = order(n); if (!o || o.status !== 'payment') return false;
    o.status = 'packing'; emit(); return true;
  }

  /* ---------- tasks (A-24, A-28, A-31) ---------- */
  // Belposhta parcels are not tracked by anyone, so once a day the manager confirms which packed ones were handed over.
  function postList() {
    return state.orders.filter(function (o) { return o.delivery.type === 'post' && o.status === 'packed'; })
      .sort(function (a, b) { return a.number - b.number; });
  }
  function confirmDispatch(n) { var o = order(n); if (!o || o.status !== 'packed') return false; o.status = 'dispatched'; o.dispatchedAt = D.now; emit(); return true; }
  // A mistaken Belposhta confirmation can be undone for 24 hours (A-31).
  function canRevertDispatch(o) { return o.status === 'dispatched' && o.delivery.type === 'post' && !!o.dispatchedAt && new Date(D.now) - new Date(o.dispatchedAt) < 86400000; }
  function revertDispatch(n) { var o = order(n); if (!o || !canRevertDispatch(o)) return false; o.status = 'packed'; o.dispatchedAt = null; emit(); return true; }
  function closePostCheck() { state.postCheck.due = false; emit(); } // unconfirmed parcels return in tomorrow's task
  function openPostCheck() { state.postCheck.due = true; emit(); }
  // Tasks are derived from order state, so each one closes itself when its action is done anywhere in the panel.
  function tasks(level) {
    var out = [];
    if (state.postCheck.due && postList().length) out.push({ type: 'post-check', count: postList().length });
    state.orders.slice().sort(function (a, b) { return a.receivedAt < b.receivedAt ? -1 : 1; }).forEach(function (o) {
      var t = o.status === 'payment' ? ['receipt', 'Проверить чек об оплате', 'Белпочта: без подтверждения чека заказ не уйдёт на упаковку']
        : o.status === 'phone' ? ['phone', 'Согласовать телефон', 'Минск: без согласования заказ нельзя обработать']
        : o.status === 'processed' ? ['send', 'Отправить накладную', 'Отгрузка создана, накладная не отправлена клиенту и упаковщикам']
        : o.pendingRetry ? ['retry', 'МойСклад не ответил', 'Запись заказа стоит в очереди на повтор'] : null;
      if (t) out.push({ type: t[0], title: t[1], text: t[2], n: o.number, who: customer(o).name, since: o.receivedAt, when: o.receivedAt });
    });
    state.refunds.forEach(function (r) {
      out.push({ type: 'refund', title: 'Вернуть клиенту деньги', text: 'Заказ ' + r.n + ' удалён после оплаты. К возврату ' + money(r.amount) + (r.stage === 'asked' ? '. Реквизиты запрошены в чате' : ''),
        rid: r.id, stage: r.stage, cid: r.cid, who: customerById(r.cid).name, since: r.at, when: r.at });
    });
    state.custom.forEach(function (t) { out.push({ type: 'custom', title: t.text, text: 'Задача из чата', uid: t.id, cid: t.cid, who: customerById(t.cid).name, since: t.at, when: t.at }); });
    state.chats.forEach(function (ch) {
      if (!ch.unread) return;
      var last = ch.messages[ch.messages.length - 1];
      out.push({ type: 'chat', reply: true, title: 'Ответить клиенту', text: last.text, cid: ch.customer, who: customerById(ch.customer).name, since: last.at, when: last.at });
    });
    if (level === 'admin') state.security.forEach(function (x) { out.push({ type: 'security', title: x.text, text: 'Безопасность входа. Видит только супер-админ', at: x.at, when: new Date(x.at).toISOString() }); });
    return out;
  }

  /* ---------- chats (A-22, A-18) ---------- */
  function chatOf(id) { return state.chats.filter(function (c) { return c.customer === id; })[0] || null; }
  function chatList(q, onlyMarked) {
    q = norm(q || '').replace(/^@/, '');
    return state.chats.filter(function (ch) {
      var c = customerById(ch.customer);
      return (!onlyMarked || ch.marked) && (!q || norm(c.name + ' ' + c.person).indexOf(q) >= 0);
    }).sort(function (a, b) { return a.messages[a.messages.length - 1].at < b.messages[b.messages.length - 1].at ? 1 : -1; });
  }
  function readChat(id) { var ch = chatOf(id); if (ch && ch.unread) { ch.unread = false; save(); } }
  function sendChat(id, text, files) { // files: names of attached documents or photos, sent through the bot with the text
    var ch = chatOf(id); text = String(text || '').trim(); files = (files || []).slice(0, 5);
    if (!ch || (!text && !files.length) || customerById(id).blocked) return false;
    // An unedited quick command goes out as plain bot text; anything typed by the manager gets the manager prefix (A-22).
    var cmd = !!text && state.settings.commands.some(function (c) { return c.text.trim() === text; });
    ch.messages.push({ from: 'm', at: D.now, text: text, cmd: cmd, files: files }); ch.unread = false; emit(); return cmd ? 'cmd' : 'text';
  }
  function toggleMark(id) { var ch = chatOf(id); if (ch) { ch.marked = !ch.marked; emit(); } }

  /* ---------- settings (A-16, A-1, A-20) ---------- */
  function setSetting(k, v) { state.settings[k] = v; emit(); }
  function addCity(name) {
    name = String(name || '').trim().replace(/\s+/g, ' ');
    if (!name) return { error: 'Введите название города' };
    if (state.settings.cities.some(function (c) { return norm(c) === norm(name); })) return { error: 'Такой город уже есть в списке' };
    state.settings.cities.push(name); state.settings.cities.sort(function (a, b) { return a.localeCompare(b, 'ru'); });
    emit(); return { ok: true };
  }
  function removeCity(name) { state.settings.cities = state.settings.cities.filter(function (c) { return c !== name; }); emit(); }
  function cityInUse(name) { return state.orders.filter(function (o) { return o.delivery.type === 'minibus' && o.delivery.city === name && o.status !== 'dispatched'; }).length; }
  function saveItem(list, id, fields) { // shared by quick commands and FAQ entries
    var it = id ? list.filter(function (x) { return x.id === id; })[0] : null;
    if (!it) { it = { id: 'n' + Date.now() + Math.random().toString(36).slice(2, 6) }; list.push(it); }
    Object.keys(fields).forEach(function (k) { it[k] = fields[k]; });
    emit();
  }
  function cmdName(v) { return String(v || '').trim().replace(/^\/+/, '').toLowerCase(); }
  function saveCommand(id, cmd, text) {
    cmd = cmdName(cmd); text = String(text || '').trim();
    if (!/^[a-zа-яё0-9_]{2,20}$/.test(cmd)) return { error: 'Команда: от 2 до 20 букв или цифр без пробелов, например тег' };
    if (!text) return { error: 'Введите текст сообщения для команды' };
    if (state.settings.commands.some(function (c) { return c.id !== id && c.cmd === cmd; })) return { error: 'Команда /' + cmd + ' уже есть' };
    saveItem(state.settings.commands, id, { cmd: cmd, text: text }); return { ok: true };
  }
  function saveFaq(id, q, a) {
    q = String(q || '').trim(); a = String(a || '').trim();
    if (!q || !a) return { error: 'Заполните и вопрос, и ответ' };
    saveItem(state.settings.faq, id, { q: q, a: a }); return { ok: true };
  }
  function removeItem(key, id) { state.settings[key] = state.settings[key].filter(function (x) { return x.id !== id; }); emit(); }
  function findCommands(q) { q = cmdName(q); return state.settings.commands.filter(function (c) { return c.cmd.indexOf(q) === 0; }); }
  function setText(id, text) { state.settings.texts.forEach(function (t) { if (t.id === id) t.text = text; }); emit(); }
  // A-1: keys are generated, never typed; a new key ends every ordinary-manager session.
  function newManagerKey() {
    var abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', buf = new Uint32Array(20), out = '';
    (window.crypto || window.msCrypto).getRandomValues(buf);
    for (var i = 0; i < 20; i++) out += (i && i % 4 === 0 ? '-' : '') + abc[buf[i] % abc.length];
    state.managerKey = 'MGR-' + out; emit(); return state.managerKey;
  }
  function packerReport() { return D.packers.slice(); }

  /* ---------- queue (A-2) ---------- */
  function queue(f) {
    f = f || {};
    var q = norm(f.q || '');
    return state.orders.filter(function (o) {
      var c = customer(o);
      if (q && String(o.number).indexOf(q) < 0 && norm(c.name + ' ' + c.person + ' ' + o.siteTag).indexOf(q.replace(/^@/, '')) < 0) return false;
      if (f.status && o.status !== f.status) return false;
      if (f.delivery && o.delivery.type !== f.delivery) return false;
      var day = o.receivedAt.slice(0, 10);
      if (f.from && day < f.from) return false;
      if (f.to && day > f.to) return false;
      return true;
    }).sort(function (a, b) {
      var x = sortValue(a, f.sort), y = sortValue(b, f.sort), d = x < y ? -1 : x > y ? 1 : b.number - a.number;
      return f.dir === 'asc' ? d : -d;
    });
  }
  function sortValue(o, key) {
    if (key === 'number') return o.number;
    if (key === 'name') return norm(customer(o).name).replace(/^@/, '');
    if (key === 'total') return compute(o).total;
    if (key === 'delivery') return delivery(o.delivery.type).label;
    if (key === 'status') return STATUSES.map(function (s) { return s.id; }).indexOf(o.status);
    return o.receivedAt;
  }

  /* ---------- formatting ---------- */
  function money(n) { return r2(n).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' BYN'; }
  function price(n) { return n == null ? '' : String(Math.round(n * 10000) / 10000).replace('.', ','); }
  function dateTime(iso) {
    var d = new Date(iso), p = function (x) { return (x < 10 ? '0' : '') + x; };
    return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }

  load();
  window.SWP = {
    TIERS: TIERS, STATUSES: STATUSES, DELIVERY: DELIVERY, MAX_TRIES: MAX_TRIES,
    get CITIES() { return state.settings.cities.slice(); }, get KEYS() { return { admin: D.keys.admin, manager: state.managerKey }; },
    on: on, reset: reset, get flags() { return state.flags; }, setFlag: function (k, v) { state.flags[k] = v; emit(); },
    session: session, signIn: signIn, signOut: signOut, muteLeft: muteLeft, expireSession: expireSession, endMute: endMute,
    security: function () { return state.security.slice(); },
    order: order, customer: customer, customerById: customerById, renameCustomer: renameCustomer, setOrderCustomer: setOrderCustomer,
    customerOrders: customerOrders, findCustomers: findCustomers, status: status, delivery: delivery, editable: editable, compute: compute, queue: queue,
    undoPrice: undoPrice, canUndoPrice: canUndoPrice, TRACK_RE: TRACK_RE,
    setLinePrice: setLinePrice, applyTier: applyTier, applyCustomerPrice: applyCustomerPrice, setQty: setQty, addItem: addItem,
    restoreItem: restoreItem, patchOrder: patchOrder, setDelivery: setDelivery, setDeliveryField: setDeliveryField,
    searchProducts: searchProducts, lineName: lineName, flavor: flavor, product: function (id) { return products[id]; },
    packingMessage: packingMessage, writeToMoySklad: writeToMoySklad, sendPacking: sendPacking, approveReceipt: approveReceipt,
    approvePhone: approvePhone, offerOtherDelivery: offerOtherDelivery, setBlocked: setBlocked, receiptToMinibus: receiptToMinibus,
    canReturn: canReturn, returnForEditing: returnForEditing, removeOrder: removeOrder, restoreOrder: restoreOrder, askRefundDetails: askRefundDetails, payRefund: payRefund, addCustomTask: addCustomTask, closeCustomTask: closeCustomTask,
    addonTargets: addonTargets, setKind: setKind, setOriginal: setOriginal, backToPacking: backToPacking, resendEdited: resendEdited,
    saveCommand: saveCommand, saveFaq: saveFaq, removeItem: removeItem, findCommands: findCommands, mergeTarget: mergeTarget,
    sendDispatch: sendDispatch, setChangedInMs: setChangedInMs,
    chatOf: chatOf, chatList: chatList, readChat: readChat, sendChat: sendChat, toggleMark: toggleMark,
    settings: function () { return state.settings; }, setSetting: setSetting, addCity: addCity, removeCity: removeCity, cityInUse: cityInUse, setText: setText,
    newManagerKey: newManagerKey, packerReport: packerReport,
    tasks: tasks, postList: postList, confirmDispatch: confirmDispatch, revertDispatch: revertDispatch, canRevertDispatch: canRevertDispatch, closePostCheck: closePostCheck, openPostCheck: openPostCheck,
    markRemoteChange: function (n) { var o = order(n); if (o) { o.remoteChanged = true; emit(); } },
    clearRemoteChange: function (n) { var o = order(n); if (o) { o.remoteChanged = false; emit(); } },
    round5: round5, distribute: distribute, qtyTier: qtyTier, money: money, price: price, dateTime: dateTime, esc: esc
  };

  /* ---------- rule self-checks ---------- */
  console.assert(round5(172) === 170 && round5(173) === 175 && round5(177) === 175 && round5(178) === 180 && round5(172.5) === 175, 'S-4: nearest 5 BYN, ties up');
  var rows = [{ sum: 95, price: 9.5 }, { sum: 52.2, price: 8.7 }, { sum: 25.8, price: 12.9 }]; // 173 -> 175, +2 spread over rows
  var out = distribute(rows, 175);
  console.assert(Math.round(out.reduce(function (a, v) { return a + v; }, 0) * 100) === 17500, 'AC-79: item rows add up exactly to the rounded total');
  console.assert(out.every(function (v, i) { return v >= rows[i].sum; }), 'AC-79: a positive rounding difference never lowers a row');
  console.assert(qtyTier(29) === 10 && qtyTier(30) === 30 && qtyTier(100) === 100, 'A-5: tier by units');
})();
