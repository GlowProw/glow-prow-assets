# Glow Prow 技能书（AI Skills）

本目录包含为各类 AI 助手与 Agent 客户端提供的 **Glow Prow（碧海黑帆/闪耀船首）** 官方数据查询技能。

---

## 目录结构设计

```text
skills/
├── README.md                           # 技能书概览与使用指南（当前文件）
│
├── glow-prow-community/                # 📦 标准完整技能包（适用于 Agentic 框架与支持外挂知识库的 AI）
│   ├── SKILL.md                        # 核心技能规范（配装、Codex图鉴、Twitch掉宝、赛季日历、服务状态）
│   └── codex-catalog.json              # 全量 Codex 物品目录资源文件 (收录 13 大类共 2118 项物品)
│
└── standalone/                         # 📄 单文件自包含版（适用于直接复制粘贴到网页端 AI 提示词框）
    ├── glow-prow-community-zh.md       # 中文自包含单文件（免附件依赖，开箱即用）
    └── glow-prow-community-en.md       # 英文自包含单文件（面向英文 AI 客户端）
```

---

## 各版本适用场景与导入方式

### 1. 网页端 AI 对话助手（豆包、ChatGPT、Claude、深度求索 DeepSeek、Kimi 等）
- **推荐文件**：[`standalone/glow-prow-community-zh.md`](./standalone/glow-prow-community-zh.md)
- **使用方式**：
  直接打开该 Markdown 文件，全选复制全部内容，粘贴到平台的**“自定义指令（Custom Instructions）”**、**“系统提示词（System Prompt）”**或**“智能体设定（GPTs / 角色设定）”**中保存即可。

### 2. IDE / Agentic 框架（Antigravity、Cursor、Cline、OpenCode 等）
- **推荐目录**：[`glow-prow-community/`](./glow-prow-community/)
- **使用方式**：
  将 `glow-prow-community` 整个文件夹挂载到 Agent 的 skills 路径中。框架会自动读取 `SKILL.md` 的规范描述，并在需要检索 Codex 物品 ID 时自动调用同目录下的 `codex-catalog.json` 数据文件。

---

## 功能特性对照

| 功能模块 | 对应 MCP 工具 | 真实 REST API | 说明 |
| --- | --- | --- | --- |
| **配装查询** | `search_assemblies`, `get_assembly` | `GET /api/assembly/list`, `GET /api/assembly/item` | 社区公开配装搜索、部件与武器挂载详情 |
| **图鉴索引** | `search_codex`, `get_codex_entry` | `codex-catalog.json`, `GET /api/public/stats/*` | 2118 项物品、分类、赛季收集清单与图片 |
| **寻求组队** | `list_teams`（`查询寻求组队`） | `GET /api/team/teamups` | 活跃组队招募、活动标签（PVE/PVP/要塞/悬赏等）、跨平台与剩余有效时长 |
| **战争状态** | `get_state_of_war`, `list_war_seasons`（`获取战争状态`、`查询战事赛季`） | `GET /api/stateOfWar/latest`, `GET /api/stateOfWar/seasons` | 当前赛季势力战况、阵营战功排行榜与大洋战略战区态势 |
| **Twitch 掉宝** | `list_drops`, `get_drop_detail` | `GET /api/drop/current`, `GET /api/drop/history` | 当前进行中的掉宝活动、观看门槛与奖励阶梯 |
| **赛季日历** | `list_calendar_seasons`, `get_calendar_season` | `GET /api/calendar/data`, `GET /api/calendar/events.ics` | 世界领主与黑木商人排期、ICS 订阅导出 |
| **服务状态** | `list_site_features` | `GET /api/status/page`, `GET /api/status/heartbeat` | 站点全组件健康监控与前端页面直达导航 |
