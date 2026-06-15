#!/usr/bin/env bash
# 全仪器全流程测试（gpt-5.5-medium）
#
#   cd simulator-master && ./start.sh
#   export API_KEY=... API_URL=https://api.openai.com/v1
#   bash run_full_flow.sh
#   INSTRUMENT=fib bash run_full_flow.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${ROOT}"

API_KEY="${API_KEY:?Set API_KEY}"
API_URL="${API_URL:?Set API_URL}"
MODEL="gpt-5.5-medium"
INSTRUMENT="${INSTRUMENT:-all}"
RUNS="${RUNS:-1}"
MAX_STEPS="${MAX_STEPS:-15}"
HEADLESS="${HEADLESS:-1}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
RESULT_DIR="${RESULT_DIR:-${ROOT}/results/full_flow/${TIMESTAMP}}"

export PYTHONPATH="${ROOT}:${ROOT}/OSWorld:${ROOT}/OSWorld-main:${ROOT}/benchmarks:${PYTHONPATH:-}"
mkdir -p "${RESULT_DIR}"

ARGS=(
  benchmarks/test_os_symphony_web_all_instruments.py
  --instrument "${INSTRUMENT}"
  --model "${MODEL}"
  --api_url "${API_URL}"
  --api_key "${API_KEY}"
  --runs "${RUNS}"
  --max_steps_subtask "${MAX_STEPS}"
  --result_dir "${RESULT_DIR}"
)

[[ "${HEADLESS}" == "1" ]] && ARGS+=(--headless)

LOG="${RESULT_DIR}/run.log"
echo "model=${MODEL} instrument=${INSTRUMENT} runs=${RUNS} results=${RESULT_DIR}"
echo ""

PYTHONUNBUFFERED=1 python "${ARGS[@]}" 2>&1 | tee "${LOG}"

echo "Done. results=${RESULT_DIR}"
