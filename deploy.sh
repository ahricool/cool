#!/bin/bash
set -e

echo "==> [1/4] 清理本地未提交的修改..."
git checkout -- .
git clean -fd

echo "==> [2/4] 拉取最新 main 分支..."
git fetch origin main
git checkout main
git reset --hard origin/main

echo "==> [3/4] 拉取最新镜像..."
docker compose pull

echo "==> [4/4] 启动新容器..."
docker compose up -d

docker image prune -f

echo ""
echo "✓ 部署完成。当前运行容器："
docker compose ps
