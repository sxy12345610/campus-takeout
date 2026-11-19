/**
 * 手机短信验证码登录
 * 通过 Supabase Auth 的短信 OTP 接口发送真实短信：
 *   POST {url}/auth/v1/otp     发送验证码
 *   POST {url}/auth/v1/verify  校验验证码
 * 需要 Supabase 控制台 Authentication → Providers 中启用 Phone 并配置短信服务商。
 * 短信通道未开通时，回退为「演示验证码」（仅本机有效，页面直接显示）。
 */
(function () {
  var DEMO_KEY = 'wk_demo_otp';
  var LAST_KEY = 'wk_otp_last';

  function cfg() { return window.SYNC_CONFIG || {}; }
  function baseUrl() { return (cfg().supabaseUrl || '').replace(/\/$/, ''); }
  function headers() {
    return {
      'Content-Type': 'application/json',
      apikey: cfg().supabaseKey, Authorization: 'Bearer ' + cfg().supabaseKey,
    };
  }
  function readJson(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
  }
  function writeJson(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {}
  }
  function makeCode() { return String(Math.floor(100000 + Math.random() * 900000)); }
  function errText(data, status) {
    return (data && (data.msg || data.message || data.error_description || data.error)) || ('请求失败（' + status + '）');
  }

  /* 演示兜底：本地生成验证码，5 分钟内有效 */
  function demoSend(phone) {
    var code = makeCode();
    writeJson(DEMO_KEY, { phone: phone, code: code, exp: Date.now() + 5 * 60000 });
    return { ok: true, demo: true, code: code };
  }

  function sendCode(phone) {
    var last = readJson(LAST_KEY) || {};
    if (last.at && Date.now() - last.at < 60000) {
      return Promise.resolve({ ok: false, error: '发送过于频繁，请 60 秒后再试' });
    }
    if (!baseUrl() || !cfg().supabaseKey) {
      writeJson(LAST_KEY, { at: Date.now() });
      return Promise.resolve(demoSend(phone));
    }
    return fetch(baseUrl() + '/auth/v1/otp', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ phone: '+86' + phone, create_user: true }),
    }).then(function (res) {
      return res.text().then(function (text) {
        var data = {};
        try { data = JSON.parse(text || '{}'); } catch (e) {}
        writeJson(LAST_KEY, { at: Date.now() });
        if (res.ok) return { ok: true, demo: false };
        var code = String(data.error_code || '');
        var msg = String(errText(data, res.status));
        var unconfigured = /phone_provider_disabled|phone_provider_not_enabled|signups_disabled|unsupported_phone/i.test(code) ||
          /phone[\s\S]*(disabled|not enabled|not supported)|sms provider/i.test(msg);
        if (unconfigured) return demoSend(phone);
        return { ok: false, error: '短信发送失败：' + msg };
      });
    }).catch(function () {
      writeJson(LAST_KEY, { at: Date.now() });
      return { ok: false, error: '网络异常，短信发送失败' };
    });
  }

  function verifyCode(phone, code) {
    var demo = readJson(DEMO_KEY);
    if (demo && demo.phone === phone) {
      if (Date.now() > demo.exp) {
        writeJson(DEMO_KEY, null);
        return Promise.resolve({ ok: false, error: '验证码已过期，请重新获取' });
      }
      if (demo.code !== code) return Promise.resolve({ ok: false, error: '验证码错误' });
      writeJson(DEMO_KEY, null);
      return Promise.resolve({ ok: true, demo: true });
    }
    if (!baseUrl() || !cfg().supabaseKey) {
      return Promise.resolve({ ok: false, error: '未配置云端短信服务' });
    }
    return fetch(baseUrl() + '/auth/v1/verify', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ type: 'sms', phone: '+86' + phone, token: code }),
    }).then(function (res) {
      return res.text().then(function (text) {
        var data = {};
        try { data = JSON.parse(text || '{}'); } catch (e) {}
        if (res.ok) return { ok: true, demo: false };
        return { ok: false, error: errText(data, res.status) };
      });
    }).catch(function () {
      return { ok: false, error: '网络异常，请稍后重试' };
    });
  }

  window.Auth = { sendCode: sendCode, verifyCode: verifyCode };
})();
