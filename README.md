# LabOSBench

**LabOSBench** is a GUI agent benchmark suite for scientific instrument web simulators (SEM, FIB, EDS, APT, LFM, SPM, TEM, XRD). Agents control instrument UIs in the browser via Playwright and vision-language models; success is measured per subtask and over full workflows.

**📊 [Live results dashboard](https://su-ise-2001.github.io/LABOSBENCH/)** · 中文文档见 [README_ZN.md](README_ZN.md)

---

## Repository layout

```
.
├── simulator-master/          # Instrument web simulators (Go + static frontend, Git LFS)
├── OSWorld-main/              # Trimmed OSWorld fork (agents & tooling)
├── benchmarks/                # Per-instrument Python benchmarks
├── run_subtasks.sh            # ★ Entry: subtask-level eval (all instruments)
├── run_full_flow.sh           # ★ Entry: full-workflow eval (OS-Symphony)
├── web/                       # ★ Results dashboard (GitHub Pages)
├── install_dependencies.sh
└── results/                   # Run outputs (git-ignored)
```

---

## Requirements

- Python 3.10+
- [Git LFS](https://git-lfs.github.com/) (for `simulator-master/simulator`)
- Playwright + Chromium
- An **OpenAI-compatible API** endpoint

```bash
git lfs install
git clone https://github.com/Su-ISE-2001/LABOSBENCH.git
cd LABOSBENCH
git lfs pull

bash install_dependencies.sh
```

---

## Quick start

### 1. Start the simulator

```bash
cd simulator-master
./start.sh          # listens on :8080
```

### 2. Set API credentials

```bash
export API_KEY="sk-..."
export API_URL="https://api.openai.com/v1"

# Subtask eval — all instruments (gpt-5.5-medium)
bash run_subtasks.sh

# Full-workflow eval — all instruments (gpt-5.5-medium)
bash run_full_flow.sh
```

---

## Instruments & subtasks

| ID | Instrument | Subtask script | Subtasks |
|----|------------|----------------|----------|
| FIB | Focused ion beam | `fib_benchmark/test_fib_subtask_demos.py` | F1–F20 (20) |
| SEM | Scanning electron microscope | `sem_benchmark/test_sem_subtask_demos.py` | S1–S12 (12) |
| EDS | Energy-dispersive spectroscopy | `eds_benchmark/test_eds_subtask_demos.py` | S1–S8 (8; batch default S1–S4) |
| APT | Atom probe tomography | `apt_benchmark/test_apt_subtask_demos.py` | S1–S12 (12) |
| LFM | Light/fluorescence microscope | `lfm_benchmark/test_lfm_subtask_demos.py` | L1–L12 (12) |
| SPM | Scanning probe microscope | `spm_benchmark/test_spm_subtask_demos.py` | S1–S14 (14) |
| TEM | Transmission electron microscope | `tem_benchmark/test_tem_subtask_demos.py` | T1–T10 (10) |
| XRD | X-ray diffraction | `xrd_benchmark/test_xrd_subtask_demos.py` | S1–S8 (8) |

Single subtask example:

```bash
python benchmarks/fib_benchmark/test_fib_subtask_demos.py \
  --subtask F1 --runs 5 \
  --agent o3 --model gpt-5.5-medium \
  --api_url "$API_URL" --api_key "$API_KEY" \
  --headless
```

Subtask IDs are defined in each `test_*_subtask_demos.py` (`*_SUBTASK_DEMOS` / `*_SUBTASK_IDS`).

---

## Coming soon

- [ ] Unified CLI: `simbench run --instrument fib --mode subtask`
- [ ] Docker image: simulator + Playwright + dependencies
- [ ] Additional agent baselines (VLAA-GUI, HIPPO, …)
- [ ] Schema validator CI (JSON schema vs simulator JS)
- [ ] Cross-subtask memory evaluation

Issues and PRs welcome.

---

## License

See per-component licenses in this repository. Agent code is partially forked from [OSWorld](https://github.com/xlang-ai/OSWorld); thanks to the OSWorld team for the evaluation framework and architecture.
