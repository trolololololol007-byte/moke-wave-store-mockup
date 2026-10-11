/* Smoke Wave manager panel mockup: synthetic customers and orders.
   Products and folders come from ../data.js (window.SW_DATA).
   Every customer, tag, phone, address and note here is invented.
   Order items are [lineFolderId, productIndexInLine, quantity]; core.js resolves them to products. */
(function () {
  'use strict';
  var L = {
    sour: '8a2421bf-ac51-11f1-0a80-1b53001ba389',
    strong: '871ce618-ac51-11f1-0a80-1b53001b9f2e',
    parts: 'abb1b195-ac50-11f1-0a80-1b53001a2e00',
    bcpro: '121f2c9d-ac51-11f1-0a80-1b53001ae6ae',
    duke: '15695eb4-ac51-11f1-0a80-1b53001aec5d',
    catswill: 'fcddd4dd-ac50-11f1-0a80-1b53001ac4b3',
    chappman: '010062bd-ac51-11f1-0a80-1b53001accd9',
    elfliq: '1cb6f79a-ac51-11f1-0a80-1b53001af941',
    husky: 'b023baa6-ac50-11f1-0a80-1b53001a3684',
    acid: 'b6a8b773-ac50-11f1-0a80-1b53001a449a',
    skala: 'b8201d6d-ac50-11f1-0a80-1b53001a4728',
    lush: '118cc49e-ac51-11f1-0a80-1b53001ae5ac'
  };

  window.SWP_DATA = {
    now: '2026-10-10T12:00:00',
    // Mock access keys, shown on the sign-in screen of the mockup only.
    keys: { manager: 'MGR-7Q4K-P2XD-9LTA-W6HN', admin: 'ADM-3F8R-V5YC-K1ZE-J9QB' },
    customers: [
      { id: 'c1', tgId: 481120934, name: '@vape_gomel', person: 'Андрей', history: [[L.sour, 8.9, 1098, '2026-09-28'], [L.skala, 8.6, 1071, '2026-09-12']] },
      { id: 'c2', tgId: 502771468, name: '@minsk_cloud', person: 'Марина', history: [[L.bcpro, 28.5, 1102, '2026-10-01']] },
      { id: 'c3', tgId: 377905512, name: '@parovoz_brest', person: 'Сергей', history: [[L.sour, 8.4, 1090, '2026-09-24'], [L.husky, 8.5, 1090, '2026-09-24'], [L.catswill, 12.2, 1064, '2026-09-08']] },
      { id: 'c4', tgId: 618340027, name: '@dym_vitebsk', person: 'Ольга', history: [] },
      { id: 'c5', tgId: 512345678, name: 'Олег (id512345678)', person: 'Олег', history: [[L.parts, 7.9, 1085, '2026-09-21']] },
      { id: 'c6', tgId: 455019283, name: '@lida_vape', person: 'Виктор', history: [[L.skala, 8.7, 1077, '2026-09-15']] },
      { id: 'c7', tgId: 590226741, name: '@grodno_par', person: 'Наталья', history: [[L.acid, 10.5, 1059, '2026-09-04']] },
      { id: 'retail', name: 'Розничный покупатель', person: '', history: [] }
    ],
    // Bot conversations: c = customer, m = manager, bot = automated message.
    chats: [
      { customer: 'c7', marked: false, unread: true, messages: [
        { from: 'bot', at: '2026-10-08T16:21:00', order: 1117, text: 'Заказ 1117 принят. Способ доставки: Белпочта.' },
        { from: 'bot', at: '2026-10-08T17:40:00', order: 1117, text: 'Накладная и реквизиты для оплаты. К оплате 165 + 10 BYN.' },
        { from: 'c', at: '2026-10-09T09:12:00', order: 1117, text: 'Оплатила, чек отправила. Когда отправите?' } ] },
      { customer: 'c2', marked: true, unread: true, messages: [
        { from: 'c', at: '2026-10-07T14:02:00', order: 1115, text: 'Курьер не дозвонился, можно перенести на завтра?' },
        { from: 'm', at: '2026-10-07T14:10:00', order: 1115, text: 'Да, перенесли на завтра до обеда.' },
        { from: 'bot', at: '2026-10-10T09:16:00', order: 1123, text: 'Заказ 1123: укажите телефон для водителя маршрутки.' },
        { from: 'c', at: '2026-10-10T09:18:00', order: 1123, text: '+375 29 555-01-23, это номер брата, он заберёт.' } ] },
      { customer: 'c1', marked: false, unread: false, messages: [
        { from: 'bot', at: '2026-10-10T10:43:00', order: 1124, text: 'Заказ 1124 принят. Маршрутка в Гомель, водителю около 10 BYN сверх накладной.' },
        { from: 'c', at: '2026-10-10T10:45:00', order: 1124, text: 'Спасибо, жду накладную.' },
        { from: 'm', at: '2026-10-10T10:50:00', order: 1124, text: 'Обработаем в течение часа.' } ] },
      { customer: 'c5', marked: false, unread: false, messages: [
        { from: 'bot', at: '2026-10-09T17:06:00', order: 1120, text: 'Заказ 1120 принят. Маршрутка в Гродно.' } ] },
      { customer: 'c3', marked: true, unread: false, messages: [
        { from: 'c', at: '2026-10-08T10:30:00', order: 1116, text: 'В прошлый раз не доложили две позиции, проверьте в этот раз, пожалуйста.' },
        { from: 'm', at: '2026-10-08T10:41:00', order: 1116, text: 'Проверим отдельно, спасибо, что написали.' } ] }
    ],
    packers: [
      { user: '@packer_ivan', packed: 46, repacked: 2, dismantled: 1 },
      { user: '@sklad_katya', packed: 38, repacked: 0, dismantled: 0 },
      { user: '@dima_pack', packed: 21, repacked: 1, dismantled: 2 }
    ],
    orders: [
      { number: 1125, receivedAt: '2026-10-10T11:31:00', customer: 'retail', siteTag: '@new_shop_mogilev', kind: 'main', status: 'new', tier: 10,
        delivery: { type: 'minibus', city: 'Могилёв' },
        items: [[L.sour, 0, 6], [L.sour, 1, 6]], customerNote: '' },
      { number: 1124, receivedAt: '2026-10-10T10:42:00', customer: 'c1', kind: 'main', status: 'accepted', tier: 30,
        delivery: { type: 'minibus', city: 'Гомель' },
        items: [[L.sour, 0, 10], [L.sour, 1, 8], [L.sour, 2, 6], [L.skala, 0, 5], [L.skala, 1, 5], [L.elfliq, 1, 4]],
        customerNote: 'Позвоните водителю заранее, пожалуйста.' },
      { number: 1123, receivedAt: '2026-10-10T09:15:00', customer: 'c2', kind: 'main', status: 'phone', tier: 10,
        delivery: { type: 'minsk-minibus', phone: '+375 29 555-01-23' },
        items: [[L.bcpro, 0, 4], [L.duke, 0, 2], [L.duke, 1, 3], [L.lush, 0, 3]], customerNote: '' },
      { number: 1122, receivedAt: '2026-10-10T08:50:00', customer: 'c3', kind: 'main', status: 'accepted', tier: 50,
        delivery: { type: 'post', fullName: 'Ковалёв Сергей Петрович', address: 'г. Брест, ул. Советская, 10, кв. 5', postcode: '224005' },
        items: [[L.sour, 0, 15], [L.sour, 1, 15], [L.husky, 2, 12], [L.husky, 1, 5], [L.catswill, 0, 8]], customerNote: 'Хрупкое не кладите вниз.' },
      { number: 1121, receivedAt: '2026-10-09T19:30:00', customer: 'c4', kind: 'main', status: 'accepted', tier: 10,
        delivery: { type: 'minsk-address', address: 'Минск, ул. Притыцкого, 29, кв. 12' },
        items: [[L.acid, 2, 6], [L.acid, 3, 2], [L.chappman, 0, 4]], customerNote: '' },
      { number: 1120, receivedAt: '2026-10-09T17:05:00', customer: 'c5', kind: 'main', status: 'accepted', tier: 30,
        delivery: { type: 'minibus', city: 'Гродно' },
        items: [[L.parts, 0, 20], [L.parts, 2, 15], [L.parts, 5, 5]], customerNote: '' },
      { number: 1119, receivedAt: '2026-10-09T15:40:00', customer: 'c6', kind: 'addon', original: 1118, status: 'accepted', tier: 10,
        delivery: { type: 'minibus', city: 'Лида' },
        items: [[L.skala, 0, 6], [L.strong, 0, 4]], customerNote: 'Положите в ту же посылку.' },
      { number: 1118, receivedAt: '2026-10-09T11:02:00', customer: 'c6', kind: 'main', status: 'packing', tier: 30,
        delivery: { type: 'minibus', city: 'Лида' },
        items: [[L.skala, 0, 12], [L.skala, 1, 12], [L.chappman, 0, 8]], customerNote: '', prices: [[L.skala, 8.7], [L.chappman, 9]] },
      { number: 1117, receivedAt: '2026-10-08T16:20:00', customer: 'c7', kind: 'main', status: 'payment', tier: 10,
        delivery: { type: 'post', fullName: 'Савицкая Наталья Игоревна', address: 'г. Гродно, ул. Ожешко, 22, кв. 3', postcode: '230023' },
        items: [[L.acid, 2, 8], [L.catswill, 0, 6]], customerNote: '', tracking: 'PC123456789BY', prices: [[L.acid, 10.5], [L.catswill, 13.5]] },
      { number: 1116, receivedAt: '2026-10-08T10:10:00', customer: 'c3', kind: 'main', status: 'packed', tier: 50,
        delivery: { type: 'minibus', city: 'Брест' },
        items: [[L.sour, 0, 20], [L.sour, 2, 20], [L.husky, 2, 10]], customerNote: '', prices: [[L.sour, 8.4], [L.husky, 8.5]] },
      { number: 1115, receivedAt: '2026-10-07T13:45:00', customer: 'c2', kind: 'main', status: 'dispatched', tier: 10,
        delivery: { type: 'minsk-address', address: 'Минск, пр. Независимости, 95, оф. 4' },
        items: [[L.bcpro, 0, 2], [L.lush, 0, 5]], customerNote: '', prices: [[L.bcpro, 28.5], [L.lush, 32]] },
      { number: 1114, receivedAt: '2026-10-07T11:20:00', customer: 'c1', kind: 'main', status: 'packed', tier: 10,
        delivery: { type: 'post', fullName: 'Мельник Андрей Олегович', address: 'г. Гомель, ул. Кирова, 14, кв. 8', postcode: '246050' },
        items: [[L.sour, 0, 8], [L.skala, 0, 6]], customerNote: '', tracking: 'PC204518873BY', prices: [[L.sour, 8.9], [L.skala, 8.6]] },
      { number: 1113, receivedAt: '2026-10-07T09:05:00', customer: 'c4', kind: 'main', status: 'packed', tier: 10,
        delivery: { type: 'post', fullName: 'Лукашевич Ольга Викторовна', address: 'г. Витебск, пр. Фрунзе, 31, кв. 40', postcode: '210009' },
        items: [[L.acid, 2, 10], [L.chappman, 0, 5]], customerNote: '', tracking: 'PC204518890BY', prices: [[L.acid, 11.5], [L.chappman, 9.5]] },
      { number: 1112, receivedAt: '2026-10-06T18:40:00', customer: 'c5', kind: 'main', status: 'packed', tier: 30,
        delivery: { type: 'post', fullName: 'Жук Олег Николаевич', address: 'г. Гродно, ул. Горького, 87, кв. 2', postcode: '230015' },
        items: [[L.parts, 0, 25], [L.parts, 2, 10]], customerNote: '', tracking: 'PC204518912BY', prices: [[L.parts, 7.9]] }
    ]
  };
})();
