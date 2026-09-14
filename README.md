# WaytoAGI 知识库导航

把 [WaytoAGI 飞书知识库](https://waytoagi.feishu.cn/wiki/DOYPwcGHAiluiekAeGgc3kM8nNb)（14,552 个节点）做成一个目录导航站，
访问地址：**https://chrisgao1219.com/waytoagi/**

## 特点

- **纯静态，零依赖零构建** —— 只有 `index.html` + `data.js` 两个文件
- 点击条目标题展开子目录（懒加载，不会一次渲染 14,552 个 DOM 节点）
- 点击右侧 `↗` 在飞书中打开原文
- 全库标题搜索：关键词高亮 + 父级路径定位，上限 300 条
- 明暗主题切换，选择存 `localStorage`
- `noindex, nofollow` + `robots.txt` 阻断搜索引擎收录

## 数据格式

`data.js` 内容为：

```js
window.WIKI_DATA = {
  space:   '7226178700923011075',              // WaytoAGI 知识空间 ID
  base:    'https://waytoagi.feishu.cn/wiki/', // 原文链接前缀
  types:   ['docx','bitable','sheet','file','slides','mindnote'],
  crawled: '2026-09-14T...',                   // 抓取时间
  total:   14552,
  // [node_token, title, typeIdx, parentIdx, hasChild]
  // parentIdx = -1 表示一级目录；数组下标即节点 id
  nodes: [ ... ]
};
```

## 更新数据

知识库会持续更新。重新抓取（需要 `lark-cli` 已登录且具备 `wiki:node:read` scope）：

```bash
node scripts/traverse.mjs      # 递归遍历整棵知识树 → tree.json（约 10 分钟）
node scripts/build-data.mjs    # tree.json → data.js（约 1 秒）
```

`traverse.mjs` 以 6 并发递归调用 `wiki +node-list`，失败自动退避重试；
`build-data.mjs` 会把 7MB 的 `tree.json` 瘦身成约 950KB 的 `data.js`（gzip 后约 250KB）。
两个脚本都会自检数据完整性，异常时直接报错退出。

## 版权

内容版权归 WaytoAGI 社区及原作者所有。本站**只存目录标题**，不复制正文，所有条目均跳转回飞书原文。
