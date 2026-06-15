# FIB Benchmark

仿照 XRD Benchmark 的 FIB 模拟器 benchmark，用于评估 GUI Agent 在 FIB（聚焦离子束）模拟器上的操作能力。

## 任务说明

任务 **FIB-Full-Workflow-01**：Si Wafer 完整教程流程，从进样到截面制备与成像结束，共 **20 个子任务（F1–F20）**：

| ID  | 名称                     | 说明 |
|-----|--------------------------|------|
| F1  | VentChamber              | 点击 VENT 放气并等待完成 |
| F2  | PumpDown                 | 点击 PUMP 抽真空 |
| F3  | SelectSample             | 选择样品 Si Wafer |
| F4  | EbeamOn                  | 设置电子束参数并打开 HT |
| F5  | EbeamLiveFocus           | 电子束 Live View、对焦、居中特征 |
| F6  | WD7mm                    | 工作距离设为 7mm |
| F7  | Tilt10deg                | 倾角设为 10° |
| F8  | StageZCenter             | 用 Stage Z 将特征调回中心 |
| F9  | IonBeamLiveCenter        | 离子束 Live View 并用 Beam Shift 居中 |
| F10 | FirstRectStart           | 第一个矩形 Si 铣削：选 Pattern、拖放、START |
| F11 | DeletePattern            | 铣削完成后点击 DELETE PATTERN |
| F12 | SecondRectStart          | 设 30nA 后第二个矩形铣削、START |
| F13 | BeamCurrent10pA          | 将离子束电流调回 10pA |
| F14 | PtNeedleIn               | 勾选 Pt Needle 插入针 |
| F15 | PtDepositionStart        | Pattern 选 Pt Deposition、拖放、START（Pt 沉积） |
| F16 | IonSnapshot5000x         | 离子束 5000x 下 SNAPSHOT |
| F17 | CrossSectionCutStart     | Pattern 选 Cross Section Cutting、拖放、3nA、START |
| F18 | CleaningCrossSectionStart| Pattern 选 Cleaning Cross Section、拖放、0.1nA、START |
| F19 | Tilt0deg                 | 截面成像后设 Tilt 为 0° |
| F20 | TaskComplete             | 回到 0° 后流程结束（Centre Stage / Congratulations） |

## 文件说明

- **schema.json**：单次 episode 日志的 JSON Schema（与前端 `benchmark_fib.js` 输出一致）。
- **test_fib_subtask_demos.py**：单子任务分步测试（推荐，OpenAI 兼容 API）。
- **test_fib_agent_lightweight.py**：完整流程轻量测试（Playwright + Agent）。

## 使用方法

1. 启动 FIB 模拟器（与 XRD 共用同一服务，端口 8080）：
   ```bash
   cd simulator-master && ./start.sh
   ```
   浏览器打开：`http://localhost:8080/static/simulator/fib_simulator/FIB_simulator.html`

2. **分步测试**（推荐）：
   ```bash
   python benchmarks/fib_benchmark/test_fib_subtask_demos.py \
     --subtask F1 --runs 5 \
     --agent o3 --model gpt-4o \
     --api_url "$API_URL" --api_key "$API_KEY" \
     --headless
   ```

3. **全流程测试**（OS-Symphony）：
   ```bash
   python benchmarks/test_os_symphony_fib_web.py \
     --model gpt-4o \
     --api_url "$API_URL" --api_key "$API_KEY" \
     --headless
   ```

## 结果

- 结果默认写入 `results/fib/`（已在 `.gitignore`，不上传 Git）。
- 每次运行生成 episode 日志（subtasks、steps、summary 等），控制台打印子任务成功率。

## 与 XRD Benchmark 的对应关系

- 前端：`simulator-master/static/benchmark_fib.js`，在 FIB 页面注入并暴露 `window.FIB_BENCHMARK` / `FIB_BENCHMARK_API`。
- 模拟器：`FIB_simulator.html` 已引入 `benchmark_fib.js`；`FIB_simulator.js` 在关键步骤完成后调用 `FIB_BENCHMARK_API.markSubtaskSuccess("F1")` 等。
