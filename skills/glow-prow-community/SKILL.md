---
name: glow-prow-社区数据查询技能书
description: 查询 Glow Prow（碧海黑帆 / 闪耀船首）社区平台的公开配装、Codex 物品图鉴、Twitch 掉宝活动、赛季事件日历与全站服务状态。提供登录认证、公开与私有配装详情、物品分类与图片、掉宝活动监控、日历事件及 ICS 订阅导出等真实 REST API 规范与文本展示模板。
version: 2.0.0
---

# Glow Prow 社区数据查询技能书

> 适用平台：豆包（Doubao）、ChatGPT、Claude、深度求索（DeepSeek）等支持“自定义指令 / 系统提示 / 技能”的 AI 助手。
> 数据接口：Glow Prow 官方后端 REST API，与官方 MCP 协议服务功能对齐。

## 一、技能简介

本技能让 AI 助手可以通过 Glow Prow 官方后端接口读取《碧海黑帆》（Skull and Bones）玩家社区的完整数据，包括：

- **配装查询（Assembly）**：查询社区公开配装列表，读取配装完整信息（船只、武器组合、精通、轮盘、船仓与描述）。
- **图鉴查询（Codex）**：支持 13 类 Codex 物品（船只、武器装备、材料、改装、商品等 2100+ 条目）的本地目录索引、赛季可收集清单与官方图片资源。
- **Twitch 掉宝（Drops）**：查询当前进行中的掉宝活动、观看时长门槛、奖励物品清单、历史活动归档与变动通知。
- **赛季日历（Calendar）**：获取各赛季世界事件、黑木商人轮换日程安排，并支持导出 iCalendar（.ics）订阅链接。
- **服务状态与站点导航（Status & Features）**：查询全站组件可用性与实时心跳，提供对应官方页面的精准直达链接。

大部分数据接口均为公开只读接口；涉及私有配装或特定权限操作时需通过账号密码登录换取令牌。

## 二、接口与鉴权

### 2.1 API 基址

| 环境 | 基址 |
| --- | --- |
| 生产环境 | `https://api.glow-prow.top/api/` |
| 本地调试 | `http://localhost:3000/api/` |

### 2.2 鉴权方式

- 公开接口（配装列表、掉宝当前/历史活动、赛季日历、公开统计、服务状态）支持**匿名直接调用**。
- 受保护接口需在请求头携带令牌：`x-access-token: <token>`（或标准 Authorization 头 `Bearer <token>`）。
- 登录有效时间为 24 小时；若返回 `401` 或 `code: "user.tokenExpired"`，需重新登录获取新令牌。

### 2.3 账号登录

```http
POST {基址}user/signin
Content-Type: application/json

{
  "username": "用户名",
  "password": "密码"
}
```

成功响应示例：
```json
{
  "code": "signin.ok",
  "data": {
    "token": "eyJhbGciOi...",
    "userId": 123,
    "username": "demo_captain",
    "alternativeName": "演示船长",
    "role": "user"
  }
}
```

> 说明：正常登录无需验证码。仅当同 IP 短时间内连续登录失败时才会触发验证码要求。

## 三、功能模块与真实接口

### 1. 配装查询（Assembly）

对应 MCP 工具：`search_assemblies`、`get_assembly`

#### 1.1 查询配装列表（公开，可匿名）

```http
GET {基址}assembly/list?page=1&pageSize=10&keyword=可选关键字&sortField=updatedTime&sortOrder=desc
```

- **常用参数**：
  - `keyword`：按配装名称、作者用户名或昵称模糊搜索。
  - `page` / `pageSize`：分页参数，`page` 从 1 开始，`pageSize` 默认为 10（最大 100）。
  - `sortField`：排序字段，可选 `updatedTime`（更新时间）、`createdTime`（创建时间）、`likes`（点赞数）。
  - `sortOrder`：排序方向，可选 `desc`（降序，默认）或 `asc`（升序）。
- **返回结构**：
  - `data.data`：配装列表数组，每项包含 `uuid`、`name`、`assembly`、`username`、`likes` 等字段。
  - `data.pagination.total`：匹配到的配装总数。

