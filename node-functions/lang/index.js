/**
 * 翻译文本 CDN 接口
 * 从 lang.glow-prow.top 提供 glow-prow-data-languages 翻译 JSON 资源
 * by cabbagelol
 */

const ORIGIN_URL = 'https://lang.glow-prow.top';

// 支持的语言列表
const SUPPORTED_LOCALES = ['zh_CN', 'zh_TW', 'en_US'];

// 各语言下可访问的翻译分类文件
const CATEGORY_FILES = [
    'ships',
    'items',
    'items_ammunition',
    'commodities',
    'calendar',
    'materials',
    'factions',
    'modifications',
    'perks',
    'seasons',
    'locations',
    'ultimates',
    'ranks',
    'cosmetics',
    'events',
    'worldEvents',
    'empireSkills',
    'mapLocations',
    'sets',
    'regions',
    'territories',
    'npcs',
    'enemies',
    'treasureMaps',
    'zones',
    'masterys',
    'quest',
    'map'
];

function getOriginURL(env) {
    return ORIGIN_URL;
}

function getCorsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept-Language',
        'Access-Control-Max-Age': '86400',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Vary': 'Origin'
    };
}

function jsonResponse(data, status = 200, extra = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
            ...getCorsHeaders(),
            ...extra
        }
    });
}

/**
 * 主请求处理函数
 * GET /lang?locale=zh_CN&category=ships[&key=someKey]
 */
export async function onRequestGet({request, env}) {
    if (request.method === 'OPTIONS') {
        return new Response(null, {status: 204, headers: getCorsHeaders()});
    }

    const url = new URL(request.url);
    const locale = url.searchParams.get('locale') || 'zh_CN';
    const category = url.searchParams.get('category');
    const key = url.searchParams.get('key');

    // 校验 locale
    if (!SUPPORTED_LOCALES.includes(locale)) {
        return jsonResponse({
            error: '不支持的语言',
            message: `locale "${locale}" 不在支持列表中`,
            supportedLocales: SUPPORTED_LOCALES
        }, 400);
    }

    // 如果没有 category，返回所有分类列表
    if (!category) {
        return jsonResponse({
            locale,
            categories: CATEGORY_FILES
        });
    }

    // 校验 category
    if (!CATEGORY_FILES.includes(category)) {
        return jsonResponse({
            error: '无效的翻译分类',
            message: `category "${category}" 未配置`,
            availableCategories: CATEGORY_FILES
        }, 400);
    }

    const originURL = getOriginURL(env);
    const fileUrl = `${originURL}/src/data/${locale}/${category}.json`;

    try {
        console.log('[path]:', fileUrl)
        const response = await fetch(fileUrl);

        if (!response.ok) {
            return jsonResponse({
                error: '翻译文件未找到',
                locale,
                category,
                status: response.status
            }, 404);
        }

        const data = await response.json();

        // 如果指定了 key，只返回该 key 对应的翻译值
        if (key) {
            if (!(key in data)) {
                return jsonResponse({
                    error: '翻译键不存在',
                    locale,
                    category,
                    key
                }, 404);
            }
            return jsonResponse({locale, category, key, value: data[key]});
        }

        return jsonResponse({locale, category, data});

    } catch (error) {
        return jsonResponse({
            error: '内部服务错误',
            message: error.message
        }, 500);
    }
}
