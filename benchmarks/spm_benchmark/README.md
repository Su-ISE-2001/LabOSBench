# SPM Benchmark

SPM（扫描探针显微镜 / AFM）模拟器 benchmark，用于评估 GUI Agent 在 AFM Tapping 模式下完成完整扫描流程的能力。

## 任务定义：SPM-Tapping-Scan-01

**任务目标**：在 SPM 模拟器中完成 Tapping 模式下一次完整的 AFM 扫描并保存图像。

**子任务（S1～S14）**：

| ID | 名称 | 描述 |
|----|------|------|
| S1 | SelectTappingMode | 在 MODE 下拉框中选择 TAPPING |
| S2 | LaserAlignment | 使用 ALIGNMENT 将激光对准悬臂梁 |
| S3 | PhotodiodeAlignment | 使用 PHOTODIODE 将激光对准光电二极管 |
| S4 | SetTargetAmplitude | 将 Target amplitude 设为 500mV |
| S5 | SetFrequency | 设置 Frequency 200-500KHz |
| S6 | AutoTune | 点击 AUTO TUNE |
| S7 | SetScanSize | 选择 SCAN SIZE |
| S8 | SetIntegralGain | 设置 INTEGRAL GAIN |
| S9 | SetScanRate | 选择 SCAN RATE |
| S10 | SetSetPoint | 调节 SET POINT |
| S11 | MotorApproach | 使用 MOTOR 滑块接近样品 |
| S12 | Engage | 点击 ENGAGE |
| S13 | Scan | 点击 SCAN |
| S14 | Save | 点击 SAVE 保存图像 |

## 使用方法

### 1. 启动模拟器服务器

```bash
cd simulator-master
python -m http.server 8080
# 或使用项目提供的启动方式
```

### 2. 完整流程测试

```bash
cd spm_benchmark
python test_spm_agent_lightweight.py --model your_model_name
```

### 3. 单子任务测试

```bash
# 测试 S1（选择 Tapping 模式）
python test_spm_subtask_demos.py --subtask S1 --runs 10

# 测试所有子任务
python test_spm_subtask_demos.py --run_all_subtask_demos --runs 10
```

**注意**：S2～S14 的独立测试需要 `SPM_fast_forward_to_subtask` 支持。当前已实现 S1～S14 的 fast_forward：S1（无操作）、S2（tapping_mode）、S3（激光对准完成）、S4（光电二极管对准完成）、S5（Target amplitude 500mV 完成）、S6（AUTO TUNE 阶段）、S7（SCAN SIZE 设置完成）、S8（INTEGRAL GAIN 设置完成）、S9（SCAN RATE 设置完成）、S10（进入 SET POINT 设置阶段）、S11（进入 MOTOR 滑块接近阶段）、S12（MOTOR 已接近，进入 ENGAGE 按钮阶段）、S13（ENGAGE 已完成，进入 SCAN 按钮阶段）、S14（SCAN 已完成，进入 SAVE 按钮阶段）。

### 4. OpenAI 分步批量测试

```bash
# 项目根目录，跑全部仪器子任务
bash benchmarks/run_gpt55_subtask_demos.sh
```

## 文件结构

```
spm_benchmark/
├── test_spm_agent_lightweight.py   # 完整流程测试
├── test_spm_subtask_demos.py       # 单子任务测试
└── README.md                       # 本说明

simulator-master/static/
├── benchmark_spm.js               # Benchmark 前端脚本
└── simulator/spm_simulator/
    ├── SPM_simulator.html         # 已引入 benchmark_spm.js
    └── js/SPM_simulator.js        # 已集成 markSubtaskSuccess 调用
```

## 成功判定

- **完整任务**：S14（Save）完成即视为成功
- **子任务**：各子任务有独立的成功条件，由 `SPM_BENCHMARK_API.markSubtaskSuccess` 在模拟器内触发
