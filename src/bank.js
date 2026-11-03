// 统一题库装载：数据文件合并 → 逐题修正（fix6 句子/答案、fix9 收音核对、glossFix 词义）
// → 每专题追加“特殊情况＋日常用法”题（extra）→ 统一重排题号 → 自动补词义（inject）
const fix6 = require('./fix6.js').fix6;
const glossFix = require('./glossFix.js');
const fix9 = require('./fix9.js');
const extra = require('./extra.js');
const { inject } = require('./inject.js');

const raw = [].concat(
  require('./data1.js'), require('./data2.js'), require('./data3.js'),
  require('./data4.js'), require('./data5.js'), require('./data6.js'),
  require('./data7.js'), require('./data8.js')
);

const sections = [];
const items = [];
let cur = null;
raw.forEach(it => {
  if (it.sec) { sections.push(it); cur = it.sec; }
  else { it._sec = cur; items.push(it); }
});

// 1) 原题修正（按原题号定位，必须在重排题号之前完成）
fix6.forEach(f => { const i = items.findIndex(x => x.n === f.n); if (i >= 0) items[i] = Object.assign(f, { _sec: items[i]._sec }); });
fix9.forEach(f => {
  const it = items.find(x => x.n === f.n);
  if (!it) throw new Error('修正指向的题号不存在: ' + f.n);
  Object.assign(it, f.patch);
});
Object.keys(glossFix).forEach(k => { const it = items.find(x => x.n === +k); if (it) it.s = glossFix[k]; });

// 2) 每个专题末尾插入新增题（不新建专题）
extra.forEach(g => {
  const idx = items.map((x, i) => (x._sec === g.sec ? i : -1)).filter(i => i >= 0);
  if (!idx.length) throw new Error('专题不存在: ' + g.sec);
  const at = idx[idx.length - 1] + 1;
  items.splice(at, 0, ...g.items.map(x => Object.assign({}, x, { _sec: g.sec })));
});

// 3) 统一重排题号
items.forEach((it, i) => { it.n = i + 1; });

// 4) 自动补词义括注
items.forEach(it => { it.s = inject(it.s); });

if (items.length !== 348) throw new Error('题量异常: ' + items.length);
items.forEach((it, i) => { if (it.n !== i + 1) throw new Error('题号错位 at ' + i); });

module.exports = { items, sections, fix6 };
