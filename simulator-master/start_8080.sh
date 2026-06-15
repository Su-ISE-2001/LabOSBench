#!/bin/bash

# 启动 simulator 网站（使用 8080 端口，无需 root 权限）

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
    export PATH=$PATH:$(go env GOPATH)/bin
fi

echo "打包静态资源..."
go-bindata --pkg htmlbind -o htmlbind/static.go static/...
if [ $? -ne 0 ]; then
    echo "错误: 静态资源打包失败"
    exit 1
fi

echo "编译程序（使用 8080 端口）..."
# 临时修改端口为 8080
sed -i 's/:80/:8080/g' simulator.go
go build -o simulator
# 恢复原文件
git checkout simulator.go 2>/dev/null || sed -i 's/:8080/:80/g' simulator.go

if [ $? -ne 0 ]; then
    echo "错误: 编译失败"
    exit 1
fi

echo "启动服务器..."
echo "服务器将在 http://localhost:8080 启动"
echo ""
./simulator

