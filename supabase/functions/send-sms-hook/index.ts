/**
 * Supabase Edge Function：Send SMS Hook → 阿里云短信
 *
 * 作用：Supabase Auth 发送手机验证码时，不再使用 Twilio，而是把验证码
 *       交给本函数，通过阿里云短信服务（dysmsapi）发到用户手机。
 *
 * 部署（需在 campus-takeout-web 目录下执行）：
 *   supabase login
 *   supabase functions deploy send-sms-hook --project-ref erjfpjexzrbolfczmsej --no-verify-jwt
 *
 * 环境变量（Edge Functions → Secrets）：
 *   ALIYUN_ACCESS_KEY_ID       阿里云 AccessKey ID
 *   ALIYUN_ACCESS_KEY_SECRET   阿里云 AccessKey Secret
 *   ALIYUN_SIGN_NAME           短信签名，如：校园外卖
 *   ALIYUN_TEMPLATE_CODE       验证码模板 CODE，如：SMS_123456789
 *   SEND_SMS_HOOK_SECRET       Supabase 后台「Send SMS Hook」生成的签名密钥
 *
 * 阿里云模板内容示例：您的验证码为 ${code}，5 分钟内有效，请勿泄露给他人。
 */

const encoder = new TextEncoder();

function base64Decode(value: string): Uint8Array {
  const bin = atob(value);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function base64Encode(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

async function hmac(hash: 'SHA-1' | 'SHA-256', key: Uint8Array, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  return base64Encode(new Uint8Array(signature));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* 校验 Supabase Standard Webhooks 签名（密钥形如 v1,whsec_xxx） */
async function verifySignature(req: Request, rawBody: string, secret: string): Promise<boolean> {
  const id = req.headers.get('webhook-id') || '';
  const timestamp = req.headers.get('webhook-timestamp') || '';
  const signatureHeader = req.headers.get('webhook-signature') || '';
  const secretPart = secret.split(',').map((s) => s.trim()).find((s) => s.startsWith('whsec_'));
  if (!id || !timestamp || !signatureHeader || !secretPart) return false;

  const ts = Number(timestamp);
  if (!ts || Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const expected = await hmac('SHA-256', base64Decode(secretPart.slice(6)), `${id}.${timestamp}.${rawBody}`);
  return signatureHeader.split(' ').some((item) => {
    const [version, signature] = item.split(',');
    return version === 'v1' && safeEqual(signature || '', expected);
  });
}

function percentEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

/* 阿里云短信 SendSms（签名算法 V1，HMAC-SHA1） */
async function sendAliyunSms(phone: string, code: string): Promise<void> {
  const accessKeyId = Deno.env.get('ALIYUN_ACCESS_KEY_ID') || '';
  const accessKeySecret = Deno.env.get('ALIYUN_ACCESS_KEY_SECRET') || '';
  const signName = Deno.env.get('ALIYUN_SIGN_NAME') || '';
  const templateCode = Deno.env.get('ALIYUN_TEMPLATE_CODE') || '';
  if (!accessKeyId || !accessKeySecret || !signName || !templateCode) {
    throw new Error('缺少阿里云短信环境变量');
  }

  const params: Record<string, string> = {
    AccessKeyId: accessKeyId,
    Action: 'SendSms',
    Format: 'JSON',
    PhoneNumbers: phone.replace(/^\+/, ''),
    RegionId: 'cn-hangzhou',
    SignName: signName,
    SignatureMethod: 'HMAC-SHA1',
    SignatureNonce: crypto.randomUUID(),
    SignatureVersion: '1.0',
    TemplateCode: templateCode,
    TemplateParam: JSON.stringify({ code }),
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    Version: '2017-05-25',
  };

  const canonical = Object.keys(params)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join('&');
  const stringToSign = `GET&%2F&${percentEncode(canonical)}`;
  const signature = await hmac('SHA-1', encoder.encode(accessKeySecret + '&'), stringToSign);

  const url = `https://dysmsapi.aliyuncs.com/?Signature=${percentEncode(signature)}&${canonical}`;
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.Code !== 'OK') {
    throw new Error(`阿里云短信发送失败：${body.Code || res.status} ${body.Message || ''}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const rawBody = await req.text();
  const hookSecret = Deno.env.get('SEND_SMS_HOOK_SECRET') || '';
  if (hookSecret) {
    const valid = await verifySignature(req, rawBody, hookSecret);
    if (!valid) {
      return new Response(JSON.stringify({ error: 'invalid webhook signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  let payload: { user?: { phone?: string }; sms?: { otp?: string } };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const phone = payload.user?.phone || '';
  const otp = payload.sms?.otp || '';
  if (!phone || !otp) {
    return new Response(JSON.stringify({ error: 'missing phone or otp' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await sendAliyunSms(phone, otp);
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[send-sms-hook]', err);
    return new Response(JSON.stringify({ error: String(err && (err as Error).message || err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
