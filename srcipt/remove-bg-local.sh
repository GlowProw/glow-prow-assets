#!/bin/bash
# 批量去除图片背景（使用本地 rembg）
# 支持格式: png, jpg, jpeg, webp
# 排除 .idea 和 .edgeone 目录

echo "🎨 开始批量去除图片背景（本地 AI）"
echo "----------------------------------------"

# 配置
INPUT_DIR="."                    # 当前目录，也可改为特定路径
OUTPUT_SUFFIX="_nobg"            # 输出文件后缀（rembg 默认会生成 *_nobg.png）
ALLOWED_EXTS=("png" "jpg" "jpeg" "webp")  # 处理的格式
EXCLUDE_DIRS=(".idea" ".edgeone")         # 排除的目录

# 计数器
processed=0
skipped=0
error=0

# 检查 rembg 是否可用
if ! command -v rembg &> /dev/null; then
    echo "❌ 错误：未找到 rembg 命令"
    echo "请安装：pip install rembg"
    exit 1
fi

# 构建 find 命令的排除条件
exclude_pattern=""
for dir in "${EXCLUDE_DIRS[@]}"; do
    if [ -z "$exclude_pattern" ]; then
        exclude_pattern="-name $dir"
    else
        exclude_pattern="$exclude_pattern -o -name $dir"
    fi
done

# 递归处理图片
for ext in "${ALLOWED_EXTS[@]}"; do
    while IFS= read -r -d '' img; do
        # 检查文件是否存在
        if [ ! -f "$img" ]; then
            continue
        fi

        # 跳过排除目录中的文件
        skip=false
        for dir in "${EXCLUDE_DIRS[@]}"; do
            if [[ "$img" == *"/$dir/"* ]]; then
                echo "⏭️  跳过: $img (在 $dir 目录中)"
                ((skipped++))
                skip=true
                break
            fi
        done
        if [ "$skip" = true ]; then
            continue
        fi

        # rembg 默认输出为 PNG 格式，输出文件名为 原文件名_nobg.png
        # 获取不带扩展名的文件名
        basename="${img%.*}"
        output="${basename}${OUTPUT_SUFFIX}.png"

        echo "🔄 处理: $img → $output"

        # 执行 rembg 命令
        if rembg i "$img" "$output" 2>/dev/null; then
            echo "✅ 完成: $output"
            ((processed++))
        else
            echo "❌ 失败: $img"
            ((error++))
        fi

    done < <(find "$INPUT_DIR" -type f -iname "*.$ext" -print0)
done

echo "----------------------------------------"
echo "处理统计："
echo "  成功: $processed 个文件"
echo "  跳过: $skipped 个文件（在排除目录中）"
echo "  失败: $error 个文件"
echo "✨ 所有背景移除完成！"
