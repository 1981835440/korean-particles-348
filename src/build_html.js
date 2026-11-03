const fs = require('fs');
const { items, sections } = require('./bank.js');
const OUT = 'C:/Users/Administrator/.qwenworkcn/workspace/2026-11-03/mvxyo9jvagb9y4lr/outputs';
const data = items.map(it => ({ n: it.n, s: it.s, a: it.a, x: it.x || [], e: it.e, t: it.t, sec: it._sec, sp: it.sp || '', us: it.us || '' }));
const secIndex = sections.map(s => ({ sec: s.sec, tip: s.tip, from: items.find(x => x._sec === s.sec).n, count: items.filter(x => x._sec === s.sec).length }));
const CHIPS = [
  { g: '基本格', k: ['이', '가', '은', '는', '을', '를', '의'] },
  { g: '场所·时间', k: ['에', '에서', '로', '으로', '로서', '로써', '에게서', '한테서', '로부터', '만에', '여', '째'] },
  { g: '对象·敬语', k: ['에게', '한테', '께', '께서'] },
  { g: '并列·选择', k: ['와', '과', '랑', '이랑', '나', '이나'] },
  { g: '补助', k: ['도', '만', '뿐', '조차', '마저', '부터', '까지', '마다', '정도', '때문에'] },
  { g: '比较·比喻', k: ['보다', '만큼', '처럼', '같이', '대로'] },
  { g: '原因·框架', k: ['탓에', '덕분에', '인해', '에 따라', '에 대해', '을 통해', '를 통해', '를 막론하고', '를 제외한', '를 비롯한', '를 중심으로', '에 이어', '에 힘입어', '에 한해', '에 비해', '는 물론', '은 물론'] }
];

// 保证“每个答案都能在芯片面板里点到”：把散见的合成答案自动补进“综合”组
const norm0 = s => String(s).replace(/[\s／/·，,、]/g, '');
const covered = new Set();
CHIPS.forEach(c => c.k.forEach(k => covered.add(norm0(k))));
const extra = new Set();
items.forEach(it => {
  String(it.a).split(/[／/]/).forEach(p => { const t = p.trim(); if (t && !covered.has(norm0(t))) extra.add(t); });
  (it.x || []).forEach(v => String(v).split(/[／/]/).forEach(p => { const t = p.trim(); if (t && !covered.has(norm0(t))) extra.add(t); }));
});
CHIPS.push({ g: '综合', k: [...extra].sort((a, b) => a.localeCompare(b, 'ko')) });

