// 把 7MB 的 tree.json 瘦身成前端可直接加载的紧凑数据
import fs from 'node:fs';
import path from 'node:path';

// 输出目录：默认当前目录，可用第一个参数覆盖
const OUT_DIR = process.argv[2] || process.cwd();
const SPACE_ID = '7226178700923011075';

// 不在导航中显示的一级目录（按标题精确匹配，整棵子树一起移除）。
// 原始数据不受影响，注释掉任意一行即可恢复该目录。
const HIDDEN_ROOTS = [
  // 时效性与活动类
  '9 月 13 日，现场实测四大办公 Agent，到底谁真 Work？',
  '晚8点共学',
  // 元信息类
  '4.5 历史更新',
  '5. 关于我们 & 致谢',
  '通往AGI之路',
  // 与业务无关
  'AI训练营',
  'WaytoAGI 高校板块',
];

const tree = JSON.parse(fs.readFileSync('tree.json', 'utf8'));
const nodes = tree.nodes;

// node_token -> 数组下标
const idx = new Map();
nodes.forEach((n, i) => idx.set(n.node_token, i));

const TYPES = ['docx', 'bitable', 'sheet', 'file', 'slides', 'mindnote'];
const typeIdx = new Map(TYPES.map((t, i) => [t, i]));

// 建立父子索引（用节点下标）
const kids = new Map();
nodes.forEach((n, i) => {
  const pt = n.parent_token || '';
  if (!pt) return;
  const pi = idx.get(pt);
  if (pi === undefined) return;
  if (!kids.has(pi)) kids.set(pi, []);
  kids.get(pi).push(i);
});

// 标记要隐藏的整棵子树
const hidden = new Set();
const missed = [];
for (const title of HIDDEN_ROOTS) {
  const rootIdx = nodes.findIndex((n) => !(n.parent_token || '') && n.title.trim() === title.trim());
  if (rootIdx === -1) { missed.push(title); continue; }
  const stack = [rootIdx];
  while (stack.length) {
    const cur = stack.pop();
    if (hidden.has(cur)) continue;
    hidden.add(cur);
    for (const k of kids.get(cur) || []) stack.push(k);
  }
}
if (missed.length) {
  throw new Error(`HIDDEN_ROOTS 里有标题在一级目录中找不到，请核对：\n  - ${missed.join('\n  - ')}`);
}

// 保留可见节点，并重建下标映射
const keep = [];
const remap = new Map();
nodes.forEach((n, i) => {
  if (!hidden.has(i)) { remap.set(i, keep.length); keep.push(i); }
});

// 紧凑格式: [node_token, title, typeIdx, parentIdx, hasChild]
const out = keep.map((i) => {
  const n = nodes[i];
  const pt = n.parent_token || '';
  const oldParent = pt ? idx.get(pt) : -1;
  const p = oldParent === undefined || oldParent === -1 ? -1 : (remap.get(oldParent) ?? -1);
  const hasVisibleChild = (kids.get(i) || []).some((k) => remap.has(k));
  return [n.node_token, n.title, typeIdx.get(n.obj_type) ?? 9, p, hasVisibleChild ? 1 : 0];
});

// 自检：parent 下标必须都落在数组范围内
let bad = 0;
for (const r of out) if (r[3] < -1 || r[3] >= out.length) bad++;
if (bad) throw new Error(`parent 下标越界 ${bad} 条`);

fs.mkdirSync(OUT_DIR, { recursive: true });

const payload = {
  space: SPACE_ID,
  base: 'https://waytoagi.feishu.cn/wiki/',
  types: TYPES,
  crawled: tree.crawled_at,
  total: out.length,
  nodes: out,
};

const js = 'window.WIKI_DATA=' + JSON.stringify(payload) + ';\n';
fs.writeFileSync(path.join(OUT_DIR, 'data.js'), js, 'utf8');

const roots = out.filter((r) => r[3] === -1).length;
console.log(
  JSON.stringify(
    {
      节点数: out.length,
      根节点数: roots,
      已隐藏节点数: hidden.size,
      已隐藏目录数: HIDDEN_ROOTS.length,
      输出文件: path.join(OUT_DIR, 'data.js'),
      体积KB: Math.round(js.length / 1024),
    },
    null,
    2,
  ),
);
