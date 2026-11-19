/**
 * 云同步：把本地数据（localStorage 中 wk_ 开头的 key）同步到 Supabase，
 * 让所有打开同一网址的人共享同一份数据。
 * 未配置 js/sync-config.js 时自动退化为本地模式，不影响原有功能。
 */
(function () {
    var cfg = window.SYNC_CONFIG || {};
    var enabled = !!(cfg.supabaseUrl && cfg.supabaseKey);
    var TABLE = cfg.table || 'app_state';
    var ROW = cfg.rowId || 'main';
    var TS_KEY = 'sync_updated_ts';
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

    // 这些是“每个人自己的”数据，不应共享给其他人
    var EXCLUDE = {
        'wk_cart': 1,
        'wk_addresses': 1,
        'wk_current_shop': 1,
        'wk_current_location': 1,
        'wk_session': 1,
        'wk_role_auth': 1
    };

    function isSyncedKey(k) {
        return k && k.indexOf('wk_') === 0 && !EXCLUDE[k];
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

    function apply(data, ts) {
        if (!data) return;
        applying = true;
        Object.keys(data).forEach(function (k) {
            if (!isSyncedKey(k)) return;
            try { localStorage.setItem(k, JSON.stringify(data[k])); } catch (e) {}
        });
        localStorage.setItem(TS_KEY, String(ts || Date.now()));
        applying = false;
    }

    function push() {
        if (!enabled || !ready) return;
        if (pushing) { queued = true; return; }
        pushing = true;
        var ts = Date.now();
        fetch(base + '?on_conflict=id', {
            method: 'POST',
            headers: Object.assign({}, headers, { Prefer: 'resolution=merge-duplicates,return=minimal' }),
            body: JSON.stringify({ id: ROW, data: collect(), updated_at: ts })
        }).then(function (r) {
            if (r.ok) localStorage.setItem(TS_KEY, String(ts));
            else console.warn('[sync] 推送失败，HTTP ' + r.status + '，请检查数据表与权限配置');
        }).catch(function (e) {
            console.warn('[sync] 网络异常，稍后重试', e);
        }).then(function () {
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
                if (ts > localTs() + 1000) {
                    apply(row.data, ts);
                    window.dispatchEvent(new CustomEvent('sync:applied'));
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
        onWrite: function () {
            if (!enabled || applying) return;
            schedulePush();
        },
        pushNow: push,
        pullNow: function () { pull(false); }
    };
})();