#### 1.2 查询单个配装详情

```http
GET {基址}assembly/item?uuid=<配装UUID>&password=<可选密码>
Header: x-access-token: <token>（私有配装必需，公开配装可选）
```

- **关键字段说明**：
  - `name`：配装名称。
  - `username` / `userId`：创建人名称与 ID（匿名配装为 `null`）。
  - `createdTime` / `updatedTime`：创建与最近更新时间。
  - `description`：配装说明或攻略心得。
  - `tags`：标签数组。
  - `assembly.data`：核心部件与武器组合（船体、前舷、后舷、侧舷、辅助武器、装甲等）。
  - `assembly.attr`：配装属性（公开性、是否匿名等）。
  - `wheel.data`：附带的快捷轮盘配置。
  - `warehouse.data`：附带的船仓携带物资。
  - `mastery.data`：附带的精通专精配置。

#### 1.3 配装文本展示模板

```
【配装查询结果】
■ 配装名称：<name>
■ 创建人：<username / alternativeName>
■ 创建时间：<createdTime>
■ 最近更新：<updatedTime>
■ 配装描述：<description>

■ 核心配装：
<assembly.data 核心配置摘要：船只型号、武器挂载、装甲护盾>

■ 附带精通：<mastery.data 或“（无）”>
■ 附带轮盘：<wheel.data 或“（无）”>
■ 附带船仓：<warehouse.data 或“（无）”>
```

### 2. 图鉴与统计（Codex & Stats）

对应 MCP 工具：`search_codex`、`get_codex_entry`

#### 2.1 全量 Codex 本地目录

技能包附带 `codex-catalog.json`，收录全量 2118 个图鉴物品 ID 与类型对照，共 13 个分类：
- `items`（武器装备与道具，770 项）：culverin（长炮）、bombard（射石炮）、torpedo（鱼雷）、armor（护甲）等。
- `ships`（船只，20 项）：dhow、sloop、brigantine、snow、barque、battlejunk 等。
- `materials`（材料，161 项）：silver、piecesOfEight、sovereigns、reapersToll 等。
- `modifications`（改装件，138 项）：direPiercing、firepower、rapidReload 等。
- `commodities`（商品，77 项）：lambaCloth、ivory、cloves 等贸易货物。
- `cosmetics`（外观，478 项）：套装、涂装与装饰。
- `treasureMaps`（藏宝图，192 项）、`mapPositions`（地图位置，112 项）、`empireSkills`（帝国技能，124 项）、`npc`（NPC，33 项）、`mastery`（精通，2 项）、`ultimates`（终极，11 项）。

#### 2.2 官方图片资源地址

所有物品均可通过官方静态资源接口直接预览图标或插图：
```
https://assets.glow-prow.top/api?t=AUTO_items&id=<物品ID>
```
> 参数 `t` 亦可传入具体分类标识，如 `t=culverin`。

#### 2.3 赛季图鉴与全站收集统计接口

```http
# 获取某赛季可收集图鉴条目清单（按图鉴类型分组）
GET {基址}public/stats/season/:season/items

# 获取单个图鉴条目的全站取得率与近 12 周走势
GET {基址}public/stats/codex/item?targetType=<类型>&targetId=<条目ID>

# 全站按赛季汇总图鉴条目数与收藏量
GET {基址}public/stats/season

# 全站图鉴收藏统计分布（默认 30 天，可选 7 / 30 / 90）
GET {基址}public/stats/codex?range=30
```

### 3. Twitch 掉宝活动（Drops）

对应 MCP 工具：`list_drops`、`get_drop_detail`、`list_drop_notifications`

#### 3.1 获取当前生效中的掉宝活动（公开，可匿名）

```http
GET {基址}drop/current
```

