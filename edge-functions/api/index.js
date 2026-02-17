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
    extensions: ['.webp'],
};

function generatePathPatterns(category, id, config = RESOURCE_CONFIG) {
    const patterns = [];
    const basePaths = config.basePaths[category] || [];

    for (const basePath of basePaths) {
        for (const ext of config.extensions) {
            patterns.push(`${basePath}/${id}${ext}`);
            patterns.push(`/${id}${ext}`);
        }
    }

    return patterns;
}

async function getEmptyImageResponse(context) {
    const url = new URL('https://assets.glow-prow.org.cn');
    const emptyImageUrl = new URL('/empty.webp', url);
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

    return new Response('Empty image not found', {status: 404});
}

export default async function onRequestGet(context) {
    const {request} = context;
    const url = new URL(request.url);

    const category = url.searchParams.get('src');
    const id = url.searchParams.get('id');

    if (!category || !id) {
        return new Response('Missing src or id parameter', {status: 400});
    }

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

        const patterns = generatePathPatterns(decodedCategory, decodedId);

        console.log(`Looking for: ${decodedCategory}/${decodedId}`);
        console.log('Patterns:', patterns);

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
            }
            return {success: false};
        });

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

        console.log(`Image not found for ${decodedCategory}/${decodedId}, returning /empty.png`);
        return await getEmptyImageResponse(context);

    } catch (error) {
        console.error('Error:', error);
        return await getEmptyImageResponse(context);
    }
}
