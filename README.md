# WaytoAGI 知识库导航

把 [WaytoAGI 飞书知识库](https://waytoagi.feishu.cn/wiki/DOYPwcGHAiluiekAeGgc3kM8nNb)做成一个卡片式目录导航站。

访问地址：**https://chrisgao1219.com/waytoagi/**

## 特点

- **纯静态，零依赖零构建** —— 只有 `index.html` + `data.js` 两个文件
- 首页按编号分组（1 · 入门与创作 / 2 · 应用与专题 / 3 · 案例与工具 / 4 · 动态与资讯 / 其他），每组是卡片网格
- 点卡片进入该目录继续下钻，面包屑可逐级回溯；叶子卡片点击直接用飞书打开原文
- 卡片右下角显示该目录的条目总数，方便判断规模
- 全库标题搜索：关键词高亮，右侧标注所属一级目录；上限 200 条
- 明暗主题切换，选择存 `localStorage`
- `noindex, nofollow` + `robots.txt` 阻断搜索引擎收录

## 数据

`data.js` 内容为：

```js
window.WIKI_DATA = {
  space:   '7226178700923011075',              // WaytoAGI 知识空间 ID
  base:    'https://waytoagi.feishu.cn/wiki/', // 原文链接前缀
  types:   ['docx','bitable','sheet','file','slides','mindnote'],
  crawled: '2026-09-14T...',                   // 抓取时间
  total:   13605,
  // [node_token, title, typeIdx, parentIdx, hasChild]
  // parentIdx = -1 表示一级目录；数组下标即节点 id
  nodes: [ ... ]
};
```

站点上**只保存标题和目录结构**，不存正文、图片或附件 —— 所有条目都跳转回飞书原文。

## 目录过滤

知识库原始有 14,552 个节点。`scripts/build-data.mjs` 顶部的 `HIDDEN_ROOTS` 列出了不参与导航的一级目录，
连同其整棵子树一起移除（当前隐藏 7 个目录、947 个节点，站上保留 13,605 个）：

- 时效性与活动类：《9 月 13 日，现场实测四大办公 Agent，到底谁真 Work？》《晚8点共学》
- 元信息类：《4.5 历史更新》《5. 关于我们 & 致谢》《通往AGI之路》
- 与业务无关：《AI训练营》《WaytoAGI 高校板块》

**想恢复某个目录，把对应那行注释掉重新生成即可**，原始抓取数据一直完整保留在 `tree.json` 里。
若标题在一级目录中匹配不到，脚本会直接报错退出，不会静默漏掉。

## 更新数据

知识库会持续更新。重新抓取（需要 `lark-cli` 已登录且具备 `wiki:node:read` scope）：

```bash
node scripts/traverse.mjs      # 递归遍历整棵知识树 → tree.json（约 10 分钟）
node scripts/build-data.mjs    # tree.json → data.js（约 1 秒）
```

`traverse.mjs` 以 6 并发递归调用 `wiki +node-list`，失败自动退避重试；
`build-data.mjs` 把 7MB 的 `tree.json` 瘦身成约 890KB 的 `data.js`（gzip 后约 240KB）。
两个脚本都会自检数据完整性（父节点下标越界、隐藏目录标题失配）异常时直接报错退出。

## 版权

内容版权归 WaytoAGI 社区及原作者所有。本站只存目录标题，不复制正文。
