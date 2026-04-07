#!/bin/bash
set -e

COMPOSE_PROJECT=$(basename "$(pwd)")
IMAGE_NAME="${COMPOSE_PROJECT}-backend"

echo "==> [1/5] 清理本地未提交的修改..."
git checkout -- .
git clean -fd

echo "==> [2/5] 拉取最新 main 分支..."
git fetch origin main
git checkout main
git reset --hard origin/main

echo "==> [3/5] 构建新镜像..."
docker compose build --no-cache

echo "==> [4/5] 启动新容器..."
docker compose up -d

echo "==> [5/5] 清理旧镜像（dangling）..."
docker image prune -f

echo ""
echo "✓ 部署完成。当前运行容器："
docker compose ps
