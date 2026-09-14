// 把 7MB 的 tree.json 瘦身成前端可直接加载的紧凑数据
import fs from 'node:fs';
import path from 'node:path';

// 输出目录：默认当前目录，可用第一个参数覆盖
const OUT_DIR = process.argv[2] || process.cwd();
const SPACE_ID = '7226178700923011075';

const tree = JSON.parse(fs.readFileSync('tree.json', 'utf8'));
const nodes = tree.nodes;

// node_token -> 数组下标
const idx = new Map();
nodes.forEach((n, i) => idx.set(n.node_token, i));

const TYPES = ['docx', 'bitable', 'sheet', 'file', 'slides', 'mindnote'];
const typeIdx = new Map(TYPES.map((t, i) => [t, i]));

// 紧凑格式: [node_token, title, typeIdx, parentIdx, hasChild]
const out = nodes.map((n) => {
  const parentToken = n.parent_token || '';
  const p = parentToken ? (idx.get(parentToken) ?? -1) : -1;
  return [n.node_token, n.title, typeIdx.get(n.obj_type) ?? 9, p, n.has_child ? 1 : 0];
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
      输出文件: path.join(OUT_DIR, 'data.js'),
      体积KB: Math.round(js.length / 1024),
    },
    null,
    2,
  ),
);