const JS = String.raw`
var DATA = __DATA__;
var SECS = __SECS__;
var CHIPS = __CHIPS__;
var KEY = 'kr_part_v2';
var okLS = (function () { try { localStorage.setItem('_t', '1'); localStorage.removeItem('_t'); return true; } catch (e) { return false; } })();
function load() { if (!okLS) return window.__mem || null; try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
function save() { window.__mem = S; if (okLS) localStorage.setItem(KEY, JSON.stringify(S)); }
var S = load() || { ans: {}, done: {}, wrong: {}, i: 0, mode: 'all', queue: [] };
S.ans = S.ans || {}; S.done = S.done || {}; S.wrong = S.wrong || {}; S.queue = S.queue || []; S.i = S.i || 0; S.mode = S.mode || 'all';
var cur = '', grp = 0;

function norm(s) { return String(s || '').replace(/[\s／/·，,、]/g, ''); }
function segs(s) { return String(s || '').split(/[／/]/).map(function (x) { return x.trim(); }).filter(Boolean); }
function isAns(i, v) { var d = DATA[i]; if (!norm(v)) return false; if (norm(v) === norm(d.a)) return true; return (d.x || []).some(function (a) { return norm(v) === norm(a); }); }
function known(w) { w = norm(w); for (var i = 0; i < CHIPS.length; i++) for (var j = 0; j < CHIPS[i].k.length; j++) if (norm(CHIPS[i].k[j]) === w) return true; return false; }
function splitAns(t, n) {
  if (n <= 1) return [t];
  if (!t) return new Array(n).fill('');
  var out = [], rest = t;
  for (var i = 0; i < n - 1 && rest; i++) {
    var put = false;
    for (var L = Math.min(rest.length, 9); L >= 1; L--) {
      var cand = rest.slice(0, L);
      if (known(cand)) { out.push(cand.trim()); rest = rest.slice(L).replace(/^\s+/, ''); put = true; break; }
    }
    if (!put) { out.push(rest); rest = ''; break; }
  }
  out.push(rest);
  while (out.length < n) out.push('');
  return out;
}
function gloss(t) { return t.replace(/（([^）]*)）/g, '<span class="g">（$1）</span>'); }
function qNo() { var pool = S.mode === 'wrong' ? S.queue : DATA.map(function (d) { return d.n; }); return pool[S.i] || DATA[0].n; }
function dNow() { return DATA[qNo() - 1]; }
function done(n) { return S.done[n] !== undefined; }
function isRight(n) { return S.done[n] === 1; }
function nb(d) { return (d.s.match(/____/g) || []).length; }

function render() {
  var d = dNow(), n = nb(d), typed = cur, seg = splitAns(typed, n), right = isAns(d.n - 1, typed);
  var show = done(d.n);
  var an = segs(d.a), h = '';
  var parts = d.s.split('____');
  for (var i = 0; i < parts.length; i++) {
    h += gloss(parts[i]);
    if (i < parts.length - 1) {
      var a = seg[i] || '';
      var cls = show && a ? ((norm(a) === norm(an[i]) || (d.x || []).some(function (x) { return norm(a) === norm(segs(x)[i]); }) || right) ? ' ok' : ' no') : '';
      h += '<span class="slot' + cls + '">' + (a || '&nbsp;') + '</span>';
    }
  }
  var fb = '';
  if (show) {
    var ext = '';
    if (d.sp) ext += '<div class="ex"><b>特殊情况</b>' + d.sp + '</div>';
    if (d.us) ext += '<div class="ex"><b>日常常用</b>' + d.us + '</div>';
    fb = '<div class="fb ' + (isRight(d.n) ? 'ok' : 'no') + '"><span class="k">' + (isRight(d.n) ? '✔ 正确' : '✘ 正确答案：' + d.a) + '</span> — ' + d.e + ext + '<div class="tr">译文：' + d.t + '</div></div>';
  }
  document.getElementById('qcard').innerHTML =
    '<span class="sec">' + d.sec.replace(/（.*?）/, '').trim() + '</span>' +
    '<div class="sent">' + d.n + '. ' + h + '</div>' + fb;
  document.getElementById('hintline').textContent = show ? '' : '点助词卡片拼答案；两个空按顺序点两次。回车＝提交，←→＝翻题（判分后显示「特殊情况」与「日常常用」）。';  var dn = Object.keys(S.done).length, rg = Object.keys(S.done).filter(function (k) { return S.done[k] === 1; }).length;
  document.getElementById('prg').style.width = (dn / DATA.length * 100) + '%';
  document.getElementById('stat').textContent = dn + '/' + DATA.length;
  document.getElementById('stat2').textContent = '对 ' + rg + ' · 错 ' + (dn - rg) + ' · 正确率 ' + (dn ? Math.round(rg / dn * 100) + '%' : '—') + (S.mode === 'wrong' ? ' · 错题模式(' + (S.i + 1) + '/' + S.queue.length + ')' : ' · 第 ' + qNo() + ' 题');
}
function addChip(c) { cur += (cur ? ' ' : '') + c; render(); }
function del() { cur = cur.replace(/\s*\S+$/, ''); render(); }
function clr() { cur = ''; render(); }
function submit() {
  var d = dNow();
  if (!norm(cur)) { flash('先点一个助词再提交'); return; }
  S.ans[d.n] = cur; S.done[d.n] = isAns(d.n - 1, cur) ? 1 : 0;
  if (S.done[d.n]) delete S.wrong[d.n]; else S.wrong[d.n] = 1;
  save(); render(); setTimeout(next, 850);
}
function answerThis() {
  var d = dNow();
  if (!done(d.n)) { S.done[d.n] = 0; S.wrong[d.n] = 1; }
  S.ans[d.n] = d.a; cur = d.a; save(); render();
}
function next() {
  var max = S.mode === 'wrong' ? S.queue.length : DATA.length;
  if (S.i < max - 1) S.i++;
  save(); cur = S.ans[qNo()] || ''; render();
}
function go(k) {
  var max = S.mode === 'wrong' ? S.queue.length : DATA.length;
  var i = S.i + k; if (i < 0) i = 0; if (i >= max) return;
  S.i = i; save(); cur = S.ans[qNo()] || ''; render();
}
function jumpNext() {
  var pool = S.mode === 'wrong' ? S.queue : DATA.map(function (d) { return d.n; });
  for (var i = 0; i < pool.length; i++) if (!done(pool[i])) { S.i = i; break; }
  save(); cur = S.ans[qNo()] || ''; render();
}
function flash(t) { var e = document.getElementById('hintline'); e.textContent = t; }
function tabSet(g) {
  grp = g;
  document.getElementById('chips').innerHTML = CHIPS[g].k.map(function (k) { return '<div class="chip" data-k="' + k + '">' + k + '</div>'; }).join('');
  var t = document.querySelectorAll('.tab'); for (var i = 0; i < t.length; i++) t[i].className = 'tab' + (i === g ? ' on' : '');
}
function openMenu() {
  var dn = Object.keys(S.done).length, rg = Object.keys(S.done).filter(function (k) { return S.done[k] === 1; }).length;
  var list = SECS.map(function (s) {
    var ok = 0, bad = 0;
    for (var i = s.from; i < s.from + s.count; i++) { if (S.done[i] === 1) ok++; else if (S.done[i] === 0) bad++; }
    return '<div onclick="jumpTo(' + s.from + ')">' + s.sec.replace(/（.*?）/, '').trim() + '<b style="float:right;color:#2f5aa0">' + ok + '/' + s.count + ' 对</b></div>';
  }).join('');
  modal('<h1>目录 · 进度 · 工具</h1><p class="hint">已做 ' + dn + '/' + DATA.length + '，正确 ' + rg + '（' + (dn ? Math.round(rg / dn * 100) : 0) + '%）；错题 ' + Object.keys(S.wrong).length + ' 道。点专题可跳转。</p><div class="list">' + list + '</div>' +
    '<div class="foot"><button class="mini" onclick="startWrong()">只重做错题（' + Object.keys(S.wrong).length + '）</button><button class="mini" onclick="backAll()">全部顺序练</button><button class="mini" onclick="exportAns()">导出我的答案 → 发给千问办公批改</button><button class="mini warn" onclick="resetAll()">清空进度</button><button class="mini" onclick="closeM()">关闭</button></div>');
}
function jumpTo(n) { S.mode = 'all'; S.i = n - 1; save(); closeM(); cur = S.ans[n] || ''; render(); }
function startWrong() {
  var w = Object.keys(S.wrong).map(Number).sort(function (a, b) { return a - b; });
  if (!w.length) { alert('还没有错题，先做几题'); return; }
  S.queue = w; S.i = 0; S.mode = 'wrong'; save(); closeM(); cur = S.ans[w[0]] || ''; render();
}
function backAll() { S.mode = 'all'; S.i = 0; save(); closeM(); cur = S.ans[qNo()] || ''; render(); }
function resetAll() { if (!confirm('确定清空全部作答记录？')) return; S = { ans: {}, done: {}, wrong: {}, i: 0, mode: 'all', queue: [] }; save(); cur = ''; closeM(); render(); }
function exportAns() {
  var lines = DATA.map(function (d) { var v = S.ans[d.n] || ''; var st = done(d.n) ? (isRight(d.n) ? '✓' : '✗(正确:' + d.a + ')') : '·'; return d.n + ' ' + v + ' ' + st; }).join('\n');
  modal('<h1>我的作答</h1><p class="hint">复制后发给千问办公，我按题号批改并只讲错题（✓＝网页判对，✗＝网页判错，·＝未做）。</p><textarea id="ta" readonly>' + lines.replace(/</g, '&lt;') + '</textarea><div class="foot"><button class="btn pri" onclick="cp()">复制全部</button><button class="mini" onclick="closeM()">关闭</button></div>');
}
function cp() {
  var t = document.getElementById('ta'); t.focus(); t.select();
  var txt = t.value, done2 = function () { alert('已复制，去聊天框粘贴即可'); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done2, function () { try { document.execCommand('copy'); done2(); } catch (e) { alert('长按文本框全选复制'); } });
  else { try { document.execCommand('copy'); done2(); } catch (e) { alert('长按文本框全选复制'); } }
}
function modal(h) { document.getElementById('modal').innerHTML = h; document.getElementById('mask').classList.add('on'); }
function closeM() { document.getElementById('mask').classList.remove('on'); }
document.getElementById('mask').addEventListener('click', function (e) { if (e.target === this) closeM(); });
document.getElementById('chips').addEventListener('click', function (e) { var k = e.target.getAttribute('data-k'); if (k) addChip(k); });
document.getElementById('tabs').innerHTML = CHIPS.map(function (c, i) { return '<div class="tab' + (i === 0 ? ' on' : '') + '" data-g="' + i + '">' + c.g + '</div>'; }).join('');
document.getElementById('tabs').addEventListener('click', function (e) { var g = e.target.getAttribute('data-g'); if (g !== null) tabSet(+g); });
document.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') go(-1); });
tabSet(0);
cur = S.ans[qNo()] || '';
render();
`;

