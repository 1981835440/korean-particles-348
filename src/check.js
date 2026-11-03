const { items, sections } = require('./bank.js');
const errs = [];
const hangulOk = /^[\uac00-\ud7a3\s·]+$/;
items.forEach((it, i) => { if (it.n !== i + 1) errs.push('题号错位 idx=' + i); });
if (items.length !== 348) errs.push('总题数=' + items.length);
items.forEach(it => {
  const blanks = (it.s.match(/____/g) || []).length;
  const parts = String(it.a).split(/[／/]/).map(s => s.trim()).filter(Boolean);
  if (blanks !== parts.length) errs.push('#' + it.n + ' 空格' + blanks + ' vs 答案' + parts.length + '「' + it.a + '」 ' + it.s);
  parts.forEach(p => { if (!hangulOk.test(p)) errs.push('#' + it.n + ' 答案含非法字符「' + p + '」 cp=' + [...p].map(c => c.codePointAt(0).toString(16)).join(',')); });
  (it.x || []).forEach(v => String(v).split(/[／/]/).forEach(q => { if (!hangulOk.test(q.trim())) errs.push('#' + it.n + ' 备选含非法字符「' + q + '」'); }));
  const o = (it.s.match(/（/g) || []).length, c = (it.s.match(/）/g) || []).length;
  if (o !== c) errs.push('#' + it.n + ' 括注不配对 ' + it.s);
  if (!o) errs.push('#' + it.n + ' 无词义括注 ' + it.s);
  if (/[\u3041-\u309f\uff66-\uff9f]/.test(it.s + it.a)) errs.push('#' + it.n + ' 含日文假名');
  if (!it.e || !it.t) errs.push('#' + it.n + ' 缺解析或翻译');
  if (/（[^）]*（/.test(it.s)) errs.push('#' + it.n + ' 括注嵌套 ' + it.s);
});
// 收音（받침）与助词的一致性核对
const jong = w => { const c = w.codePointAt(w.length - 1) - 0xAC00; if (c < 0 || c > 11171) return -1; return c % 28; };
const hasB = w => { const j = jong(w); return j < 0 ? null : j !== 0; };
const solo = ['이','가','은','는','을','를','와','과','랑','이랑','나','이나','으로','로'];
items.forEach(it => {
  const parts = it.s.split('____');
  String(it.a).split(/[／/]/).map(x => x.trim()).forEach((sg, i) => {
    if (!solo.includes(sg)) return;
    const before = (parts[i] || '').replace(/（[^）]*）/g, '').trim();
    const m = before.match(/([가-힣]+)\s*$/); if (!m) return;
    const w = m[1], hb = hasB(w); if (hb === null) return;
    let ok = true;
    if (['이','은','을','과','이랑','이나','으로'].includes(sg)) ok = hb;
    if (['가','는','를','와','랑','나'].includes(sg)) ok = !hb;
    if (sg === '로') ok = !hb || jong(w) === 8;   // 8 = ㄹ 收音
    if (!ok) errs.push('#' + it.n + ' 收音不符：' + w + ' + ' + sg);
  });
});
console.log('题量:', items.length, ' 专题:', sections.length, ' 含特殊情况标注:', items.filter(x => x.sp).length);
console.log(errs.length ? '❌ ' + errs.length + ' 项:\n' + errs.join('\n') : '✔ 校验通过');
