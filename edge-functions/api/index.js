const ORIGIN_URL = 'https://assets.glow-prow.org.cn'
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
            '/items/shipUpgrades',
            '/items/weapons',
            '/items/weapons/longGuns',
            '/items/weapons/torpedos'
        ],
        commodities: ['/commodities'],
        cosmetics: ['/cosmetics'],
        damages: ['/damages'],
        factions: ['/factions'],
        materials: ['/materials'],
        modifications: ['/modifications'],
        npcs: ['/npcs'],
        ships: ['/ships'],
        treasureMaps: ['/treasureMaps'],
        ultimates: ['/ultimates']
    },
    extensions: ['.webp'],
    emptyImagePath: '/empty.webp' // 将空图片路径添加到配置中
};

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

async function getEmptyImageResponse(context) {
    try {
        // 正确构建空图片 URL
        const emptyImageUrl = `${ORIGIN_URL}${RESOURCE_CONFIG.emptyImagePath}`;

        console.log('正在获取空图片:', emptyImageUrl);

        const response = await fetch(emptyImageUrl);

        if (response.ok) {
            const imageData = await response.arrayBuffer();
            return new Response(imageData, {
                status: 200,
                headers: {
                    'Content-Type': response.headers.get('content-type') || 'image/webp',
                    'Cache-Control': 'public, max-age=3600', // 缓存1小时
                    'Access-Control-Allow-Origin': '*',
                }
            });
        }

        // 如果空图片不存在，创建一个 1x1 透明像素作为后备
        console.error('空图片未找到:', emptyImageUrl);
        return createTransparentPixelResponse();

    } catch (error) {
        console.error('获取空图片时出错:', error);
        // 终极后备方案 - 创建一个透明像素
        return createTransparentPixelResponse();
    }
}

// 创建一个 1x1 的透明 PNG 像素作为终极后备
function createTransparentPixelResponse() {
    // Base64 编码的 1x1 透明 PNG
    const transparentPixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const imageData = Uint8Array.from(atob(transparentPixel), c => c.charCodeAt(0));

    return new Response(imageData, {
        status: 200,
        headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=3600', // 缓存1小时
            'Access-Control-Allow-Origin': '*',
        }
    });
}

export default async function onRequestGet(context) {
    const {request} = context;
    const url = new URL(request.url);

    const category = url.searchParams.get('src');
    const id = url.searchParams.get('id');
    const debug = url.searchParams.get('debug');

    if (!category || !id) {
        return new Response('缺少 src 或 id 参数', {status: 400});
    }

    if (!RESOURCE_CONFIG.basePaths[category]) {
        return new Response(JSON.stringify({
            error: '无效的分类',
            message: `分类 "${category}" 未配置`,
            availableCategories: Object.keys(RESOURCE_CONFIG.basePaths)
        }), {
            status: 400,
            headers: {'Content-Type': 'application/json'}
        });
    }

    try {
        const decodedCategory = decodeURIComponent(category);
        const decodedId = decodeURIComponent(id);

        const patterns = generatePathPatterns(decodedCategory, decodedId);

        for (const pattern of patterns) {
            try {
                const imageUrl = new URL(pattern, ORIGIN_URL || url.origin);
                const response = await fetch(imageUrl);

                if (response.ok) {
                    if (debug) {
                        console.log('找到图片:', imageUrl.toString());
                    }

                    const contentType = response.headers.get('content-type');
                    const imageData = await response.arrayBuffer();

                    return new Response(imageData, {
                        status: 200,
                        headers: {
                            'Content-Type': contentType,
                            'Cache-Control': 'public, max-age=86400', // 缓存24小时
                            'Access-Control-Allow-Origin': '*',
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
