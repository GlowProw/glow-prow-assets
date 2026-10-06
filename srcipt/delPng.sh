#!/bin/bash
# 安全删除所有 PNG 文件（排除 .idea 和 .edgeone 目录）

echo "🔍 正在扫描 PNG 文件（排除 .idea 和 .edgeone 目录）..."
echo "----------------------------------------"

# 先列出所有要删除的文件（预览模式）
echo "📋 找到以下 PNG 文件："
count=0
while IFS= read -r -d '' img; do
    if [[ "$img" != *"/.idea/"* ]] && [[ "$img" != *"/.edgeone/"* ]]; then
        echo "  $img"
        ((count++))
    fi
done < <(find . -type f -name "*.png" -print0)

echo "----------------------------------------"
echo "总计找到 $count 个 PNG 文件"

if [ $count -eq 0 ]; then
    echo "没有找到 PNG 文件，退出。"
    exit 0
fi

# 请求确认
echo ""
read -p "⚠️  确定要删除这些 $count 个 PNG 文件吗？(y/N): " confirm

if [[ "$confirm" != "y" ]] && [[ "$confirm" != "Y" ]]; then
    echo "操作已取消"
    exit 0
fi

# 执行删除
echo ""
echo "🗑️  开始删除..."
deleted=0
skipped=0

while IFS= read -r -d '' img; do
    if [[ "$img" == *"/.idea/"* ]] || [[ "$img" == *"/.edgeone/"* ]]; then
        echo "⏭️  跳过: $img (在排除目录中)"
        ((skipped++))
        continue
    fi

    echo "🗑️  删除: $img"
    if rm "$img"; then
        ((deleted++))
    else
        echo "❌ 删除失败: $img"
    fi
done < <(find . -type f -name "*.png" -print0)

echo "----------------------------------------"
echo "删除统计："
echo "  已删除: $deleted 个文件"
echo "  已跳过: $skipped 个文件（在排除目录中）"
echo "操作完成！"
