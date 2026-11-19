/**
 * 云端同步配置（Supabase）
 * 填写后，所有人打开同一个网址都会读写同一份数据。
 * 不填写时，数据仅保存在各自浏览器（本地模式）。
 *
 * supabaseUrl：Supabase 项目地址，形如 https://abcdefgh.supabase.co
 * supabaseKey：项目 Settings → API 里的 anon public key
 */

window.SYNC_CONFIG = {
  supabaseUrl: 'https://erjfpjexzrbolfczmsej.supabase.co',
  supabaseKey: 'sb_publishable_HsjimE3qIubYDt-VhCPZpQ_E35L65Q0',
  table: 'app_state',
  rowId: 'main',
  pollMs: 6000
};

