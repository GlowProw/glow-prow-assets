const DEBUG = true
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
    const url = new URL(ORIGIN_URL);
    const emptyImageUrl = new URL('/empty.webp', url);
    const response = await fetch(emptyImageUrl);

    if (response.ok) {
        const imageData = await response.arrayBuffer();
        return new Response(imageData, {
            status: 200,
            headers: {
                'Content-Type': response.headers.get('content-type') || 'image/png',
                'Cache-Control': `public, max-age=${30 * 60000}`
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

        for (const pattern of patterns) {
            try {
                const imageUrl = new URL(pattern, DEBUG ? ORIGIN_URL : url.origin);
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

        return await getEmptyImageResponse(context);
    } catch (error) {
        return await getEmptyImageResponse(context);
    }
}
