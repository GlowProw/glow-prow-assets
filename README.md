# 关于

这是glow-prow的资源集，它的来源包含`skullandbonestools.de` `skull and bones wiki`等互联网上收集资源

> 这是一个面向Glow-Prow镜像，弥补S&B Tool源在国内资源访问过慢和因vercel在中国防火墙列入黑名单导致无法访问问题
> Glow-Prow主程序有S&B Tool选择源，如果可用的话 :P

## 使用资源

glow-prow提供几种可访问方案:

**原始**
- 使用github raw,`raw.github.com/items/culverin/basilisk1.webp`

**中间件**

- 使用基于EO函数获取, `assets.glow-prow.org.cn/api?t=AUTO_items&id=basilisk1` and `assets.glow-prow.org.cn/api?t=culverin&id=basilisk1`
- 使用基于EO(全球)函数获取, `assets.glow-prow.top/api?t=AUTO_items&id=abyssal1`

t: 代表类型
- 当t等于AUTO_items表示则自动从可选路径查询，在已有路径并行请求检查，将更久时间; AUTO_items仅支持item类型，不支持npcs等其他
- 当指定data数据中type则精准从对应类型目录下获取

id: 代表id，物品具体映射表内标识
