// 配置你的资源根目录
const RESOURCE_CONFIG = {
    basePaths: [
        '/items', '/items/ammunitions', '/items/armors', '/items/chests', '/items/consumables', '/items/majorFurnitures', '/items/offensiveFurnitures', '/items/tools', '/items/utilityFurnitures', '/items/weapons',
        '/commodities',
        '/cosmetics',
        '/damages',
        '/factions',
        '/materials',
        '/modifications',
        '/npcs',
        '/ships',
        '/treasureMaps',
        '/ultimates'
    ],
    extensions: ['.webp', '.png', '.jpg', '.jpeg'],
    // 可以添加更多配置
};

// 生成所有可能的路径模式
function generatePathPatterns(src, config = RESOURCE_CONFIG) {
    const patterns = [];

    for (const basePath of config.basePaths) {
        for (const ext of config.extensions) {
            // 模式1: basePath/src.ext
            patterns.push(`${basePath}/${src}${ext}`);
            // 模式2: 如果 src 已经是完整路径，也可能没有 basePath
            patterns.push(`/${src}${ext}`);
        }
    }

    return patterns;
}

export default async function onRequestGet(context) {
    const {request} = context;
    const url = new URL(request.url);

    const src = url.searchParams.get('src');
    const width = url.searchParams.get('width');

    if (!src) {
        return new Response('Missing src parameter', {status: 400});
    }

    try {
        const decodedSrc = decodeURIComponent(src);

        // 生成所有可能的路径
        const patterns = generatePathPatterns(decodedSrc);

        console.log(`Looking for: ${decodedSrc}`);
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

        // 额外尝试：如果 src 不包含扩展名，但文件可能有扩展名
        const extraPatterns = generatePathPatterns(`${decodedSrc}/${decodedSrc.split('/').pop()}`);
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

        return new Response(JSON.stringify({
            error: 'Image not found',
            message: `Could not find ${decodedSrc} in any configured location`,
            config: {
                basePaths: RESOURCE_CONFIG.basePaths,
                extensions: RESOURCE_CONFIG.extensions
            }
        }), {
            status: 404,
            headers: {'Content-Type': 'application/json'}
        });

    } catch (error) {
        console.error('Error:', error);
        return new Response('Internal server error', {status: 500});
    }
}
