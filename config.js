// 云端配置：拿到 Supabase 项目后，把下面两项填上即可启用登录与同步
// Project URL 形如 https://abcdefghijkl.supabase.co
// anon / publishable key 形如 sb_publishable_xxx 或 eyJhbGciOi...
// 这两项是公开信息（会出现在浏览器里），真正的权限由数据库 RLS 控制
window.CLOUD_CONFIG = {
  provider: 'supabase',
  url: '',
  anonKey: '',
  table: 'attempts'
};
