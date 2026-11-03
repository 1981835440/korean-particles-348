/* ===== 云端同步（Supabase，可选；未配置时一切仍走本地） ===== */
var CL = { client: null, user: null, msg: '' };
function cloudCfg() {
  var c = window.CLOUD_CONFIG || {};
  return (c && c.url && c.anonKey && String(c.url).indexOf('https://') === 0) ? c : null;
}
function cdMsg(t) { CL.msg = t; var e = document.getElementById('cdmsg'); if (e) e.textContent = t; }
function cdSDK(cb) {
  if (window.supabase && window.supabase.createClient) return cb();
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  s.onload = function () { cb(); };
  s.onerror = function () { cdMsg('SDK 加载失败：检查网络后重试'); };
  document.head.appendChild(s);
}
function cdReady(cb) {
  var cfg = cloudCfg();
  if (!cfg) { cdMsg('未配置云端：在 config.js 填 Supabase 的 url 与 anonKey'); return; }
  cdSDK(function () {
    if (!CL.client) {
      try { CL.client = window.supabase.createClient(cfg.url, cfg.anonKey); }
      catch (e) { cdMsg('初始化失败：' + e.message); return; }
    }
    cb();
  });
}
function cdTable() { var c = cloudCfg(); return (c && c.table) || 'attempts'; }
function cdPanel() {
  if (!cloudCfg()) return '<div class="cdbox"><b>云端同步</b><p class="hint">未配置：在 config.js 填入 Supabase 的 url 与 anonKey 后即可登录、跨设备同步错题。现在仍是纯本地存储。</p></div>';
  if (CL.user) return '<div class="cdbox"><b>云端同步</b><p class="hint">已登录 ' + CL.user.email + ' · 每题作答自动上传</p>' +
    '<div class="foot" style="margin-top:6px"><button class="mini" onclick="cdPush()">上传全部</button><button class="mini" onclick="cdPull()">从云端恢复</button><button class="mini" onclick="cdLogout()">退出登录</button></div>' +
    '<div class="cdmsg" id="cdmsg">' + (CL.msg || '') + '</div></div>';
  return '<div class="cdbox"><b>云端同步</b><p class="hint">登录后错题存到云端，换设备可恢复；不登录则一切仍只在本机。</p>' +
    '<input id="cdemail" type="email" placeholder="邮箱" autocomplete="username">' +
    '<input id="cdpass" type="password" placeholder="密码（至少 6 位）" autocomplete="current-password">' +
    '<div class="foot" style="margin-top:6px"><button class="mini" onclick="cdLogin()">登录</button><button class="mini" onclick="cdSignup()">注册</button></div>' +
    '<div class="cdmsg" id="cdmsg">' + (CL.msg || '') + '</div></div>';
}
function cdRefresh() { if (document.getElementById('mask').classList.contains('on')) openMenu(); }
function cdLogin() {
  var e = document.getElementById('cdemail'), p = document.getElementById('cdpass');
  if (!e.value || !p.value) return cdMsg('请填邮箱和密码');
  cdReady(function () {
    cdMsg('登录中…');
    CL.client.auth.signInWithPassword({ email: e.value.trim(), password: p.value }).then(function (r) {
      if (r.error) return cdMsg('登录失败：' + r.error.message);
      CL.user = r.data.user; CL.msg = '已登录 ' + CL.user.email; cdRefresh(); cdPull();
    });
  });
}
function cdSignup() {
  var e = document.getElementById('cdemail'), p = document.getElementById('cdpass');
  if (!e.value || !p.value) return cdMsg('请填邮箱和密码');
  if (p.value.length < 6) return cdMsg('密码至少 6 位');
  cdReady(function () {
    cdMsg('注册中…');
    CL.client.auth.signUp({ email: e.value.trim(), password: p.value }).then(function (r) {
      if (r.error) return cdMsg('注册失败：' + r.error.message);
      if (r.data.session) { CL.user = r.data.user; CL.msg = '注册成功并已登录'; cdRefresh(); cdPush(); }
      else cdMsg('注册成功：请到邮箱点确认链接后再登录（或在 Supabase 关掉邮箱确认）');
    });
  });
}
function cdLogout() {
  if (!CL.client) { CL.user = null; return cdRefresh(); }
  CL.client.auth.signOut().then(function () { CL.user = null; CL.msg = '已退出登录，本地记录保留'; cdRefresh(); });
}
function cdRows() {
  return Object.keys(S.done).map(function (k) {
    return { user_id: CL.user.id, q_no: +k, answer: S.ans[k] || '', is_right: S.done[k] === 1, updated_at: new Date().toISOString() };
  });
}
function cdPush(silent) {
  if (!CL.user) { if (!silent) cdMsg('先登录再上传'); return; }
  var rows = cdRows();
  if (!rows.length) { if (!silent) cdMsg('还没有作答记录'); return; }
  CL.client.from(cdTable()).upsert(rows, { onConflict: 'user_id,q_no' }).then(function (r) {
    if (r.error) return cdMsg('上传失败：' + r.error.message);
    cdMsg('已上传 ' + rows.length + ' 条到云端');
  });
}
function cdSyncOne(n) {
  if (!CL.user || !CL.client) return;
  CL.client.from(cdTable()).upsert([{ user_id: CL.user.id, q_no: n, answer: S.ans[n] || '', is_right: S.done[n] === 1, updated_at: new Date().toISOString() }], { onConflict: 'user_id,q_no' }).then(function (r) {
    if (r.error) cdMsg('单题同步失败：' + r.error.message);
  });
}
function cdPull() {
  if (!CL.user) { cdMsg('先登录再恢复'); return; }
  cdMsg('正在拉取云端记录…');
  CL.client.from(cdTable()).select('q_no,answer,is_right').then(function (r) {
    if (r.error) return cdMsg('拉取失败：' + r.error.message);
    var rows = r.data || [];
    rows.forEach(function (x) {
      S.ans[x.q_no] = x.answer || '';
      S.done[x.q_no] = x.is_right ? 1 : 0;
      if (x.is_right) delete S.wrong[x.q_no]; else S.wrong[x.q_no] = 1;
    });
    save(); cur = S.ans[qNo()] || ''; render();
    cdMsg('已从云端恢复 ' + rows.length + ' 条；本机多出来的会自动补传');
    cdPush(true);
  });
}
function cdBoot() {
  if (!cloudCfg()) return;
  cdReady(function () {
    CL.client.auth.getSession().then(function (r) {
      var s = r && r.data && r.data.session;
      if (s && s.user) { CL.user = s.user; cdRefresh(); }
    });
    CL.client.auth.onAuthStateChange(function (_ev, s) { CL.user = s ? s.user : null; cdRefresh(); });
  });
}
