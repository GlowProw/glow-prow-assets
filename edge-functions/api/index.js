/**
 * 配置资源根目录
 * @type {{basePaths: string[], extensions: string[]}}
 */
const RESOURCE_CONFIG = {
    basePaths: {
        items: ['/items', '/items/ammunitions', '/items/armors', '/items/chests', '/items/consumables', '/items/majorFurnitures', '/items/offensiveFurnitures', '/items/tools', '/items/utilityFurnitures', '/items/weapons'],
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
    extensions: ['.webp', '.png'],
};

/**
 * 生成所有可能的路径模式
 * @param category
 * @param id
 * @param config
 * @returns {*[]}
 */
function generatePathPatterns(category, id, config = RESOURCE_CONFIG) {
    const patterns = [];
    const basePaths = config.basePaths[category] || [];

    for (const basePath of basePaths) {
        for (const ext of config.extensions) {
            // 模式1: basePath/id.ext
            patterns.push(`${basePath}/${id}${ext}`);
            // 模式2: 如果 id 已经是完整路径，也可能没有 basePath
            patterns.push(`/${id}${ext}`);
        }
    }

    return patterns;
}

/**
 * 获取空图片响应
 * @param context
 * @returns {Promise<Response>}
 */
async function getEmptyImageResponse(context) {
    const { request } = context;
    const url = new URL(request.url);
    const emptyImageUrl = new URL('/empty.png', url.origin);
    const response = await fetch(emptyImageUrl);

    if (response.ok) {
        const imageData = await response.arrayBuffer();
        return new Response(imageData, {
            status: 200,
            headers: {
                'Content-Type': response.headers.get('content-type') || 'image/png',
                'Cache-Control': 'public, max-age=86400'
            }
        });
    }

    // 如果 empty.png 也不存在，返回404
    return new Response('Empty image not found', { status: 404 });
}

export default async function onRequestGet(context) {
    const {request} = context;
    const url = new URL(request.url);

    const category = url.searchParams.get('src');
    const id = url.searchParams.get('id');

    if (!category || !id) {
        return new Response('Missing src or id parameter', {status: 400});
    }

    // 检查分类是否有效
    if (!RESOURCE_CONFIG.basePaths[category]) {
        return new Response(JSON.stringify({
            error: 'Invalid category',
            message: `Category "${category}" is not configured`,
            availableCategories: Object.keys(RESOURCE_CONFIG.basePaths)
        }), {
            status: 400,
            headers: {'Content-Type': 'application/json'}
        });
    }

    try {
        const decodedCategory = decodeURIComponent(category);
        const decodedId = decodeURIComponent(id);

        // 生成所有可能的路径
        const patterns = generatePathPatterns(decodedCategory, decodedId);

        console.log(`Looking for: ${decodedCategory}/${decodedId}`);
        console.log('Patterns:', patterns);

        // 并行尝试所有模式（更快）
        const fetchPromises = patterns.map(async (pattern) => {
            try {
                const imageUrl = new URL(pattern, url.origin);
                const response = await fetch(imageUrl);

                if (response.ok) {
                    return {
                        success: true,
                        response: response,
                        path: pattern
                    };
                }
            } catch (e) {
                // 忽略错误，继续其他尝试
            }
            return {success: false};
        });

        // 等待所有尝试完成
        const results = await Promise.all(fetchPromises);
        const successful = results.find(result => result.success);

        if (successful) {
            const contentType = successful.response.headers.get('content-type');
            const imageData = await successful.response.arrayBuffer();

            console.log(`Successfully found at: ${successful.path}`);

            return new Response(imageData, {
                status: 200,
                headers: {
                    'Content-Type': contentType,
                    'Cache-Control': 'public, max-age=86400'
                }
            });
        }

        // 额外尝试：如果 id 已经是完整路径
        const extraPatterns = [];
        for (const ext of RESOURCE_CONFIG.extensions) {
            extraPatterns.push(`/${decodedId}${ext}`);
        }

        for (const pattern of extraPatterns) {
            try {
                const imageUrl = new URL(pattern, url.origin);
                const response = await fetch(imageUrl);

                if (response.ok) {
                    const contentType = response.headers.get('content-type');
                    const imageData = await response.arrayBuffer();

                    return new Response(imageData, {
                        status: 200,
                        headers: {
                            'Content-Type': contentType,
                            'Cache-Control': 'public, max-age=86400'
                        }
                    });
                }
            } catch (e) {
                continue;
            }
        }

        // 所有尝试都失败，返回 /empty.png
        console.log(`Image not found for ${decodedCategory}/${decodedId}, returning /empty.png`);
        return await getEmptyImageResponse(context);

    } catch (error) {
        console.error('Error:', error);
        // 发生错误时也返回 /empty.png
        return await getEmptyImageResponse(context);
    }
}
