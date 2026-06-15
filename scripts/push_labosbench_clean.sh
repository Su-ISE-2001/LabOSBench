#!/usr/bin/env bash
# Push current workspace to LabOSBench WITHOUT 12GB+ git history.
# Usage:
#   bash scripts/push_labosbench_clean.sh
#   GITHUB_TOKEN=ghp_xxx bash scripts/push_labosbench_clean.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

REMOTE="${REMOTE:-labosbench}"
REMOTE_URL="${REMOTE_URL:-https://github.com/Su-ISE-2001/LabOSBench.git}"
BRANCH="${BRANCH:-labosbench-release}"
TARGET="${TARGET:-main}"

if ! command -v git-lfs >/dev/null 2>&1; then
  echo "ERROR: git-lfs not installed. Install first:"
  echo "  sudo apt-get install -y git-lfs && git lfs install"
  exit 1
fi

git lfs install

# Fix root-owned simulator files (common after sudo build)
if [[ ! -r simulator-master/simulator.go ]]; then
  echo "Fixing permissions on simulator-master/simulator.go ..."
  sudo chown "$(id -un):$(id -gn)" simulator-master/simulator.go simulator-master/simulator 2>/dev/null || true
  chmod u+rw simulator-master/simulator.go 2>/dev/null || true
fi

CURRENT="$(git branch --show-current)"
echo "Current branch: ${CURRENT}"
echo "Creating orphan branch '${BRANCH}' (no old history)..."

git checkout --orphan "${BRANCH}"
git add -A

echo ""
echo "Staged files (should NOT include .env / results/ / OSWorld/):"
git status --short | head -30
STAGED=$(git diff --cached --name-only | wc -l)
echo "... total staged: ${STAGED} files"
echo ""

if git diff --cached --name-only | grep -qE '^\.env$|^results/|^OSWorld/'; then
  echo "ERROR: sensitive/large paths staged. Fix .gitignore before pushing."
  git checkout "${CURRENT}" 2>/dev/null || true
  exit 1
fi

git commit -m "Initial LabOSBench release"

PUSH_URL="${REMOTE_URL}"
if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  PUSH_URL="https://${GITHUB_TOKEN}@github.com/Su-ISE-2001/LabOSBench.git"
fi

echo "Pushing ${BRANCH} -> ${REMOTE}/${TARGET} ..."
git push -f "${PUSH_URL}" "${BRANCH}:${TARGET}" 2>/dev/null || \
  git push -f "${REMOTE}" "${BRANCH}:${TARGET}"

echo "Pushing Git LFS objects..."
git lfs push "${REMOTE}" "${BRANCH}:${TARGET}" --all 2>/dev/null || \
  git lfs push "${PUSH_URL}" "${BRANCH}:${TARGET}" --all 2>/dev/null || true

echo ""
echo "Done. View: https://github.com/Su-ISE-2001/LabOSBench"
echo "Local orphan branch: ${BRANCH} (switch back: git checkout ${CURRENT})"
