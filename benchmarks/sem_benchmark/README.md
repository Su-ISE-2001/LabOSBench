# SEM Benchmark

基于 Web Simulator 的 SEM（扫描电子显微镜）Benchmark 测试框架，用于评估 GUI Agent 在 SEM 模拟器中完成扫描任务的能力。

## 任务说明

Agent 需在 SEM 模拟器中完成一次完整的扫描流程并保存图像：

1. **S1 VentChamber** - 点击 VENT 让空气进入腔室
2. **S2 OpenChamber** - 点击 OPEN 打开腔室
3. **S3 SelectSample** - 选择样品（WOOD、POLLEN、ROCK、STEEL）
4. **S4 CloseChamber** - 点击 CLOSE 关闭腔室
5. **S5 EvacuateChamber** - 点击 EVACUATE 抽真空
6. **S6 TurnOnHT** - 点击 HT 开启高压
7. **S7 SetAccVoltage** - 设置加速电压（滑块）
8. **S8 SetContrast** - 调节 CONTRAST 旋钮调整对比度
9. **S9 AdjustClarity** - 调节 COARSE 旋钮调整画面清晰度
10. **S10 StartScan** - 选择 TV RATE / SLOW SCAN 1 / SLOW SCAN 2 开始扫描
11. **S11 SaveImage** - 点击 SAVE IMAGE 保存图像

## 指标说明

- **实际步骤数**：本回合内 Agent 执行的步数（与日志中的「Step X/30」一致），即主循环执行的轮数。
- **步骤效率**：仅当**任务成功**（跑完基准路径、全部子任务完成）时，为 最优步数(12)/实际步骤数，上限 100%；**未成功则为 0**（连基准路径都没跑完不计效率）。
- **子任务尝试次数**：仅当 Agent **触发了该子任务对应的控件**（如点了该按钮、在该滑块上按下/拖完）时才会 +1；若从未操作该控件，则显示 0。因此「打叉且 0 次尝试」表示该控件未被操作，而不是「尝试了但没成功」。

## 前置条件


1. **启动 SEM 模拟器**

或使用 Go 版本：
cd D:\python\simulator-benchmark-main\simulator-master
start_8080.bat
2. 新开一个终端，运行采集
conda activate simulator-benchmark

export DOUBAO_API_KEY="sk-osRZauVvCV9I2XqiLXzlFe4Til4BIDQKETG8u68RKRchkSDd"
export DOUBAO_API_URL="http://34.13.73.248:3888/v1"
或者
export KIMI_API_KEY="sk-osRZauVvCV9I2XqiLXzlFe4Til4BIDQKETG8u68RKRchkSDd"
export KIMI_API_URL="http://34.13.73.248:3888/v1/chat/completions"

cd D:\python\simulator-benchmark-main\sem_benchmark
python test_sem_agent_lightweight.py --max_steps 30 --use-system-chrome
python test_sem_subtask_demos.py --subtask S11 --runs 10 --use-system-chrome --model doubao-seed-1-6-vision-250815

   - **Windows**：在 CMD 中执行或双击运行（推荐纯静态方式，无需 Go）
     ```cmd
      cd D:\python\simulator-benchmark-main\simulator-master
      start_8080.bat
     ```
   - **Linux/macOS**：
     ```bash
     cd simulator-master
     ./start_http_simple.sh
     ```
   > 说明：`start_http_simple.*` 仅需 Python；`start_8080.*` 需 Go。详见 [simulator-master/README.md](../simulator-master/README.md)

2. **安装依赖**

   若已用 conda 创建好环境（如 `simulator-benchmark`），直接激活即可：
   ```cmd
   conda activate simulator-benchmark
   ```
   若尚未创建环境，可任选其一：
   - **Conda**（推荐）：
     ```cmd
     conda create -n simulator-benchmark python=3.10
     conda activate simulator-benchmark
     pip install -r OSWorld-main\requirements.txt
     # 若 playwright install chromium 下载失败，可使用 --use-system-chrome 跳过
     ```
   - **venv**：运行 `setup_venv.bat`，或手动 `python -m venv venv` 后 `pip install -r OSWorld-main\requirements.txt`

3. **API 配置**：脚本内置默认 API（与 xrd_benchmark 一致），可通过 `--api_key` / `--api_url` 覆盖

## 使用方法

### 单次测试

```bash
conda activate simulator-benchmark
cd sem_benchmark
python test_sem_agent_lightweight.py

# 若 playwright install chromium 下载失败，使用系统 Chrome
python test_sem_agent_lightweight.py --use-system-chrome
```

**注意**：`PLAYWRIGHT_DOWNLOAD_BASE_URL` 镜像无效，Playwright 不支持该变量。推荐使用 `--use-system-chrome`。

### 多次测试并统计

```bash
conda activate simulator-benchmark
cd sem_benchmark
python test_sem_agent_lightweight.py --num_runs 5
```

### 命令行参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--agent` | uitars15_v2 | Agent 类型 |
| `--model` | ByteDance-Seed/UI-TARS-1.5-7B | 模型名称 |
| `--sem_url` | http://localhost:8080/static/simulator/sem_simulator/SEM_simulator.html | SEM 模拟器 URL |
| `--max_steps` | 50 | 最大步骤数 |
| `--result_dir` | ./sem_results | 结果目录 |
| `--num_runs` | 1 | 测试次数 |
| `--headless` | False | 无头模式 |
| `--use-system-chrome` | False | 使用系统 Chrome，无需 playwright install chromium |

## 项目结构

```
sem_benchmark/
├── test_sem_agent_lightweight.py  # 主测试脚本
├── test_sem_subtask_demos.py      # 对齐其他 benchmark 的子任务 demo 入口
├── test_sem_single_subtask.py     # 旧入口，保留兼容
├── sem_schema.json                # 日志格式规范
├── README.md                      # 本说明
└── sem_results/                   # 测试结果
    └── episode_YYYYMMDD_HHMMSS/
        ├── step_*_before.png
        ├── step_*_after.png
        ├── benchmark_sem.js
        └── episode_*.json
```

## 参考

- [xrd_benchmark](../xrd_benchmark/) - XRD 参考实现
- [TUTORIAL.md](../xrd_benchmark/TUTORIAL.md) - 开发教程
