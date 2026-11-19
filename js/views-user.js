/* 顾客端所有页面视图 */
(function () {
  window.Views = window.Views || {};
  var S = window.Store, U = window.UI, E = U.esc;
  var V = {};

  var SHOP_CATS = ['全部', '快餐便当', '川菜', '面食', '饮品甜品', '面包甜点'];
  var SORTS = ['综合', '评分', '销量', '距离'];
  var QUICK_TAGS = ['味道很棒', '分量足', '配送快', '包装好', '性价比高', '会回购'];

  /* ---------------- 餐馆列表（顾客端首页） ---------------- */
  V.shops = function (p) {
    var ui = p.ui, cat = ui.shopsCat || '全部', sort = ui.shopsSort || '综合';
    var list = S.getShops().filter(function (s) { return s.status === 'open'; });
    if (cat !== '全部') list = list.filter(function (s) { return s.category === cat; });
    if (sort === '评分') list.sort(function (a, b) { return b.rating - a.rating; });
    else if (sort === '销量') list.sort(function (a, b) { return b.monthSales - a.monthSales; });
    else if (sort === '距离') list.sort(function (a, b) { return parseFloat(a.distance) - parseFloat(b.distance); });
    var loc = S.getCurrentLocation();

    var h = '';
    h += '<div class="loc-bar" data-action="go" data-href="#/user/location">' +
      '<span class="loc-icon">📍</span><div class="loc-text">' + E(loc.name) +
      '<small>' + E(loc.detail) + '</small></div><span class="arrow">›</span></div>';
    h += '<div class="banner"><h3>🍱 今天吃点好的</h3><p>新人首单立减 5 元 · 满 30 减 8 · 多店可选</p></div>';
    h += '<div class="card tight" data-action="go" data-href="#/user/search" style="color:#98a0ab;display:flex;align-items:center;gap:8px;cursor:pointer">🔍 搜索菜品或餐馆</div>';
    h += '<div class="section-head">选择餐馆<span class="sh-more">' + list.length + ' 家营业中</span></div>';
    h += U.chips(SHOP_CATS, cat, 'shopsCat');
    h += U.chips(SORTS, sort, 'shopsSort');

    if (!list.length) h += U.empty('🏪', '该分类下暂无营业中的餐馆');
    h += list.map(function (s) {
      return '<div class="shop-card" data-action="open-shop" data-id="' + E(s.id) + '">' +
        '<div class="shop-logo">' + E(s.emoji) + '</div>' +
        '<div class="flex1">' +
          '<div class="between"><span class="shop-name">' + E(s.name) + '</span><span class="tiny muted">' + E(s.distance) + '</span></div>' +
          '<div class="shop-meta">⭐ ' + s.rating + ' · 月售 ' + s.monthSales + ' · ' + s.deliverMin + ' 分钟 · 配送费 ' + U.money(s.deliveryFee) + '</div>' +
          '<div class="shop-tags">' + s.tags.map(function (t) { return '<span class="tag">' + E(t) + '</span>'; }).join(' ') +
            '<span class="tag tag-green">' + E(s.category) + '</span></div>' +
          '<div class="shop-promo">🎁 ' + E(s.promo) + '</div>' +
        '</div></div>';
    }).join('');
    h += '<div class="notice-bar">🏪 新入驻的商家需经「管理后台 → 商家审核」通过后，才会出现在这里。</div>';
    return U.page('校园外卖平台', h, {
      tab: 'shops',
      right: '<div class="icon-btn" data-action="go" data-href="#/user/search">🔍</div>',
    });
  };

  /* ---------------- 单店点餐 ---------------- */
  V.shop = function (p) {
    var id = p.params.id || S.getCurrentShopId();
    S.setCurrentShop(id);
    var shop = S.getShop(id);
    if (!shop) return U.page('餐馆不存在', U.empty('🤔', '未找到该餐馆'), { back: true });
    var cats = S.getShopCategories(id);
    var allCats = ['全部'].concat(cats);
    var cur = p.ui.shopCat && allCats.indexOf(p.ui.shopCat) >= 0 ? p.ui.shopCat : '全部';
    var dishes = S.getDishesByShop(id).filter(function (d) { return d.status === 'on'; });
    var shown = cur === '全部' ? dishes : dishes.filter(function (d) { return d.category === cur; });
    var cart = S.getCart().filter(function (c) { return c.shopId === id; });

    var h = '';
    h += '<div class="hero"><div class="hero-name">' + E(shop.emoji) + ' ' + E(shop.name) + '</div>' +
      '<div class="hero-sub">⭐ ' + shop.rating + ' · 月售 ' + shop.monthSales + ' · ' + shop.deliverMin + ' 分钟送达 · 配送费 ' + U.money(shop.deliveryFee) + '</div>' +
      '<div class="hero-sub" style="margin-top:8px">📢 ' + E(shop.notice) + '</div></div>';
    h += '<div class="menu-layout"><div class="cat-side">' +
      allCats.map(function (c) {
        return '<div class="cat-item ' + (cur === c ? 'active' : '') + '" data-action="set-ui" data-key="shopCat" data-value="' + E(c) + '">' + E(c) + '</div>';
      }).join('') + '</div><div class="cat-main">';

    if (!shown.length) h += U.empty('🍽️', '该分类暂无菜品');
    var groups = cur === '全部' ? allCats.slice(1) : [cur];
    groups.forEach(function (g) {
      var gList = shown.filter(function (d) { return d.category === g; });
      if (!gList.length) return;
      h += '<div class="cat-group-title">' + E(g) + '</div>';
      h += gList.map(function (d) {
        var inCart = cart.find(function (c) { return c.id === d.id; });
        var n = inCart ? inCart.count : 0;
        return '<div class="dish-row">' + U.thumb(d, 'dish-thumb') +
          '<div class="dish-info"><div class="dish-name">' + E(d.name) + (d.tag ? ' <span class="tag">' + E(d.tag) + '</span>' : '') + '</div>' +
          '<div class="dish-desc">' + E(d.desc) + '</div>' +
          '<div class="tiny muted">月售 ' + d.sales + ' · 库存 ' + d.stock + '</div>' +
          '<div class="dish-foot"><span class="price dish-price">' + d.price + '</span>' +
            '<div class="stepper">' +
              (n > 0 ? '<span class="step-btn minus" data-action="cart-minus" data-id="' + E(d.id) + '">−</span><span class="step-num">' + n + '</span>' : '') +
              '<span class="step-btn plus" data-action="add-cart" data-id="' + E(d.id) + '">＋</span>' +
            '</div></div></div></div>';
      }).join('');
    });
    h += '</div></div>';

    var count = cart.reduce(function (s, c) { return s + c.count; }, 0);
    var total = cart.reduce(function (s, c) { return s + c.price * c.count; }, 0);
    h += '<div class="cart-bar"><div class="cb-icon">🛒' + (count ? '<span class="cb-count">' + count + '</span>' : '') + '</div>' +
      '<div class="cb-total">' + U.money(total) + '<small>另需配送费 ' + U.money(shop.deliveryFee) + '</small></div>' +
      '<div class="cb-btn ' + (count ? '' : 'disabled') + '" ' + (count ? 'data-action="go" data-href="#/user/cart"' : '') + '>去结算</div></div>';
    h += '<div style="text-align:center;margin-top:14px"><span class="tiny muted" data-action="go" data-href="#/user/shops" style="cursor:pointer">← 返回餐馆列表</span></div>';

    return U.page(shop.name, h, {
      back: true, tab: 'shops',
      right: '<div class="icon-btn" data-action="call-merchant">📞</div>',
    });
  };

  /* ---------------- 购物车 ---------------- */
  V.cart = function (p) {
    var sum = S.cartSummary();
    var shop = S.getShop(sum.shopId);
    var h = '';
    if (!sum.cart.length) {
      h += U.empty('🛒', '购物车还是空的，去挑点好吃的吧');
      h += '<div class="btn btn-block" data-action="go" data-href="#/user/shops">去逛餐馆</div>';
      return U.page('购物车', h, { tab: 'cart' });
    }
    h += '<div class="card tight"><div class="between"><div class="bold">' + E(shop ? shop.emoji + ' ' + shop.name : '购物车') + '</div>' +
      '<span class="tiny muted">同一时间只能点一家店</span></div></div>';
    h += '<div class="card">';
    h += sum.cart.map(function (c) {
      return '<div class="dish-row">' +
        '<div class="stepper" style="margin-right:4px"><span class="step-btn ' + (c.selected ? 'plus' : 'minus') + '" data-action="toggle-item" data-id="' + E(c.id) + '">' + (c.selected ? '✓' : '−') + '</span></div>' +
        U.thumb(c, 'dish-thumb') +
        '<div class="dish-info"><div class="dish-name">' + E(c.name) + '</div>' +
        '<div class="dish-desc">单价 ' + U.money(c.price) + '</div>' +
        '<div class="dish-foot"><span class="price dish-price">' + c.price * c.count + '</span>' +
        '<div class="stepper"><span class="step-btn minus" data-action="cart-minus" data-id="' + E(c.id) + '">−</span>' +
        '<span class="step-num">' + c.count + '</span>' +
        '<span class="step-btn plus" data-action="cart-plus" data-id="' + E(c.id) + '">＋</span></div></div></div></div>';
    }).join('');
    h += '<div class="divider"></div><div class="between small">' +
      '<span data-action="toggle-all" style="cursor:pointer">' + (sum.allSelected ? '☑ 全选' : '☐ 全选') + '</span>' +
      '<span class="muted" data-action="remove-selected" style="cursor:pointer">删除已选</span></div></div>';
    h += '<div class="card"><div class="between" style="margin-bottom:8px"><span class="sub">商品小计</span><span>' + U.money(sum.total) + '</span></div>' +
      '<div class="between" style="margin-bottom:8px"><span class="sub">配送费</span><span>' + U.money(shop ? shop.deliveryFee : 0) + '</span></div>' +
      '<div class="divider"></div><div class="between"><span class="bold">合计</span><span class="price" style="font-size:18px">' + (sum.total + (shop ? shop.deliveryFee : 0)) + '</span></div></div>';
    h += '<div class="btn btn-block ' + (sum.count ? '' : 'disabled') + '" ' + (sum.count ? 'data-action="go" data-href="#/user/checkout"' : '') + '>去结算（' + sum.count + ' 件）</div>';
    return U.page('购物车', h, { tab: 'cart' });
  };

  /* ---------------- 结算下单 ---------------- */
  V.checkout = function (p) {
    var sum = S.cartSummary();
    if (!sum.count) return U.page('确认订单', U.empty('🛒', '没有可结算的商品') + '<div class="btn btn-block" data-action="go" data-href="#/user/shops">去点餐</div>', { back: true });
    var shop = S.getShop(sum.shopId) || S.getCurrentShop();
    var addr = S.getAddresses().find(function (a) { return a.isDefault; }) || S.getAddresses()[0];
    var coupons = S.getCoupons().filter(function (c) { return !c.used && sum.total >= c.threshold; });
    var chosen = p.ui.couponId ? coupons.find(function (c) { return c.id === p.ui.couponId; }) : null;
    var couponAmount = chosen ? chosen.amount : 0;
    var fee = shop ? shop.deliveryFee : 0;
    var total = Math.max(0, sum.total + fee - couponAmount);

    var h = '';
    h += '<div class="card" data-action="go" data-href="#/user/address" style="cursor:pointer"><div class="between">' +
      '<div><div class="bold">' + (addr ? E(addr.name) + ' <span class="tag">' + E(addr.tag) + '</span>' : '请选择收货地址') + '</div>' +
      '<div class="small sub" style="margin-top:4px">' + (addr ? E(addr.detail) : '点击添加') + '</div></div><span class="arrow">›</span></div></div>';
    h += '<div class="card"><div class="card-title">' + E(shop ? shop.emoji + ' ' + shop.name : '商品清单') + '</div>' +
      sum.cart.filter(function (c) { return c.selected; }).map(function (c) {
        return '<div class="row gap10" style="padding:7px 0">' + U.thumb(c, 'oc-thumb') +
          '<div class="flex1"><div class="small bold">' + E(c.name) + '</div><div class="tiny muted">x' + c.count + '</div></div>' +
          '<span class="bold">' + U.money(c.price * c.count) + '</span></div>';
      }).join('') + '</div>';
    h += '<div class="card">' +
      '<div class="between" style="padding:5px 0"><span class="sub">商品小计</span><span>' + U.money(sum.total) + '</span></div>' +
      '<div class="between" style="padding:5px 0"><span class="sub">配送费 <span class="tiny muted">(商家设置)</span></span><span>' + U.money(fee) + '</span></div>' +
      '<div class="between" style="padding:5px 0;cursor:pointer" data-action="open-modal" data-modal="coupon"><span class="sub">优惠券</span><span style="color:var(--primary)">' + (chosen ? '-' + U.money(couponAmount) : (coupons.length ? coupons.length + ' 张可用 ›' : '暂无可用 ›')) + '</span></div>' +
      '<div class="divider"></div><div class="between"><span class="bold">实付款</span><span class="price" style="font-size:19px">' + total + '</span></div></div>';
    h += '<div class="card"><div class="form-field" style="margin-bottom:0"><label class="form-label">订单备注</label>' +
      '<textarea class="textarea" data-model="note" placeholder="口味、送达位置等要求（选填）">' + E(p.ui.note || '') + '</textarea></div></div>';
    h += '<div class="notice-bar">📞 下单后可在订单详情一键拨打商家电话</div>';
    h += '<div class="btn btn-block" data-action="place-order">提交订单 · ' + U.money(total) + '</div>';
    return U.page('确认订单', h, { back: true });
  };

  /* ---------------- 订单列表 ---------------- */
  V.orders = function (p) {
    var tab = p.ui.ordersTab || '全部';
    var all = S.getOrders();
    var ongoing = ['pending', 'accepted', 'ready', 'delivering'];
    var list = tab === '进行中' ? all.filter(function (o) { return ongoing.indexOf(o.status) >= 0; })
      : tab === '已完成' ? all.filter(function (o) { return ongoing.indexOf(o.status) < 0; }) : all;
    var h = U.seg([{ value: '全部', label: '全部' }, { value: '进行中', label: '进行中' }, { value: '已完成', label: '已完成' }], tab, 'ordersTab');
    if (!list.length) h += U.empty('📋', '暂无相关订单');
    h += list.map(function (o) {
      var preview = (o.items || []).slice(0, 3).map(function (it) { return U.thumb(it, 'oc-thumb'); }).join('');
      return '<div class="order-card"><div class="oc-head"><span class="oc-shop">' + E(o.shopEmoji || '🍽️') + ' ' + E(o.shopName) + '</span>' + U.statusTag(o.status) + '</div>' +
        '<div class="oc-goods" data-action="go" data-href="#/user/detail?id=' + E(o.id) + '" style="cursor:pointer">' + preview +
        '<div class="flex1 small muted ellipsis">' + (o.items || []).map(function (i) { return i.name + '×' + i.count; }).join('、') + '</div>' +
        '<span class="bold">' + U.money(o.total) + '</span></div>' +
        '<div class="oc-foot"><span class="tiny muted">' + E(o.createdAt) + ' · ' + E(o.no) + '</span>' +
        '<span class="tiny muted">' + (o.items || []).reduce(function (s, i) { return s + i.count; }, 0) + ' 件</span></div>' +
        '<div class="oc-actions">' +
          '<div class="btn btn-ghost btn-sm" data-action="go" data-href="#/user/detail?id=' + E(o.id) + '">查看详情</div>' +
          (o.status === 'completed' && !o.reviewed ? '<div class="btn btn-soft btn-sm" data-action="go" data-href="#/user/review?id=' + E(o.id) + '">✍️ 评价晒图</div>' : '') +
          '<a class="btn btn-ghost btn-sm" href="tel:' + E(S.getMerchantPhone()) + '">📞 联系商家</a>' +
        '</div></div>';
    }).join('');
    return U.page('我的订单', h, { tab: 'orders' });
  };

  /* ---------------- 订单详情 ---------------- */
  V.detail = function (p) {
    var o = S.findOrder(p.params.id);
    if (!o) return U.page('订单详情', U.empty('🤔', '订单不存在'), { back: true });
    var h = '';
    h += '<div class="card" style="text-align:center;padding:20px"><div style="font-size:34px">' +
      (o.status === 'completed' ? '✅' : o.status === 'rejected' ? '❌' : '🛵') + '</div>' +
      '<div class="bold" style="font-size:16px;margin-top:6px">' + U.statusText(o.status) + '</div>' +
      '<div class="tiny muted" style="margin-top:4px">' + (o.status === 'delivering' ? '商家已取餐，正在为你配送' : '订单编号 ' + E(o.no)) + '</div></div>';
    h += '<div class="card"><div class="card-title">配送进度</div>' + U.timeline(o.timeline) + '</div>';
    h += '<div class="card"><div class="card-title">' + E(o.shopEmoji || '🍽️') + ' ' + E(o.shopName) + '</div>' +
      (o.items || []).map(function (it) {
        return '<div class="row gap10" style="padding:7px 0">' + U.thumb(it, 'oc-thumb') +
          '<div class="flex1"><div class="small bold">' + E(it.name) + '</div><div class="tiny muted">x' + it.count + '</div></div>' +
          '<span>' + U.money(it.price * it.count) + '</span></div>';
      }).join('') +
      '<div class="divider"></div>' +
      '<div class="between small" style="padding:3px 0"><span class="sub">商品小计</span><span>' + U.money(o.goodsTotal) + '</span></div>' +
      '<div class="between small" style="padding:3px 0"><span class="sub">配送费</span><span>' + U.money(o.deliveryFee) + '</span></div>' +
      '<div class="between small" style="padding:3px 0"><span class="sub">优惠券</span><span>-' + U.money(o.couponAmount) + '</span></div>' +
      '<div class="divider"></div><div class="between"><span class="bold">实付款</span><span class="price" style="font-size:18px">' + o.total + '</span></div></div>';
    var reviews = S.getReviews().filter(function (r) { return r.orderId === o.id; });
    if (reviews.length) {
      h += '<div class="card"><div class="card-title">我的评价</div>' + reviews.map(function (r) {
        return '<div class="small">' + '⭐'.repeat(r.rating) + ' <span class="tiny muted">' + E(r.time) + '</span></div>' +
          '<div class="small" style="margin:6px 0">' + E(r.text || '（仅晒图）') + '</div>' + U.reviewImgs(r.images);
      }).join('') + '</div>';
    }
    h += '<div class="card"><div class="card-title">订单信息</div>' +
      '<div class="small sub" style="line-height:2">收货人：' + E(o.receiver) + ' ' + E(o.phone) + '<br>地址：' + E(o.address) +
      '<br>备注：' + E(o.note || '无') + '<br>下单时间：' + E(o.createdAt) + '<br>订单号：' + E(o.no) + '</div></div>';
    h += '<div style="display:flex;gap:10px"><a class="btn btn-ghost" style="flex:1" href="tel:' + E(S.getMerchantPhone()) + '">📞 联系商家</a>' +
      (o.status === 'completed' && !o.reviewed ? '<div class="btn" style="flex:1" data-action="go" data-href="#/user/review?id=' + E(o.id) + '">✍️ 去评价</div>' : '<div class="btn btn-ghost" style="flex:1" data-action="go" data-href="#/user/shops">再来一单</div>') + '</div>';
    return U.page('订单详情', h, { back: true });
  };

  /* ---------------- 评价晒图 ---------------- */
  V.review = function (p) {
    var o = S.findOrder(p.params.id);
    if (!o) return U.page('评价', U.empty('🤔', '订单不存在'), { back: true });
    var ui = p.ui;
    var rating = Number(ui.rating || 5);
    var tags = ui.tags || [];
    var images = ui.reviewImages || [];
    var h = '';
    h += '<div class="card"><div class="row gap10">' + U.thumb({ shopEmoji: o.shopEmoji }, 'oc-thumb') +
      '<div><div class="bold">' + E(o.shopName) + '</div><div class="tiny muted">共 ' + (o.items || []).length + ' 件商品 · ' + U.money(o.total) + '</div></div></div></div>';
    h += '<div class="card"><div class="card-title" style="justify-content:center">这次用餐体验如何？</div>' + U.stars(rating) +
      '<div class="chips" style="justify-content:center;flex-wrap:wrap">' + QUICK_TAGS.map(function (t) {
        return '<div class="chip ' + (tags.indexOf(t) >= 0 ? 'active' : '') + '" data-action="toggle-tag" data-value="' + E(t) + '">' + E(t) + '</div>';
      }).join('') + '</div>' +
      '<div class="form-field" style="margin-top:12px"><label class="form-label">写下你的评价</label>' +
      '<textarea class="textarea" data-model="reviewText" placeholder="说说味道、分量、包装…">' + E(ui.reviewText || '') + '</textarea>' +
      '<div class="tiny muted" style="text-align:right">' + (ui.reviewText || '').length + '/200</div></div></div>';
    h += '<div class="card"><div class="card-title">晒图评价 <span class="tiny muted">最多 6 张</span></div>' +
      U.photoGrid(images, 'reviewImages', 6) +
      '<div class="tiny muted" style="margin-top:8px">照片保存在本机浏览器，刷新后仍在</div></div>';
    h += '<div class="btn btn-block" data-action="submit-review" data-id="' + E(o.id) + '">提交评价</div>';
    return U.page('评价晒图', h, { back: true });
  };

  /* ---------------- 我的 ---------------- */
  V.profile = function (p) {
    var orders = S.getOrders(), coupons = S.getCoupons().filter(function (c) { return !c.used; });
    var spent = orders.reduce(function (s, o) { return s + (o.total || 0); }, 0);
    var phone = S.getMerchantPhone();
    var session = S.getSession() || { name: '同学' };
    var h = '';
    h += '<div class="hero"><div class="hero-name">Hi，' + E(session.name) + ' 👋</div><div class="hero-sub">欢迎回来，享受美味时光</div></div>';
    h += '<div class="stat-grid" style="margin-bottom:12px">' +
      '<div class="stat-box"><div class="sb-val">' + orders.length + '</div><div class="sb-label">我的订单</div></div>' +
      '<div class="stat-box"><div class="sb-val">' + coupons.length + '</div><div class="sb-label">可用优惠券</div></div>' +
      '<div class="stat-box"><div class="sb-val">' + U.money(spent) + '</div><div class="sb-label">累计消费</div></div>' +
      '<div class="stat-box"><div class="sb-val">' + S.getReviews().length + '</div><div class="sb-label">我的评价</div></div></div>';
    h += '<div class="card">' +
      '<div class="list-row" data-action="go" data-href="#/user/account"><span class="lr-icon">👤</span><span class="flex1">个人资料 / 修改昵称</span><span class="tiny muted">' + E(session.name) + '</span><span class="arrow">›</span></div>' +
      '<div class="list-row" data-action="go" data-href="#/user/address"><span class="lr-icon">📍</span><span class="flex1">我的收货地址</span><span class="arrow">›</span></div>' +
      '<div class="list-row" data-action="go" data-href="#/user/coupons"><span class="lr-icon">🎟️</span><span class="flex1">我的优惠券</span><span class="tag">' + coupons.length + ' 张</span><span class="arrow">›</span></div>' +
      '<a class="list-row" href="tel:' + E(phone) + '"><span class="lr-icon">📞</span><span class="flex1">联系商家</span><span class="tiny muted">' + E(phone) + '</span><span class="arrow">›</span></a>' +
      '<div class="list-row" data-action="go" data-href="#/user/location"><span class="lr-icon">🧭</span><span class="flex1">手动设置位置</span><span class="arrow">›</span></div>' +
      '</div>';
    h += '<div class="card"><div class="card-title">其他入口</div>' +
      '<div class="list-row" data-action="switch-role" data-role="merchant"><span class="lr-icon">🍳</span><span class="flex1">进入商家端</span><span class="tiny muted">商家专用</span><span class="arrow">›</span></div>' +
      '<div class="list-row" data-action="switch-role" data-role="admin"><span class="lr-icon">📊</span><span class="flex1">进入管理后台</span><span class="tiny muted">管理员专用</span><span class="arrow">›</span></div>' +
      '<div class="list-row" data-action="reset-data"><span class="lr-icon">♻️</span><span class="flex1">重置演示数据</span><span class="arrow">›</span></div>' +
      '<div class="list-row" data-action="logout"><span class="lr-icon">🚪</span><span class="flex1">退出登录</span><span class="arrow">›</span></div></div>';
    h += '<div style="text-align:center;margin-top:18px;font-size:20px;opacity:.45">校园外卖平台 · v1.0 Web</div>';
    h += '<div class="tiny muted" style="text-align:center;margin-top:6px;line-height:1.7">昵称与资料可在「个人资料」中随时修改<br>本链接可直接转发给他人打开</div>';
    return U.page('我的', h, { tab: 'profile' });
  };

  /* ---------------- 个人资料 ---------------- */
  V.account = function (p) {
    var session = S.getSession() || {};
    if (p.ui.nickName === undefined) p.ui.nickName = session.name || '';
    var h = '<div class="hero"><div class="hero-name">👤 ' + E(session.name || '同学') + '</div>' +
      '<div class="hero-sub">' + E(session.phone && session.phone !== '未填写' ? session.phone : '未绑定手机号') +
      ' · 加入于 ' + E(session.joined || '--') + '</div></div>';
    h += '<div class="card"><div class="form-field"><label class="form-label">昵称</label>' +
      '<input class="input" maxlength="12" data-model="nickName" value="' + E(p.ui.nickName) + '" placeholder="输入新昵称"></div>' +
      '<div class="btn btn-block" data-action="save-nickname">保存昵称</div>' +
      '<div class="tiny muted" style="text-align:center;margin-top:8px">昵称会用于首页问候和平台用户列表</div></div>';
    h += '<div class="card"><div class="list-row" data-action="logout"><span class="lr-icon">🚪</span><span class="flex1">退出登录</span><span class="arrow">›</span></div></div>';
    return U.page('个人资料', h, { back: true });
  };

  /* ---------------- 搜索 ---------------- */
  V.search = function (p) {
    var key = (p.ui.searchKey || '').trim();
    var openIds = S.getShops().filter(function (s) { return s.status === 'open'; }).map(function (s) { return s.id; });
    var dishes = S.getDishes().filter(function (d) { return d.status === 'on' && openIds.indexOf(d.shopId) >= 0; });
    var results = key ? dishes.filter(function (d) { return (d.name + d.desc).indexOf(key) >= 0; }) : [];
    var hot = dishes.slice().sort(function (a, b) { return b.sales - a.sales; }).slice(0, 6);
    var h = '<div class="card tight"><input class="input" data-model="searchKey" value="' + E(p.ui.searchKey || '') + '" placeholder="搜索菜品名称，如：牛肉面"></div>';
    if (key) {
      h += '<div class="section-head">搜索结果 <span class="sh-more">' + results.length + ' 道菜</span></div>';
      h += results.length ? results.map(function (d) {
        var shop = S.getShop(d.shopId);
        return '<div class="dish-row">' + U.thumb(d, 'dish-thumb') + '<div class="dish-info">' +
          '<div class="dish-name">' + E(d.name) + '</div><div class="dish-desc">' + E(shop ? shop.name : '') + ' · 月售 ' + d.sales + '</div>' +
          '<div class="dish-foot"><span class="price dish-price">' + d.price + '</span>' +
          '<span class="btn btn-xs" data-action="open-shop" data-id="' + E(d.shopId) + '">进店</span></div></div></div>';
      }).join('') : U.empty('🔍', '没有找到相关菜品');
    } else {
      h += '<div class="section-head">🔥 人气推荐</div><div class="card">' + hot.map(function (d) {
        return '<div class="dish-row">' + U.thumb(d, 'dish-thumb') + '<div class="dish-info">' +
          '<div class="dish-name">' + E(d.name) + '</div><div class="dish-desc">' + E(S.getShop(d.shopId) ? S.getShop(d.shopId).name : '') + '</div>' +
          '<div class="dish-foot"><span class="price dish-price">' + d.price + '</span>' +
          '<span class="btn btn-xs" data-action="open-shop" data-id="' + E(d.shopId) + '">进店</span></div></div></div>';
      }).join('') + '</div>';
    }
    return U.page('搜索', h, { back: true });
  };

  /* ---------------- 地址管理 ---------------- */
  V.address = function (p) {
    var list = S.getAddresses();
    var h = '<div class="btn btn-block" data-action="open-modal" data-modal="address">＋ 新增收货地址</div>';
    h += '<div class="section-head">已保存地址</div>';
    if (!list.length) h += U.empty('📍', '还没有收货地址');
    h += list.map(function (a) {
      return '<div class="card"><div class="between"><div class="bold">' + E(a.name) + ' <span class="tag">' + E(a.tag) + '</span>' +
        (a.isDefault ? ' <span class="tag tag-green">默认</span>' : '') + '</div><span class="tiny muted">' + E(a.phone) + '</span></div>' +
        '<div class="small sub" style="margin:8px 0">' + E(a.detail) + '</div>' +
        '<div class="row gap8" style="justify-content:flex-end">' +
        (a.isDefault ? '' : '<span class="btn btn-ghost btn-xs" data-action="set-default" data-id="' + E(a.id) + '">设为默认</span>') +
        '<span class="btn btn-danger btn-xs" data-action="del-address" data-id="' + E(a.id) + '">删除</span></div></div>';
    }).join('');
    return U.page('收货地址', h, { back: true });
  };

  /* ---------------- 优惠券 ---------------- */
  V.coupons = function (p) {
    var list = S.getCoupons();
    var h = '';
    ['未使用', '已使用'].forEach(function (label) {
      var arr = list.filter(function (c) { return label === '未使用' ? !c.used : c.used; });
      h += '<div class="section-head">' + label + '（' + arr.length + '）</div>';
      h += arr.length ? arr.map(function (c) {
        return '<div class="card ' + (c.used ? 'muted' : '') + '" style="opacity:' + (c.used ? '.6' : '1') + '">' +
          '<div class="row gap12"><div style="font-size:30px">🎟️</div><div class="flex1">' +
          '<div class="bold">' + E(c.title) + '</div><div class="tiny muted">' + E(c.desc) + '</div></div>' +
          '<span class="price" style="font-size:18px">' + c.amount + '</span></div></div>';
      }).join('') : '<div class="card tiny muted">暂无' + label + '优惠券</div>';
    });
    return U.page('我的优惠券', h, { back: true });
  };

  /* ---------------- 手动设置位置 ---------------- */
  V.location = function (p) {
    var loc = S.getCurrentLocation();
    var commons = ['科技园 · 腾讯大厦', '深南大道 · 创新大厦', '科苑路 · 软件园二期', '南山大道 · 海天花园', '大学城 · 学生宿舍 A 栋'];
    var h = '<div class="card"><div class="form-field"><label class="form-label">手动输入地址 / 地点名称</label>' +
      '<input class="input" data-model="locInput" value="' + E(p.ui.locInput || '') + '" placeholder="例如：图书馆北门"></div>' +
      '<div class="btn btn-block" data-action="save-location">保存为当前位置</div></div>';
    h += '<div class="section-head">常用地点</div><div class="card">' + commons.map(function (c) {
      return '<div class="list-row" data-action="pick-location" data-value="' + E(c) + '"><span class="lr-icon">📍</span><span class="flex1">' + E(c) + '</span><span class="arrow">›</span></div>';
    }).join('') + '</div>';
    h += '<div class="section-head">从收货地址选择</div><div class="card">' + S.getAddresses().map(function (a) {
      return '<div class="list-row" data-action="pick-location" data-value="' + E(a.detail) + '"><span class="lr-icon">🏠</span>' +
        '<div class="flex1"><div class="small bold">' + E(a.tag) + ' · ' + E(a.name) + '</div><div class="tiny muted ellipsis">' + E(a.detail) + '</div></div><span class="arrow">›</span></div>';
    }).join('') + '</div>';
    h += '<div class="notice-bar">当前位置：' + E(loc.name) + ' — ' + E(loc.detail) + '（不会自动获取 GPS）</div>';
    return U.page('设置位置', h, { back: true });
  };

  window.Views.user = V;

  /* ---------------- 登录页 ---------------- */
  window.Views.login = {
    home: function (p) {
      var h = '<div class="login-wrap">' +
        '<div class="login-logo">🍜</div>' +
        '<div class="login-title">校园外卖</div>' +
        '<div class="login-sub">足不出校 · 吃遍食堂与周边</div>' +
        '<div class="card login-card">' +
        '<div class="form-field"><label class="form-label">昵称</label>' +
        '<input class="input" maxlength="12" data-model="loginName" value="' + E(p.ui.loginName || '') + '" placeholder="给自己起个昵称"></div>' +
        '<div class="form-field"><label class="form-label">手机号（选填）</label>' +
        '<input class="input" maxlength="11" data-model="loginPhone" value="' + E(p.ui.loginPhone || '') + '" placeholder="用于商家联系你"></div>' +
        '<div class="btn btn-block" data-action="login">进入校园外卖</div>' +
        '<div class="tiny muted login-tip">登录后可在「我的 → 个人资料」随时修改昵称</div>' +
        '</div>' +
        '<div class="login-foot">同一链接多人使用，云端数据实时同步<br>登录后可在顶部切换商家端 / 管理后台</div>' +
        '</div>';
      return U.page('登录', h, {});
    }
  };
})();
