// 递归遍历 WaytoAGI 知识库的全部节点，输出目录树 + 统计
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';

const execFileP = promisify(execFile);

const SPACE_ID = '7226178700923011075';
const CONCURRENCY = 6;
const ENV = {
  ...process.env,
  LARKSUITE_CLI_NO_UPDATE_NOTIFIER: '1',
  LARKSUITE_CLI_NO_SKILLS_NOTIFIER: '1',
};

async function listChildren(parentToken) {
  const args = [
    '/c', 'lark-cli', 'wiki', '+node-list',
    '--space-id', SPACE_ID,
    '--as', 'user',
    '--format', 'json',
    '--page-all', '--page-limit', '0',
  ];
  if (parentToken) args.push('--parent-node-token', parentToken);

  let lastErr;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const { stdout } = await execFileP('cmd.exe', args, {
        maxBuffer: 128 * 1024 * 1024,
        env: ENV,
      });
      const start = stdout.indexOf('{');
      if (start === -1) throw new Error('no JSON in output: ' + stdout.slice(0, 200));
      const j = JSON.parse(stdout.slice(start));
      if (!j.ok) throw new Error(JSON.stringify(j.error));
      return j.data.nodes || [];
    } catch (e) {
      lastErr = e;
      const msg = String(e.message || e);
      // 权限类错误不重试
      if (/missing_scope|permission_denied|not_found/.test(msg)) throw e;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw lastErr;
}

const t0 = Date.now();
const nodes = [];          // 全部节点（扁平）
const byToken = new Map(); // node_token -> 带 depth/parent 的记录

function record(node, depth, parentToken, parentTitle) {
  const rec = { ...node, depth, parent_token: parentToken, parent_title: parentTitle };
  nodes.push(rec);
  byToken.set(node.node_token, rec);
  return rec;
}

// 根层
const roots = await listChildren(null);
for (const n of roots) record(n, 0, '', '');
console.error(`根节点: ${roots.length}`);

let queue = nodes.filter((n) => n.has_child);
let processed = 0;

while (queue.length > 0) {
  const batch = queue.splice(0, CONCURRENCY);
  const results = await Promise.all(
    batch.map(async (parent) => {
      const kids = await listChildren(parent.node_token);
      return kids.map((k) => record(k, parent.depth + 1, parent.node_token, parent.title));
    }),
  );
  processed += batch.length;
  const kids = results.flat();
  queue.push(...kids.filter((k) => k.has_child));
  console.error(
    `已展开父节点 ${processed} 个，累计节点 ${nodes.length} 个，待展开 ${queue.length} 个，耗时 ${((Date.now() - t0) / 1000).toFixed(0)}s`,
  );
}

// 统计
const byType = {};
const byDepth = {};
for (const n of nodes) {
  byType[n.obj_type] = (byType[n.obj_type] || 0) + 1;
  byDepth[n.depth] = (byDepth[n.depth] || 0) + 1;
}

await fs.writeFile(
  'tree.json',
  JSON.stringify({ space_id: SPACE_ID, crawled_at: new Date().toISOString(), total: nodes.length, byType, byDepth, nodes }, null, 2),
  'utf8',
);

console.log(JSON.stringify({ total: nodes.length, byType, byDepth, elapsed_s: ((Date.now() - t0) / 1000).toFixed(0) }, null, 2));
