#!/bin/bash
# 批量转换所有子文件夹中的 PNG 到 WebP
# 排除 .idea 和 .edgeone 目录

echo "开始转换 PNG → WebP（排除 .idea 和 .edgeone 目录）"
echo "----------------------------------------"

converted=0
skipped=0
error=0

# 使用 find 递归查找，排除指定目录
while IFS= read -r -d '' img; do
    # 检查文件是否存在（安全处理）
    if [ ! -f "$img" ]; then
        continue
    fi

    # 跳过排除目录中的文件（双重保障）
    if [[ "$img" == *"/.idea/"* ]] || [[ "$img" == *"/.edgeone/"* ]]; then
        echo "⏭️  跳过: $img (在排除目录中)"
        ((skipped++))
        continue
    fi

    # 生成输出文件名
    filename="${img%.*}"
    output="${filename}.webp"

    echo "🔄 转换: $img → ${output}"

    # 执行转换（-quiet 减少输出，-q 80 质量参数）
    if cwebp -q 80 -quiet "$img" -o "$output"; then
        echo "✅ 完成: $output"
        ((converted++))
    else
        echo "❌ 失败: $img"
        ((error++))
    fi

done < <(find . -type f -name "*.png" -print0)

echo "----------------------------------------"
echo "转换统计："
echo "  成功: $converted 个文件"
echo "  跳过: $skipped 个文件（在排除目录中）"
echo "  失败: $error 个文件"
echo "转换完成！"
