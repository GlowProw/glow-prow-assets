/**
 * 中间件
 * 转发边缘静态资源
 * by cabbagelol
 */

// 基本配置
const ORIGIN_URL = 'https://assets.glow-prow.org.cn'
const TEST_URL = 'http://localhost:8088'

// 路径配置
const RESOURCE_CONFIG = {
    basePaths: {
        items: [
            '/items',
            '/items/ammunitions',
            '/items/armors',
            '/items/chests',
            '/items/consumables',
            '/items/majorFurnitures',
            '/items/offensiveFurnitures',
            '/items/tools',
            '/items/utilityFurnitures',
            '/ships/shipUpgrades',
            '/items/weapons',
            '/items/weapons/longGuns',
            '/items/weapons/torpedos',
        ],
        commodities: ['/commodities'],
        cosmetics: ['/cosmetics'],
        damages: ['/damages'],
        factions: ['/factions'],
        materials: ['/materials'],
        modifications: ['/modifications'],
        npcs: ['/npcs'],
        ships: ['/ships', '/ships/shipUpgrades'],
        treasureMaps: [
            '/treasureMaps/legendary',
            '/treasureMaps/old',
            '/treasureMaps/recent',
            '/treasureMaps/veryOld',
        ],
        ultimates: ['/ultimates']
    },
    extensions: ['.webp', '.png'],
    emptyImagePath: '/empty.webp'
};

// 速率配置
const ANTI_LEECH_CONFIG = {
    // 允许的域名列表（从环境变量读取）
    getAllowedDomains: (env) => {
        const domains = env.ALLOW_DOMAIN || 'glow-prow.org.cn,glow-prow.top';
        return domains.split(',').map(d => d.trim());
    },
    // 允许空 Referer（直接访问）
    allowEmptyReferer: false,
    // 缓存时间（秒）
    cacheTime: 86400, // 24小时
    // 空图片缓存时间（秒）
    emptyImageCacheTime: 3600, // 1小时
    // 速率限制配置
    rateLimit: {
        enabled: true,
        windowMs: 60 * 1000, // 1分钟窗口
        maxRequests: 100, // 每个IP每分钟最多100次请求
        cacheSize: 1000 // 最多缓存1000个IP的计数
    }
};

// 简单的内存缓存用于速率限制
const rateLimitCache = new Map();

function isDebug(context) {
    const {env} = context;
    console.log('env:', env.NODE_ENV)
    return (env.NODE_ENV || 'production') === 'development';
}

function getOriginURL(context) {
    if (isDebug(context)) return TEST_URL;
    return ORIGIN_URL;
}

function generatePathPatterns(category, id, config = RESOURCE_CONFIG) {
    const patterns = [];
    const basePaths = config.basePaths[category] || [];

    for (const basePath of basePaths) {
        for (const ext of config.extensions) {
            patterns.push(`${basePath}/${id}${ext}`);
        }
    }

    return [...new Set(patterns)];
}

/**
 * 检查 Referer 是否允许访问
 */
function isRefererAllowed(request, env) {
    const referer = request.headers.get('Referer');
    const allowedDomains = ANTI_LEECH_CONFIG.getAllowedDomains(env);

    // 调试模式跳过检查
    if (isDebug({env})) {
        return true;
    }

    // 允许空 Referer 的情况
    if (!referer && ANTI_LEECH_CONFIG.allowEmptyReferer) {
        return true;
    }

    // 如果没有 Referer 且不允许空 Referer，拒绝访问
    if (!referer) {
        console.log('防盗链: 拒绝空 Referer 的请求');
        return false;
    }

    try {
        const refererUrl = new URL(referer);
        const refererHost = refererUrl.hostname;

        // 检查是否在允许的域名列表中
        const isAllowed = allowedDomains.some(domain => {
            // 支持子域名匹配（例如 .glow-prow.org.cn 匹配所有子域名）
            if (domain.startsWith('.')) {
                return refererHost.endsWith(domain) || refererHost === domain.substring(1);
            }
            return refererHost === domain;
        });

        if (!isAllowed) {
            console.log(`防盗链: 拒绝来自 ${refererHost} 的请求`);
        }

        return isAllowed;
    } catch (e) {
        console.error('解析 Referer 失败:', e);
        return false;
    }
}

/**
 * 速率限制检查
 */
function checkRateLimit(clientIp) {
    if (!ANTI_LEECH_CONFIG.rateLimit.enabled) {
        return {allowed: true};
    }

    const now = Date.now();
    const windowMs = ANTI_LEECH_CONFIG.rateLimit.windowMs;
    const maxRequests = ANTI_LEECH_CONFIG.rateLimit.maxRequests;

    // 获取该IP的请求记录
    let record = rateLimitCache.get(clientIp);

    // 如果没有记录或记录已过期，创建新记录
    if (!record || now - record.windowStart > windowMs) {
        record = {
            windowStart: now,
            count: 1
        };
        rateLimitCache.set(clientIp, record);
        return {allowed: true};
    }

    // 检查是否超过限制
    if (record.count >= maxRequests) {
        return {
            allowed: false,
            retryAfter: Math.ceil((record.windowStart + windowMs - now) / 1000)
        };
    }

    // 增加计数
    record.count++;
    return {allowed: true};
}

/**
 * 清理过期的速率限制记录
 */
