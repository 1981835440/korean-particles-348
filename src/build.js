const fs = require('fs');
const { items, sections } = require('./bank.js');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, PageBreak, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, Header, Footer, PageNumber, ShadingType
} = require('docx');

const KO = { ascii: 'Malgun Gothic', eastAsia: 'Malgun Gothic', hAnsi: 'Malgun Gothic' };
const CN = { ascii: 'Microsoft YaHei', eastAsia: 'Microsoft YaHei', hAnsi: 'Microsoft YaHei' };
const SZ = 22, SZG = 15, SZA = 20;      // 11pt 题干 / 7.5pt 词义 / 10pt 解析
const BLANK = '＿＿＿＿';

// 把题干拆成 韩文 / 中文括注 / 空格 三类 run
function sentRuns(s, size = SZ) {
  return s.split(/(（[^）]*）|____)/).filter(Boolean).map(p => {
    if (p === '____') return new TextRun({ text: BLANK, font: KO, size, bold: true, color: '1a1a1a' });
    if (/^（/.test(p)) return new TextRun({ text: p, font: CN, size: SZG, color: '8A8A8A' });
    return new TextRun({ text: p, font: KO, size });
  });
}
const qPara = it => new Paragraph({
  spacing: { after: 70, line: 260 },
  children: [new TextRun({ text: it.n + '. ', font: KO, size: SZ, bold: true, color: '2F5AA0' }), ...sentRuns(it.s)]
});
const secPara = sec => new Paragraph({
  spacing: { before: 200, after: 40 },
  children: [new TextRun({ text: sec, font: CN, size: 24, bold: true, color: 'B03A2E' })]
});
const tipPara = tip => new Paragraph({
  spacing: { after: 120 },
  children: [new TextRun({ text: '填空范围与要领：' + tip, font: CN, size: SZG + 1, color: '5A5A5A' })]
});
const ansPara = it => {
  const runs = [
    new TextRun({ text: it.n + '. ', font: KO, size: SZA, bold: true, color: '2F5AA0' }),
    new TextRun({ text: it.a, font: KO, size: SZA, bold: true, color: 'B03A2E' }),
    new TextRun({ text: (it.x && it.x.length ? '（也接受：' + it.x.join('、') + '）' : ''), font: CN, size: SZG, color: '7A7A7A' }),
    new TextRun({ text: ' — ' + it.e, font: CN, size: SZA - 2 }),
    new TextRun({ text: '  ▸ ' + it.t, font: CN, size: SZA - 2, color: '444444' })
  ];
  if (it.sp) runs.push(new TextRun({ text: '特殊情况：' + it.sp, break: 1, font: CN, size: SZA - 3, color: '8A5A00' }));
  if (it.us) runs.push(new TextRun({ text: '日常常用：' + it.us, break: 1, font: CN, size: SZA - 3, color: '1F6E43' }));
  return new Paragraph({ spacing: { after: 80, line: 250 }, children: runs });
};
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

