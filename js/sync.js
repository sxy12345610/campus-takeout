/**
 * 云同步：把本地数据（localStorage 中 wk_ 开头的 key）同步到 Supabase，
 * 让所有打开同一网址的人共享同一份数据。
 *
 * 同步策略：
 * - 只上传“本地改动过的键”，其余键以云端最新数据为准，避免一台设备用旧数据覆盖别人。
 * - 数组型数据（订单、用户、评价等）按 id 合并，保留双端新增的记录。
 * - 每 6 秒拉取一次云端数据；拉取时不覆盖本地尚未上传的改动。
 */
(function () {
    var cfg = window.SYNC_CONFIG || {};
    var enabled = !!(cfg.supabaseUrl && cfg.supabaseKey);
    var TABLE = cfg.table || 'app_state';
    var ROW = cfg.rowId || 'main';
    var TS_KEY = 'sync_updated_ts';
    var SIG_KEY = 'sync_sig_' + ROW;
    var POLL_MS = cfg.pollMs || 6000;
    var base = enabled ? cfg.supabaseUrl.replace(/\/$/, '') + '/rest/v1/' + TABLE : '';
    var headers = enabled ? {
        apikey: cfg.supabaseKey,
        Authorization: 'Bearer ' + cfg.supabaseKey,
        'Content-Type': 'application/json'
    } : {};

    var pushTimer = null;
    var pushing = false;
    var pulling = false;
    var queued = false;
    var applying = false;
    var ready = false;
    var ver = {};   // 本地改动过的键 -> 版本号

    // 这些是“每个人自己的”数据，不应共享给其他人
    var EXCLUDE = {
        'wk_cart': 1,
        'wk_addresses': 1,
        'wk_current_shop': 1,
        'wk_current_location': 1,
        'wk_session': 1,
        'wk_role_auth': 1,
        'wk_demo_otp': 1,
        'wk_otp_last': 1
    };

    function isSyncedKey(k) {
        return !!k && k.indexOf('wk_') === 0 && !EXCLUDE[k];
    }

    function localTs() {
        return Number(localStorage.getItem(TS_KEY) || 0);
    }

    function collect() {
        var out = {};
        for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (!isSyncedKey(k)) continue;
            var raw = localStorage.getItem(k);
            try { out[k] = JSON.parse(raw); } catch (e) { out[k] = raw; }
        }
        return out;
    }

    function mergeList(remote, local) {
        var map = {}, order = [];
        (remote || []).forEach(function (x) {
            if (!x || x.id === undefined) return;
            if (map[x.id] === undefined) order.push(x.id);
            map[x.id] = x;
        });
        (local || []).forEach(function (x) {
            if (!x || x.id === undefined) return;
            if (map[x.id] === undefined) order.push(x.id);
            map[x.id] = x;
        });
        return order.map(function (id) { return map[id]; });
    }

    // 以云端数据为底，只覆盖本地改动过的键；数组按键内 id 合并
    function mergeData(remote, local) {
        var out = {};
        Object.keys(remote || {}).forEach(function (k) {
            if (isSyncedKey(k)) out[k] = remote[k];
        });
        Object.keys(local).forEach(function (k) {
            if (!isSyncedKey(k)) return;
            if (!ver[k] && out[k] !== undefined) return;
            var rv = out[k], lv = local[k];
            out[k] = (Array.isArray(rv) && Array.isArray(lv)) ? mergeList(rv, lv) : lv;
        });
        return out;
    }

    function apply(data, ts) {
        if (!data) return;
        applying = true;
        Object.keys(data).forEach(function (k) {
            if (!isSyncedKey(k) || ver[k]) return;   // 本地未上传的改动优先
            try { localStorage.setItem(k, JSON.stringify(data[k])); } catch (e) {}
        });
        localStorage.setItem(TS_KEY, String(ts || Date.now()));
        applying = false;
    }

    function push() {
        if (!enabled || !ready) return;
        if (pushing) { queued = true; return; }
        pushing = true;
        var snap = Object.assign({}, ver);
        var local = collect();

        fetch(base + '?id=eq.' + encodeURIComponent(ROW) + '&select=data', { headers: headers })
            .then(function (r) { return r.ok ? r.json() : []; })
            .then(function (rows) {
                var remote = (rows && rows[0] && rows[0].data) || {};
                var merged = mergeData(remote, local);
                var ts = Date.now();
                return fetch(base + '?on_conflict=id', {
                    method: 'POST',
                    headers: Object.assign({}, headers, { Prefer: 'resolution=merge-duplicates,return=minimal' }),
                    body: JSON.stringify({ id: ROW, data: merged, updated_at: ts })
                }).then(function (r) {
                    if (!r.ok) {
                        console.warn('[sync] 推送失败，HTTP ' + r.status + '，请检查数据表与权限配置');
                        return;
                    }
                    localStorage.setItem(TS_KEY, String(ts));
                    localStorage.setItem(SIG_KEY, JSON.stringify(merged));
                    Object.keys(snap).forEach(function (k) {
                        if (ver[k] === snap[k]) delete ver[k];
                    });
                    apply(merged, ts);
                });
            })
            .catch(function (e) {
                console.warn('[sync] 网络异常，稍后重试', e);
            })
            .then(function () {
                pushing = false;
                if (queued) { queued = false; push(); }
            });
    }

    function pull(initial) {
        if (!enabled || pulling) return;
        pulling = true;
        fetch(base + '?id=eq.' + encodeURIComponent(ROW) + '&select=id,data,updated_at', { headers: headers })
            .then(function (r) { return r.ok ? r.json() : []; })
            .then(function (rows) {
                pulling = false;
                var row = rows && rows[0];
                if (!row) {
                    ready = true;
                    if (initial) push();
                    return;
                }
                var ts = Number(row.updated_at || 0);
                var sig = JSON.stringify(row.data || {});
                if (sig !== localStorage.getItem(SIG_KEY)) {
                    apply(row.data, ts);
                    localStorage.setItem(SIG_KEY, sig);
                    window.dispatchEvent(new CustomEvent('sync:applied'));
                } else if (ts > localTs() + 1000) {
                    localStorage.setItem(TS_KEY, String(ts));
                }
                ready = true;
            })
            .catch(function (e) {
                pulling = false;
                ready = true;
                console.warn('[sync] 拉取失败', e);
            });
    }

    function schedulePush() {
        if (!enabled) return;
        clearTimeout(pushTimer);
        pushTimer = setTimeout(push, 900);
    }

    window.Sync = {
        enabled: enabled,
        init: function () {
            if (!enabled) return;
            pull(true);
            setInterval(function () { pull(false); }, POLL_MS);
        },
        onWrite: function (key) {
            if (!enabled || applying) return;
            if (!isSyncedKey(key)) return;
            ver[key] = (ver[key] || 0) + 1;
            schedulePush();
        },
        pushNow: push,
        pullNow: function () { pull(false); }
    };
})();
