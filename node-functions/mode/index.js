/**
 * 藏宝图 CLIP 预计算特征访问接口
 */

// 基本默认配置
const ORIGIN_URL = 'https://assets.glow-prow.top';
const TEST_URL = 'http://localhost:8088';

const CATEGORY_MAP = {
    'legendary': '/treasureMaps/legendary/clip-vit-b-32.bin',
    'legend': '/treasureMaps/legendary/clip-vit-b-32.bin',
    'old': '/treasureMaps/old/clip-vit-b-32.bin',
    'recent': '/treasureMaps/recent/clip-vit-b-32.bin',
    'veryOld': '/treasureMaps/veryOld/clip-vit-b-32.bin',
    'all': '/treasureMaps/clip-vit-b-32.bin'
};

function isDebug(env) {
    return (env.NODE_ENV || 'production') === 'development';
}

function getOriginURL(env) {
    if (isDebug(env)) return env.TARGET_TEST_DOMAIN || TEST_URL;
    return env.TARGET_DOMAIN || ORIGIN_URL;
}

/**
 * 生成安全跨域响应头
 */
function getSecurityHeaders(request, env) {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Referer, Range',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
        'Access-Control-Max-Age': '86400',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Vary': 'Origin'
    };
}

/**
 * 解析二进制特征文件
 * @param {ArrayBuffer} buffer
 */
function parseClipBinary(buffer) {
    const magic = new TextDecoder().decode(new Uint8Array(buffer, 0, 4));
    if (magic !== 'CLIP') {
        throw new Error('Invalid CLIP binary format magic');
    }
    const view = new DataView(buffer);
    const version = view.getUint16(4, true);
    const dim = view.getUint16(6, true);
    const count = view.getUint32(8, true);
    const metaLen = view.getUint32(12, true);

    const metaBytes = new Uint8Array(buffer, 16, metaLen);
    const metaJsonStr = new TextDecoder('utf-8').decode(metaBytes);
    const metadata = JSON.parse(metaJsonStr);

    const floatOffset = 16 + metaLen;
    const floatArray = new Float32Array(buffer.slice(floatOffset));

    return {
        version,
        dim,
        count,
        metadata,
        embeddings: floatArray
    };
}

/**
 * 主请求处理函数
 */
export async function onRequestGet({ request, env, geo, clientIp }) {
    // OPTIONS 预检请求
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: getSecurityHeaders(request, env)
        });
    }

    const url = new URL(request.url);
    const category = (url.searchParams.get('category') || url.searchParams.get('t') || 'all').trim();
    const id = url.searchParams.get('id');
    const format = (url.searchParams.get('format') || 'bin').toLowerCase();
    const securityHeaders = getSecurityHeaders(request, env);

    // 确定对应的特征文件相对路径
    const relPath = CATEGORY_MAP[category] || CATEGORY_MAP['all'];
    const originURL = getOriginURL(env);
    const featureFileUrl = new URL(relPath, originURL);

    try {
        const response = await fetch(featureFileUrl);
        if (!response.ok) {
            return new Response(JSON.stringify({
                error: '特征文件未找到',
                path: relPath,
                status: response.status
            }), {
                status: 404,
                headers: {
                    'Content-Type': 'application/json',
                    ...securityHeaders
                }
            });
        }

        const buffer = await response.arrayBuffer();

        // 如果客户端请求 JSON 格式或查询特定 ID
        if (format === 'json' || id) {
            const parsed = parseClipBinary(buffer);

            // 按 ID 查询单个特征
            if (id) {
                const targetIndex = parsed.metadata.findIndex(m => m.id === id);
                if (targetIndex === -1) {
                    return new Response(JSON.stringify({
                        error: '未找到指定 ID 的特征',
                        id
                    }), {
                        status: 404,
                        headers: {
                            'Content-Type': 'application/json',
                            ...securityHeaders
                        }
                    });
                }

                const start = targetIndex * parsed.dim;
                const embedding = Array.from(parsed.embeddings.subarray(start, start + parsed.dim));
                return new Response(JSON.stringify({
                    id,
                    category: parsed.metadata[targetIndex].category,
                    dim: parsed.dim,
                    embedding
                }), {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'public, max-age=86400',
                        ...securityHeaders
                    }
                });
            }

            // 返回全部条目与向量结构
            const items = parsed.metadata.map((m, idx) => {
                const start = idx * parsed.dim;
                return {
                    ...m,
                    embedding: Array.from(parsed.embeddings.subarray(start, start + parsed.dim))
                };
            });

            return new Response(JSON.stringify({
                model: 'openai/clip-vit-base-patch32',
                dim: parsed.dim,
                count: parsed.count,
                category,
                items
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'public, max-age=86400',
                    ...securityHeaders
                }
            });
        }

        // 默认直接返回二进制特征流
        return new Response(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Length': buffer.byteLength.toString(),
                'Cache-Control': 'public, max-age=86400',
                ...securityHeaders
            }
        });

    } catch (error) {
        console.error('获取或解析 CLIP 特征出错:', error);
        return new Response(JSON.stringify({
            error: '内部服务错误',
            message: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                ...securityHeaders
            }
        });
    }
}
