/* 应用核心：路由、渲染、事件、弹窗、图片上传 */
(function () {
  var S = window.Store, U = window.UI, E = U.esc;
  var screen = document.getElementById('screen');
  var appbar = document.getElementById('appbar');
  var tabbar = document.getElementById('tabbar');
  var rolebar = document.getElementById('rolebar');
  var modalRoot = document.getElementById('modal');
  var toastEl = document.getElementById('toast');

  var App = {
    ui: {}, params: {}, stack: [], currentHash: '', modal: null,
    confirmAction: null, focusKey: null,
  };
  window.App = App;

  /* 商家端 / 管理后台访问密码（可自行修改） */
  var PASSWORDS = { merchant: '888888', admin: 'admin888' };

  var ROLES = [
    { key: 'user', label: '🛵 顾客端', home: '#/user/shops' },
    { key: 'merchant', label: '🍳 商家端', home: '#/merchant/home' },
    { key: 'admin', label: '📊 后台', home: '#/admin/home' },
  ];
  var TABS = {
    user: [
      { key: 'shops', label: '点餐', emoji: '🍽️', href: '#/user/shops' },
      { key: 'cart', label: '购物车', emoji: '🛒', href: '#/user/cart' },
      { key: 'orders', label: '订单', emoji: '📋', href: '#/user/orders' },
      { key: 'profile', label: '我的', emoji: '👤', href: '#/user/profile' },
    ],
    merchant: [
      { key: 'home', label: '首页', emoji: '🏠', href: '#/merchant/home' },
      { key: 'orders', label: '订单', emoji: '📋', href: '#/merchant/orders' },
      { key: 'menu', label: '商品', emoji: '🍽️', href: '#/merchant/menu' },
      { key: 'stats', label: '统计', emoji: '📊', href: '#/merchant/stats' },
    ],
    admin: [
      { key: 'home', label: '大盘', emoji: '📊', href: '#/admin/home' },
      { key: 'merchants', label: '商家', emoji: '🏪', href: '#/admin/merchants' },
      { key: 'orders', label: '订单', emoji: '📋', href: '#/admin/orders' },
      { key: 'users', label: '用户', emoji: '👥', href: '#/admin/users' },
      { key: 'settings', label: '设置', emoji: '⚙️', href: '#/admin/settings' },
    ],
  };

  function parseHash(hash) {
    var raw = (hash || '').replace(/^#\/?/, '');
    var qi = raw.indexOf('?');
    var path = qi >= 0 ? raw.slice(0, qi) : raw;
    var qs = qi >= 0 ? raw.slice(qi + 1) : '';
    var parts = path.split('/');
    var role = parts[0] || 'user';
    if (!window.Views[role]) role = 'user';
    var page = parts[1] || (role === 'user' ? 'shops' : 'home');
    var params = {};
    qs.split('&').forEach(function (kv) {
      if (!kv) return;
      var i = kv.indexOf('=');
      params[decodeURIComponent(i < 0 ? kv : kv.slice(0, i))] = decodeURIComponent(i < 0 ? '' : kv.slice(i + 1));
    });
    return { role: role, page: page, params: params };
  }
  function currentRole() { return parseHash(location.hash).role; }
  function roleHome(role) {
    var r = ROLES.find(function (x) { return x.key === role; });
    return r ? r.home : '#/user/shops';
  }
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toastEl.classList.remove('show'); }, 1800);
  }

  /* ---------------- 渲染 ---------------- */
  function renderRolebar() {
    var parsed = parseHash(location.hash);
    var isLogin = parsed.role === 'login' || parsed.page === 'login';
    document.body.setAttribute('data-role', isLogin ? 'login' : parsed.role);
    rolebar.style.display = 'none';
    rolebar.innerHTML = '';
  }
  function renderTabbar(role, active) {
    if (!active) { tabbar.style.display = 'none'; tabbar.innerHTML = ''; return; }
    tabbar.style.display = 'flex';
    var pending = S.getOrders().filter(function (o) { return o.status === 'pending'; }).length;
    var cartCount = S.cartSummary().count;
    tabbar.innerHTML = (TABS[role] || []).map(function (t) {
      var badge = (t.key === 'orders' && role === 'merchant' && pending) ? pending
        : (t.key === 'cart' && role === 'user' && cartCount) ? cartCount : 0;
      return '<div class="tb-item ' + (active === t.key ? 'active' : '') + '" data-action="go" data-href="' + t.href + '">' +
        (badge ? '<span class="tb-dot">' + badge + '</span>' : '') +
        '<span class="tb-emoji">' + t.emoji + '</span><span>' + t.label + '</span></div>';
    }).join('');
  }
  function render(navigate) {
    var parsed = parseHash(location.hash);
    var role = parsed.role, page = parsed.page;
    if (role === 'merchant' && page !== 'login' && !S.canRole('merchant')) { location.hash = '#/merchant/login'; return; }
    if (role === 'admin' && page !== 'login' && !S.canRole('admin')) { location.hash = '#/admin/login'; return; }
    if (role === 'merchant' && page === 'login' && S.canRole('merchant')) { location.hash = '#/merchant/home'; return; }
    if (role === 'admin' && page === 'login' && S.canRole('admin')) { location.hash = '#/admin/home'; return; }
    if (role === 'user' && !S.getSession()) { location.hash = '#/login'; return; }
    if (role === 'login' && S.getSession()) { location.hash = '#/user/shops'; return; }
    App.params = parsed.params;
    var view = (window.Views[parsed.role] || {})[parsed.page];
    var res;
    try {
      res = view ? view({ ui: App.ui, params: parsed.params })
        : U.page('页面不存在', U.empty('🤔', '未找到该页面'), { back: true });
    } catch (err) {
      res = U.page('出错了', '<div class="card small sub">页面渲染出错：' + E(err.message) + '</div>', { back: true });
    }
    renderRolebar();
    appbar.innerHTML = '<div class="appbar-side">' + (res.back ? '<div class="icon-btn" data-action="back">‹</div>' : '') + '</div>' +
      '<div class="appbar-title">' + E(res.title) + '</div>' +
      '<div class="appbar-side right">' + (res.right || '') + '</div>';
    renderTabbar(parsed.role, res.tab);
    var top = screen.scrollTop;
    screen.innerHTML = res.html;
    screen.scrollTop = navigate ? 0 : top;
    if (App.modal) renderModal();
    if (App.focusKey) {
      var f = screen.querySelector('[data-model="' + App.focusKey + '"]');
      if (f) { f.focus(); try { f.setSelectionRange(f.value.length, f.value.length); } catch (e) {} }
      App.focusKey = null;
    }
  }

  /* ---------------- 导航 ---------------- */
  function navigate(href) {
    if (App.currentHash && App.currentHash !== href) App.stack.push(App.currentHash);
    App.currentHash = href;
    if (location.hash === href) render(true);
    else location.hash = href;
  }
  function back() {
    var prev = App.stack.pop();
    var target = prev || roleHome(currentRole());
    App.currentHash = target;
    if (location.hash !== target) location.hash = target;
    else render(true);
  }
  window.addEventListener('hashchange', function () { App.currentHash = location.hash; render(true); });

  /* ---------------- 弹窗 ---------------- */
  function openModal(name, data) { App.modal = { name: name, data: data || {} }; renderModal(); }
  function closeModal() { App.modal = null; App.confirmAction = null; renderModal(); }
  function confirmModal(title, desc, onYes) {
    App.confirmAction = onYes;
    openModal('confirm', { title: title, desc: desc });
  }
  function renderModal() {
    if (!App.modal) { modalRoot.classList.remove('show'); modalRoot.innerHTML = ''; return; }
    modalRoot.classList.add('show');
    modalRoot.innerHTML = '<div class="modal-card">' + modalBody(App.modal) + '</div>';
  }
  function modalBody(m) {
    var ui = App.ui, d = m.data;
    if (m.name === 'confirm') {
      return '<div class="modal-title">' + E(d.title) + '</div><div class="modal-desc">' + E(d.desc) + '</div>' +
        '<div class="modal-actions"><div class="btn btn-ghost" data-action="close-modal">取消</div>' +
        '<div class="btn" data-action="confirm-yes">确定</div></div>';
    }
    if (m.name === 'address') {
      return '<div class="modal-title">新增收货地址</div>' +
        '<div class="form-field"><label class="form-label">收货人</label><input class="input" data-model="addrName" value="' + E(ui.addrName || '') + '" placeholder="姓名"></div>' +
        '<div class="form-field"><label class="form-label">联系电话</label><input class="input" data-model="addrPhone" value="' + E(ui.addrPhone || '') + '" placeholder="手机号"></div>' +
        '<div class="form-field"><label class="form-label">详细地址</label><input class="input" data-model="addrDetail" value="' + E(ui.addrDetail || '') + '" placeholder="楼栋 / 门牌号"></div>' +
        '<div class="form-field"><label class="form-label">标签</label>' + U.chips(['家', '公司', '学校', '其他'], ui.addrTag || '家', 'addrTag') + '</div>' +
        '<div class="switch-row"><span class="small">设为默认地址</span><div class="switch ' + (ui.addrDefault ? 'on' : '') + '" data-action="toggle-switch" data-key="addrDefault"></div></div>' +
        '<div class="modal-actions"><div class="btn btn-ghost" data-action="close-modal">取消</div><div class="btn" data-action="save-address">保存</div></div>';
    }
    if (m.name === 'coupon') {
      var sum = S.cartSummary();
      var list = S.getCoupons().filter(function (c) { return !c.used && sum.total >= c.threshold; });
      var body = '<div class="modal-title">选择优惠券</div>';
      body += '<div class="card tight" data-action="pick-coupon" data-id="" style="cursor:pointer"><div class="between"><span class="small">不使用优惠券</span>' +
        (ui.couponId ? '<span class="tiny muted">切换</span>' : '<span class="tag">当前</span>') + '</div></div>';
      if (!list.length) body += '<div class="tiny muted" style="text-align:center;padding:12px">当前订单暂无可用优惠券</div>';
      body += list.map(function (c) {
        return '<div class="card tight" data-action="pick-coupon" data-id="' + E(c.id) + '" style="cursor:pointer"><div class="between">' +
          '<div><div class="bold">' + E(c.title) + '</div><div class="tiny muted">' + E(c.desc) + '</div></div>' +
          '<span class="price" style="font-size:17px">' + c.amount + '</span></div>' +
          (String(ui.couponId) === c.id ? '<div class="tag" style="margin-top:8px">已选择</div>' : '') + '</div>';
      }).join('');
      body += '<div class="modal-actions"><div class="btn btn-ghost" data-action="close-modal">关闭</div></div>';
      return body;
    }
    if (m.name === 'dish') {
      var dish = d.id ? S.getDishes().find(function (x) { return x.id === d.id; }) : null;
      if (dish && !d.prefilled) {
        ui.dishEditId = dish.id; ui.dishName = dish.name; ui.dishDesc = dish.desc;
        ui.dishPrice = dish.price; ui.dishStock = dish.stock; ui.dishCategory = dish.category;
        ui.dishEmoji = dish.emoji; ui.dishImage = dish.image || '';
        d.prefilled = true;
      } else if (!dish && !d.prefilled) {
        ui.dishEditId = ''; ui.dishName = ''; ui.dishDesc = ''; ui.dishPrice = '';
        ui.dishStock = '99'; ui.dishCategory = '热销'; ui.dishEmoji = '🍲'; ui.dishImage = '';
        d.prefilled = true;
      }
      var emojis = ['🍲', '🍖', '🍗', '🍜', '🍚', '🥘', '🥤', '🍰', '🥗', '🍳'];
      var body = '<div class="modal-title">' + (dish ? '编辑菜品' : '新增菜品') + '</div>';
      body += '<div class="form-field"><label class="form-label">菜品照片（顾客端可见）</label>' +
        U.photoGrid(ui.dishImage ? [ui.dishImage] : [], 'dishImage', 1) + '</div>';
      body += '<div class="form-field"><label class="form-label">图标（未上传照片时显示）</label><div class="chips" style="flex-wrap:wrap">' +
        emojis.map(function (x) {
          return '<div class="chip ' + (ui.dishEmoji === x ? 'active' : '') + '" data-action="set-ui" data-key="dishEmoji" data-value="' + x + '" style="font-size:17px;padding:4px 10px">' + x + '</div>';
        }).join('') + '</div></div>';
      body += '<div class="form-field"><label class="form-label">菜品名称</label><input class="input" data-model="dishName" value="' + E(ui.dishName || '') + '" placeholder="如：招牌红烧肉"></div>';
      body += '<div class="form-field"><label class="form-label">菜品描述</label><input class="input" data-model="dishDesc" value="' + E(ui.dishDesc || '') + '" placeholder="一句话介绍"></div>';
      body += '<div class="row gap10"><div class="form-field flex1"><label class="form-label">价格（元）</label><input class="input" type="number" data-model="dishPrice" value="' + E(ui.dishPrice) + '"></div>' +
        '<div class="form-field flex1"><label class="form-label">库存</label><input class="input" type="number" data-model="dishStock" value="' + E(ui.dishStock) + '"></div></div>';
      body += '<div class="form-field"><label class="form-label">分类</label>' + U.chips(S.getShopCategories('s1'), ui.dishCategory || '热销', 'dishCategory') + '</div>';
      body += '<div class="modal-actions"><div class="btn btn-ghost" data-action="close-modal">取消</div><div class="btn" data-action="save-dish">保存菜品</div></div>';
      return body;
    }
    if (m.name === 'register') {
      if (!d.prefilled) { ui.regName = ''; ui.regOwner = ''; ui.regPhone = ''; ui.regCategory = '快餐便当'; d.prefilled = true; }
      var cats = ['快餐便当', '川菜', '面食', '饮品甜品', '面包甜点'];
      return '<div class="modal-title">🏪 商家入驻申请</div>' +
        '<div class="modal-desc" style="text-align:left">提交后进入待审核，管理后台通过审核后，店铺才会出现在顾客端餐馆列表。</div>' +
        '<div class="form-field"><label class="form-label">店铺名称</label><input class="input" data-model="regName" value="' + E(ui.regName || '') + '" placeholder="如：星辰美食屋"></div>' +
        '<div class="form-field"><label class="form-label">店主姓名</label><input class="input" data-model="regOwner" value="' + E(ui.regOwner || '') + '" placeholder="如：林老板"></div>' +
        '<div class="form-field"><label class="form-label">联系电话</label><input class="input" data-model="regPhone" value="' + E(ui.regPhone || '') + '" placeholder="手机号"></div>' +
        '<div class="form-field"><label class="form-label">经营类目</label>' + U.chips(cats, ui.regCategory || '快餐便当', 'regCategory') + '</div>' +
        '<div class="modal-actions"><div class="btn btn-ghost" data-action="close-modal">取消</div><div class="btn" data-action="save-register">提交申请</div></div>';
    }
    return '<div class="modal-title">提示</div>';
  }

  /* ---------------- 图片压缩上传 ---------------- */
  function compress(file, cb) {
    var reader = new FileReader();
    reader.onload = function (ev) {
      var img = new Image();
      img.onload = function () {
        var max = 640, w = img.width, h = img.height;
        var scale = Math.min(1, max / Math.max(w, h));
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        cb(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = function () { cb(ev.target.result); };
      img.src = ev.target.result;
    };
    reader.onerror = function () { toast('图片读取失败'); };
    reader.readAsDataURL(file);
  }
  function handleUpload(input) {
    var key = input.dataset.upload;
    var files = Array.prototype.slice.call(input.files || []);
    if (!files.length) return;
    var multi = input.hasAttribute('multiple');
    var left = files.length;
    files.forEach(function (f) {
      compress(f, function (dataUrl) {
        if (multi) {
          var arr = App.ui[key] || [];
          arr.push(dataUrl); App.ui[key] = arr;
        } else App.ui[key] = dataUrl;
        left--;
        if (left === 0) { render(false); toast('图片已添加'); }
      });
    });
    input.value = '';
  }

  /* ---------------- 动作处理 ---------------- */
  function handle(action, ds, el, ev) {
    var id = ds.id;
    switch (action) {
      /* 导航类 */
      case 'go': navigate(ds.href); break;
      case 'back': back(); break;
      case 'switch-role': App.stack = []; navigate(roleHome(ds.role)); break;
      case 'open-shop':
        S.setCurrentShop(id); App.ui.shopCat = '全部';
        navigate('#/user/shop?id=' + encodeURIComponent(id)); break;
      case 'set-ui':
        App.ui[ds.key] = ds.value; render(false); break;
      case 'toggle-tag': {
        var tags = App.ui.tags || [];
        var i = tags.indexOf(ds.value);
        if (i >= 0) tags.splice(i, 1); else tags.push(ds.value);
        App.ui.tags = tags; render(false); break;
      }
      case 'toggle-switch': {
        var key = ds.key;
        if (key === 'soundAlert' || key === 'autoAccept') {
          var st = S.getSettings(); st[key] = !st[key]; S.setSettings(st);
          toast(st[key] ? '已开启' : '已关闭');
        } else if (key === 'shopOpen') {
          var shopNow = S.getShop('s1');
          var open = !(shopNow && shopNow.status === 'open');
          S.updateShop('s1', { status: open ? 'open' : 'closed' });
          toast(open ? '已开始营业' : '已打烊');
        } else if (key === 'addrDefault') {
          App.ui.addrDefault = !App.ui.addrDefault;
        }
        render(false); break;
      }
      case 'open-modal': openModal(ds.modal, { id: id || '' }); break;
      case 'close-modal': closeModal(); break;
      case 'confirm-yes': {
        var fn = App.confirmAction; App.confirmAction = null;
        closeModal(); if (fn) fn(); break;
      }
      case 'del-photo': {
        var k = ds.key, idx = Number(ds.index);
        if (k === 'reviewImages') { var arr = App.ui.reviewImages || []; arr.splice(idx, 1); App.ui.reviewImages = arr; }
        else App.ui[k] = '';
        render(false); break;
      }
      case 'call-merchant': window.location.href = 'tel:' + S.getMerchantPhone(); break;
      case 'reset-data':
        confirmModal('重置演示数据', '将清空本浏览器中全部订单、评价、照片与商家修改，恢复到初始演示状态。', function () {
          S.resetAll();
          App.ui = {}; App.stack = [];
          navigate(roleHome(currentRole())); toast('已重置为初始数据');
        });
        break;

      /* 购物车 / 下单 */
      case 'add-cart': {
        var r = S.addToCart(id);
        if (r.switched) toast('已切换餐馆，购物车已清空');
        render(false); break;
      }
      case 'cart-plus': S.updateCartCount(id, 1); render(false); break;
      case 'cart-minus': S.updateCartCount(id, -1); render(false); break;
      case 'toggle-item': S.toggleCartItem(id); render(false); break;
      case 'toggle-all': S.toggleAllCart(!S.cartSummary().allSelected); render(false); break;
      case 'remove-selected': S.removeSelected(); toast('已删除'); render(false); break;
      case 'pick-coupon': App.ui.couponId = id; closeModal(); render(false); break;
      case 'place-order': {
        var sum = S.cartSummary();
        if (!sum.count) { toast('购物车是空的'); return; }
        var shop = S.getShop(sum.shopId) || S.getCurrentShop();
        var addr = S.getAddresses().find(function (a) { return a.isDefault; }) || S.getAddresses()[0];
        var coupons = S.getCoupons().filter(function (c) { return !c.used && sum.total >= c.threshold; });
        var chosen = App.ui.couponId ? coupons.find(function (c) { return c.id === App.ui.couponId; }) : null;
        var off = chosen ? chosen.amount : 0;
        var fee = shop ? shop.deliveryFee : 0;
        var order = S.placeOrder({
          shopId: sum.shopId, shopName: shop ? shop.name : '', shopEmoji: shop ? shop.emoji : '',
          items: sum.cart.filter(function (c) { return c.selected; }),
          goodsTotal: sum.total, deliveryFee: fee, couponAmount: off,
          total: Math.max(0, sum.total + fee - off),
          address: addr ? addr.detail : '请补充地址', receiver: addr ? addr.name : '顾客',
          phone: addr ? addr.phone : '', deliverTime: '尽快送达', note: App.ui.note || '',
        });
        if (chosen) S.toggleCouponUse(chosen.id);
        App.ui.couponId = ''; App.ui.note = '';
        App.stack = ['#/user/orders'];
        toast('下单成功 · 已通知商家');
        navigate('#/user/detail?id=' + encodeURIComponent(order.id));
        break;
      }

      /* 地址 / 位置 */
      case 'set-default': S.setDefaultAddress(id); toast('已设为默认'); render(false); break;
      case 'del-address': S.deleteAddress(id); toast('已删除'); render(false); break;
      case 'save-address': {
        var name = (App.ui.addrName || '').trim(), detail = (App.ui.addrDetail || '').trim();
        if (!name || !detail) { toast('请填写收货人和详细地址'); return; }
        S.addAddress({ name: name, phone: (App.ui.addrPhone || '').trim() || '未填写', tag: App.ui.addrTag || '家', detail: detail, isDefault: !!App.ui.addrDefault });
        App.ui.addrName = ''; App.ui.addrPhone = ''; App.ui.addrDetail = ''; App.ui.addrDefault = false;
        closeModal(); toast('地址已保存'); render(false); break;
      }
      case 'pick-location':
        S.setCurrentLocation({ name: ds.value, detail: ds.value });
        toast('位置已更新'); navigate('#/user/shops'); break;
      case 'save-location': {
        var v = (App.ui.locInput || '').trim();
        if (!v) { toast('请输入地点名称'); return; }
        S.setCurrentLocation({ name: v, detail: v });
        toast('位置已更新'); navigate('#/user/shops'); break;
      }

      /* 评价 */
      case 'submit-review': {
        var text = (App.ui.reviewText || '').trim();
        var tg = App.ui.tags || [];
        if (tg.length) text = (text ? text + '，' : '') + tg.join('、');
        var imgs = App.ui.reviewImages || [];
        if (!text && !imgs.length) { toast('写点评价或上传图片吧'); return; }
        S.submitReview(id, Number(App.ui.rating || 5), text, imgs);
        App.ui.reviewText = ''; App.ui.tags = []; App.ui.reviewImages = []; App.ui.rating = 5;
        App.stack = ['#/user/orders'];
        toast('评价成功'); navigate('#/user/detail?id=' + encodeURIComponent(id)); break;
      }

      /* 商家端 */
      case 'save-fee': {
        var feeVal = Number(App.ui.feeInput);
        if (isNaN(feeVal) || feeVal < 0 || feeVal > 99) { toast('请输入 0–99 之间的金额'); return; }
        S.updateShop('s1', { deliveryFee: feeVal });
        var st2 = S.getSettings(); st2.deliveryFee = feeVal; S.setSettings(st2);
        toast('配送费已更新，顾客端自动生效'); render(false); break;
      }
      case 'save-shop': {
        var shopFee = Number(App.ui.shopFee);
        var shopMin = Number(App.ui.shopMinOrder);
        if (isNaN(shopFee) || shopFee < 0 || shopFee > 99) { toast('配送费需在 0–99 元之间'); return; }
        if (isNaN(shopMin) || shopMin < 0 || shopMin > 999) { toast('起送价需在 0–999 元之间'); return; }
        S.updateShop('s1', {
          deliveryFee: shopFee,
          minOrder: shopMin,
          notice: (App.ui.shopNotice || '').trim(),
        });
        App.ui.feeInput = shopFee;
        var st3 = S.getSettings(); st3.deliveryFee = shopFee; S.setSettings(st3);
        toast('店铺设置已保存'); render(false); break;
      }
      case 'cat-view':
        App.ui.menuCat = ds.cat;
        navigate('#/merchant/menu'); break;
      case 'cat-toggle': {
        var catDishes = S.getDishesByShop('s1').filter(function (d) { return d.category === ds.cat; });
        if (!catDishes.length) { toast('该分类暂无菜品'); return; }
        catDishes.forEach(function (d) { S.updateDish(d.id, { status: ds.status }); });
        toast(ds.status === 'on' ? '该分类已全部上架' : '该分类已全部下架');
        render(false); break;
      }
      case 'accept-order':
        if (S.acceptOrder(id)) { toast('接单成功'); } else { toast('订单状态已变化'); }
        render(false); break;
      case 'reject-order': S.rejectOrder(id); toast('已拒单'); render(false); break;
      case 'mark-ready': S.markReady(id); toast('已出餐，等待取餐'); render(false); break;
      case 'start-delivery': S.startDelivery(id); toast('已取餐，配送中'); render(false); break;
      case 'confirm-delivered': S.confirmDelivered(id); toast('订单已送达'); render(false); break;
      case 'toggle-dish': S.toggleDishStatus(id); toast('状态已更新'); render(false); break;
      case 'del-dish': S.deleteDish(id); toast('菜品已删除'); render(false); break;
      case 'save-dish': {
        var dn = (App.ui.dishName || '').trim();
        if (!dn) { toast('请填写菜品名称'); return; }
        var patch = {
          name: dn, desc: (App.ui.dishDesc || '').trim() || '美味佳肴',
          price: Number(App.ui.dishPrice) || 0, stock: Number(App.ui.dishStock) || 0,
          category: App.ui.dishCategory || '热销', emoji: App.ui.dishEmoji || '🍲',
          image: App.ui.dishImage || '',
        };
        if (App.ui.dishEditId) S.updateDish(App.ui.dishEditId, patch);
        else S.addDish(Object.assign({ shopId: 's1' }, patch));
        closeModal(); toast('菜品已保存，顾客端可查看'); render(false); break;
      }
      case 'save-register': {
        var res = S.registerMerchant({ name: App.ui.regName, owner: App.ui.regOwner, phone: App.ui.regPhone, category: App.ui.regCategory });
        if (!res.ok) { toast(res.msg); return; }
        App.ui.regName = ''; App.ui.regOwner = ''; App.ui.regPhone = '';
        closeModal(); toast('申请已提交，等待后台审核'); render(false); break;
      }

      /* 管理后台 */
      case 'approve-merchant': S.setMerchantStatus(id, 'approved'); toast('已通过 · 店铺已在顾客端上线'); render(false); break;
      case 'reject-merchant': S.setMerchantStatus(id, 'rejected'); toast('已驳回 · 店铺保持下架'); render(false); break;
      case 'toggle-user': {
        var u = S.getUsers().find(function (x) { return x.id === id; });
        if (u) { S.setUserStatus(id, u.status === 'banned' ? 'normal' : 'banned'); toast(u.status === 'banned' ? '已封禁' : '已解封'); }
        render(false); break;
      }
      case 'refund-order': S.updateOrder(id, { status: 'refunded' }); toast('已退款'); render(false); break;

      /* 登录 / 个人资料 */
      case 'login': {
        var nm = (App.ui.loginName || '').trim();
        var ph = (App.ui.loginPhone || '').trim();
        if (!nm) { toast('请输入昵称'); return; }
        if (nm.length > 12) { toast('昵称最多 12 个字'); return; }
        if (ph && !/^1\d{10}$/.test(ph)) { toast('手机号需为 11 位数字'); return; }
        S.login(nm, ph);
        App.ui.loginName = ''; App.ui.loginPhone = '';
        toast('欢迎，' + nm);
        navigate('#/user/shops'); break;
      }
      case 'save-nickname': {
        var nn = (App.ui.nickName || '').trim();
        if (!nn) { toast('昵称不能为空'); return; }
        if (nn.length > 12) { toast('昵称最多 12 个字'); return; }
        S.updateSessionName(nn);
        App.ui.nickName = nn;
        toast('昵称已更新');
        back(); break;
      }
      case 'logout':
        confirmModal('退出登录', '退出后需要重新输入昵称才能进入', function () {
          S.clearSession();
          navigate('#/login');
        });
        break;

      /* 商家 / 后台密码登录 */
      case 'merchant-login': {
        if ((App.ui.merchantPass || '') !== PASSWORDS.merchant) { toast('商家密码错误'); return; }
        S.setRoleAuth('merchant');
        App.ui.merchantPass = '';
        toast('已进入商家端');
        navigate('#/merchant/home'); break;
      }
      case 'admin-login': {
        if ((App.ui.adminPass || '') !== PASSWORDS.admin) { toast('后台密码错误'); return; }
        S.setRoleAuth('admin');
        App.ui.adminPass = '';
        toast('已进入管理后台');
        navigate('#/admin/home'); break;
      }
      case 'exit-merchant':
        S.clearRole('merchant');
        toast('已退出商家端');
        navigate(S.getSession() ? '#/user/shops' : '#/login'); break;
      case 'exit-admin':
        S.clearRole('admin');
        toast('已退出管理后台');
        navigate(S.getSession() ? '#/user/shops' : '#/login'); break;

      default: break;
    }
  }

  /* ---------------- 全局事件 ---------------- */
  document.addEventListener('click', function (e) {
    var g = e.target.closest('[data-goto]');
    if (g) { navigate(g.dataset.goto); return; }
    if (e.target === modalRoot) { closeModal(); return; }
    var el = e.target.closest('[data-action]');
    if (!el) return;
    handle(el.dataset.action, el.dataset, el, e);
  });
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (!t.dataset || !t.dataset.model) return;
    App.ui[t.dataset.model] = t.value;
    if (t.dataset.model === 'searchKey') { App.focusKey = 'searchKey'; render(false); }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (!t.dataset) return;
    if (t.dataset.upload) { handleUpload(t); return; }
    if (t.dataset.model) App.ui[t.dataset.model] = t.type === 'checkbox' ? t.checked : t.value;
  });

  /* ---------------- 启动 ---------------- */
  function tickClock() {
    var d = new Date();
    document.getElementById('clock').textContent = (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
  }
  var syncPending = false;
  window.addEventListener('sync:applied', function () {
    // 正在输入时先不刷新，避免把用户还没保存的内容冲掉
    var ae = document.activeElement;
    if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) {
      syncPending = true;
      return;
    }
    render(false);
    toast('已同步最新数据');
  });
  document.addEventListener('focusout', function () {
    if (!syncPending) return;
    syncPending = false;
    render(false);
    toast('已同步最新数据');
  });
  S.init();
  if (!location.hash) location.hash = S.getSession() ? '#/user/shops' : '#/login';
  App.currentHash = location.hash;
  tickClock(); setInterval(tickClock, 30000);
  render(true);
  if (window.Sync) {
    window.Sync.init();
    if (window.Sync.enabled) {
      var sideNote = document.getElementById('sideNote');
      var sideFoot = document.getElementById('sideFoot');
      if (sideNote) sideNote.innerHTML = '数据已开启<strong>云端同步</strong>：你在这里的修改，其他人打开同一链接刷新后即可看到。购物车与收货地址仅保存在各自浏览器。';
      if (sideFoot) sideFoot.textContent = '静态托管 + Supabase 云同步 · 无需登录';
    }
  }
})();
