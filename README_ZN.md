# LabOSBench

面向科学仪器 Web 模拟器（SEM、FIB、EDS、APT、LFM、SPM、TEM、XRD）的 **GUI Agent 评测框架**。在浏览器中运行仪器模拟界面，通过视觉语言模型（VLM）驱动 Playwright 完成操作，并统计子任务成功率。

**📊 [在线结果展示页](https://su-ise-2001.github.io/LABOSBENCH/)** · 英文文档见 [README.md](README.md)

---

## 仓库结构

```
.
├── simulator-master/          # 仪器 Web 模拟器（Go + 静态前端，需 Git LFS）
├── OSWorld-main/              # 精简版 OSWorld（Agent 与工具链）
├── benchmarks/                # 各仪器评测脚本与核心 Python 测试
├── run_subtasks.sh            # ★ 全仪器分子任务测试入口
├── run_full_flow.sh           # ★ 全仪器全流程测试入口（OS-Symphony）
├── web/                       # ★ 结果展示页（GitHub Pages）
├── install_dependencies.sh
└── results/                   # 评测输出（不上传 Git）
```

---

## 环境要求

- Python 3.10+
- [Git LFS](https://git-lfs.github.com/)（拉取 `simulator-master/simulator` 二进制）
- Playwright + Chromium
- 可访问的 **OpenAI 兼容 API**

```bash
git lfs install
git clone https://github.com/Su-ISE-2001/LabOSBench.git
cd LabOSBench
git lfs pull

bash install_dependencies.sh
```

---

## 快速开始

### 1. 启动模拟器

```bash
cd simulator-master
./start.sh          # 默认 :8080
```

### 2. 配置 API

```bash
export API_KEY="sk-..."
export API_URL="https://api.openai.com/v1"

# 分子任务 — 全部仪器（gpt-5.5-medium）
bash run_subtasks.sh

# 全流程 — 全部仪器（gpt-5.5-medium）
bash run_full_flow.sh
```

---

## 支持的仪器与子任务

| 代号 | 仪器 | 子任务脚本 | 子任务数量 |
|------|------|-----------|-----------|
| FIB | 聚焦离子束 | `fib_benchmark/test_fib_subtask_demos.py` | F1–F20（20） |
| SEM | 扫描电镜 | `sem_benchmark/test_sem_subtask_demos.py` | S1–S12（12） |
| EDS | 能谱 | `eds_benchmark/test_eds_subtask_demos.py` | S1–S8（8；批量默认 S1–S4） |
| APT | 原子探针 | `apt_benchmark/test_apt_subtask_demos.py` | S1–S12（12） |
| LFM | 轻元素显微镜 | `lfm_benchmark/test_lfm_subtask_demos.py` | L1–L12（12） |
| SPM | 扫描探针 | `spm_benchmark/test_spm_subtask_demos.py` | S1–S14（14） |
| TEM | 透射电镜 | `tem_benchmark/test_tem_subtask_demos.py` | T1–T10（10） |
| XRD | X 射线衍射 | `xrd_benchmark/test_xrd_subtask_demos.py` | S1–S8（8） |

单仪器、单子任务示例：

```bash
python benchmarks/fib_benchmark/test_fib_subtask_demos.py \
  --subtask F1 --runs 5 \
  --agent o3 --model gpt-5.5-medium \
  --api_url "$API_URL" --api_key "$API_KEY" \
  --headless
```

---

## Coming Soon

- [ ] **统一 CLI**：`simbench run --instrument fib --mode subtask`
- [ ] **Docker 一键环境**：模拟器 + Playwright + 依赖打包镜像
- [ ] **更多 Agent 基线**：VLAA-GUI、HIPPO 等复现配置
- [ ] **子任务 Schema 校验器**：CI 检查与模拟器 JS 一致性
- [ ] **多轮对话记忆评测**：跨子任务上下文保持能力

欢迎 Issue / PR。

---

## License

遵循本仓库各子模块原有许可证。部分 Agent 代码 fork 自 [OSWorld](https://github.com/xlang-ai/OSWorld)，感谢其提供的评测思路与架构参考。