- **返回关键字段**：
  - `data.campaigns`：当前正处于活动周期内的掉宝活动数组。
  - 活动内包含 `id`、`name`、`game`、`startAt`、`endAt`、`detailsURL`。
  - `timeBasedDrops`：具体奖励阶梯列表，每项包含 `id`、`name`、`requiredMinutesWatched`（所需观看时长，分钟）、`benefitEdges`（物品图标与名称）。
  - `data.totalCampaigns` / `data.totalDrops`：有效活动与奖励总数。

#### 3.2 分页查询掉宝历史档案

```http
GET {基址}drop/history?page=1&pageSize=12&status=all&keyword=可选关键词
```

- **参数说明**：
  - `page` / `pageSize`：分页参数（pageSize 最大 100）。
  - `status`：活动状态过滤，可选 `all`（全部）、`active`（进行中）、`upcoming`（即将开始）、`ended`（已结束）。
  - `keyword`：按活动名称或奖励名称搜索。
  - `startDate` / `endDate`：起始/结束时间区间。

#### 3.3 获取单个掉宝活动详情

```http
GET {基址}drop/:id
```

- 参数 `:id` 支持数据库记录 ID 或 Twitch 平台的 `campaignId`。
- 返回单个活动的完整信息，包含限定直播频道、活动海报图和所有奖励的达成进度要求。

#### 3.4 掉宝变动通知记录（机器人 / 管理权限）

```http
GET {基址}drop/robot/notify?since=<可选毫秒时间戳>
Header: x-access-token: <token>（需具备 bot / dev / root 角色）
```

- 返回最新检测到的掉宝新活动或新奖励，并附带可直接发往 Discord / 开黑啦 / QQ 机器人的预排版 Markdown 文本（`formattedMessage`）。

#### 3.5 掉宝信息文本展示模板

```
【Twitch 掉宝活动信息】
■ 活动名称：<name>
■ 活动状态：<进行中 / 即将开始 / 已结束>
■ 起止时间：<startAt> 至 <endAt>
■ 详情链接：<detailsURL>

■ 掉宝奖励阶梯：
- 观看满 <requiredMinutesWatched> 分钟：<奖励物品名称与说明>
- 观看满 <requiredMinutesWatched> 分钟：<奖励物品名称与说明>
```

### 4. 赛季日历（Calendar）

对应 MCP 工具：`list_calendar_seasons`、`get_calendar_season`

#### 4.1 获取赛季日历事件原始数据

```http
GET {基址}calendar/data?season=<赛季ID>
```

- **参数**：`season` 为赛季唯一标识，例如 `crimsonWaters`、`shatteredSeas`。
- **返回结构**：
  - `data.events`：包含该赛季所有世界领主、突袭事件、黑木商人（William Blackwood）货品轮换的完整排期。
  - 每个事件包含 `id`、`name`、`duration`（持续天数）、`occurrences`（具体发生的年月与日期数组）、`droppeds`（掉落物品摘要）。

#### 4.2 导出赛季日历为 iCalendar (.ics) 订阅文件

```http
# 导出整个赛季全部事件的日历订阅
GET {基址}calendar/events.ics?season=<赛季ID>&language=zh_CN

# 导出单个事件的日历文件
GET {基址}calendar/event.ics?season=<赛季ID>&language=zh_CN&eventId=<事件ID>&occurrenceIndex=<可选轮换批次>
```

- 用户可将链接添加至 Apple Calendar、Google Calendar 或 Outlook 中，自动与游戏内事件排期同步。

#### 4.3 日历事件文本展示模板

```
【赛季日历日程表】
■ 所属赛季：<season>
■ 事件名称：<event.name>
■ 持续时间：<duration> 天
■ 近期轮换排期：
- <occurrence.year>年<occurrence.month>月<occurrence.day>日 开幕
- 活动掉落：<droppeds 关键物品>
```

### 5. 服务状态与站点导航（Status & Features）

对应 MCP 工具：`list_site_features`

#### 5.1 服务状态监控

```http
# 站点分组监视器健康状态（API、数据库、存储、CDN 等）
GET {基址}status/page

# 实时心跳检测与可用率数据
GET {基址}status/heartbeat
```

- 官方状态页地址：`https://status.glow-prow.top`

