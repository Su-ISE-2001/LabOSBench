#!/bin/bash

# 启动 simulator 网站的脚本

echo "检查 Go 环境..."
if ! command -v go &> /dev/null; then
    echo "错误: 未找到 Go，请先安装 Go:"
    echo "  sudo apt install golang-go"
    exit 1
fi

echo "检查 go-bindata..."
if ! command -v go-bindata &> /dev/null; then
    echo "安装 go-bindata..."
    go install github.com/go-bindata/go-bindata/go-bindata@latest
    if [ $? -ne 0 ]; then
        echo "错误: 无法安装 go-bindata"
        exit 1
    fi
    # 确保 $GOPATH/bin 或 $HOME/go/bin 在 PATH 中
    export PATH=$PATH:$(go env GOPATH)/bin
fi

echo "打包静态资源..."
go-bindata --pkg htmlbind -o htmlbind/static.go static/...
if [ $? -ne 0 ]; then
    echo "错误: 静态资源打包失败"
    exit 1
fi

echo "编译程序..."
go build -o simulator
if [ $? -ne 0 ]; then
    echo "错误: 编译失败"
    exit 1
fi

echo "启动服务器..."
echo "注意: 程序将监听 80 端口，可能需要 root 权限"
echo "如果 80 端口被占用或没有权限，可以修改 simulator.go 中的端口号"
echo ""
sudo ./simulator

