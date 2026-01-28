export default async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);

  // 获取查询参数
  const src = url.searchParams.get('src'); // 目录，如 "items"
  const id = url.searchParams.get('id');   // 文件名，如 "123"
  const width = url.searchParams.get('width'); // 可选宽度

  // 验证必要的参数
  if (!src || !id) {
    return new Response(JSON.stringify({ error: 'Missing src or id parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // 构建文件路径 - 支持.webp和.png扩展名
    const imagePaths = [
      `${src}/${id}.webp`,
      `${src}/${id}.png`,
      `${src}/${id}.jpg`,
      `${src}/${id}.jpeg`
    ];

    let imageResponse;
    let contentType;

    // 尝试加载不同格式的图片
    for (const imagePath of imagePaths) {
      try {
        console.log(`Trying to fetch: ${imagePath}`);

        imageResponse = await fetch(new URL(`/${imagePath}`, url.origin));

        if (imageResponse && imageResponse.ok) {
          contentType = imageResponse.headers.get('content-type');
          console.log(`Found image: ${imagePath}, content-type: ${contentType}`);
          break;
        }
      } catch (e) {
        console.log(`Failed to fetch ${imagePath}:`, e.message);
        continue;
      }
    }

    if (!imageResponse || !imageResponse.ok) {
      console.log('All image formats failed for:', src, id);
      return new Response(JSON.stringify({
        error: 'Image not found',
        triedPaths: imagePaths
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 获取原始图片数据
    const originalImage = await imageResponse.arrayBuffer();

    // 如果指定了宽度，进行图片处理
    if (width && !isNaN(width) && parseInt(width) > 0) {
      try {
        return await resizeImageUsingPlatformAPI(originalImage, parseInt(width), contentType, request);
      } catch (error) {
        console.error('Image processing error:', error);
        // 处理失败时返回原始图片
        return new Response(originalImage, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400'
          }
        });
      }
    }

    // 如果没有指定宽度，返回原始图片
    return new Response(originalImage, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400'
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 图片处理函数
async function resizeImageUsingPlatformAPI(imageBuffer, width, contentType, request) {
  // 如果没有图片处理能力，返回原始图片
  return new Response(imageBuffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400'
    }
  });
}
