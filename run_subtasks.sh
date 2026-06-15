#!/usr/bin/env bash
# 全仪器分子任务测试（gpt-5.5-medium + o3）
#
#   cd simulator-master && ./start.sh
#   export API_KEY=... API_URL=https://api.openai.com/v1
#   bash run_subtasks.sh
#   INSTRUMENT=fib RUNS=3 bash run_subtasks.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${ROOT}"

API_KEY="${API_KEY:?Set API_KEY}"
API_URL="${API_URL:?Set API_URL}"
MODEL="gpt-5.5-medium"
AGENT="o3"
RUNS="${RUNS:-1}"
MAX_STEPS="${MAX_STEPS:-10}"
HEADLESS="${HEADLESS:-1}"
INSTRUMENT="${INSTRUMENT:-all}"
EDS_SUBTASKS="${EDS_SUBTASKS:-S1-S4}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
LOG_DIR="${LOG_DIR:-${ROOT}/results/subtask_runs/${TIMESTAMP}}"

BASE_URL="${API_URL%/}"
CHAT_URL="${BASE_URL}"
if [[ "${CHAT_URL}" != */chat/completions ]]; then
  CHAT_URL="${CHAT_URL}/chat/completions"
fi

export API_KEY API_URL MODEL
export OPENAI_API_KEY="${API_KEY}"
export OPENAI_BASE_URL="${BASE_URL}"
export DOUBAO_API_KEY="${API_KEY}"
export DOUBAO_API_URL="${CHAT_URL}"
export PYTHONPATH="${ROOT}:${ROOT}/OSWorld-main:${ROOT}/benchmarks:${PYTHONPATH:-}"

mkdir -p "${LOG_DIR}"

COMMON_ARGS=(--agent "${AGENT}" --model "${MODEL}" --runs "${RUNS}" --max_steps_subtask "${MAX_STEPS}")
if [[ "${HEADLESS}" == "1" ]]; then
  COMMON_ARGS+=(--headless)
fi

run_instrument() {
  local name="$1"
  local script="$2"
  shift 2
  local log_path="${LOG_DIR}/${name}.log"
  echo "===== [${name}] ====="
  PYTHONUNBUFFERED=1 python "${script}" "$@" 2>&1 | tee "${log_path}"
}

run_tem() {
  local args=(
    benchmarks/tem_benchmark/test_tem_subtask_demos.py
    --run_all_subtask_demos
    --agent "${AGENT}"
    --model "${MODEL}"
    --runs "${RUNS}"
    --max-steps "${MAX_STEPS}"
    --api-url "${BASE_URL}"
    --api-key "${API_KEY}"
  )
  [[ "${HEADLESS}" == "1" ]] && args+=(--headless)
  run_instrument tem "${args[@]}"
}

ALL_INSTRUMENTS=(apt eds fib lfm spm sem tem xrd)

should_run() {
  [[ "${INSTRUMENT}" == "all" || "${INSTRUMENT}" == "$1" ]]
}

echo "model=${MODEL} instrument=${INSTRUMENT} runs=${RUNS} logs=${LOG_DIR}"
echo ""

for inst in "${ALL_INSTRUMENTS[@]}"; do
  should_run "${inst}" || continue
  case "${inst}" in
    apt) run_instrument apt benchmarks/apt_benchmark/test_apt_subtask_demos.py \
           --run_all_subtask_demos "${COMMON_ARGS[@]}" --api_url "${BASE_URL}" --api_key "${API_KEY}" ;;
    eds) run_instrument eds benchmarks/eds_benchmark/test_eds_subtask_demos.py \
           --run_all_subtask_demos "${COMMON_ARGS[@]}" --subtasks "${EDS_SUBTASKS}" \
           --api_url "${BASE_URL}" --api_key "${API_KEY}" ;;
    fib) run_instrument fib benchmarks/fib_benchmark/test_fib_subtask_demos.py \
           --run_all_subtask_demos "${COMMON_ARGS[@]}" --api_url "${BASE_URL}" --api_key "${API_KEY}" ;;
    lfm) run_instrument lfm benchmarks/lfm_benchmark/test_lfm_subtask_demos.py \
           --run_all_subtask_demos "${COMMON_ARGS[@]}" --api_url "${BASE_URL}" --api_key "${API_KEY}" ;;
    spm) run_instrument spm benchmarks/spm_benchmark/test_spm_subtask_demos.py \
           --run_all_subtask_demos "${COMMON_ARGS[@]}" --api_url "${BASE_URL}" --api_key "${API_KEY}" ;;
    sem) run_instrument sem benchmarks/sem_benchmark/test_sem_subtask_demos.py \
           --run_all_subtask_demos "${COMMON_ARGS[@]}" --api_url "${BASE_URL}" --api_key "${API_KEY}" ;;
    tem) run_tem ;;
    xrd) run_instrument xrd benchmarks/xrd_benchmark/test_xrd_subtask_demos.py \
           --run_all_subtask_demos "${COMMON_ARGS[@]}" --api_url "${BASE_URL}" --api_key "${API_KEY}" ;;
  esac
done

echo "Done. logs=${LOG_DIR}"
