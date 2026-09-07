/**
 * 中间件
 * 转发边缘静态资源
 * by cabbagelol
 */

// 基本默认配置
const ORIGIN_URL = 'https://assets.glow-prow.top'
const TEST_URL = 'http://localhost:8088'

// 路径配置
const RESOURCE_CONFIG = {
    basePaths: {
        // ── AUTO_items 兜底（type 未知时并行竞速全部目录）──
        AUTO_items: [
            '/items',
            '/items/ammunitions',
            '/items/armors',
            '/items/chests',
            '/items/consumables',
            '/items/contracts',
            '/items/culverin',
            '/items/demicannon',
            '/items/ballista',
            '/items/bombard',
            '/items/mortar',
            '/items/rocket',
            '/items/seaFire',
            '/items/springloader',
            '/items/longGuns',
            '/items/torpedos',
            '/items/majorFurnitures',
            '/items/offensiveFurnitures',
            '/items/tools',
            '/items/utilityFurnitures',
            '/items/quests',
            '/ships/shipUpgrades',
        ],
        // ── items 精确子类型（来自 items.json 的全量 type，1次请求直接命中）──
        // 通用类
        ammunition: ['/items/ammunitions'],
        armor: ['/items/armors'],
        chest: ['/items/chests'],
        consumable: ['/items/consumables'],
        contract: ['/items/contracts'],
        quest: ['/items/quests'],
        tool: ['/items/tools'],
        // 家具类
        majorFurniture: ['/items/majorFurnitures'],
        offensiveFurniture: ['/items/offensiveFurnitures'],
        utilityFurniture: ['/items/utilityFurnitures'],
        // 武器类（各自独立目录）
        culverin: ['/items/culverin'],
        demicannon: ['/items/demicannon'],
        ballista: ['/items/ballista'],
        bombard: ['/items/bombard'],
        mortar: ['/items/mortar'],
        rocket: ['/items/rocket'],
        seaFire: ['/items/seaFire'],
        springloader: ['/items/springloader'],
        longGun: ['/items/longGuns'],
        torpedo: ['/items/torpedos'],
        // 船只类
        shipUpgrade: ['/ships/shipUpgrades'],

        // ── 其他独立分类 ──
        commodities: ['/commodities'],
        damages: ['/damages'],
        factions: ['/factions'],
        materials: ['/materials'],
        modifications: ['/modifications'],
        npcs: ['/npcs'],
        ships: ['/ships'],

        // ── treasureMaps 兜底与精确子分类 ──
        AUTO_treasureMaps: [
            '/treasureMaps/legendary',
            '/treasureMaps/old',
            '/treasureMaps/recent',
            '/treasureMaps/veryOld',
        ],
        'treasureMaps/legend': ['/treasureMaps/legendary'],
        'treasureMaps/old': ['/treasureMaps/old'],
        'treasureMaps/recent': ['/treasureMaps/recent'],
        'treasureMaps/veryOld': ['/treasureMaps/veryOld'],

        ultimates: ['/ultimates'],
        vanities: ['/vanities/cosmetics'],
        sets: ['/vanities/sets'],
        mastery: ['/mastery', '/mastery/information']
    },
    extensions: ['.webp'],
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
    allowEmptyReferer: true,
    // 缓存时间（秒）
    cacheTime: 21600,               // 6小时
    // 空图片缓存时间（秒）
    emptyImageCacheTime: 3600       // 1小时
};

function isDebug(env) {
    return (env.NODE_ENV || 'production') === 'development';
}

