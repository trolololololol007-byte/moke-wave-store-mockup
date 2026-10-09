/* Smoke Wave customer store mockup: shared core (PRD 5.4: W-1, W-5, W-6, W-11, W-14 to W-19).
   - One price tier for the whole order, set by total units: 1-29 -> 10+, 30-49 -> 30+, 50-99 -> 50+, 100+ -> 100+.
   - Catalog shows the selected tier; the basket shows actual prices and how many units are missing to the selected tier.
   - Minimum order: 100 BYN and 5 units. Products without stock are hidden.
   - Checkout fields depend on the delivery method; checkout opens the bot with a one-time link.
   Load after data.js; the UI calls SW.init(name) and renders itself. */
(function () {
  'use strict';
  var D = window.SW_DATA;
  var TIERS = D.tiers.slice(); // [10, 30, 50, 100]
  var MIN_SUM = 100;
  var MIN_UNITS = 5;
  var BOT = 'https://t.me/smokewave_bot';

  /* ---------- catalog: available products only (W-11) ---------- */
  var folders = {}, kids = {}, byFolder = {}, products = {};
  var visible = D.products.filter(function (p) { return p.stock > 0; });
  D.folders.forEach(function (f) { folders[f.id] = f; });
  visible.forEach(function (p) { products[p.id] = p; (byFolder[p.folderId] = byFolder[p.folderId] || []).push(p); });
  var byName = function (a, b) { return a.name.localeCompare(b.name, 'ru'); };
  Object.keys(byFolder).forEach(function (k) { byFolder[k].sort(byName); });
  // a folder is visible only if it contains (at any depth) an available product
  var hasStock = {};
  Object.keys(byFolder).forEach(function (id) { var f = folders[id]; while (f) { hasStock[f.id] = true; f = folders[f.parentId]; } });
  D.folders.forEach(function (f) { if (hasStock[f.id]) (kids[f.parentId || 'root'] = kids[f.parentId || 'root'] || []).push(f); });
  Object.keys(kids).forEach(function (k) { kids[k].sort(byName); });

  function children(id) { return (kids[id || 'root'] || []).slice(); }
  function path(id) { var out = []; var f = folders[id]; while (f) { out.unshift(f); f = folders[f.parentId]; } return out; }
  function isLine(id) { return !!byFolder[id]; }
  function lines(id) {
    var out = [];
    (function walk(fid) { if (fid && isLine(fid)) out.push(folders[fid]); children(fid).forEach(function (c) { walk(c.id); }); })(id || null);
    return out;
  }
  function productsIn(id, deep) {
    if (!deep) return (byFolder[id] || []).slice();
    return lines(id).reduce(function (a, l) { return a.concat(byFolder[l.id]); }, []);
  }
  // Home (W-18): all available products in a row. Phase 1 uses catalog tree order;
  // in Phase 2 the order is configured in the manager panel.
  function allProducts() { return productsIn(null, true); }
  function countIn(id) { return productsIn(id, true).length; }
  function flavor(p) {
    var parts = p.name.split(' - ');
    if (parts.length < 2) return p.name;
    return parts.slice(1).join(' - ').replace(/\s*-\s*\d+$/, '');
  }
  function lineOf(p) { return folders[p.folderId]; }
  function price(p, tier) { return p.prices[tier]; }

  /* ---------- price tiers ---------- */
  function qtyTier(q) { return q >= 100 ? 100 : q >= 50 ? 50 : q >= 30 ? 30 : 10; }
  function nextTier(t) { var i = TIERS.indexOf(t); return i >= 0 && i < TIERS.length - 1 ? TIERS[i + 1] : null; }
  function tierLabel(t) { return 'от ' + t + ' шт'; }

  /* ---------- search (W-15) ---------- */
  var EN = "qwertyuiop[]asdfghjkl;'zxcvbnm,.`";
  var RU = 'йцукенгшщзхъфывапролджэячсмитьбюё';
  function swapLayout(s) {
    return s.split('').map(function (ch) {
      var i = EN.indexOf(ch); if (i >= 0) return RU[i];
      var j = RU.indexOf(ch); if (j >= 0) return EN[j];
      return ch;
    }).join('');
  }
  function norm(s) { return String(s).toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim(); }
  function search(q) {
    q = norm(q); if (!q) return [];
    var variants = [q, norm(swapLayout(q))];
    var groups = {}, order = [];
    allProducts().forEach(function (p) {
      var hay = norm(p.name + ' ' + path(p.folderId).map(function (f) { return f.name; }).join(' '));
      var hit = variants.some(function (v) { return v.split(' ').every(function (t) { return hay.indexOf(t) >= 0; }); });
      if (!hit) return;
      if (!groups[p.folderId]) { groups[p.folderId] = { line: folders[p.folderId], path: path(p.folderId), products: [] }; order.push(p.folderId); }
      groups[p.folderId].products.push(p);
    });
    return order.map(function (id) { return groups[id]; });
  }

  /* ---------- state ---------- */
  var key = 'sw-mock', state = { tier: 10, cart: {} }, subs = [], prevTier = null;
  function load() { try { var s = JSON.parse(localStorage.getItem(key)); if (s && s.cart) state = s; } catch (e) {} }
  function save() { try { localStorage.setItem(key, JSON.stringify(state)); } catch (e) {} }

  function init(variant) {
    key = 'sw-mock-' + (variant || 'x');
    load();
    var m = /[?&]tier=(\d+)/.exec(location.search);
    if (m && TIERS.indexOf(+m[1]) >= 0) state.tier = +m[1];
    if (TIERS.indexOf(state.tier) < 0) state.tier = 10;
    Object.keys(state.cart).forEach(function (id) { if (!products[id]) delete state.cart[id]; });
    prevTier = quote().tier;
    save();
    return api;
  }
  function on(fn) { subs.push(fn); fn(quote(), []); return function () { subs = subs.filter(function (f) { return f !== fn; }); }; }
  function emit(silent) {
    save();
    var q = quote(), events = [];
    if (!silent && q.tier > (prevTier || state.tier) && q.upgraded && q.savings > 0) events.push({ type: 'upgrade', tier: q.tier, savings: q.savings, units: q.units });
    prevTier = q.tier;
    subs.forEach(function (f) { f(q, events); });
  }

  function setTier(t) { if (TIERS.indexOf(t) < 0) return; state.tier = t; emit(true); }
  function qty(id) { return state.cart[id] || 0; }
  function setQty(id, n) {
    var p = products[id]; if (!p) return 0;
    n = Math.max(0, Math.min(Math.floor(+n || 0), p.stock));
    if (n) state.cart[id] = n; else delete state.cart[id];
    emit(); return n;
  }
  function addQty(id, d) { return setQty(id, qty(id) + d); }
  function fillLine(lineId, n) { // "N of each flavor in the line"
    (byFolder[lineId] || []).forEach(function (p) { state.cart[p.id] = Math.min(qty(p.id) + n, p.stock); });
    emit();
  }
  function clearCart() { state.cart = {}; prevTier = null; emit(true); }

  /* ---------- basket and prices (W-1, W-5, W-14) ----------
     One tier for the whole order: max(selected tier, tier by total unit count). */
  function quote(cart, selected) {
    cart = cart || state.cart; selected = selected || state.tier;
    var units = 0;
    Object.keys(cart).forEach(function (id) { if (products[id]) units += cart[id] || 0; });
    var tier = qtyTier(units); // the selected tier is a target, not a minimum
    var lineMap = {}, order = [];
    Object.keys(cart).forEach(function (id) {
      var p = products[id]; if (!p || !cart[id]) return;
      if (!lineMap[p.folderId]) { lineMap[p.folderId] = { line: folders[p.folderId], path: path(p.folderId), items: [], qty: 0, sum: 0 }; order.push(p.folderId); }
      var it = { product: p, qty: cart[id], price: price(p, tier), basePrice: price(p, selected) };
      it.sum = r2(it.price * it.qty); it.baseSum = r2(it.basePrice * it.qty);
      lineMap[p.folderId].items.push(it); lineMap[p.folderId].qty += it.qty; lineMap[p.folderId].sum += it.sum;
    });
    var res = { selected: selected, tier: tier, upgraded: tier > selected, lines: [], positions: 0, units: units, sum: 0, baseSum: 0, savings: 0 };
    order.sort(function (a, b) { return folders[a].name.localeCompare(folders[b].name, 'ru'); }).forEach(function (id) {
      var l = lineMap[id]; l.sum = r2(l.sum);
      l.items.sort(function (a, b) { return a.product.name.localeCompare(b.product.name, 'ru'); });
      l.items.forEach(function (it) { res.sum += it.sum; res.baseSum += it.baseSum; });
      res.positions += l.items.length; res.lines.push(l);
    });
    res.sum = r2(res.sum); res.baseSum = r2(res.baseSum); res.savings = Math.max(0, r2(res.baseSum - res.sum));
    res.short = units > 0 && selected > tier ? { tier: selected, need: selected - units, extra: r2(res.sum - res.baseSum) } : null;
    var nt = nextTier(tier);
    res.next = null;
    if (nt && units > 0 && !res.short) {
      var all = res.lines.reduce(function (a, l) { return a.concat(l.items); }, []);
      var perUnit = r2(all.reduce(function (a, it) { return a + (price(it.product, tier) - price(it.product, nt)) * it.qty; }, 0) / units);
      if (perUnit > 0) res.next = { tier: nt, need: nt - units, perUnit: perUnit };
    }
    var needSum = Math.max(0, r2(MIN_SUM - res.sum)), needUnits = Math.max(0, MIN_UNITS - units);
    res.min = { ok: needSum === 0 && needUnits === 0, needSum: needSum, needUnits: needUnits, minSum: MIN_SUM, minUnits: MIN_UNITS,
      sumProgress: Math.min(1, res.sum / MIN_SUM), unitsProgress: Math.min(1, units / MIN_UNITS), message: minMessage(needSum, needUnits) };
    return res;
  }
  function minMessage(s, u) {
    if (!s && !u) return '';
    var parts = [];
    if (s) parts.push(money(s));
    if (u) parts.push(u + ' шт');
    return 'Доберите ещё ' + parts.join(' и ');
  }

  /* ---------- checkout (W-6, W-8, W-17) ---------- */
  var WARN = 'Если данные указаны неверно, могут возникнуть проблемы с доставкой заказа.';
  var DELIVERY = [
    { id: 'minsk-address', title: 'Минск, на адрес', hint: 'Курьер, доплата 15 BYN',
      fields: [{ id: 'address', label: 'Адрес доставки', placeholder: 'ул. Притыцкого, 29, кв. 12', required: true }], warning: WARN },
    { id: 'minsk-minibus', title: 'Минск, маршрутка', hint: 'Доплата 5 BYN',
      fields: [{ id: 'phone', label: 'Телефон для водителя', placeholder: '+375 29 123-45-67', type: 'tel', required: true }],
      warning: 'Укажите номер, на который точно можно дозвониться. Если водитель не дозвонится, могут возникнуть проблемы с заказом.' },
    { id: 'minibus', title: 'Маршрутка в областной город', hint: '1–2 дня, водителю ~10 BYN сверх накладной',
      fields: [{ id: 'city', label: 'Город', type: 'select', options: null, required: true },
               ], warning: WARN },
    { id: 'post', title: 'Белпочта', hint: '3–5 дней, предоплата, +10 BYN',
      fields: [{ id: 'fullName', label: 'ФИО получателя', placeholder: 'Иванов Иван Иванович', required: true },
               { id: 'postcode', label: 'Индекс', placeholder: '220000', inputmode: 'numeric', required: true },
               { id: 'address', label: 'Адрес с городом', placeholder: 'г. Гомель, ул. Советская, 10, кв. 5', required: true }],
      warning: 'Если данные для Белпочты указаны неверно, могут возникнуть проблемы с оформлением и отправкой заказа.' }
  ];
  var CITIES = ['Брест', 'Витебск', 'Гомель', 'Гродно', 'Могилёв', 'Барановичи', 'Бобруйск', 'Борисов', 'Лида', 'Молодечно', 'Мозырь', 'Новополоцк', 'Орша', 'Пинск', 'Полоцк', 'Солигорск'];
  DELIVERY[2].fields[0].options = CITIES;
  function delivery(id) { return DELIVERY.filter(function (d) { return d.id === id; })[0] || null; }
  function validate(form) {
    var e = {};
    if (!/^@[A-Za-z0-9_]{5,32}$/.test(String(form.telegram || '').trim())) e.telegram = 'Укажите ник в Telegram в формате @username';
    var d = delivery(form.delivery);
    if (!d) e.delivery = 'Выберите способ доставки';
    else d.fields.forEach(function (f) {
      var v = String(form[f.id] || '').trim();
      if (f.required && !v) { e[f.id] = f.id === 'city' ? 'Выберите город' : 'Заполните поле «' + f.label + '»'; return; }
      if (f.id === 'phone' && !/^\+?375\s?\(?(25|29|33|44)\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/.test(v)) e.phone = 'Номер в формате +375 29 123-45-67';
      if (f.id === 'postcode' && !/^2\d{5}$/.test(v)) e.postcode = 'Индекс из 6 цифр, например 220000';
      if (f.id === 'fullName' && v.split(/\s+/).length < 2) e.fullName = 'Укажите фамилию и имя полностью';
    });
    var q = quote(); if (!q.min.ok) e.basket = q.min.message;
    return e;
  }
  // Customer details draft: kept until "Place a new order" (W-17)
  function saveForm(form) { try { localStorage.setItem(key + '-form', JSON.stringify(form)); } catch (x) {} }
  function loadForm() { try { return JSON.parse(localStorage.getItem(key + '-form')) || {}; } catch (x) { return {}; } }
  function newOrder() { try { localStorage.removeItem(key + '-form'); localStorage.removeItem(key + '-last'); } catch (x) {} state.cart = {}; prevTier = null; emit(true); }
  function placeOrder(form) { // W-8 + W-17: the order is created; confirmation happens in the bot
    var err = validate(form); if (Object.keys(err).length) return { errors: err };
    saveForm(form);
    var n; try { n = +(localStorage.getItem('sw-mock-order-seq') || 1111) + 1; localStorage.setItem('sw-mock-order-seq', n); } catch (x) { n = 1112; }
    var token = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
    var saved = { number: n, token: token, form: form, cart: state.cart, tier: state.tier, status: 'Ждёт подтверждения в Telegram', at: new Date().toISOString() };
    try { localStorage.setItem(key + '-last', JSON.stringify(saved)); } catch (x) {}
    state.cart = {}; prevTier = null; emit(true);
    saved.quote = quote(saved.cart, saved.tier);
    return { order: saved };
  }
  function lastOrder() {
    try { var o = JSON.parse(localStorage.getItem(key + '-last')); if (!o) return null; o.quote = quote(o.cart, o.tier); return o; } catch (x) { return null; }
  }
  function botLink(token) { return token ? BOT + '?start=o_' + token : BOT; } // W-17: the one-time link binds the order to the Telegram account
  function copyNumber(n) { // call directly inside the click handler
    var t = String(n);
    try { if (navigator.clipboard) return navigator.clipboard.writeText(t).then(function () { return true; }, function () { return fallbackCopy(t); }); } catch (x) {}
    return Promise.resolve(fallbackCopy(t));
  }
  function fallbackCopy(t) { try { var a = document.createElement('textarea'); a.value = t; a.setAttribute('readonly', ''); a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select(); var ok = document.execCommand('copy'); a.remove(); return ok; } catch (x) { return false; } }
  function catalogPrice(p) { return price(p, state.tier); } // W-5: no quantity-based repricing in the catalog
  function cartNotice(q) { q = q || quote(); return q.upgraded && q.savings > 0 ? 'Вы набрали ' + tierLabel(q.tier) + ': цены в корзине пересчитаны, ваша скидка ' + money(q.savings) : ''; }

  /* ---------- demo scenarios ---------- */
  var DEMO = {
    // 10+ selected, 50 units across lines -> 50+ prices for the whole order, discount
    upgrade: { tier: 10, cart: { '8a497433-ac51-11f1-0a80-1b53001ba3c4': 20, '8a4f20c6-ac51-11f1-0a80-1b53001ba3cc': 10, 'aca40fd3-ac50-11f1-0a80-1b53001a2f24': 10, '1d9a370c-ac51-11f1-0a80-1b53001afb6e': 5, 'b6d3cf74-ac50-11f1-0a80-1b53001a44e5': 5 } },
    // 100+ selected, 10 units -> basket at 10+ prices, 90 units missing to 100+
    individual: { tier: 100, cart: { '8a497433-ac51-11f1-0a80-1b53001ba3c4': 5, '8a4f20c6-ac51-11f1-0a80-1b53001ba3cc': 5 } },
    // Below minimum: 3 units for about 31 BYN
    below: { tier: 10, cart: { 'b6d3cf74-ac50-11f1-0a80-1b53001a44e5': 2, '1d9a370c-ac51-11f1-0a80-1b53001afb6e': 1 } },
    // Minimum met by one product: 11 units = 104.50 BYN -> checkout allowed
    single: { tier: 10, cart: { '8a497433-ac51-11f1-0a80-1b53001ba3c4': 11 } }
  };
  function demo(name) { var d = DEMO[name]; if (!d) return; state.tier = d.tier; state.cart = JSON.parse(JSON.stringify(d.cart)); prevTier = null; emit(true); }

  /* ---------- formatting ---------- */
  function r2(n) { return Math.round(n * 100) / 100; }
  function money(n) { return r2(n).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' BYN'; }
  function plural(n, one, few, many) { var a = Math.abs(n) % 100, b = a % 10; if (a > 10 && a < 20) return many; if (b > 1 && b < 5) return few; if (b === 1) return one; return many; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function upgradeText(ev) { return 'Вы набрали ' + tierLabel(ev.tier) + ': вам выдана скидка ' + money(ev.savings); }

  var api = window.SW = {
    TIERS: TIERS, MIN_SUM: MIN_SUM, MIN_UNITS: MIN_UNITS, DELIVERY: DELIVERY, CITIES: CITIES, delivery: delivery,
    init: init, on: on, get tier() { return state.tier; }, cart: function () { return Object.assign({}, state.cart); },
    folder: function (id) { return folders[id]; }, product: function (id) { return products[id]; },
    roots: function () { return children(null); }, children: children, path: path, isLine: isLine, lines: lines,
    productsIn: productsIn, allProducts: allProducts, countIn: countIn, flavor: flavor, lineOf: lineOf, price: price,
    qtyTier: qtyTier, nextTier: nextTier, tierLabel: tierLabel, search: search, swapLayout: swapLayout,
    setTier: setTier, qty: qty, setQty: setQty, addQty: addQty, fillLine: fillLine, clearCart: clearCart,
    quote: quote, validate: validate, placeOrder: placeOrder, lastOrder: lastOrder, botLink: botLink, demo: demo,
    copyNumber: copyNumber, catalogPrice: catalogPrice, cartNotice: cartNotice, saveForm: saveForm, loadForm: loadForm, newOrder: newOrder,
    money: money, plural: plural, esc: esc, upgradeText: upgradeText
  };

  /* ---------- rule self-checks ---------- */
  var a = quote(DEMO.upgrade.cart, 10);
  console.assert(a.units === 50 && a.tier === 50 && a.savings > 0 && a.min.ok, '10+ with 50 units in the order -> 50+ prices for the whole order');
  var b = quote(DEMO.individual.cart, 100);
  console.assert(b.tier === 10 && b.short && b.short.need === 90, '100+ with 10 units -> 10+ prices, 90 units missing');
  var s40 = quote({ '8a497433-ac51-11f1-0a80-1b53001ba3c4': 40 }, 50);
  console.assert(s40.tier === 30 && s40.short.need === 10, 'units decide the tier; the basket shows units missing to the selected tier');
  var c = quote(DEMO.below.cart, 10);
  console.assert(!c.min.ok && c.min.needUnits === 2, 'below minimum: units missing');
  console.assert(quote(DEMO.single.cart, 10).min.ok, 'one product with 11 units meets the minimum');
  console.assert(allProducts().every(function (p) { return p.stock > 0; }), 'only available products are shown');
  console.assert(swapLayout('flfh') === 'адар', 'keyboard layout swap');
})();
