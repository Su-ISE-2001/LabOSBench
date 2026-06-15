#!/usr/bin/env bash
# 删除 OSWorld-main 中仪器评测不需要的模块，减小发布体积。
# 用法: bash scripts/prune_osworld_for_release.sh [--dry-run]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OSW="${ROOT}/OSWorld-main"
DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

if [[ ! -d "${OSW}/mm_agents" ]]; then
  echo "ERROR: ${OSW}/mm_agents not found"
  exit 1
fi

# mm_agents 下可安全删除的目录（Web 仪器评测 + OpenAI 公开路径不依赖）
REMOVE_DIRS=(
  maestro
  uipath
  mobileagent_v3
  autoglm
  autoglm_v
  aworldguiagent
  anthropic
  opencua
  evocua
  dart_gui
  llm_server
  gui_som
  surferH
  kimi
  seed_agent
)

# 可删除的单文件 agent（保留 openai/o3/uitars/os_symphony/coact 相关）
REMOVE_FILES=(
  mano_agent.py
  dart_gui_agent.py
)

# 顶层目录（非 Web Playwright 评测必需）
REMOVE_TOP=(
  monitor
  assets
)

remove_path() {
  local p="$1"
  if [[ ! -e "${p}" ]]; then
    return
  fi
  if [[ "${DRY_RUN}" -eq 1 ]]; then
    echo "[dry-run] would remove: ${p}"
  else
    echo "removing: ${p}"
    rm -rf "${p}"
  fi
}

echo "Pruning ${OSW} ..."
for d in "${REMOVE_DIRS[@]}"; do
  remove_path "${OSW}/mm_agents/${d}"
done
for f in "${REMOVE_FILES[@]}"; do
  remove_path "${OSW}/mm_agents/${f}"
done
for d in "${REMOVE_TOP[@]}"; do
  remove_path "${OSW}/${d}"
done

echo ""
if [[ "${DRY_RUN}" -eq 1 ]]; then
  echo "Dry run complete. Re-run without --dry-run to delete."
else
  echo "Prune complete. Kept: os_symphony, o3_agent, openai_compat_chat_agent, uitars*, coact, desktop_env."
fi