// ---------------- 封面 ----------------
const cover = [
  new Paragraph({ spacing: { before: 600, after: 80 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: '韩语助词（조사）' + items.length + ' 题专项练习', font: CN, size: 40, bold: true })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 360 }, children: [new TextRun({ text: '裸填空 · 全程带中文词义 · 每题标注特殊情况与日常常用 · 每 40 题一页答案与解析', font: CN, size: 22, color: '666666' })] }),
  new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: '怎么用', font: CN, size: 26, bold: true, color: 'B03A2E' })] }),
  new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: '1. 每个空格只填一个助词；两个空格按顺序填，如「는／가」。', font: CN, size: 20 })] }),
  new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: '2. 题干里每个实词后面都跟了小字中文词义，不用另查单词。', font: CN, size: 20 })] }),
  new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: '3. 每做完 40 题翻到下一页对答案，解析里写清了“为什么不是另一个”。', font: CN, size: 20 })] }),
  new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: '4. 手机上可用配套的网页版：点助词卡片作答、即时判分、自动记错题，最后把答案串发给我做逐题精讲。', font: CN, size: 20 })] }),
  new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: '助词速查表（先看一遍再做题）', font: CN, size: 26, bold: true, color: 'B03A2E' })] })
];
const CHEAT = [
  ['类别', '助词', '什么时候用', '例'],
  ['主格', '이 / 가', '有收音→이，无收音→가；新信息、存在句、疑问词主语', '고양이가 있어요'],
  ['主题', '은 / 는', '有收音→은，无收音→는；已知话题、对比、评价', '저는 학생이에요'],
  ['宾格', '을 / 를', '有收音→을；无收音或以ㄹ结尾→를', '물을 마셔요 / 빵을 먹어요'],
  ['属格', '의', 'A의 B＝A 的 B（所属·内容·同位）', '친구의 책'],
  ['静态场所·时点', '에', '있다·살다·넣다＋场所；几点/几日；对象', '책상 위에 / 세 시에'],
  ['动作场所·起点', '에서', '有意识的动作在哪里发生；从哪来（~까지）', '학교에서 공부해요'],
  ['方向·手段·身份', '(으)로 / 로서 / 로써', '有收音→으로，无收音或ㄹ结尾→로；로서＝作为，로써＝凭', '버스(으)로 / 학생으로서'],
  ['对象·来源·敬语', '에게 한테 께 께서 에게서', '给人→에게/께；长辈作主语→께서；从某人处→에게서', '선생님께 여쭤요'],
  ['并列·选择', '와 과 랑 이랑 나 이나', '和→와/과（口语랑）；或者→나/이나', '책과 노트 / 커피나 차'],
  ['累加·限定', '도 만 뿐', '도也；만只；뿐只不过', '물만 마셔요'],
  ['递进极限', '조차 마저 까지', '连…都（조차/마저）；到…为止、甚至（까지）', '이름조차 몰라요'],
  ['起终·每·余', '부터 까지 마다 여 만에 째', '从…到…；每逢；…有余；隔…之后；第…', '월요일부터 금요일까지'],
  ['比较·比喻', '보다 만큼처럼 같이', '比→보다；相当→만큼；像→처럼/같이', '지난주보다 쉬워요'],
  ['按照', '대로', '照…那样（약속한 대로）', '교칙대로 입어요'],
  ['原因', '때문에 탓에 (으)로 인해 덕분에', '中性/归咎/书面/多亏', '감기 때문에 쉬었어요'],
  ['惯用框架', '에 따라 · 에 대해 · 을 통해 · 로부터 · 를 제외하고 · 를 막론하고 · 에 한해 · 는 물론', '随着/关于/通过/从/除…外/不论/限于/…不用说', '계절에 따라 달라져요']
];
const cw = [1400, 2500, 3400, 2338];
const cheatTable = new Table({
  columnWidths: cw,
  width: { size: cw.reduce((a, b) => a + b, 0), type: WidthType.DXA },
  rows: CHEAT.map((row, ri) => new TableRow({
    children: row.map((cell, ci) => new TableCell({
      width: { size: cw[ci], type: WidthType.DXA },
      shading: ri === 0 ? { type: ShadingType.CLEAR, fill: 'F0F0F0' } : undefined,
      margins: { top: 40, bottom: 40, left: 80, right: 80 },
      children: [new Paragraph({ children: [new TextRun({ text: cell, font: /[\uac00-\ud7a3]/.test(cell) ? KO : CN, size: 17, bold: ri === 0 })] })]
    }))
  }))
});

// ---------------- 题目 + 答案，每 40 题一轮 ----------------
const body = [];
let lastSec = null;
for (let start = 1; start <= items.length; start += 40) {
  const block = items.slice(start - 1, start - 1 + 40);
  block.forEach(it => {
    if (it._sec !== lastSec) {
      const sec = sections.find(s => s.sec === it._sec);
      body.push(secPara(it._sec));
      if (sec && sec.tip) body.push(tipPara(sec.tip));
      lastSec = it._sec;
    }
    body.push(qPara(it));
  });
  body.push(pageBreak());
  body.push(new Paragraph({
    spacing: { after: 160 },
    children: [new TextRun({ text: `答案与解析（第 ${block[0].n}–${block[block.length - 1].n} 题）`, font: CN, size: 26, bold: true, color: 'B03A2E' })]
  }));
  block.forEach(it => body.push(ansPara(it)));
  body.push(pageBreak());
}

const doc = new Document({
  styles: { default: { document: { run: { font: KO, size: SZ } } } },
  features: { unicodeRangeBiDi: false },
  sections: [{
    properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } },
    footers: {
      default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '第 ', font: CN, size: 16, color: '999999' }), new TextRun({ children: [PageNumber.CURRENT], font: CN, size: 16, color: '999999' }), new TextRun({ text: ' 页', font: CN, size: 16, color: '999999' })] })] })
    },
    children: [...cover, cheatTable, pageBreak(), ...body]
  }]
});

Packer.toBuffer(doc).then(buf => {
  const out = 'C:/Users/Administrator/.qwenworkcn/workspace/2026-11-03/mvxyo9jvagb9y4lr/outputs';
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(out + '/韩语助词' + items.length + '题·专项练习（含答案解析）.docx', buf);
  console.log('docx 写出', buf.length, 'bytes');
});
