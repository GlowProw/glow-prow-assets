---
name: glow-prow (standalone)
description: Query public ship loadouts (assemblies), Codex item catalog, Twitch Drops, season calendar events, and service status for Glow Prow (Skull and Bones player community). Standalone single-file edition for direct usage in any AI assistant.
version: 2.0.0
---

# Glow Prow (Standalone Edition)

> Standalone single-file edition ready to be copied into AI assistants supporting custom instructions / system prompts (ChatGPT, Claude, DeepSeek, Doubao, etc.).
> Backend REST API Base: `https://api.glow-prow.top/api/` (Local debugging: `http://localhost:3000/api/`).
> Update URL: `https://raw.githubusercontent.com/GlowProw/glow-prow-assets/main/skills/standalone/glow-prow-community-en.md`
> Skills Repository: `https://github.com/GlowProw/glow-prow-assets/tree/main/skills`

## 1. Authentication (Optional / On Demand)

Public queries (loadout list, Twitch drops, season calendar, service status) can be accessed anonymously. User login is only required when accessing private loadouts:

```http
POST {base}user/signin
Content-Type: application/json

{"username":"your_username","password":"your_password"}
```
Returns `code: "signin.ok"`, `data.token` is the JWT session token (valid for 24h). When calling protected endpoints, provide: `x-access-token: <token>`.

## 2. Loadouts (Assembly)

### 2.1 Search Public Loadouts (Anonymous)
```http
GET {base}assembly/list?page=1&pageSize=10&keyword=optional&sortField=updatedTime&sortOrder=desc
```
- Parameters: `keyword` (search by loadout title or author), `page`/`pageSize` (≤100), `sortField`=`updatedTime|createdTime|likes`, `sortOrder`=`asc|desc`.
- Returns: `data.data` list (including `uuid`, `name`, `assembly`, `username`, `likes`), `data.pagination.total` count.

### 2.2 Loadout Detail
```http
GET {base}assembly/item?uuid=<loadout_uuid>&password=<optional_password>
Header: x-access-token: <token> (required for private loadouts)
```
- Key fields: `name`, `username` (creator), `createdTime`/`updatedTime`, `description`, `assembly.data` (weapons, hull, armor), `mastery.data`, `wheel.data`, `warehouse.data`.

### 2.3 Loadout Text Display Template
```
[Loadout Details]
- Name: <name>
- Creator: <username>
- Created: <createdTime>
- Updated: <updatedTime>
- Description: <description>
- Core Loadout: <assembly.data summary: ship, weapons, armor>
- Mastery: <mastery.data or "(None)">
- Action Wheel: <wheel.data or "(None)">
- Cargo: <warehouse.data or "(None)">
```

## 3. Codex & Items

### 3.1 Codex Catalog Categories (2118 items total)
- **items** (770): culverin, bombard, torpedo, demicannon, ballista, seaFire, mortar, rocket, armor, ammunition, tools, consumables.
- **ships** (20): dhow, bedar, sloop, padewakang, snow, brigantine, sambuk, barque, brig, battlejunk, etc.
- **materials** (161): silver, piecesOfEight, sovereigns, reapersToll, azuriteGem, etc.
- **modifications** (138): direPiercing, direElectric, direExplosive, firepower, rapidReload, flood, etc.
- **commodities** (77): lambaCloth, uncutGarnet, cloves, frankincense, ivory, etc.
- **ultimates** (11): hunter, laPlusGrandeFleur, trueEndlessRequiem, bastion, hailstormLongGuns, etc.
- **cosmetics** (478), **npc** (33), **treasureMaps** (192), **mapPositions** (112), **empireSkills** (124).

### 3.2 Resource Images & Public Stats API
- Item icon & artwork URL: `https://assets.glow-prow.top/api?t=AUTO_items&id=<item_id>`
- Season collectible items list: `GET {base}public/stats/season/:season/items`
- Item acquisition rate & trend: `GET {base}public/stats/codex/item?targetType=<type>&targetId=<id>`
- Overall codex collection statistics: `GET {base}public/stats/codex?range=30`

## 4. Twitch Drops

### 4.1 Active Campaigns (Public)
```http
GET {base}drop/current
```
- Returns active Twitch drops, start/end dates, details URL, and `timeBasedDrops` tier list (required watch time `requiredMinutesWatched` and item names).

### 4.2 Historical Drops & Details
- Search history: `GET {base}drop/history?page=1&pageSize=12&status=all|active|upcoming|ended&keyword=`
- Single campaign detail: `GET {base}drop/:id` (supports database ID or Twitch campaignId)
- Bot notification events: `GET {base}drop/robot/notify?since=<timestamp_ms>` (requires token with bot/dev/root role)

### 4.3 Twitch Drops Text Display Template
```
[Twitch Drop Campaign]
- Campaign: <name>
- Duration: <startAt> to <endAt>
- URL: <detailsURL>
- Rewards:
  * Watch <requiredMinutesWatched> mins: <reward_name>
```

## 5. Season Calendar

### 5.1 Season Events Schedule (Public)
```http
GET {base}calendar/data?season=<season_id>
```
- Fetches all world events and William Blackwood merchant rotation dates for the specified season (e.g. `crimsonWaters`).

### 5.2 Export iCalendar (.ics) Subscriptions
- Full season subscription: `GET {base}calendar/events.ics?season=<season_id>&language=en_US`
- Single event subscription: `GET {base}calendar/event.ics?season=<season_id>&language=en_US&eventId=<event_id>`

## 6. Service Status & Navigation

- Health & monitoring: `GET {base}status/page`
- Heartbeat & uptime: `GET {base}status/heartbeat`
- Site Routes:
  - Codex: `/codex` (Ships `/codex/ships`, Items `/codex/items`, Materials `/codex/materials`)
  - Loadouts: `/assembly`
  - Calendar: `/calendar`
  - Twitch Drops: `/twitch-drops`
  - Interactive Map: `/map`
  - AI Connector: `/apps/ai-connector`

## 7. Rate Limits & Security

1. **Read-Only**: Strictly queries data; does not create, modify, or delete any online resources.
2. **Rate Limits**:
   - General public endpoints: max 200 requests / 15 min per IP.
   - Drops: max 30 requests / 1 min per IP.
   - Calendar: max 4 requests / 10 sec per IP.
   - MCP protocol endpoint: Anonymous 60 req / 10 min, free user 150 req / 10 min, subscriber 1,000 req / 10 min. Returns 429 when exceeded.
3. **Security**: Never display auth credentials or tokens in plain text in AI responses.
