// 云端配置：填好下面两项即启用登录与跨设备同步（留空则纯本地，不影响使用）
// url：Supabase → Project Settings → API → Project URL
// anonKey：同页面 → anon public / publishable key（可公开，权限由数据库 RLS 控制）
window.CLOUD_CONFIG = {
  provider: 'supabase',
  url: 'https://dvimdvsjfcwktgyeerxt.supabase.co',
  anonKey: 'sb_publishable_Pb75t5IjODv9syPpgKtyPA_IK4XtWd6',
  table: 'attempts'
};
