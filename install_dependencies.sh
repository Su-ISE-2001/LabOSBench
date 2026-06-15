#!/bin/bash

# XRD Benchmark 依赖安装脚本
# 安装所有必需的依赖

echo "=========================================="
echo "安装 Benchmark 依赖"
echo "=========================================="
echo ""

# 切换到项目根目录（脚本可在任意位置通过 bash install_dependencies.sh 调用）
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${ROOT}"

if [ ! -d "OSWorld-main" ]; then
    echo "错误: 未找到 OSWorld-main 目录"
    echo "请在项目根目录运行: bash install_dependencies.sh"
    exit 1
fi

# 1. 安装 OSWorld 依赖
echo "步骤 1/3: 安装 OSWorld 依赖..."
cd "${ROOT}/OSWorld-main"
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo "警告: 部分依赖安装可能失败，继续..."
    fi
else
    echo "警告: 未找到 requirements.txt"
fi

# 2. 安装 playwright 和浏览器驱动
echo ""
echo "步骤 2/3: 安装 playwright 和浏览器驱动..."
pip install playwright
if [ $? -eq 0 ]; then
    playwright install chromium
    echo "✅ Playwright 安装完成"
    echo ""
    echo "若在 Linux 上启动 Chromium 报 libatk / .so 缺失，请安装系统依赖（需 sudo）："
    echo "  playwright install-deps"
else
    echo "❌ Playwright 安装失败"
fi

# 3. 安装其他可能缺失的依赖
echo ""
echo "步骤 3/3: 安装其他依赖..."
pip install pydrive

echo ""
echo "=========================================="
echo "依赖安装完成！"
echo "=========================================="
echo ""
echo "如果还有缺失的依赖，请运行："
echo "  pip install <package_name>"
echo ""
echo "或者安装完整的 OSWorld 依赖："
echo "  cd OSWorld-main && pip install -r requirements.txt"