function getOriginURL(env) {
    if (isDebug(env)) return env.TARGET_TEST_DOMAIN || TEST_URL;
    return env.TARGET_DOMAIN || ORIGIN_URL;
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
function isRefererAllowed(request, env, clientIp) {
    const referer = request.headers.get('Referer');
    const allowedDomains = ANTI_LEECH_CONFIG.getAllowedDomains(env);

    // 调试模式跳过检查
    if (isDebug(env)) {
        return true;
    }

    // 允许空 Referer 或显式允许的情况
    if (!referer) {
        return true;
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
 * 生成安全响应头
 */
function getSecurityHeaders(request, env) {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Referer',
        'Access-Control-Max-Age': '86400',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Vary': 'Origin'
    };
}

/**
 * 获取空图片响应
 */
async function getEmptyImageResponse(request, env) {
    try {
        const emptyImageUrl = `${getOriginURL(env)}${RESOURCE_CONFIG.emptyImagePath}`;
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
        return createTransparentPixelResponse(request, env);

    } catch (error) {
        console.error('获取空图片时出错:', error);
        return createTransparentPixelResponse(request, env);
    }
}

/**
 * 创建透明像素响应
 */
function createTransparentPixelResponse(request, env) {
    // Base64 编码的 1x1 透明 PNG
    const transparentPixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const imageData = Uint8Array.from(atob(transparentPixel), c => c.charCodeAt(0));
    const securityHeaders = getSecurityHeaders(request, env);

    return new Response(imageData, {
        status: 200,
        headers: {
            ...securityHeaders,
            'Content-Type': 'image/png',
            'Cache-Control': `public, max-age=${ANTI_LEECH_CONFIG.emptyImageCacheTime}`,
        }
    });
}

/**
 * 并行竞速：同时发出所有路径请求，返回第一个成功的响应
 * 比串行快数倍，尤其对 items 类（13个路径 × 2种扩展名 = 26个候选）
 */
async function fetchImageParallel(patterns, originURL) {
    const fetchPromises = patterns.map(pattern => {
        const imageUrl = new URL(pattern, originURL);
        return fetch(imageUrl).then(response => {
            if (response.ok) return response;
            return Promise.reject(new Error(`HTTP ${response.status}: ${imageUrl}`));
        });
    });

    // Promise.any：第一个成功的就返回，全部失败才抛出 AggregateError
    return Promise.any(fetchPromises);
}

/**
 * 主请求处理函数
 */
export async function onRequestGet({ request, env, geo, clientIp }) {
    // 处理 OPTIONS 请求（CORS 预检）
    if (request.method === 'OPTIONS') {
        const securityHeaders = getSecurityHeaders(request, env);
        return new Response(null, {
            status: 204,
            headers: securityHeaders
        });
    }

    // 防盗链检查
    if (!isRefererAllowed(request, env, clientIp)) {
        const url = new URL(request.url);
        // 返回一个 1x1 透明像素或直接返回 403
        if (url.searchParams.get('strict') === 'true') {
            return new Response('禁止访问', {
                status: 403,
                headers: getSecurityHeaders(request, env)
            });
        }
        // 返回空图片（不会暴露真实资源）
        return await getEmptyImageResponse(request, env);
    }

    const url = new URL(request.url);
    const t = url.searchParams.get('t');
    const id = url.searchParams.get('id');
    const debug = url.searchParams.get('debug');

    if (!t || !id) {
        return new Response('缺少 t 或 id 参数', {
            status: 400,
            headers: getSecurityHeaders(request, env)
        });
    }

    const decodedCategory = decodeURIComponent(t);
    const decodedId = decodeURIComponent(id);

    if (!RESOURCE_CONFIG.basePaths[decodedCategory]) {
        return new Response(JSON.stringify({
            error: '无效的分类',
            message: `分类 "${decodedCategory}" 未配置`,
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
        const securityHeaders = getSecurityHeaders(request, env);

        // Promise.any 并行竞速 —— 所有路径同时请求，第一个成功就返回
        // 原来串行最坏需等待 N 次请求，现在只需等待最快的那一个
        const patterns = generatePathPatterns(decodedCategory, decodedId);
        const originURL = getOriginURL(env);

        try {
            const response = await fetchImageParallel(patterns, originURL);

            if (debug) console.log('并行竞速命中图片');

            const contentType = response.headers.get('content-type');
            const imageData = await response.arrayBuffer();

            return new Response(imageData, {
                status: 200,
                headers: {
                    ...securityHeaders,
                    'Content-Type': contentType,
                    'Cache-Control': `public, max-age=${ANTI_LEECH_CONFIG.cacheTime}`,
                }
            });

        } catch (e) {
            // Promise.any 全部失败 (AggregateError)，所有路径均无图片，返回空图片占位
            if (debug) console.log('所有路径均未找到图片，返回空图片');
            return await getEmptyImageResponse(request, env);
        }

    } catch (error) {
        console.error('处理请求时出错:', error);
        return await getEmptyImageResponse(request, env);
    }
}
