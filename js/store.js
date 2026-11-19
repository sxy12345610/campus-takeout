/**
 * 校园外卖平台 · 网页版数据层
 * 与微信小程序共用同一套数据模型，存储改为浏览器 localStorage。
 * 三端（顾客 / 商家 / 后台）在同一浏览器内共享数据，实现实时联动。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Store = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var K = {
    SHOPS: 'wk_shops', DISHES: 'wk_dishes', CART: 'wk_cart', ORDERS: 'wk_orders',
    ADDRESSES: 'wk_addresses', COUPONS: 'wk_coupons', REVIEWS: 'wk_reviews',
    USERS: 'wk_users', MERCHANTS: 'wk_merchants', SETTINGS: 'wk_settings',
    MARKETING: 'wk_marketing', CURRENT_SHOP: 'wk_current_shop',
    LOCATION: 'wk_current_location', INIT: 'wk_init_v4', SESSION: 'wk_session',
    ROLE_AUTH: 'wk_role_auth',
  };

  function ls() {
    if (typeof localStorage !== 'undefined') return localStorage;
    if (root && root.localStorage) return root.localStorage;
    return { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} };
  }
  function read(key, fallback) {
    try {
      var v = ls().getItem(key);
      if (v === null || v === undefined || v === '') return fallback;
      return JSON.parse(v);
    } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { ls().setItem(key, JSON.stringify(value)); } catch (e) {}
    try {
      if (typeof window !== 'undefined' && window.Sync && window.Sync.onWrite) window.Sync.onWrite();
    } catch (e) {}
    return value;
  }
  function emit() {
    try {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('store:change'));
      }
    } catch (e) {}
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function nowText(offsetMin) {
    var d = new Date(Date.now() - (offsetMin || 0) * 60000);
    return pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function orderNo() {
    var d = new Date();
    return '' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()) + Math.floor(Math.random() * 90 + 10);
  }

  /* ---------------- 种子数据（与小程序一致） ---------------- */
  var SEED_SHOPS = [
    { id: 's1', name: '家常味道馆', emoji: '🍚', category: '快餐便当', rating: 4.8, monthSales: 2000, deliverMin: 30, distance: '1.2km', minOrder: 0, deliveryFee: 3, notice: '新鲜现做，用心服务每一单～', tags: ['品牌', '品质联盟'], promo: '满30减8 · 满50减15', status: 'open' },
    { id: 's2', name: '川香小厨', emoji: '🌶️', category: '川菜', rating: 4.7, monthSales: 1500, deliverMin: 35, distance: '2.1km', minOrder: 20, deliveryFee: 4, notice: '地道川味，麻辣鲜香，越吃越上头！', tags: ['人气', '麻辣'], promo: '满40减12 · 满60减20', status: 'open' },
    { id: 's3', name: '面面俱到', emoji: '🍜', category: '面食', rating: 4.9, monthSales: 3200, deliverMin: 25, distance: '0.8km', minOrder: 0, deliveryFee: 2, notice: '手工现擀面，汤浓味美，30 分钟必达。', tags: ['口碑', '准时达'], promo: '满25减6 · 新客减5', status: 'open' },
    { id: 's4', name: '鲜果时光', emoji: '🥤', category: '饮品甜品', rating: 4.6, monthSales: 980, deliverMin: 20, distance: '1.6km', minOrder: 15, deliveryFee: 2, notice: '鲜果现切，无添加，清爽一整天。', tags: ['下午茶', '清爽'], promo: '第二杯半价', status: 'open' },
    { id: 's5', name: '麦香烘焙坊', emoji: '🥐', category: '面包甜点', rating: 4.5, monthSales: 640, deliverMin: 40, distance: '3.4km', minOrder: 10, deliveryFee: 5, notice: '每日现烤面包，限量供应，售完即止。', tags: ['烘焙', '早餐'], promo: '满30减5', status: 'closed' },
  ];

  var SEED_DISHES = [
    { id: 'd1', shopId: 's1', name: '招牌红烧肉', desc: '肥瘦相间，入口即化，本店招牌', price: 38, category: '热销', emoji: '🍖', sales: 328, stock: 99, status: 'on', tag: '招牌' },
    { id: 'd2', shopId: 's1', name: '宫保鸡丁', desc: '鸡肉嫩滑，花生香脆，微辣下饭', price: 28, category: '热销', emoji: '🍗', sales: 276, stock: 99, status: 'on', tag: '热销' },
    { id: 'd3', shopId: 's1', name: '麻婆豆腐', desc: '麻辣鲜香，嫩滑入味', price: 24, category: '热销', emoji: '🌶️', sales: 198, stock: 99, status: 'on', tag: '' },
    { id: 'd4', shopId: 's1', name: '鱼香肉丝', desc: '酸甜微辣，经典川味', price: 26, category: '热销', emoji: '🥘', sales: 182, stock: 99, status: 'on', tag: '' },
    { id: 'd5', shopId: 's1', name: '米饭', desc: '东北五常大米，颗粒饱满', price: 3, category: '主食', emoji: '🍚', sales: 890, stock: 999, status: 'on', tag: '' },
    { id: 'd6', shopId: 's1', name: '扬州炒饭', desc: '粒粒分明，配料丰富', price: 18, category: '主食', emoji: '🍳', sales: 156, stock: 99, status: 'on', tag: '' },
    { id: 'd7', shopId: 's1', name: '红烧牛肉面', desc: '牛骨熬汤，牛肉软烂', price: 22, category: '主食', emoji: '🍜', sales: 143, stock: 60, status: 'on', tag: '' },
    { id: 'd8', shopId: 's1', name: '番茄蛋汤', desc: '酸甜开胃，清淡爽口', price: 8, category: '汤品', emoji: '🍲', sales: 121, stock: 99, status: 'on', tag: '' },
    { id: 'd9', shopId: 's1', name: '紫菜蛋花汤', desc: '清爽解腻，配送好搭档', price: 6, category: '汤品', emoji: '🥣', sales: 98, stock: 99, status: 'on', tag: '' },
    { id: 'd10', shopId: 's1', name: '香炸鸡翅', desc: '外酥里嫩，现炸出锅', price: 16, category: '小吃', emoji: '🍗', sales: 210, stock: 40, status: 'on', tag: '人气' },
    { id: 'd11', shopId: 's1', name: '黄金薯条', desc: '酥脆可口，配番茄酱', price: 10, category: '小吃', emoji: '🍟', sales: 88, stock: 99, status: 'on', tag: '' },
    { id: 'd12', shopId: 's1', name: '蒜蓉西兰花', desc: '清炒时蔬，健康低脂', price: 14, category: '小吃', emoji: '🥦', sales: 76, stock: 99, status: 'on', tag: '' },
    { id: 'd13', shopId: 's1', name: '冰镇可乐', desc: '330ml 罐装，冰爽畅快', price: 5, category: '饮品', emoji: '🥤', sales: 340, stock: 200, status: 'on', tag: '' },
    { id: 'd14', shopId: 's1', name: '鲜榨橙汁', desc: '新鲜橙子现榨，无添加', price: 12, category: '饮品', emoji: '🍊', sales: 65, stock: 30, status: 'on', tag: '' },
    { id: 's2d1', shopId: 's2', name: '水煮牛肉', desc: '麻辣鲜香，牛肉滑嫩', price: 48, category: '热销', emoji: '🥩', sales: 268, stock: 80, status: 'on', tag: '招牌' },
    { id: 's2d2', shopId: 's2', name: '辣子鸡', desc: '干香麻辣，越嚼越香', price: 38, category: '热销', emoji: '🍗', sales: 210, stock: 99, status: 'on', tag: '热销' },
    { id: 's2d3', shopId: 's2', name: '麻婆豆腐', desc: '正宗川味，麻辣烫香', price: 22, category: '川菜', emoji: '🌶️', sales: 186, stock: 99, status: 'on', tag: '' },
    { id: 's2d4', shopId: 's2', name: '回锅肉', desc: '肥而不腻，蒜香浓郁', price: 32, category: '川菜', emoji: '🥓', sales: 156, stock: 99, status: 'on', tag: '' },
    { id: 's2d5', shopId: 's2', name: '酸辣粉', desc: '酸辣开胃，爽滑筋道', price: 16, category: '主食', emoji: '🍜', sales: 302, stock: 150, status: 'on', tag: '人气' },
    { id: 's2d6', shopId: 's2', name: '米饭', desc: '优质大米，香软可口', price: 3, category: '主食', emoji: '🍚', sales: 780, stock: 999, status: 'on', tag: '' },
    { id: 's2d7', shopId: 's2', name: '冰粉', desc: '红糖冰粉，清甜解辣', price: 10, category: '饮品', emoji: '🍧', sales: 145, stock: 99, status: 'on', tag: '' },
    { id: 's3d1', shopId: 's3', name: '招牌牛肉面', desc: '牛骨浓汤，大块牛肉', price: 32, category: '热销', emoji: '🍜', sales: 520, stock: 99, status: 'on', tag: '招牌' },
    { id: 's3d2', shopId: 's3', name: '番茄鸡蛋面', desc: '酸甜开胃，老少皆宜', price: 20, category: '热销', emoji: '🍅', sales: 388, stock: 99, status: 'on', tag: '热销' },
    { id: 's3d3', shopId: 's3', name: '炸酱面', desc: '秘制肉酱，筋道手擀面', price: 24, category: '面食', emoji: '🍝', sales: 266, stock: 99, status: 'on', tag: '' },
    { id: 's3d4', shopId: 's3', name: '阳春面', desc: '清汤细面，朴素鲜香', price: 15, category: '面食', emoji: '🍜', sales: 178, stock: 99, status: 'on', tag: '' },
    { id: 's3d5', shopId: 's3', name: '卤蛋', desc: '卤香入味，配面绝佳', price: 3, category: '小吃', emoji: '🥚', sales: 460, stock: 200, status: 'on', tag: '' },
    { id: 's3d6', shopId: 's3', name: '凉拌黄瓜', desc: '清脆爽口，解腻小菜', price: 8, category: '小吃', emoji: '🥒', sales: 210, stock: 99, status: 'on', tag: '' },
    { id: 's3d7', shopId: 's3', name: '酸梅汤', desc: '酸甜解渴，自熬无添加', price: 8, category: '饮品', emoji: '🥤', sales: 198, stock: 150, status: 'on', tag: '' },
    { id: 's4d1', shopId: 's4', name: '招牌水果茶', desc: '多种鲜果，果香满满', price: 18, category: '热销', emoji: '🍹', sales: 320, stock: 99, status: 'on', tag: '招牌' },
    { id: 's4d2', shopId: 's4', name: '满杯红柚', desc: '整颗红柚，清甜微苦', price: 16, category: '果茶', emoji: '🍊', sales: 245, stock: 99, status: 'on', tag: '热销' },
    { id: 's4d3', shopId: 's4', name: '芒芒甘露', desc: '芒果+椰乳，绵密香甜', price: 22, category: '果茶', emoji: '🥭', sales: 188, stock: 80, status: 'on', tag: '' },
    { id: 's4d4', shopId: 's4', name: '珍珠奶茶', desc: 'Q弹珍珠，香浓奶味', price: 14, category: '奶茶', emoji: '🧋', sales: 402, stock: 150, status: 'on', tag: '人气' },
    { id: 's4d5', shopId: 's4', name: '杨枝甘露', desc: '经典港式，芒香四溢', price: 20, category: '甜品', emoji: '🍮', sales: 156, stock: 60, status: 'on', tag: '' },
    { id: 's4d6', shopId: 's4', name: '双皮奶', desc: '嫩滑香甜，入口即化', price: 15, category: '甜品', emoji: '🍦', sales: 122, stock: 60, status: 'on', tag: '' },
    { id: 's5d1', shopId: 's5', name: '现烤蛋挞', desc: '外酥内滑，奶香浓郁', price: 12, category: '热销', emoji: '🥧', sales: 288, stock: 60, status: 'on', tag: '招牌' },
    { id: 's5d2', shopId: 's5', name: '手撕吐司', desc: '松软拉丝，麦香十足', price: 18, category: '面包', emoji: '🍞', sales: 176, stock: 50, status: 'on', tag: '' },
    { id: 's5d3', shopId: 's5', name: '牛角包', desc: '层层酥脆，黄油香气', price: 10, category: '面包', emoji: '🥐', sales: 198, stock: 80, status: 'on', tag: '热销' },
    { id: 's5d4', shopId: 's5', name: '提拉米苏', desc: '绵密顺滑，微苦回甘', price: 26, category: '蛋糕', emoji: '🍰', sales: 98, stock: 30, status: 'on', tag: '' },
    { id: 's5d5', shopId: 's5', name: '葡式蛋挞礼盒', desc: '六只装，分享更美味', price: 58, category: '蛋糕', emoji: '🎂', sales: 66, stock: 20, status: 'on', tag: '' },
    { id: 's5d6', shopId: 's5', name: '现磨咖啡', desc: '香醇浓郁，提神醒脑', price: 16, category: '饮品', emoji: '☕', sales: 132, stock: 99, status: 'on', tag: '' },
  ];

  var SHOP_CATEGORIES = {
    s1: ['热销', '主食', '汤品', '小吃', '饮品'],
    s2: ['热销', '川菜', '主食', '饮品'],
    s3: ['热销', '面食', '小吃', '饮品'],
    s4: ['热销', '果茶', '奶茶', '甜品'],
    s5: ['热销', '面包', '蛋糕', '饮品'],
  };
  var SEED_ADDRESSES = [
    { id: 'a1', name: '张先生', phone: '138****8888', tag: '家', detail: '科技园南路 88 号 腾讯大厦 12 层', isDefault: true },
    { id: 'a2', name: '张先生', phone: '138****8888', tag: '公司', detail: '深南大道 10000 号 创新大厦 A 座 5F', isDefault: false },
  ];
  var SEED_COUPONS = [
    { id: 'c1', title: '满 30 减 8', threshold: 30, amount: 8, desc: '全场通用，有效期至 12-31', used: false },
    { id: 'c2', title: '满 50 减 15', threshold: 50, amount: 15, desc: '限堂食配送，有效期至 12-31', used: false },
    { id: 'c3', title: '新客立减 5', threshold: 0, amount: 5, desc: '新用户专享', used: true },
  ];

  function makeTimeline(status) {
    var steps = [
      { label: '订单已提交', time: nowText(18) },
      { label: '商家已接单', time: nowText(16) },
      { label: '后厨制作中', time: nowText(14) },
      { label: '商家已出餐', time: nowText(8) },
      { label: '商家已取餐', time: nowText(5) },
      { label: '已送达', time: nowText(0) },
    ];
    var order = ['submitted', 'accepted', 'cooking', 'ready', 'delivering', 'completed'];
    var idx = order.indexOf(status);
    return steps.map(function (s, i) { return { label: s.label, time: s.time, done: i <= (idx < 0 ? 0 : idx) }; });
  }

  var SEED_ORDERS = [
    { id: 'o1', no: orderNo(), status: 'pending', createdAt: nowText(2), shopId: 's1', shopName: '家常味道馆', shopEmoji: '🍚', items: [{ id: 'd1', name: '招牌红烧肉', price: 38, count: 1, emoji: '🍖' }, { id: 'd5', name: '米饭', price: 3, count: 2, emoji: '🍚' }], goodsTotal: 44, deliveryFee: 3, couponAmount: 0, total: 47, address: '科技园南路 88 号 腾讯大厦 12 层', receiver: '张先生', phone: '138****8888', deliverTime: '尽快送达', note: '少放辣，谢谢', timeline: makeTimeline('submitted'), reviewed: false },
    { id: 'o2', no: orderNo(), status: 'accepted', createdAt: nowText(8), shopId: 's2', shopName: '川香小厨', shopEmoji: '🌶️', items: [{ id: 's2d2', name: '辣子鸡', price: 38, count: 1, emoji: '🍗' }, { id: 's2d7', name: '冰粉', price: 10, count: 1, emoji: '🍧' }], goodsTotal: 48, deliveryFee: 4, couponAmount: 0, total: 52, address: '深南大道 10000 号 创新大厦 A 座 5F', receiver: '李先生', phone: '139****6666', deliverTime: '尽快送达', note: '', timeline: makeTimeline('accepted'), reviewed: false },
    { id: 'o3', no: orderNo(), status: 'ready', createdAt: nowText(14), shopId: 's3', shopName: '面面俱到', shopEmoji: '🍜', items: [{ id: 's3d1', name: '招牌牛肉面', price: 32, count: 1, emoji: '🍜' }, { id: 's3d5', name: '卤蛋', price: 3, count: 2, emoji: '🥚' }], goodsTotal: 38, deliveryFee: 2, couponAmount: 6, total: 34, address: '科苑路 15 号 软件园二期 3 栋', receiver: '王女士', phone: '137****2222', deliverTime: '尽快送达', note: '放前台即可', timeline: makeTimeline('ready'), reviewed: false },
    { id: 'o4', no: orderNo(), status: 'delivering', createdAt: nowText(25), shopId: 's4', shopName: '鲜果时光', shopEmoji: '🥤', items: [{ id: 's4d1', name: '招牌水果茶', price: 18, count: 1, emoji: '🍹' }, { id: 's4d4', name: '珍珠奶茶', price: 14, count: 1, emoji: '🧋' }], goodsTotal: 32, deliveryFee: 2, couponAmount: 0, total: 34, address: '南山大道 66 号 海天花园 8 栋 902', receiver: '陈先生', phone: '136****9999', deliverTime: '尽快送达', note: '', timeline: makeTimeline('delivering'), reviewed: false },
    { id: 'o5', no: orderNo(), status: 'completed', createdAt: nowText(90), shopId: 's1', shopName: '家常味道馆', shopEmoji: '🍚', items: [{ id: 'd3', name: '麻婆豆腐', price: 24, count: 1, emoji: '🌶️' }, { id: 'd5', name: '米饭', price: 3, count: 2, emoji: '🍚' }, { id: 'd9', name: '紫菜蛋花汤', price: 6, count: 1, emoji: '🥣' }], goodsTotal: 36, deliveryFee: 3, couponAmount: 0, total: 39, address: '科技园南路 88 号 腾讯大厦 12 层', receiver: '张先生', phone: '138****8888', deliverTime: '尽快送达', note: '', timeline: makeTimeline('completed'), reviewed: false },
  ];

  var SEED_USERS = [
    { id: 'u1', name: '张先生', phone: '138****8888', orders: 28, spent: 1068, status: 'normal', joined: '2025-03-12' },
    { id: 'u2', name: '李女士', phone: '139****6666', orders: 15, spent: 522, status: 'normal', joined: '2025-06-01' },
    { id: 'u3', name: '王先生', phone: '137****2222', orders: 9, spent: 316, status: 'normal', joined: '2025-09-20' },
    { id: 'u4', name: '赵女士', phone: '135****1234', orders: 3, spent: 88, status: 'banned', joined: '2026-01-08' },
    { id: 'u5', name: '陈先生', phone: '136****9999', orders: 41, spent: 1580, status: 'normal', joined: '2024-12-15' },
  ];
  var SEED_MERCHANTS = [
    { id: 'm1', name: '家常味道馆', owner: '周师傅', phone: '138****0001', category: '快餐便当', status: 'approved', joined: '2025-02-10', commission: 18 },
    { id: 'm2', name: '川香小厨', owner: '吴老板', phone: '138****0002', category: '川菜', status: 'approved', joined: '2025-04-18', commission: 20 },
    { id: 'm3', name: '面面俱到', owner: '郑师傅', phone: '138****0003', category: '面食', status: 'approved', joined: '2025-06-11', commission: 18 },
    { id: 'm4', name: '鲜果时光', owner: '孙女士', phone: '138****0004', category: '饮品', status: 'approved', joined: '2025-08-22', commission: 22 },
    { id: 'm5', name: '麦香烘焙坊', owner: '何师傅', phone: '138****0005', category: '甜点', status: 'pending', joined: '2026-11-17', commission: 20 },
  ];
  var SEED_SETTINGS = {
    shopName: '家常味道馆', shopNotice: '新鲜现做，用心服务每一单～', deliveryFee: 3,
    minOrder: 0, commission: 18, autoAccept: false, soundAlert: true,
  };
  var SEED_MARKETING = {
    banners: ['新客首单立减 5 元', '满 30 减 8 · 满 50 减 15', '邀请好友各得 10 元券'],
    activities: [
      { id: 'p1', title: '满 30 减 8', type: '满减', status: 'on' },
      { id: 'p2', title: '满 50 减 15', type: '满减', status: 'on' },
      { id: 'p3', title: '新客首单立减 5', type: '新人', status: 'on' },
    ],
  };

  function init() {
    if (read(K.INIT, false) === true) return;
    write(K.SHOPS, SEED_SHOPS); write(K.DISHES, SEED_DISHES); write(K.CART, []);
    write(K.ORDERS, SEED_ORDERS); write(K.ADDRESSES, SEED_ADDRESSES);
    write(K.COUPONS, SEED_COUPONS); write(K.REVIEWS, []); write(K.USERS, SEED_USERS);
    write(K.MERCHANTS, SEED_MERCHANTS); write(K.SETTINGS, SEED_SETTINGS);
    write(K.MARKETING, SEED_MARKETING); write(K.CURRENT_SHOP, 's1'); write(K.INIT, true);
  }

  var store = {
    init: init,
    shopCategories: SHOP_CATEGORIES,
    emit: emit,

    /* ---- 餐馆 ---- */
    getShops: function () { return read(K.SHOPS, []); },
    setShops: function (v) { return write(K.SHOPS, v); },
    getShop: function (id) { return this.getShops().find(function (s) { return s.id === id; }) || null; },
    getCurrentShopId: function () { return read(K.CURRENT_SHOP, 's1'); },
    setCurrentShop: function (id) { write(K.CURRENT_SHOP, id); },
    getCurrentShop: function () { return this.getShop(this.getCurrentShopId()) || this.getShops()[0] || null; },
    updateShop: function (id, patch) {
      var shops = this.getShops();
      var idx = shops.findIndex(function (s) { return s.id === id; });
      if (idx < 0) return null;
      shops[idx] = Object.assign({}, shops[idx], patch);
      this.setShops(shops);
      return shops[idx];
    },
    getShopCategories: function (shopId) {
      if (SHOP_CATEGORIES[shopId]) return SHOP_CATEGORIES[shopId];
      var cats = [];
      this.getDishesByShop(shopId).forEach(function (d) { if (cats.indexOf(d.category) < 0) cats.push(d.category); });
      return cats;
    },
    getMerchantPhone: function () {
      var shop = this.getCurrentShop();
      var name = shop ? shop.name : '';
      var m = this.getMerchants().find(function (x) { return x.name === name; });
      if (m && m.phone && m.phone.indexOf('*') < 0) return m.phone;
      return '13800138000';
    },
    getMyMerchant: function () {
      var shop = this.getShop('s1') || this.getShops()[0];
      if (!shop) return null;
      var m = this.getMerchants().find(function (x) { return x.name === shop.name; });
      return { shop: shop, merchant: m || null, statusText: m ? ({ approved: '已入驻', pending: '审核中', rejected: '已驳回' }[m.status] || m.status) : '未入驻' };
    },
    getCurrentLocation: function () { return read(K.LOCATION, { name: '科技园 · 腾讯大厦', detail: '科技园南路 88 号 腾讯大厦 12 层' }); },
    setCurrentLocation: function (v) { write(K.LOCATION, v); },

    /* ---- 基础读写 ---- */
    getDishes: function () { return read(K.DISHES, []); },
    setDishes: function (v) { return write(K.DISHES, v); },
    getDishesByShop: function (shopId) { return read(K.DISHES, []).filter(function (d) { return d.shopId === shopId; }); },
    getCart: function () { return read(K.CART, []); },
    setCart: function (v) { return write(K.CART, v); },
    getOrders: function () { return read(K.ORDERS, []); },
    setOrders: function (v) { return write(K.ORDERS, v); },
    getAddresses: function () { return read(K.ADDRESSES, []); },
    setAddresses: function (v) { return write(K.ADDRESSES, v); },
    getCoupons: function () { return read(K.COUPONS, []); },
    setCoupons: function (v) { return write(K.COUPONS, v); },
    getReviews: function () { return read(K.REVIEWS, []); },
    setReviews: function (v) { return write(K.REVIEWS, v); },
    getUsers: function () { return read(K.USERS, []); },
    setUsers: function (v) { return write(K.USERS, v); },

    /* ---- 当前登录用户的数据（按用户隔离） ---- */
    currentUserId: function () {
      var s = this.getSession();
      return s && s.id ? s.id : '';
    },
    myOrders: function () {
      var uid = this.currentUserId();
      if (!uid) return [];
      return this.getOrders().filter(function (o) { return o.userId === uid; });
    },
    myCoupons: function () {
      var uid = this.currentUserId();
      if (!uid) return [];
      return this.getCoupons().filter(function (c) { return c.userId === uid; });
    },
    myReviews: function () {
      var uid = this.currentUserId();
      if (!uid) return [];
      return this.getReviews().filter(function (r) { return r.userId === uid; });
    },

    /* ---- 登录会话（仅保存在本机，不参与云同步） ---- */
    getSession: function () { return read(K.SESSION, null); },
    login: function (name, phone) {
      var users = this.getUsers();
      var u = users.find(function (x) {
        if (phone) return x.phone === phone;
        return x.phone === '未填写' && x.name === name;
      });
      var d = new Date();
      var today = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
      if (!u) {
        u = { id: 'u' + Date.now(), name: name, phone: phone || '未填写', orders: 0, spent: 0, status: 'normal', joined: today };
        users.push(u);
      } else {
        u.name = name;
      }
      this.setUsers(users);
      var session = { id: u.id, name: name, phone: u.phone, joined: u.joined, loginAt: Date.now() };
      write(K.SESSION, session);
      return session;
    },
    updateSessionName: function (name) {
      var s = this.getSession();
      if (!s) return null;
      s.name = name;
      write(K.SESSION, s);
      var users = this.getUsers();
      var u = users.find(function (x) { return x.id === s.id; });
      if (u) { u.name = name; this.setUsers(users); }
      return s;
    },
    clearSession: function () {
      try { ls().removeItem(K.SESSION); } catch (e) {}
    },

    /* ---- 商家 / 后台访问权限（仅保存在本机，不参与云同步） ---- */
    canRole: function (role) {
      if (role === 'user') return !!this.getSession();
      var a = read(K.ROLE_AUTH, {});
      return !!(a && a[role]);
    },
    setRoleAuth: function (role) {
      var a = read(K.ROLE_AUTH, {});
      a[role] = true;
      a.at = Date.now();
      write(K.ROLE_AUTH, a);
    },
    clearRole: function (role) {
      var a = read(K.ROLE_AUTH, {});
      delete a[role];
      write(K.ROLE_AUTH, a);
    },
    getMerchants: function () { return read(K.MERCHANTS, []); },
    setMerchants: function (v) { return write(K.MERCHANTS, v); },
    getSettings: function () { return read(K.SETTINGS, SEED_SETTINGS); },
    setSettings: function (v) { return write(K.SETTINGS, v); },
    getMarketing: function () { return read(K.MARKETING, SEED_MARKETING); },
    setMarketing: function (v) { return write(K.MARKETING, v); },

    /* ---- 购物车（按店铺隔离） ---- */
    addToCart: function (dishId) {
      var dish = this.getDishes().find(function (d) { return d.id === dishId; });
      if (!dish) return { switched: false, added: false };
      var cart = this.getCart(); var switched = false;
      if (cart.length > 0 && cart[0].shopId !== dish.shopId) { cart = []; switched = true; }
      var found = cart.find(function (c) { return c.id === dishId; });
      if (found) found.count += 1;
      else cart.push({ id: dish.id, shopId: dish.shopId, name: dish.name, price: dish.price, emoji: dish.emoji, image: dish.image || '', count: 1, selected: true });
      this.setCart(cart); emit();
      return { switched: switched, added: true };
    },
    updateCartCount: function (dishId, delta) {
      var cart = this.getCart();
      var found = cart.find(function (c) { return c.id === dishId; });
      if (!found) return;
      found.count += delta;
      this.setCart(cart.filter(function (c) { return c.count > 0; })); emit();
    },
    toggleCartItem: function (dishId) {
      var cart = this.getCart();
      var found = cart.find(function (c) { return c.id === dishId; });
      if (found) { found.selected = !found.selected; this.setCart(cart); emit(); }
    },
    toggleAllCart: function (selected) {
      var cart = this.getCart();
      cart.forEach(function (c) { c.selected = selected; });
      this.setCart(cart); emit();
    },
    removeSelected: function () { this.setCart(this.getCart().filter(function (c) { return !c.selected; })); emit(); },
    clearCart: function () { this.setCart([]); emit(); },
    cartSummary: function () {
      var cart = this.getCart();
      var selected = cart.filter(function (c) { return c.selected; });
      return {
        count: selected.reduce(function (s, c) { return s + c.count; }, 0),
        total: selected.reduce(function (s, c) { return s + c.price * c.count; }, 0),
        allSelected: cart.length > 0 && cart.every(function (c) { return c.selected; }),
        cart: cart, shopId: cart.length ? cart[0].shopId : '',
      };
    },

    /* ---- 订单 ---- */
    placeOrder: function (payload) {
      var orders = this.getOrders();
      var order = {
        id: 'o' + Date.now(), no: orderNo(), status: 'pending', createdAt: nowText(0),
        userId: payload.userId || this.currentUserId(),
        shopId: payload.shopId, shopName: payload.shopName, shopEmoji: payload.shopEmoji,
        items: payload.items, goodsTotal: payload.goodsTotal, deliveryFee: payload.deliveryFee,
        couponAmount: payload.couponAmount, total: payload.total,
        address: payload.address, receiver: payload.receiver, phone: payload.phone,
        deliverTime: payload.deliverTime, note: payload.note || '',
        timeline: makeTimeline('submitted'), reviewed: false,
      };
      orders.unshift(order);
      this.setOrders(orders);
      this.setCart(this.getCart().filter(function (c) { return !c.selected; }));
      emit();
      return order;
    },
    findOrder: function (id) { return this.getOrders().find(function (o) { return o.id === id; }) || null; },
    updateOrder: function (id, patch) {
      var orders = this.getOrders();
      var idx = orders.findIndex(function (o) { return o.id === id; });
      if (idx < 0) return null;
      orders[idx] = Object.assign({}, orders[idx], patch);
      this.setOrders(orders); emit();
      return orders[idx];
    },
    acceptOrder: function (id) {
      var o = this.findOrder(id);
      if (!o || o.status !== 'pending') return null;
      var timeline = o.timeline.map(function (s) {
        return (s.label === '商家已接单' || s.label === '后厨制作中') ? { label: s.label, time: nowText(0), done: true } : s;
      });
      return this.updateOrder(id, { status: 'accepted', timeline: timeline });
    },
    rejectOrder: function (id) { return this.updateOrder(id, { status: 'rejected' }); },
    markReady: function (id) {
      var o = this.findOrder(id); if (!o) return null;
      var timeline = o.timeline.map(function (s) { return s.label === '商家已出餐' ? { label: s.label, time: nowText(0), done: true } : s; });
      return this.updateOrder(id, { status: 'ready', timeline: timeline });
    },
    startDelivery: function (id) {
      var o = this.findOrder(id); if (!o) return null;
      var timeline = o.timeline.map(function (s) {
        return (s.label === '商家已取餐' || s.label === '配送途中') ? { label: '商家已取餐', time: nowText(0), done: true } : s;
      });
      return this.updateOrder(id, { status: 'delivering', timeline: timeline });
    },
    confirmDelivered: function (id) {
      var o = this.findOrder(id); if (!o) return null;
      var timeline = o.timeline.map(function (s) { return s.label === '已送达' ? { label: s.label, time: nowText(0), done: true } : s; });
      return this.updateOrder(id, { status: 'completed', timeline: timeline });
    },
    submitReview: function (id, rating, text, images) {
      var reviews = this.getReviews();
      var o = this.findOrder(id);
      var s = this.getSession();
      reviews.unshift({
        id: 'r' + Date.now(), orderId: id,
        userId: s ? s.id : '', shopId: o ? o.shopId : '', shopName: o ? o.shopName : '',
        rating: rating, text: text, images: images || [], time: nowText(0),
      });
      this.setReviews(reviews); emit();
      return this.updateOrder(id, { reviewed: true });
    },

    /* ---- 菜品 / 地址 / 用户 ---- */
    toggleDishStatus: function (id) {
      var dishes = this.getDishes();
      var d = dishes.find(function (x) { return x.id === id; });
      if (d) { d.status = d.status === 'on' ? 'off' : 'on'; this.setDishes(dishes); emit(); }
      return d;
    },
    updateDish: function (id, patch) {
      var dishes = this.getDishes();
      var idx = dishes.findIndex(function (x) { return x.id === id; });
      if (idx >= 0) { dishes[idx] = Object.assign({}, dishes[idx], patch); this.setDishes(dishes); emit(); return dishes[idx]; }
      return null;
    },
    addDish: function (dish) {
      var dishes = this.getDishes();
      dishes.push(Object.assign({ id: 'd' + Date.now(), sales: 0, status: 'on', tag: '', shopId: dish.shopId || this.getCurrentShopId() }, dish));
      this.setDishes(dishes); emit();
    },
    deleteDish: function (id) { this.setDishes(this.getDishes().filter(function (d) { return d.id !== id; })); emit(); },
    addAddress: function (addr) {
      var list = this.getAddresses();
      if (addr.isDefault) list.forEach(function (a) { a.isDefault = false; });
      list.push(Object.assign({ id: 'a' + Date.now() }, addr));
      this.setAddresses(list); emit();
    },
    setDefaultAddress: function (id) {
      var list = this.getAddresses();
      list.forEach(function (a) { a.isDefault = a.id === id; });
      this.setAddresses(list); emit();
    },
    deleteAddress: function (id) { this.setAddresses(this.getAddresses().filter(function (a) { return a.id !== id; })); emit(); },
    setUserStatus: function (id, status) {
      var users = this.getUsers();
      var u = users.find(function (x) { return x.id === id; });
      if (u) { u.status = status; this.setUsers(users); emit(); }
    },
    setMerchantStatus: function (id, status) {
      var list = this.getMerchants();
      var m = list.find(function (x) { return x.id === id; });
      if (!m) return;
      m.status = status;
      write(K.MERCHANTS, list);
      var shops = this.getShops();
      var shop = shops.find(function (s) { return s.name === m.name; });
      if (!shop) {
        var catMap = { '快餐便当': '🍚', '川菜': '🌶️', '面食': '🍜', '饮品甜品': '🥤', '饮品': '🥤', '面包甜点': '🥐', '甜点': '🥐' };
        shop = { id: 's' + Date.now(), name: m.name, emoji: catMap[m.category] || '🏪', category: m.category || '快餐便当', rating: 5.0, monthSales: 0, deliverMin: 30, distance: '2.0km', minOrder: 0, deliveryFee: 3, notice: '新店入驻，敬请期待～', tags: ['新店'], promo: '新店开业优惠', status: 'closed' };
        shops.push(shop);
        var dishes = this.getDishes();
        [
          { name: '招牌套餐', desc: '本店招牌，欢迎品尝', price: 28, emoji: '🍱' },
          { name: '特色推荐', desc: '店长推荐，人气之选', price: 22, emoji: '⭐' },
          { name: '精选单品', desc: '精心制作，品质保证', price: 18, emoji: '🍽️' },
        ].forEach(function (x, i) {
          dishes.push(Object.assign({ id: shop.id + 'd' + (i + 1), shopId: shop.id, category: '热销', sales: 0, stock: 99, status: 'on', tag: i === 0 ? '招牌' : '' }, x));
        });
        this.setDishes(dishes);
      }
      shop.status = status === 'approved' ? 'open' : 'closed';
      write(K.SHOPS, shops); emit();
    },
    registerMerchant: function (form) {
      var name = (form.name || '').trim();
      if (!name) return { ok: false, msg: '请填写店铺名称' };
      var list = this.getMerchants();
      if (list.some(function (m) { return m.name === name; })) return { ok: false, msg: '该店铺名称已注册' };
      var catMap = { '快餐便当': '🍚', '川菜': '🌶️', '面食': '🍜', '饮品甜品': '🥤', '面包甜点': '🥐' };
      var category = catMap[form.category] ? form.category : '快餐便当';
      var d = new Date();
      var joined = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
      var mid = 'm' + Date.now(); var sid = 's' + Date.now();
      list.push({ id: mid, name: name, owner: (form.owner || '').trim() || '待补充', phone: (form.phone || '').trim() || '待补充', category: category, status: 'pending', joined: joined, commission: 20 });
      this.setMerchants(list);
      var shops = this.getShops();
      shops.push({ id: sid, name: name, emoji: catMap[category], category: category, rating: 5.0, monthSales: 0, deliverMin: 30, distance: '2.0km', minOrder: 0, deliveryFee: 3, notice: '新店入驻，即将上线，敬请期待～', tags: ['新店'], promo: '新店开业优惠', status: 'closed' });
      this.setShops(shops);
      var dishes = this.getDishes();
      [
        { name: '招牌套餐', desc: '本店招牌，欢迎品尝', price: 28, emoji: '🍱' },
        { name: '特色推荐', desc: '店长推荐，人气之选', price: 22, emoji: '⭐' },
        { name: '精选单品', desc: '精心制作，品质保证', price: 18, emoji: '🍽️' },
      ].forEach(function (x, i) {
        dishes.push(Object.assign({ id: sid + 'd' + (i + 1), shopId: sid, category: '热销', sales: 0, stock: 99, status: 'on', tag: i === 0 ? '招牌' : '' }, x));
      });
      this.setDishes(dishes); emit();
      return { ok: true, merchantId: mid, shopId: sid };
    },
    toggleCouponUse: function (id) {
      var list = this.getCoupons();
      var c = list.find(function (x) { return x.id === id; });
      if (c) { c.used = !c.used; this.setCoupons(list); emit(); }
    },
    resetAll: function () {
      var session = read(K.SESSION, null);
      var auth = read(K.ROLE_AUTH, null);
      Object.keys(K).forEach(function (k) { try { ls().removeItem(K[k]); } catch (e) {} });
      init();
      if (session) write(K.SESSION, session);
      if (auth) write(K.ROLE_AUTH, auth);
      emit();
    },
  };

  return store;
});
