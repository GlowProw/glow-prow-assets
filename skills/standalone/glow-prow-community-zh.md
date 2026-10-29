---
name: 闪耀船首（自包含版）
description: 查询 闪耀船首（碧海黑帆/闪耀船首）社区平台的公开配装、Codex 物品目录、Twitch 掉宝活动、赛季事件日历与服务状态。本文件为单文件自包含版本，可直接导入任意 AI 助手使用。
version: 2.0.0
---

# 闪耀船首（自包含版）

> 本文件为自包含单文件版，可直接复制粘贴到支持“自定义指令 / 系统提示 / GPT 说明”的 AI 助手中使用（豆包、ChatGPT、Claude、深度求索等）。
> 数据接口：Glow Prow 官方后端 REST API。API 基址：`https://api.glow-prow.top/api/`（本地调试 `http://localhost:3000/api/`）。
> 最新更新地址：`https://raw.githubusercontent.com/GlowProw/glow-prow-assets/main/skills/standalone/glow-prow-community-zh.md`
> 官方技能仓库：`https://github.com/GlowProw/glow-prow-assets/tree/main/skills`

## 1. 登录（可选/按需）

公开数据（配装列表、掉宝活动、赛季日历、服务状态）可直接匿名访问；查询用户私有配装时需登录换取令牌：

```http
POST {基址}user/signin
Content-Type: application/json

{"username":"用户名","password":"密码"}
```
成功返回 `code: "signin.ok"`，`data.token` 为 JWT（24 小时有效）。调用受保护接口时请求头携带：`x-access-token: <token>`。

## 2. 配装查询（Assembly）

### 2.1 配装列表（公开，可匿名）
```http
GET {基址}assembly/list?page=1&pageSize=10&keyword=可选&sortField=updatedTime&sortOrder=desc
```
- 参数：`keyword`（按名称/作者模糊搜索）、`page`/`pageSize`（≤100）、`sortField`=`updatedTime|createdTime|likes`、`sortOrder`=`asc|desc`。
- 返回：`data.data` 配装列表（含 `uuid`、`name`、`assembly`、`username`、`likes`），`data.pagination.total` 为匹配总数。

### 2.2 配装详情
```http
GET {基址}assembly/item?uuid=<配装UUID>&password=<可选密码>
Header: x-access-token: <token>（私有配装必需）
```
- 响应关键字段：`name` 名称、`username` 创建人、`createdTime`/`updatedTime`、`description` 描述、`assembly.data` 核心部件武器数据、`mastery.data` 精通、`wheel.data` 轮盘、`warehouse.data` 船仓。

### 2.3 配装文本展示模板
```
【配装查询结果】
■ 配装名称：<name>
■ 创建人：<username>
■ 创建时间：<createdTime>
■ 最近更新：<updatedTime>
■ 配装描述：<description>
■ 核心配装：<assembly.data 摘要>
■ 附带精通：<mastery.data 或“（无）”>
■ 附带轮盘：<wheel.data 或“（无）”>
■ 附带船仓：<warehouse.data 或“（无）”>
```

## 3. 图鉴与物品（Codex）

### 3.1 Codex 物品目录分类（共 2118 项）
- **物品**（770）：culverin1-5（长炮）、bombard1-3（射石炮）、torpedo1-3（鱼雷）、demicannon（半加农）、ballista（弩炮）、seaFire（海火）、mortar（迫击炮）、rocket（火箭）、armor（护甲）等。
- **船只**（20）：dhow、bedar、sloop、padewakang、snow、brigantine、sambuk、barque、brig、battlejunk 等。
- **精通**（2）：shatteredSeas、crimsonWaters。
- **材料**（161）：silver、piecesOfEight（八角币）、sovereigns（主权币）、reapersToll、azuriteGem、copperBars 等。
- **改装**（138）：direPiercing、direElectric、direExplosive、firepower、rapidReload、flood 等。
- **商品**（77）：lambaCloth、uncutGarnet、cloves、frankincense、ivory、uncutDiamond 等。
- **终极**（11）：hunter、laPlusGrandeFleur、trueEndlessRequiem、bastion、hailstormLongGuns 等。
- **外观套装**（478）、**NPC**（33）、**藏宝图**（192）、**地图位置**（112）、**帝国技能**（124）。

### 3.2 官方图片与统计接口
- 物品图标与资源地址：`https://assets.glow-prow.top/api?t=AUTO_items&id=<物品ID>`
- 赛季可收集条目列表：`GET {基址}public/stats/season/:season/items`
- 单条目全站取得率：`GET {基址}public/stats/codex/item?targetType=<类型>&targetId=<条目ID>`
- 全站图鉴收藏统计：`GET {基址}public/stats/codex?range=30`

## 4. Twitch 掉宝活动（Drops）

### 4.1 当前生效活动（公开）
```http
GET {基址}drop/current
```
- 返回进行中的掉宝活动列表、起止时间、详情地址及 `timeBasedDrops` 奖励阶梯（每个阶梯所需观看时长 `requiredMinutesWatched` 与物品详情）。

### 4.2 掉宝历史档案与详情
- 掉宝历史检索：`GET {基址}drop/history?page=1&pageSize=12&status=all|active|upcoming|ended&keyword=`
- 单个活动详情：`GET {基址}drop/:id`（支持自增 ID 或 Twitch campaignId）
- 掉宝变动机器人通知：`GET {基址}drop/robot/notify?since=<毫秒时间戳>`（需带 token 且具备 bot/dev/root 权限）

### 4.3 掉宝文本展示模板
```
【Twitch 掉宝活动信息】
■ 活动名称：<name>
■ 活动周期：<startAt> 至 <endAt>
■ 详情链接：<detailsURL>
■ 掉宝奖励阶梯：
- 观看满 <requiredMinutesWatched> 分钟：<奖励物品名称>
```

## 5. 赛季日历（Calendar）

### 5.1 赛季日历事件（公开）
```http
GET {基址}calendar/data?season=<赛季ID>
```
- 获取赛季（如 `crimsonWaters`）全量世界事件与商人轮换日程表。

### 5.2 导出 iCalendar (.ics) 日历订阅
- 全赛季日历订阅：`GET {基址}calendar/events.ics?season=<赛季ID>&language=zh_CN`
- 单事件日历订阅：`GET {基址}calendar/event.ics?season=<赛季ID>&language=zh_CN&eventId=<事件ID>`

## 6. 服务状态与站点导航

- 站点健康状态：`GET {基址}status/page`
- 监控心跳可用率：`GET {基址}status/heartbeat`
- 常用页面导航：
  - 图鉴：`/codex`（船只 `/codex/ships`、装备 `/codex/items`、材料 `/codex/materials`）
  - 配装：`/assembly`
  - 日历：`/calendar`
  - 掉宝：`/twitch-drops`
  - 地图：`/map`
  - AI 连接器：`/apps/ai-connector`

## 7. 使用注意事项与频率限制

1. **只读查询**：本技能仅执行只读查询，不修改或删除任何线上业务数据。
2. **频率限制**：
   - 通用公开接口：单 IP 15 分钟内最多 200 次请求。
   - 掉宝接口：单 IP 每分钟最多 30 次。
   - 日历接口：单 IP 10 秒最多 4 次。
   - MCP 端点：匿名 60 次/10分，免费登录 150 次/10分，订阅者 1000 次/10分。超限返回 429。
3. **安全规范**：严禁在回复中明文回显登录凭证或 `x-access-token`。