const html = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>韩语助词 ${items.length} 题 · 手机点选练习</title>
<style>
:root{--bg:#f6f7f9;--card:#fff;--ink:#1c1f24;--sub:#6b7280;--line:#e3e6ea;--blue:#2f5aa0;--red:#c0392b;--green:#1f9254;--chip:#eef2f8;--chipink:#243b62}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 "PingFang SC","Microsoft YaHei","Malgun Gothic",system-ui,sans-serif}
.top{position:sticky;top:0;z-index:6;background:var(--card);border-bottom:1px solid var(--line);padding:9px 12px}
.row{display:flex;align-items:center;gap:10px}
.bar{flex:1;height:6px;background:var(--line);border-radius:3px;overflow:hidden}
.bar i{display:block;height:100%;background:var(--blue);width:0;transition:width .2s}
.stat{font-size:13px;color:var(--sub);white-space:nowrap}
.stat2{font-size:12px;color:var(--sub)}
.wrap{max-width:760px;margin:0 auto;padding:12px 12px 270px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px}
.sec{font-size:12px;color:var(--blue);background:var(--chip);display:inline-block;padding:3px 8px;border-radius:20px;margin-bottom:10px}
.sent{font-size:21px;line-height:2.05;letter-spacing:.2px}
.g{font-size:12px;color:var(--sub)}
.slot{display:inline-block;min-width:76px;padding:0 6px;border-bottom:2px solid var(--ink);text-align:center;font-weight:700;color:var(--blue)}
.slot.ok{border-color:var(--green);color:var(--green)}
.slot.no{border-color:var(--red);color:var(--red);text-decoration:line-through}
.fb{margin-top:14px;font-size:14px;border-radius:10px;padding:10px 12px}
.fb.ok{background:#eaf6ef;color:#156b3f}
.fb.no{background:#fdeeec;color:#96281b}
.fb .k{font-weight:700}
.fb .tr{color:var(--sub);margin-top:4px;font-size:13px}
.fb .ex{font-size:13px;line-height:1.6;margin-top:7px;padding:6px 8px;border-radius:7px;background:rgba(255,255,255,.6)}
.fb .ex b{display:inline-block;font-size:11px;padding:1px 6px;border-radius:4px;margin-right:6px;background:#2f5aa0;color:#fff;font-weight:600;vertical-align:1px}
.fb.no .ex b{background:#96281b}
.pad{position:fixed;bottom:0;left:0;right:0;background:var(--card);border-top:1px solid var(--line);padding:8px 10px 12px;box-shadow:0 -6px 18px rgba(0,0,0,.06);max-height:50vh;overflow:auto;z-index:7}
.tabs{display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;margin-bottom:6px}
.tab{flex:0 0 auto;font-size:12px;padding:5px 10px;border-radius:20px;background:var(--chip);color:var(--chipink);cursor:pointer}
.tab.on{background:var(--blue);color:#fff}
.chips{display:flex;flex-wrap:wrap;gap:7px}
.chip{font-size:18px;padding:9px 13px;border-radius:10px;background:var(--chip);color:var(--chipink);border:1px solid #dfe6f0;cursor:pointer;user-select:none}
.chip:active{transform:translateY(1px);background:#dde6f5}
.act{margin-top:9px;display:flex;gap:8px}
.btn{flex:1;font-size:16px;padding:12px 8px;border-radius:10px;border:1px solid var(--line);background:#fff;cursor:pointer}
.btn.pri{background:var(--blue);color:#fff;border-color:var(--blue);font-weight:700}
.nav{display:flex;gap:8px;margin:10px 0 0}
.mini{font-size:13px;padding:8px 11px;border-radius:8px;background:#fff;border:1px solid var(--line);cursor:pointer;color:#333;flex:1}
.mini.warn{color:var(--red)}
.hintline{font-size:12px;color:var(--sub);margin:8px 2px 0;min-height:16px}
h1{font-size:19px;margin:2px 0 8px}
p.hint{font-size:13px;color:var(--sub);margin:4px 0 12px}
.list{font-size:14px}
.list div{padding:8px 0;border-bottom:1px solid var(--line);cursor:pointer}
.foot{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.mask{position:fixed;inset:0;background:rgba(0,0,0,.35);display:none;align-items:center;justify-content:center;padding:16px;z-index:20}
.mask.on{display:flex}
.modal{background:#fff;border-radius:14px;max-width:660px;width:100%;max-height:82vh;overflow:auto;padding:16px}
textarea{width:100%;height:200px;font-size:13px;border:1px solid var(--line);border-radius:8px;padding:8px}
</style>
</head>
<body>
<div class="top">
  <div class="row"><div class="bar"><i id="prg"></i></div><div class="stat" id="stat">0/${items.length}</div><div class="mini" style="flex:0 0 auto" onclick="openMenu()">目录·统计</div></div>
  <div class="row" style="margin-top:5px"><div class="stat2" id="stat2">—</div></div>
</div>
<div class="wrap">
  <div class="card" id="qcard"></div>
  <div class="nav"><button class="mini" onclick="go(-1)">← 上一题</button><button class="mini" onclick="go(1)">下一题 →</button><button class="mini" onclick="jumpNext()">跳到未做</button><button class="mini" onclick="answerThis()">看答案</button></div>
  <div class="hintline" id="hintline"></div>
</div>
<div class="pad">
  <div class="tabs" id="tabs"></div>
  <div class="chips" id="chips"></div>
  <div class="act"><button class="btn" onclick="del()">退格</button><button class="btn" onclick="clr()">清空</button><button class="btn pri" onclick="submit()">提交</button></div>
</div>
<div class="mask" id="mask"><div class="modal" id="modal"></div></div>
<script>
${JS.replace('__DATA__', JSON.stringify(data)).replace('__SECS__', JSON.stringify(secIndex)).replace('__CHIPS__', JSON.stringify(CHIPS))}
</script>
</body>
</html>`;
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(OUT + '/韩语助词' + items.length + '题·手机点选版.html', html);
console.log('html 写出', (html.length / 1024).toFixed(1), 'KB');

let txt = '韩语助词 ' + items.length + ' 题（裸填空）·纯文本清单\n作答方式：直接在聊天里发「题号 答案」，一行一题或一行多题都行，例如：\n1 는  2 은  3 는  4 은\n我按题号批改、给正确率，只讲错题。\n\n';
let last = null;
data.forEach(d => {
  if (d.sec !== last) {
    txt += '\n━━ ' + d.sec + ' ━━\n';
    const s = sections.find(x => x.sec === d.sec);
    if (s && s.tip) txt += '   要领：' + s.tip + '\n';
    last = d.sec;
  }
  txt += d.n + '. ' + d.s.replace(/（/g, '(').replace(/）/g, ')').replace(/____/g, '＿＿＿') + '\n';
  if (d.n % 40 === 0) txt += '\n【第 ' + (d.n - 39) + '–' + d.n + ' 题可交一批】\n\n';
});
txt += '\n\n========== 参考答案与解析（做完再对） ==========\n';
for (let st = 1; st <= items.length; st += 40) {
  const blk = data.slice(st - 1, st + 39);
  txt += '\n【答案与解析 第 ' + blk[0].n + '–' + blk[blk.length - 1].n + ' 题】\n';
  blk.forEach(d => { txt += d.n + '. ' + d.a + (d.x.length ? '（可接受：' + d.x.join('、') + '）' : '') + ' — ' + d.e + ' ▸ ' + d.t + '\n'; });
}
fs.writeFileSync(OUT + '/韩语助词' + items.length + '题·纯文本清单（复制到聊天作答）.txt', txt);
console.log('txt 写出', txt.length, '字符');