function cleanupRateLimitCache() {
    const now = Date.now();
    const windowMs = ANTI_LEECH_CONFIG.rateLimit.windowMs;

    for (const [ip, record] of rateLimitCache.entries()) {
        if (now - record.windowStart > windowMs) {
            rateLimitCache.delete(ip);
        }
    }

    // 如果缓存太大，删除最旧的记录
    if (rateLimitCache.size > ANTI_LEECH_CONFIG.rateLimit.cacheSize) {
        const entries = Array.from(rateLimitCache.entries());
        entries.sort((a, b) => a[1].windowStart - b[1].windowStart);
        const toDelete = entries.slice(0, entries.length - ANTI_LEECH_CONFIG.rateLimit.cacheSize);
        toDelete.forEach(([ip]) => rateLimitCache.delete(ip));
    }
}

/**
 * 生成防盗链响应头
 */
function getSecurityHeaders(request, env) {
    const allowedDomains = ANTI_LEECH_CONFIG.getAllowedDomains(env);

    return {
        'Access-Control-Allow-Origin': allowedDomains.join(', '),
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Referer',
        'Access-Control-Max-Age': '86400',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
    };
}

async function getEmptyImageResponse(context) {
    try {
        const {request, env} = context;
        const emptyImageUrl = `${getOriginURL(context)}${RESOURCE_CONFIG.emptyImagePath}`;
        const response = await fetch(emptyImageUrl);

        if (response.ok) {
            const imageData = await response.arrayBuffer();
            const securityHeaders = getSecurityHeaders(request, env);

            return new Response(imageData, {
                status: 200,
                headers: {
                    ...securityHeaders,
                    'Content-Type': response.headers.get('content-type') || 'image/webp',
                    'Cache-Control': `public, max-age=${ANTI_LEECH_CONFIG.emptyImageCacheTime}`,
                }
            });
        }

        console.error('空图片未找到:', emptyImageUrl);
        return createTransparentPixelResponse(context);

    } catch (error) {
        console.error('获取空图片时出错:', error);
        return createTransparentPixelResponse(context);
    }
}

function createTransparentPixelResponse(context) {
    // Base64 编码的 1x1 透明 PNG
    const transparentPixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const imageData = Uint8Array.from(atob(transparentPixel), c => c.charCodeAt(0));
    const securityHeaders = getSecurityHeaders(context.request, context.env);

    return new Response(imageData, {
        status: 200,
        headers: {
            ...securityHeaders,
            'Content-Type': 'image/png',
            'Cache-Control': `public, max-age=${ANTI_LEECH_CONFIG.emptyImageCacheTime}`,
        }
    });
}

export async function onRequestGet(context) {
    const {request, env, clientIp, geo} = context;
    const url = new URL(request.url);

    // 定期清理速率限制缓存
    cleanupRateLimitCache();

    // 处理 OPTIONS 请求（CORS 预检）
    if (request.method === 'OPTIONS') {
        const securityHeaders = getSecurityHeaders(request, env);
        return new Response(null, {
            status: 204,
            headers: securityHeaders
        });
    }

    // 速率限制检查
    if (clientIp) {
        const rateLimitResult = checkRateLimit(clientIp);
        if (!rateLimitResult.allowed) {
            return new Response('请求过于频繁，请稍后再试', {
                status: 429,
                headers: {
                    'Retry-After': rateLimitResult.retryAfter.toString(),
                    ...getSecurityHeaders(request, env)
                }
            });
        }
    }

    // 防盗链检查
    if (!isRefererAllowed(request, env)) {
        // 返回一个 1x1 透明像素或直接返回 403
        if (url.searchParams.get('strict') === 'true') {
            return new Response('禁止访问', {
                status: 403,
                headers: getSecurityHeaders(request, env)
            });
        }
        // 返回空图片（不会暴露真实资源）
        return await getEmptyImageResponse(context);
    }

    const category = url.searchParams.get('src');
    const id = url.searchParams.get('id');
    const debug = url.searchParams.get('debug');

    if (!category || !id) {
        return new Response('缺少 src 或 id 参数', {
            status: 400,
            headers: getSecurityHeaders(request, env)
        });
    }

    if (!RESOURCE_CONFIG.basePaths[category]) {
        return new Response(JSON.stringify({
            error: '无效的分类',
            message: `分类 "${category}" 未配置`,
            availableCategories: Object.keys(RESOURCE_CONFIG.basePaths)
        }), {
            status: 400,
            headers: {
                'Content-Type': 'application/json',
                ...getSecurityHeaders(request, env)
            }
        });
    }

    try {
        const decodedCategory = decodeURIComponent(category);
        const decodedId = decodeURIComponent(id);

        const patterns = generatePathPatterns(decodedCategory, decodedId);

        for (const pattern of patterns) {
            try {
                const imageUrl = new URL(pattern, getOriginURL(context));
                const response = await fetch(imageUrl);

                if (response.ok) {
                    if (debug) {
                        console.log('找到图片:', imageUrl.toString());
                    }

                    const contentType = response.headers.get('content-type');
                    const imageData = await response.arrayBuffer();
                    const securityHeaders = getSecurityHeaders(request, env);

                    return new Response(imageData, {
                        status: 200,
                        headers: {
                            ...securityHeaders,
                            'Content-Type': contentType,
                            'Cache-Control': `public, max-age=${ANTI_LEECH_CONFIG.cacheTime}`,
                        }
                    });
                }
            } catch (e) {
                console.error('获取图片时出错:', e);
                continue;
            }
        }

        // 所有路径都失败，返回空图片
        return await getEmptyImageResponse(context);
    } catch (error) {
        console.error('处理请求时出错:', error);
        return await getEmptyImageResponse(context);
    }
}
