/* 商家端 + 管理后台所有页面视图 */
(function () {
  window.Views = window.Views || {};
  var S = window.Store, U = window.UI, E = U.esc;
  var M = {}, A = {};
  var ONGOING = ['pending', 'accepted', 'ready', 'delivering'];

  var STATUS_ROWS = [
    { key: 'pending', label: '待接单', color: '#e0452e' },
    { key: 'accepted', label: '制作中', color: '#ff8a1f' },
    { key: 'ready', label: '待取餐', color: '#2b7cff' },
    { key: 'delivering', label: '配送中', color: '#7c63e6' },
    { key: 'completed', label: '已完成', color: '#1a9c54' },
    { key: 'rejected', label: '已拒单', color: '#c6ccd5' },
  ];

  function sumTotal(list) {
    return list.reduce(function (s, o) { return s + o.total; }, 0);
  }
  function notCounted(o) { return o.status === 'rejected' || o.status === 'refunded'; }
  function meterRow(label, count, percent, color) {
    return '<div style="margin-bottom:10px"><div class="between tiny" style="margin-bottom:4px">' +
      '<span>' + E(label) + '</span><span class="muted">' + count + ' 单 · ' + percent + '%</span></div>' +
      '<div class="progress"><i style="width:' + percent + '%;background:' + color + '"></i></div></div>';
  }
  function statBox(value, label, hl) {
    return '<div class="stat-box ' + (hl ? 'hl' : '') + '"><div class="sb-val">' + value + '</div><div class="sb-label">' + label + '</div></div>';
  }

  function orderCard(o, actions, detail) {
    var goods = (o.items || []).slice(0, 3).map(function (it) { return U.thumb(it, 'oc-thumb'); }).join('');
    var extra = '';
    if (detail) {
      var count = (o.items || []).reduce(function (s, i) { return s + i.count; }, 0);
      extra = '<div class="tiny sub" style="margin-top:4px">🧾 商品 ' + count + ' 件 · 小计 ' + U.money(o.goodsTotal) +
        ' · 配送费 ' + U.money(o.deliveryFee) +
        (o.couponAmount ? ' · 优惠 -' + U.money(o.couponAmount) : '') + '</div>';
    }
    return '<div class="order-card"><div class="oc-head"><span class="oc-shop">' + E(o.shopEmoji || '🍽️') + ' ' + E(o.shopName) + '</span>' + U.statusTag(o.status) + '</div>' +
      '<div class="oc-goods">' + goods + '<div class="flex1 small muted ellipsis">' +
      (o.items || []).map(function (i) { return i.name + '×' + i.count; }).join('、') + '</div>' +
      '<span class="bold">' + U.money(o.total) + '</span></div>' +
      '<div class="small sub" style="line-height:1.9">📍 ' + E(o.address) + '<br>👤 ' + E(o.receiver) + ' ' + E(o.phone) +
      (o.note ? '<br>📝 备注：' + E(o.note) : '') + '</div>' + extra +
      '<div class="oc-foot"><span class="tiny muted">' + E(o.createdAt) + ' · ' + E(o.no) + '</span>' + (o.status === 'pending' ? '<span class="tag">🔔 新订单</span>' : '') + '</div>' +
      (actions ? '<div class="oc-actions">' + actions + '</div>' : '') + '</div>';
  }

  /* ==================== 商家端 ==================== */
  M.login = function (p) {
    var h = '<div class="login-wrap">' +
      '<div class="login-logo">🍳</div>' +
      '<div class="login-title">商家登录</div>' +
      '<div class="login-sub">商家端需要密码验证</div>' +
      '<div class="card login-card">' +
      '<div class="form-field"><label class="form-label">商家密码</label>' +
      '<input class="input" type="password" data-model="merchantPass" value="" placeholder="请输入商家密码"></div>' +
      '<div class="btn btn-block" data-action="merchant-login">进入商家端</div>' +
      '<div class="tiny muted login-tip"><span class="link" data-action="go" data-href="#/login">返回顾客端</span> · <span class="link" data-action="go" data-href="#/admin/login">后台登录</span></div>' +
      '</div>' +
      '<div class="login-foot">密码由平台管理员分配<br>商家端可管理本店订单、菜品与店铺信息</div>' +
      '</div>';
    return U.page('商家登录', h, {});
  };

  M.home = function (p) {
    var orders = S.getOrders();
    var shop = S.getShop('s1') || {};
    var dishes = S.getDishesByShop('s1');
    var cats = S.getShopCategories('s1');
    var valid = orders.filter(function (o) { return !notCounted(o); });
    var revenue = sumTotal(valid);
    var pending = orders.filter(function (o) { return o.status === 'pending'; });
    var accepted = orders.filter(function (o) { return ['accepted', 'ready', 'delivering'].indexOf(o.status) >= 0; });
    var customers = {};
    valid.forEach(function (o) { customers[o.phone || o.receiver] = 1; });
    var customerCount = Object.keys(customers).length;
    var onDishes = dishes.filter(function (d) { return d.status === 'on'; }).length;
    var open = shop.status !== 'closed';
    var my = S.getMyMerchant();
    var settings = S.getSettings();
    if (p.ui.feeInput === undefined) p.ui.feeInput = shop.deliveryFee === undefined ? 3 : shop.deliveryFee;

    var modules = [
      { icon: '🏠', title: '后台首页', sub: '营业概览', href: '#/merchant/home', on: true },
      { icon: '📋', title: '订单管理', sub: pending.length ? pending.length + ' 单待接单' : '暂无待处理', href: '#/merchant/orders' },
      { icon: '🍽️', title: '商品管理', sub: onDishes + ' 道在售', href: '#/merchant/menu' },
      { icon: '🏪', title: '店铺管理', sub: open ? '营业中' : '已打烊', href: '#/merchant/shop' },
      { icon: '👥', title: '用户管理', sub: customerCount + ' 位顾客', href: '#/merchant/users' },
      { icon: '🗂️', title: '分类管理', sub: cats.length + ' 个分类', href: '#/merchant/categories' },
      { icon: '📊', title: '数据统计', sub: '经营分析', href: '#/merchant/stats' },
    ];

    var h = '';
    h += '<div class="hero"><div class="hero-name">🍳 商家后台</div><div class="hero-sub">' +
      E(shop.name || '我的店铺') + ' · ' + (open ? '营业中' : '已打烊') + ' · ' + E(shop.category || '快餐便当') + ' · 商家自配送</div></div>';

    h += '<div class="stat-grid" style="margin-bottom:12px">' +
      statBox(U.money(revenue), '今日营业额', true) +
      statBox(orders.length, '今日订单') +
      statBox(U.money(valid.length ? Math.round(revenue / valid.length) : 0), '平均客单价') +
      statBox(customerCount, '下单顾客') + '</div>';

    h += '<div class="section-head">商家后台</div>';
    h += '<div class="mm-grid">' + modules.map(function (m) {
      return '<div class="mm-item ' + (m.on ? 'on' : '') + '" data-action="go" data-href="' + m.href + '">' +
        '<div class="mm-icon">' + m.icon + '</div><div class="mm-title">' + m.title + '</div>' +
        '<div class="mm-sub">' + m.sub + '</div></div>';
    }).join('') + '</div>';

    h += '<div class="section-head">订单状态概览 <span class="sh-more" data-action="go" data-href="#/merchant/orders" style="cursor:pointer">查看订单 ›</span></div><div class="card">';
    STATUS_ROWS.forEach(function (x) {
      var n = orders.filter(function (o) { return o.status === x.key; }).length;
      var pct = orders.length ? Math.round(n / orders.length * 100) : 0;
      h += meterRow(x.label, n, pct, x.color);
    });
    h += '</div>';

    if (pending.length) {
      h += '<div class="notice-bar" data-action="go" data-href="#/merchant/orders" style="cursor:pointer">🔔 有 ' + pending.length + ' 笔新订单待接单，点击处理 →</div>';
    }

    h += '<div class="section-head">待办事项</div><div class="card">' +
      '<div class="list-row" data-action="go" data-href="#/merchant/orders"><span class="lr-icon">📋</span><span class="flex1">待接单订单</span><span class="tag">' + pending.length + '</span><span class="arrow">›</span></div>' +
      '<div class="list-row" data-action="go" data-href="#/merchant/orders"><span class="lr-icon">🍳</span><span class="flex1">制作 / 取餐 / 送达</span><span class="tag tag-blue">' + accepted.length + '</span><span class="arrow">›</span></div>' +
      '<div class="list-row" data-action="go" data-href="#/merchant/menu"><span class="lr-icon">🍽️</span><span class="flex1">商品管理</span><span class="tiny muted">在售 ' + onDishes + ' · 下架 ' + (dishes.length - onDishes) + '</span><span class="arrow">›</span></div>' +
      '<div class="list-row" data-action="go" data-href="#/merchant/categories"><span class="lr-icon">🗂️</span><span class="flex1">分类管理</span><span class="tiny muted">' + cats.length + ' 个分类</span><span class="arrow">›</span></div>' +
      '<div class="list-row" data-action="go" data-href="#/merchant/merchants"><span class="lr-icon">🏪</span><span class="flex1">已注册商家</span><span class="arrow">›</span></div></div>';

    /* 我的入驻资料 */
    h += '<div class="section-head">我的入驻资料</div><div class="card">';
    if (my && my.merchant) {
      var m = my.merchant;
      h += '<div class="between" style="margin-bottom:10px"><span class="bold" style="font-size:15px">' + E(m.name) + '</span>' + U.merchantTag(m.status) + '</div>' +
        '<div class="small sub" style="line-height:2">店主：' + E(m.owner) + '<br>联系电话：' + E(m.phone) + '<br>经营类目：' + E(m.category) +
        '<br>入驻时间：' + E(m.joined) + '<br>平台佣金：' + m.commission + '%</div>';
    } else {
      h += '<div class="small sub">暂无入驻资料，可前往「店铺管理」提交入驻申请。</div>';
    }
    h += '<div class="divider"></div><div class="tiny muted" data-action="go" data-href="#/merchant/merchants" style="cursor:pointer;text-align:center">查看全部注册商家 / 申请入驻 →</div></div>';

    /* 配送费设置 */
    h += '<div class="section-head">配送费设置</div><div class="card">' +
      '<div class="form-field"><label class="form-label">本店配送费（元）</label>' +
      '<input class="input" type="number" min="0" max="99" data-model="feeInput" value="' + E(p.ui.feeInput) + '"></div>' +
      '<div class="btn btn-block btn-sm" data-action="save-fee">保存配送费</div>' +
      '<div class="tiny muted" style="margin-top:8px">保存后，顾客端购物车与结算页会自动按新金额计算</div></div>';

    /* 快捷设置 */
    h += '<div class="section-head">快捷设置</div><div class="card">' +
      U.switchRow('新订单语音提醒', '新订单播放提示音', 'soundAlert', !!settings.soundAlert) +
      U.switchRow('自动接单', '开启后新订单自动进入制作', 'autoAccept', !!settings.autoAccept) + '</div>';
    h += '<div class="tiny muted" style="text-align:center;margin-top:16px;line-height:1.8">订单流程：接单 → 出餐 → 取餐 → 已送达<br>本店由商家自配送，无需骑手端</div>';
    h += '<div class="card" style="margin-top:12px"><div class="list-row" data-action="exit-merchant"><span class="lr-icon">🚪</span><span class="flex1">退出商家端</span><span class="arrow">›</span></div></div>';
    return U.page('后台首页', h, { tab: 'home' });
  };

  M.orders = function (p) {
    var tab = p.ui.mOrdersTab || '待接单';
    var all = S.getOrders();
    var valid = all.filter(function (o) { return !notCounted(o); });
    var revenue = sumTotal(valid);
    var pending = all.filter(function (o) { return o.status === 'pending'; }).length;
    var list = tab === '待接单' ? all.filter(function (o) { return o.status === 'pending'; })
      : tab === '进行中' ? all.filter(function (o) { return ['accepted', 'ready', 'delivering'].indexOf(o.status) >= 0; })
      : all.filter(function (o) { return ONGOING.indexOf(o.status) < 0; });

    var h = '<div class="stat-grid" style="margin-bottom:12px">' +
      statBox(U.money(revenue), '累计营业额', true) +
      statBox(all.length, '累计订单') +
      statBox(U.money(valid.length ? Math.round(revenue / valid.length) : 0), '客单价') +
      statBox(pending, '待接单') + '</div>';
    h += U.seg([{ value: '待接单', label: '待接单' }, { value: '进行中', label: '进行中' }, { value: '已完成', label: '已完成' }], tab, 'mOrdersTab');
    if (!list.length) h += U.empty('📋', tab === '待接单' ? '暂无新订单，顾客下单后会立即出现在这里' : '暂无相关订单');
    h += list.map(function (o) {
      var acts = '';
      if (o.status === 'pending') acts = '<div class="btn btn-ghost btn-sm" data-action="reject-order" data-id="' + E(o.id) + '">拒单</div>' +
        '<div class="btn btn-sm" data-action="accept-order" data-id="' + E(o.id) + '">✓ 接单</div>';
      else if (o.status === 'accepted') acts = '<div class="btn btn-sm" data-action="mark-ready" data-id="' + E(o.id) + '">🍳 出餐完成</div>';
      else if (o.status === 'ready') acts = '<div class="btn btn-sm" data-action="start-delivery" data-id="' + E(o.id) + '">🥡 取餐送出</div>';
      else if (o.status === 'delivering') acts = '<div class="btn btn-sm" data-action="confirm-delivered" data-id="' + E(o.id) + '">✅ 已送达</div>';
      return orderCard(o, acts, true);
    }).join('');
    return U.page('订单管理', h, { tab: 'orders' });
  };

  M.menu = function (p) {
    var cat = p.ui.menuCat || '全部';
    var dishes = S.getDishesByShop('s1');
    var cats = ['全部'].concat(S.getShopCategories('s1'));
    var list = cat === '全部' ? dishes : dishes.filter(function (d) { return d.category === cat; });
    var onCount = dishes.filter(function (d) { return d.status === 'on'; }).length;
    var lowStock = dishes.filter(function (d) { return d.status === 'on' && d.stock < 20; }).length;

    var h = '<div class="stat-grid" style="margin-bottom:12px">' +
      statBox(dishes.length, '菜品总数', true) +
      statBox(onCount, '在售') +
      statBox(dishes.length - onCount, '已下架') +
      statBox(lowStock, '库存预警') + '</div>';
    h += '<div class="btn btn-block" data-action="open-modal" data-modal="dish">＋ 新增菜品</div>';
    h += '<div class="section-head">商品管理 <span class="sh-more" data-action="go" data-href="#/merchant/categories" style="cursor:pointer">分类管理 ›</span></div>';
    h += U.chips(cats, cat, 'menuCat');
    if (!list.length) h += U.empty('🍽️', '该分类暂无菜品');
    h += list.map(function (d) {
      var tags = d.status === 'off' ? '<span class="tag tag-gray">已下架</span>'
        : (d.tag ? '<span class="tag">' + E(d.tag) + '</span>' : '');
      if (d.status === 'on' && d.stock < 20) tags += ' <span class="tag tag-red">库存紧张</span>';
      return '<div class="card tight"><div class="row gap10">' + U.thumb(d, 'dish-thumb') +
        '<div class="flex1"><div class="bold">' + E(d.name) + ' ' + tags + '</div>' +
        '<div class="tiny muted" style="margin:3px 0">' + E(d.category) + ' · 月售 ' + d.sales + ' · 库存 ' + d.stock + '</div>' +
        '<div class="price">' + d.price + '</div></div></div>' +
        '<div class="row gap8" style="justify-content:flex-end;margin-top:10px">' +
        '<span class="btn btn-ghost btn-xs" data-action="open-modal" data-modal="dish" data-id="' + E(d.id) + '">编辑</span>' +
        '<span class="btn btn-ghost btn-xs" data-action="toggle-dish" data-id="' + E(d.id) + '">' + (d.status === 'on' ? '下架' : '上架') + '</span>' +
        '<span class="btn btn-danger btn-xs" data-action="del-dish" data-id="' + E(d.id) + '">删除</span></div></div>';
    }).join('');
    h += '<div class="notice-bar">📷 编辑菜品时可上传实拍照片，顾客端点餐、购物车、订单里都会显示</div>';
    return U.page('商品管理', h, { tab: 'menu' });
  };

  M.stats = function (p) {
    var period = p.ui.mStatsPeriod || '今日';
    var factor = period === '今日' ? 1 : period === '近7天' ? 6.8 : 26;
    var orders = S.getOrders();
    var valid = orders.filter(function (o) { return !notCounted(o); });
    var revenue = Math.round(sumTotal(valid) * factor);
    var orderCount = Math.round(valid.length * factor);
    var reviews = S.getReviews();
    var goodRate = reviews.length ? Math.round(reviews.filter(function (r) { return r.rating >= 4; }).length / reviews.length * 100) : 96;

    var h = U.seg([{ value: '今日', label: '今日' }, { value: '近7天', label: '近 7 天' }, { value: '近30天', label: '近 30 天' }], period, 'mStatsPeriod');
    h += '<div class="stat-grid" style="margin-bottom:12px">' +
      statBox(U.money(revenue), period + '营业额', true) +
      statBox(orderCount, period + '订单') +
      statBox(U.money(orderCount ? Math.round(revenue / orderCount) : 0), '客单价') +
      statBox(goodRate + '%', '好评率') + '</div>';

    /* 营业额趋势 */
    var labels = period === '今日' ? ['10点', '11点', '12点', '13点', '14点', '17点', '18点', '19点']
      : period === '近7天' ? ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
      : ['第1周', '第2周', '第3周', '第4周'];
    var baseValues = period === '今日' ? [120, 380, 860, 640, 220, 420, 920, 760]
      : period === '近7天' ? [2100, 2400, 1980, 2600, 3100, 4200, 3900]
      : [15800, 17200, 16500, 18900];
    var max = Math.max.apply(null, baseValues);
    var bars = labels.map(function (label, i) {
      var height = Math.round(baseValues[i] / max * 88) + 8;
      return '<div class="bar-col"><div class="bar-val">' + Math.round(baseValues[i] * factor) + '</div>' +
        '<div class="bar" style="height:' + height + '%"></div><div class="bar-label">' + label + '</div></div>';
    }).join('');
    h += '<div class="section-head">营业额趋势</div><div class="card"><div class="bar-chart">' + bars + '</div></div>';

    /* 订单状态构成 */
    h += '<div class="section-head">订单状态构成</div><div class="card">';
    STATUS_ROWS.forEach(function (x) {
      var n = orders.filter(function (o) { return o.status === x.key; }).length;
      var pct = orders.length ? Math.round(n / orders.length * 100) : 0;
      h += meterRow(x.label, n, pct, x.color);
    });
    h += '</div>';

    /* 分类销售占比 */
    var dishes = S.getDishesByShop('s1');
    var catTotals = S.getShopCategories('s1').map(function (c) {
      var items = dishes.filter(function (d) { return d.category === c; });
      return { cat: c, count: items.length, sales: items.reduce(function (s, d) { return s + d.sales; }, 0) };
    });
    var totalSales = catTotals.reduce(function (s, c) { return s + c.sales; }, 0) || 1;
    catTotals.sort(function (a, b) { return b.sales - a.sales; });
    h += '<div class="section-head">分类销售占比</div><div class="card">';
    catTotals.forEach(function (c) {
      var pct = Math.round(c.sales / totalSales * 100);
      h += '<div style="margin-bottom:10px"><div class="between tiny" style="margin-bottom:4px"><span>' + E(c.cat) + '</span>' +
        '<span class="muted">' + c.sales + ' 份 · ' + pct + '%</span></div>' +
        '<div class="progress"><i style="width:' + pct + '%"></i></div></div>';
    });
    h += '</div>';

    /* 菜品销量排行 */
    var rank = dishes.slice().sort(function (a, b) { return b.sales - a.sales; }).slice(0, 6);
    var maxSales = rank.length ? rank[0].sales : 1;
    h += '<div class="section-head">菜品销量排行</div><div class="card">';
    h += rank.map(function (d, i) {
      var pct = Math.round(d.sales / maxSales * 100);
      return '<div class="rank-row"><div class="rank-no ' + (i < 3 ? 'top' : '') + '">' + (i + 1) + '</div>' +
        '<div class="rank-emoji">' + (d.emoji || '🍽️') + '</div>' +
        '<div class="rank-main"><div class="rank-name">' + E(d.name) + '</div>' +
        '<div class="progress"><i style="width:' + pct + '%"></i></div></div>' +
        '<div class="rank-sales">' + Math.round(d.sales * factor / (period === '今日' ? 8 : 1)) + '份</div></div>';
    }).join('');
    h += '</div>';

    /* 顾客分析 */
    var byPhone = {};
    orders.forEach(function (o) { var k = o.phone || o.receiver; byPhone[k] = (byPhone[k] || 0) + 1; });
    var total = Object.keys(byPhone).length;
    var repeat = Object.keys(byPhone).filter(function (k) { return byPhone[k] > 1; }).length;
    var rejectRate = orders.length ? Math.round(orders.filter(function (o) { return o.status === 'rejected'; }).length / orders.length * 100) : 0;
    h += '<div class="section-head">顾客分析</div><div class="stat-grid">' +
      statBox(total, '下单顾客') +
      statBox(repeat, '复购顾客') +
      statBox((total ? Math.round(repeat / total * 100) : 0) + '%', '复购率') +
      statBox(rejectRate + '%', '拒单率') + '</div>';

    return U.page('数据统计', h, { tab: 'stats' });
  };

  M.shop = function (p) {
    var shop = S.getShop('s1') || {};
    var my = S.getMyMerchant();
    var orders = S.getOrders();
    var valid = orders.filter(function (o) { return !notCounted(o); });
    var dishes = S.getDishesByShop('s1');
    var customers = {};
    valid.forEach(function (o) { customers[o.phone || o.receiver] = 1; });
    var open = shop.status !== 'closed';
    if (p.ui.shopFee === undefined) p.ui.shopFee = shop.deliveryFee === undefined ? 3 : shop.deliveryFee;
    if (p.ui.shopMinOrder === undefined) p.ui.shopMinOrder = shop.minOrder === undefined ? 0 : shop.minOrder;
    if (p.ui.shopNotice === undefined) p.ui.shopNotice = shop.notice || '';

    var h = '<div class="hero"><div class="hero-name">' + E(shop.emoji || '🏪') + ' ' + E(shop.name || '我的店铺') + '</div>' +
      '<div class="hero-sub">' + E(shop.category || '快餐便当') + ' · ' + (open ? '营业中' : '已打烊') + ' · 评分 ' + (shop.rating || 5.0) +
      ' · 月售 ' + (shop.monthSales || 0) + '+</div></div>';

    h += '<div class="stat-grid" style="margin-bottom:12px">' +
      statBox(orders.length, '累计订单', true) +
      statBox(U.money(sumTotal(valid)), '累计营业额') +
      statBox(dishes.filter(function (d) { return d.status === 'on'; }).length, '在售菜品') +
      statBox(Object.keys(customers).length, '下单顾客') + '</div>';

    h += '<div class="section-head">营业设置</div><div class="card">' +
      U.switchRow('营业状态', '打烊后顾客端不再展示本店', 'shopOpen', open) +
      '<div class="form-field"><label class="form-label">配送费（元）</label><input class="input" type="number" min="0" max="99" data-model="shopFee" value="' + E(p.ui.shopFee) + '"></div>' +
      '<div class="form-field"><label class="form-label">起送价（元）</label><input class="input" type="number" min="0" max="999" data-model="shopMinOrder" value="' + E(p.ui.shopMinOrder) + '"></div>' +
      '<div class="form-field"><label class="form-label">店铺公告</label><input class="input" maxlength="60" data-model="shopNotice" value="' + E(p.ui.shopNotice) + '" placeholder="填写店铺公告，顾客进店可见"></div>' +
      '<div class="btn btn-block btn-sm" data-action="save-shop">保存店铺设置</div>' +
      '<div class="tiny muted" style="margin-top:8px">保存后顾客端店铺信息、结算金额同步生效</div></div>';

    h += '<div class="section-head">入驻资料</div><div class="card">';
    if (my && my.merchant) {
      var m = my.merchant;
      h += '<div class="between" style="margin-bottom:10px"><span class="bold" style="font-size:15px">' + E(m.name) + '</span>' + U.merchantTag(m.status) + '</div>' +
        '<div class="small sub" style="line-height:2">商家编号：M' + E(m.id) + '<br>店主：' + E(m.owner) + '<br>联系电话：' + E(m.phone) +
        '<br>经营类目：' + E(m.category) + '<br>入驻时间：' + E(m.joined) + '<br>平台佣金：' + m.commission + '%</div>';
    } else {
      h += '<div class="small sub">暂无入驻资料</div>';
    }
    h += '<div class="divider"></div><div class="tiny muted" data-action="go" data-href="#/merchant/merchants" style="cursor:pointer;text-align:center">查看全部注册商家 / 申请入驻 →</div></div>';
    h += '<div class="tiny muted" style="text-align:center;margin-top:16px;line-height:1.8">店铺名称、类目与入驻资料由平台审核维护<br>如需修改请联系平台运营</div>';
    return U.page('店铺管理', h, { back: true });
  };

  M.users = function (p) {
    var filter = p.ui.mUserTab || '全部顾客';
    var orders = S.getOrders();
    var users = S.getUsers();
    var map = {};
    orders.forEach(function (o) {
      var key = o.phone || o.receiver;
      if (!map[key]) map[key] = { key: key, name: o.receiver, phone: o.phone, orders: 0, spent: 0, items: {}, last: '' };
      var c = map[key];
      c.orders += 1;
      if (!notCounted(o)) c.spent += o.total;
      if (!c.last || o.createdAt > c.last) c.last = o.createdAt;
      (o.items || []).forEach(function (it) { c.items[it.name] = (c.items[it.name] || 0) + it.count; });
    });
    var list = Object.keys(map).map(function (k) {
      var c = map[k];
      var names = Object.keys(c.items).sort(function (a, b) { return c.items[b] - c.items[a]; });
      var u = users.find(function (x) { return x.phone === c.phone; });
      return {
        key: c.key, name: c.name || '顾客', phone: c.phone || '--', orders: c.orders, spent: c.spent,
        avg: c.orders ? Math.round(c.spent / c.orders) : 0, last: c.last || '--',
        favorite: names.length ? names[0] + ' ×' + c.items[names[0]] : '--',
        repeat: c.orders > 1, registered: !!u, banned: !!(u && u.status === 'banned'),
      };
    }).sort(function (a, b) { return b.spent - a.spent; });
    var repeatCount = list.filter(function (x) { return x.repeat; }).length;
    var shown = filter === '复购顾客' ? list.filter(function (x) { return x.repeat; })
      : filter === '新客' ? list.filter(function (x) { return !x.repeat; }) : list;

    var h = '<div class="stat-grid" style="margin-bottom:12px">' +
      statBox(list.length, '下单顾客', true) +
      statBox(repeatCount, '复购顾客') +
      statBox((list.length ? Math.round(repeatCount / list.length * 100) : 0) + '%', '复购率') +
      statBox(U.money(list.length ? Math.round(list.reduce(function (s, x) { return s + x.spent; }, 0) / list.length) : 0), '人均消费') + '</div>';
    h += U.seg([{ value: '全部顾客', label: '全部顾客' }, { value: '复购顾客', label: '复购顾客' }, { value: '新客', label: '新客' }], filter, 'mUserTab');
    if (!shown.length) h += U.empty('👥', '暂无顾客数据');
    h += shown.map(function (c) {
      var tags = c.repeat ? '<span class="tag">复购</span>' : '<span class="tag tag-blue">新客</span>';
      if (c.banned) tags += ' <span class="tag tag-red">已封禁</span>';
      else if (c.registered) tags += ' <span class="tag tag-green">平台注册</span>';
      return '<div class="card"><div class="between"><div><span class="bold">' + E(c.name) + '</span> ' + tags + '</div>' +
        '<span class="price" style="font-size:16px">' + U.money(c.spent) + '</span></div>' +
        '<div class="tiny muted" style="margin-top:4px">📱 ' + E(c.phone) + ' · 最近下单 ' + E(c.last) + '</div>' +
        '<div class="row gap10" style="margin-top:10px;text-align:center">' +
        '<div class="flex1"><div class="bold">' + c.orders + '</div><div class="tiny muted">订单数</div></div>' +
        '<div class="flex1"><div class="bold">' + U.money(c.avg) + '</div><div class="tiny muted">客单价</div></div>' +
        '<div class="flex1"><div class="bold" style="font-size:12px">' + E(c.favorite) + '</div><div class="tiny muted">偏好菜品</div></div></div></div>';
    }).join('');
    h += '<div class="tiny muted" style="text-align:center;margin-top:16px;line-height:1.8">顾客数据根据订单实时汇总<br>复购定义为下单 2 次及以上</div>';
    return U.page('用户管理', h, { back: true });
  };

  M.categories = function () {
    var cats = S.getShopCategories('s1');
    var dishes = S.getDishesByShop('s1');
    var list = cats.map(function (cat) {
      var items = dishes.filter(function (d) { return d.category === cat; });
      var on = items.filter(function (d) { return d.status === 'on'; }).length;
      var sales = items.reduce(function (s, d) { return s + d.sales; }, 0);
      var avgPrice = items.length ? Math.round(items.reduce(function (s, d) { return s + d.price; }, 0) / items.length) : 0;
      var sorted = items.slice().sort(function (a, b) { return b.sales - a.sales; });
      return { cat: cat, count: items.length, on: on, off: items.length - on, sales: sales, avgPrice: avgPrice,
        top: sorted.length ? sorted[0].name : '--', topSales: sorted.length ? sorted[0].sales : 0, dishes: sorted.slice(0, 3) };
    }).sort(function (a, b) { return b.sales - a.sales; });
    var totalSales = list.reduce(function (s, c) { return s + c.sales; }, 0);

    var h = '<div class="stat-grid" style="margin-bottom:12px">' +
      statBox(list.length, '分类数', true) +
      statBox(dishes.length, '菜品总数') +
      statBox(dishes.filter(function (d) { return d.status === 'on'; }).length, '在售菜品') +
      statBox(list.length ? Math.round(totalSales / list.length) : 0, '平均月销') + '</div>';

    h += list.map(function (c) {
      return '<div class="card"><div class="between"><div><span class="bold" style="font-size:15px">' + E(c.cat) + '</span> ' +
        '<span class="tag tag-blue">' + c.count + ' 道</span></div><span class="tiny muted">月销 ' + c.sales + ' 份</span></div>' +
        '<div class="row gap10" style="margin-top:10px">' +
        '<div class="flex1"><div class="bold">' + c.count + '</div><div class="tiny muted">菜品数</div></div>' +
        '<div class="flex1"><div class="bold" style="color:var(--green)">' + c.on + '</div><div class="tiny muted">在售</div></div>' +
        '<div class="flex1"><div class="bold" style="color:var(--muted)">' + c.off + '</div><div class="tiny muted">已下架</div></div>' +
        '<div class="flex1"><div class="bold">' + U.money(c.avgPrice) + '</div><div class="tiny muted">均价</div></div></div>' +
        '<div class="tiny sub" style="margin-top:10px">销量最高：' + E(c.top) + ' · ' + c.topSales + ' 份</div>' +
        '<div style="margin-top:6px">' + c.dishes.map(function (d) {
          return '<div class="between tiny" style="padding:4px 0"><span>' + (d.emoji || '🍽️') + ' ' + E(d.name) +
            (d.status === 'off' ? ' <span class="tag tag-gray">下架</span>' : '') + '</span><span class="muted">' + d.sales + ' 份</span></div>';
        }).join('') + '</div>' +
        '<div class="row gap8" style="margin-top:10px">' +
        '<span class="btn btn-ghost btn-xs flex1" data-action="cat-view" data-cat="' + E(c.cat) + '">查看菜品</span>' +
        '<span class="btn btn-xs flex1" data-action="cat-toggle" data-cat="' + E(c.cat) + '" data-status="on">全部上架</span>' +
        '<span class="btn btn-ghost btn-xs flex1" data-action="cat-toggle" data-cat="' + E(c.cat) + '" data-status="off">全部下架</span></div></div>';
    }).join('');
    h += '<div class="tiny muted" style="text-align:center;margin-top:16px;line-height:1.8">分类由本店菜品自动汇总<br>新增菜品时可选择已有分类</div>';
    return U.page('分类管理', h, { back: true });
  };

  M.merchants = function (p) {
    var list = S.getMerchants();
    var h = '<div class="btn btn-block" data-action="open-modal" data-modal="register">🏪 商家入驻申请</div>';
    h += '<div class="notice-bar">提交申请后进入待审核，需「管理后台 → 商家审核」通过，店铺才会出现在顾客端。</div>';
    h += '<div class="section-head">已注册商家 <span class="sh-more">共 ' + list.length + ' 家</span></div>';
    h += list.map(function (m) {
      return '<div class="card"><div class="between" style="margin-bottom:8px"><span class="bold">' + E(m.name) + '</span>' + U.merchantTag(m.status) + '</div>' +
        '<div class="small sub" style="line-height:1.9">店主：' + E(m.owner) + ' · 电话：' + E(m.phone) +
        '<br>类目：' + E(m.category) + ' · 入驻：' + E(m.joined) + ' · 佣金：' + m.commission + '%</div></div>';
    }).join('');
    return U.page('注册商家', h, { back: true });
  };

  /* ==================== 管理后台 ==================== */
  A.home = function (p) {
    var orders = S.getOrders(), users = S.getUsers(), merchants = S.getMerchants();
    var pending = merchants.filter(function (m) { return m.status === 'pending'; });
    var gmv = orders.reduce(function (s, o) { return s + (o.status === 'rejected' || o.status === 'refunded' ? 0 : o.total); }, 0);
    var shops = S.getShops().filter(function (s) { return s.status === 'open'; });
    var h = '';
    h += '<div class="hero" style="background:linear-gradient(135deg,#7c63e6,#5b3ecb)"><div class="hero-name">📊 平台数据大盘</div>' +
      '<div class="hero-sub">校园外卖平台 · 管理后台 · 实时演示数据</div></div>';
    h += '<div class="stat-grid" style="margin-bottom:12px">' +
      '<div class="stat-box hl"><div class="sb-val">' + U.money(gmv) + '</div><div class="sb-label">平台 GMV</div></div>' +
      '<div class="stat-box"><div class="sb-val">' + orders.length + '</div><div class="sb-label">订单总数</div></div>' +
      '<div class="stat-box"><div class="sb-val">' + users.length + '</div><div class="sb-label">注册用户</div></div>' +
      '<div class="stat-box"><div class="sb-val">' + shops.length + '</div><div class="sb-label">营业餐馆</div></div></div>';
    if (pending.length) h += '<div class="notice-bar" data-action="go" data-href="#/admin/merchants" style="cursor:pointer">🏪 有 ' + pending.length + ' 家商家待审核，点击处理 →</div>';
    h += '<div class="section-head">订单状态分布</div><div class="card">';
    [['待接单', 'pending'], ['制作中', 'accepted'], ['待取餐', 'ready'], ['配送中', 'delivering'], ['已完成', 'completed']].forEach(function (x) {
      var n = orders.filter(function (o) { return o.status === x[1]; }).length;
      var pct = orders.length ? Math.round(n / orders.length * 100) : 0;
      h += '<div style="margin-bottom:10px"><div class="between tiny" style="margin-bottom:4px"><span>' + x[0] + '</span><span class="muted">' + n + ' 单 · ' + pct + '%</span></div>' +
        '<div class="progress"><i style="width:' + pct + '%"></i></div></div>';
    });
    h += '</div>';
    h += '<div class="section-head">最近订单</div>';
    h += orders.slice(0, 3).map(function (o) {
      return '<div class="card tight"><div class="between"><span class="bold small">' + E(o.shopName) + '</span>' + U.statusTag(o.status) + '</div>' +
        '<div class="tiny muted" style="margin-top:5px">' + E(o.createdAt) + ' · ' + E(o.receiver) + ' · ' + U.money(o.total) + '</div></div>';
    }).join('');
    h += '<div class="btn btn-block btn-ghost" data-action="go" data-href="#/admin/merchants">前往商家审核</div>';
    return U.page('数据大盘', h, { tab: 'home' });
  };

  A.merchants = function (p) {
    var tab = p.ui.adminMerchantTab || '待审核';
    var all = S.getMerchants();
    var list = tab === '待审核' ? all.filter(function (m) { return m.status === 'pending'; })
      : all.filter(function (m) { return m.status !== 'pending'; });
    var h = U.seg([{ value: '待审核', label: '待审核' }, { value: '已入驻', label: '已入驻商家' }], tab, 'adminMerchantTab');
    h += '<div class="notice-bar">' + (tab === '待审核' ? '通过 / 驳回后该申请会从此列表移除，可在「已入驻商家」中查看' : '这里可以查看全部已通过或已驳回的商家资料') + '</div>';
    if (!list.length) h += U.empty('🏪', tab === '待审核' ? '暂无待审核的商家申请' : '暂无已入驻商家');
    h += list.map(function (m) {
      var acts = tab === '待审核'
        ? '<div class="btn btn-ghost btn-sm" data-action="reject-merchant" data-id="' + E(m.id) + '">驳回</div>' +
          '<div class="btn btn-sm" data-action="approve-merchant" data-id="' + E(m.id) + '">✓ 通过审核</div>'
        : '';
      return '<div class="card"><div class="between" style="margin-bottom:8px"><span class="bold">' + E(m.name) + '</span>' + U.merchantTag(m.status) + '</div>' +
        '<div class="small sub" style="line-height:1.9">店主：' + E(m.owner) + ' · 电话：' + E(m.phone) +
        '<br>类目：' + E(m.category) + ' · 申请时间：' + E(m.joined) + ' · 佣金：' + m.commission + '%</div>' +
        (acts ? '<div class="oc-actions">' + acts + '</div>' : '') + '</div>';
    }).join('');
    return U.page('商家审核', h, { tab: 'merchants' });
  };

  A.users = function (p) {
    var list = S.getUsers();
    var h = '<div class="section-head">平台用户 <span class="sh-more">共 ' + list.length + ' 人</span></div>';
    h += list.map(function (u) {
      return '<div class="card"><div class="between"><div><span class="bold">' + E(u.name) + '</span> ' +
        (u.status === 'banned' ? '<span class="tag tag-red">已封禁</span>' : '<span class="tag tag-green">正常</span>') + '</div>' +
        '<span class="tiny muted">' + E(u.phone) + '</span></div>' +
        '<div class="small sub" style="margin:8px 0">累计 ' + u.orders + ' 单 · 消费 ' + U.money(u.spent) + ' · 注册于 ' + E(u.joined) + '</div>' +
        '<div class="oc-actions"><div class="btn ' + (u.status === 'banned' ? '' : 'btn-danger') + ' btn-xs" data-action="toggle-user" data-id="' + E(u.id) + '">' +
        (u.status === 'banned' ? '解除封禁' : '封禁用户') + '</div></div></div>';
    }).join('');
    return U.page('用户管理', h, { tab: 'users' });
  };

  A.orders = function (p) {
    var list = S.getOrders();
    var h = '<div class="section-head">全部订单 <span class="sh-more">共 ' + list.length + ' 笔</span></div>';
    if (!list.length) h += U.empty('📋', '暂无订单');
    h += list.map(function (o) {
      var acts = (ONGOING.indexOf(o.status) >= 0)
        ? '<div class="btn btn-ghost btn-sm" data-action="refund-order" data-id="' + E(o.id) + '">退款</div>'
        : '<span class="tiny muted">已完成，不可退款</span>';
      return orderCard(o, acts);
    }).join('');
    return U.page('订单管理', h, { tab: 'orders' });
  };

  A.settings = function (p) {
    var settings = S.getSettings(), mk = S.getMarketing();
    var h = '<div class="section-head">平台设置</div><div class="card">' +
      U.switchRow('订单语音提醒', '新订单播放提示音', 'soundAlert', !!settings.soundAlert) +
      U.switchRow('商家自动接单', '开启后新订单自动进入制作', 'autoAccept', !!settings.autoAccept) + '</div>';
    h += '<div class="section-head">营销活动</div><div class="card">' + mk.activities.map(function (a) {
      return '<div class="between" style="padding:8px 0;border-bottom:1px solid var(--line)"><div><div class="small bold">' + E(a.title) + '</div>' +
        '<div class="tiny muted">' + E(a.type) + '</div></div><span class="tag ' + (a.status === 'on' ? 'tag-green' : 'tag-gray') + '">' + (a.status === 'on' ? '进行中' : '已关闭') + '</span></div>';
    }).join('') + '</div>';
    h += '<div class="section-head">演示管理</div><div class="card">' +
      '<div class="list-row" data-action="reset-data"><span class="lr-icon">♻️</span><span class="flex1">重置全部演示数据</span><span class="arrow">›</span></div>' +
      '<div class="list-row" data-action="switch-role" data-role="user"><span class="lr-icon">🛵</span><span class="flex1">返回顾客端</span><span class="arrow">›</span></div>' +
      '<div class="list-row" data-action="exit-admin"><span class="lr-icon">🚪</span><span class="flex1">退出管理后台</span><span class="arrow">›</span></div></div>';
    h += '<div class="tiny muted" style="text-align:center;margin-top:16px;line-height:1.8">校园外卖平台 · 管理后台<br>数据已开启云端同步，可随时重置</div>';
    return U.page('平台设置', h, { tab: 'settings' });
  };

  /* 后台密码登录页 */
  A.login = function (p) {
    var h = '<div class="login-wrap">' +
      '<div class="login-logo">📊</div>' +
      '<div class="login-title">管理后台</div>' +
      '<div class="login-sub">仅平台管理员可进入</div>' +
      '<div class="card login-card">' +
      '<div class="form-field"><label class="form-label">后台密码</label>' +
      '<input class="input" type="password" data-model="adminPass" value="" placeholder="请输入后台密码"></div>' +
      '<div class="btn btn-block" data-action="admin-login">进入管理后台</div>' +
      '<div class="tiny muted login-tip"><span class="link" data-action="go" data-href="#/login">返回顾客端</span> · <span class="link" data-action="go" data-href="#/merchant/login">商家登录</span></div>' +
      '</div>' +
      '<div class="login-foot">后台可审核商家入驻、管理用户与订单<br>请勿把后台密码告知普通顾客</div>' +
      '</div>';
    return U.page('管理后台', h, {});
  };

  window.Views.merchant = M;
  window.Views.admin = A;
})();