#### 5.2 站点主要页面导航对照表

当用户询问去哪里查看完整页面或交互界面时，可直接提供官方站点链接：

| 功能板块 | 页面路由 | 页面说明与功能 |
| --- | --- | --- |
| 图鉴总览 | `/codex` | 游戏内全部数据入口 |
| 船只图鉴 | `/codex/ships` | 船只耐久、航速、火力、帆装与获取途径 |
| 装备图鉴 | `/codex/items` | 武器火炮、装甲、消耗品属性与制造配方 |
| 商品图鉴 | `/codex/commodities` | 贸易商品的基准价格、产地与销路区域 |
| 改装图鉴 | `/codex/modifications` | 船只改装件的属性加成与适用船型 |
| 材料图鉴 | `/codex/materials` | 原材料出处分布与采集加工方式 |
| 配装工坊 | `/assembly` | 社区公开配装库与交互式配装构建器 |
| 赛季日历 | `/calendar` | 世界事件、赛季首领与商人轮换日程表 |
| 掉宝日历 | `/twitch-drops` | Twitch 掉宝活动列表、奖励清单与历史档案 |
| 全景地图 | `/map` | 碧海黑帆交互式海图（据点、藏宝地、商人分布） |
| AI 连接器 | `/apps/ai-connector` | AI 助手授权配置、MCP 服务端点与权限管理 |
| 账户中心 | `/account` | 个人设置、平台绑定与安全中心 |

## 四、使用注意事项与频率限制

1. **凭证保护**：用户凭证与 `x-access-token` 严禁在给用户的最终回复文本中明文输出。
2. **只读安全性**：本技能涉及的接口均为只读查询，不执行发布、修改或删除配装等破坏性写操作。
3. **频率限制（Rate Limit）**：
   - 通用公开接口：单 IP 每 15 分钟最多 200 次请求。
   - 掉宝相关接口：单 IP 每分钟最多 30 次请求。
   - 日历相关接口：单 IP 每 10 秒最多 4 次请求。
   - MCP 协议端点：匿名账户 60 次 / 10 分钟，登录免费用户 150 次 / 10 分钟，订阅者 1000 次 / 10 分钟。
   - 触发限流时接口将返回 HTTP 429 状态码，需等待冷却后再发起重试。
4. **空值与隐私兜底**：当查询结果缺少描述或创建人（如匿名配装）时，统一标明“（无）”或“（未公开）”，不捏造数据。

## 五、附录：接口速查表

| 功能分类 | 操作描述 | 请求方式 | 接口相对路径 | 鉴权要求 |
| --- | --- | --- | --- | --- |
| 鉴权 | 账号登录换取令牌 | POST | `user/signin` | 无 |
| 配装 | 搜索配装列表 | GET | `assembly/list` | 无 |
| 配装 | 查询配装详细内容 | GET | `assembly/item` | 私有配装需令牌 |
| 图鉴 | 赛季图鉴分类条目 | GET | `public/stats/season/:season/items` | 无 |
| 图鉴 | 条目取得率与趋势 | GET | `public/stats/codex/item` | 无 |
| 图鉴 | 物品图标与资源图 | GET | `https://assets.glow-prow.top/api` | 无 |
| 掉宝 | 当前有效掉宝活动 | GET | `drop/current` | 无 |
| 掉宝 | 历史掉宝分页档案 | GET | `drop/history` | 无 |
| 掉宝 | 单个掉宝活动详情 | GET | `drop/:id` | 无 |
| 掉宝 | 掉宝变更事件通知 | GET | `drop/robot/notify` | 需 bot/dev/root |
| 日历 | 赛季事件排期数据 | GET | `calendar/data` | 无 |
| 日历 | 全赛季 ICS 日历订阅 | GET | `calendar/events.ics` | 无 |
| 日历 | 单事件 ICS 订阅文件 | GET | `calendar/event.ics` | 无 |
| 状态 | 站点服务组件监控 | GET | `status/page` | 无 |
| 状态 | 实时心跳与可用率 | GET | `status/heartbeat` | 无 |