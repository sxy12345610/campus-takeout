/* 公共 UI 辅助函数 */
var UI = (function () {
  function esc(s) {
    if (s === undefined || s === null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function money(n) {
    var v = Number(n || 0);
    return '¥' + (Math.round(v * 100) / 100).toString();
  }
  function page(title, html, opts) {
    return Object.assign({ title: title, html: html, back: false, right: '', tab: '', rightAction: '' }, opts || {});
  }
  function empty(emoji, text) {
    return '<div class="empty"><span class="em-emoji">' + emoji + '</span><div class="em-text">' + esc(text) + '</div></div>';
  }
  function thumb(item, cls) {
    var inner = item && item.image
      ? '<img src="' + esc(item.image) + '" alt="">'
      : esc((item && (item.emoji || item.shopEmoji)) || '🍽️');
    return '<div class="' + cls + '">' + inner + '</div>';
  }
  var STATUS = {
    pending:    { text: '待接单', cls: 'tag' },
    accepted:   { text: '制作中', cls: 'tag-blue' },
    ready:      { text: '待取餐', cls: 'tag' },
    delivering: { text: '配送中', cls: 'tag-blue' },
    completed:  { text: '已完成', cls: 'tag-green' },
    rejected:   { text: '已拒单', cls: 'tag-gray' },
    refunded:   { text: '已退款', cls: 'tag-gray' },
  };
  function statusTag(s) {
    var x = STATUS[s] || { text: s || '未知', cls: 'tag-gray' };
    return '<span class="tag ' + x.cls + '">' + esc(x.text) + '</span>';
  }
  function statusText(s) { return (STATUS[s] || { text: s || '未知' }).text; }
  function merchantTag(s) {
    var map = {
      approved: { text: '已入驻', cls: 'tag-green' },
      pending: { text: '待审核', cls: 'tag' },
      rejected: { text: '已驳回', cls: 'tag-red' },
    };
    var x = map[s] || { text: s, cls: 'tag-gray' };
    return '<span class="tag ' + x.cls + '">' + esc(x.text) + '</span>';
  }
  function timeline(list) {
    if (!list || !list.length) return '';
    return '<div class="timeline">' + list.map(function (s) {
      return '<div class="tl-item ' + (s.done ? 'done' : '') + '">' +
        '<div class="tl-dot"></div><div><span class="tl-label">' + esc(s.label) + '</span>' +
        '<span class="tl-time">' + esc(s.time || '') + '</span></div></div>';
    }).join('') + '</div>';
  }
  function stars(n) {
    var out = '<div class="stars">';
    for (var i = 1; i <= 5; i++) {
      out += '<span class="star ' + (i <= (n || 0) ? 'on' : '') + '" data-action="set-ui" data-key="rating" data-value="' + i + '">⭐</span>';
    }
    return out + '</div>';
  }
  function reviewImgs(images) {
    if (!images || !images.length) return '';
    return '<div class="review-imgs">' + images.map(function (src) {
      return '<img src="' + esc(src) + '" alt="评价图片">';
    }).join('') + '</div>';
  }
  function photoGrid(images, uploadKey, max) {
    var list = images || [];
    var html = '<div class="photo-grid">';
    list.forEach(function (src, i) {
      html += '<div class="photo-item"><img src="' + esc(src) + '" alt="">' +
        '<span class="photo-del" data-action="del-photo" data-key="' + uploadKey + '" data-index="' + i + '">×</span></div>';
    });
    if (list.length < (max || 6)) {
      html += '<label class="photo-add"><span>＋</span><small>添加图片</small>' +
        '<input type="file" accept="image/*" ' + (max === 1 ? '' : 'multiple ') + 'data-upload="' + uploadKey + '" style="display:none"></label>';
    }
    return html + '</div>';
  }
  function chips(items, current, key) {
    return '<div class="chips">' + items.map(function (it) {
      var val = typeof it === 'string' ? it : it.value;
      var label = typeof it === 'string' ? it : it.label;
      return '<div class="chip ' + (String(current) === String(val) ? 'active' : '') + '" data-action="set-ui" data-key="' + key + '" data-value="' + esc(val) + '">' + esc(label) + '</div>';
    }).join('') + '</div>';
  }
  function seg(items, current, key) {
    return '<div class="seg">' + items.map(function (it) {
      return '<div class="seg-item ' + (String(current) === String(it.value) ? 'active' : '') + '" data-action="set-ui" data-key="' + key + '" data-value="' + esc(it.value) + '">' + esc(it.label) + '</div>';
    }).join('') + '</div>';
  }
  function switchRow(label, sub, key, on) {
    return '<div class="switch-row"><div><div style="font-size:13px;font-weight:600">' + esc(label) + '</div>' +
      (sub ? '<div class="tiny muted">' + esc(sub) + '</div>' : '') + '</div>' +
      '<div class="switch ' + (on ? 'on' : '') + '" data-action="toggle-switch" data-key="' + key + '"></div></div>';
  }
  return {
    esc: esc, money: money, page: page, empty: empty, thumb: thumb,
    statusTag: statusTag, statusText: statusText, merchantTag: merchantTag,
    timeline: timeline, stars: stars, reviewImgs: reviewImgs,
    photoGrid: photoGrid, chips: chips, seg: seg, switchRow: switchRow,
  };
})();
window.UI = UI;
