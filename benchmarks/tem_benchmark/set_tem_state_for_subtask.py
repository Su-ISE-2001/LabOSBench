# -*- coding: utf-8 -*-
"""
将 TEM 模拟器直接设置为「执行某个子任务前」的初始状态，便于人工检查该步为何没有出现图片等问题。

用法:
  # 设置为「执行 T5 前」的状态（T1–T4 已完成，等待选120kV）
  python set_tem_state_for_subtask.py --subtask T5

  # 设置为「执行 T7 前」的状态，并在控制台停留，按 Enter 后关闭浏览器
  python set_tem_state_for_subtask.py --subtask T7

  # 不暂停，脚本执行完即退出（浏览器会随之关闭）
  python set_tem_state_for_subtask.py --subtask T6 --no-pause

  # 指定 TEM 地址
  python set_tem_state_for_subtask.py --subtask T5 --tem-url http://localhost:8080/static/simulator/tem_simulator/TEM_simulator.html
"""

import argparse
import re
import os
import sys
import time

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_BENCHMARKS = os.path.dirname(_SCRIPT_DIR)
_ROOT = os.path.dirname(_BENCHMARKS)
sys.path.insert(0, _ROOT)

from playwright.sync_api import sync_playwright

# 与 test_tem_agent_lightweight 中一致：第 1–10 个子任务的简要描述
SUBTASK_INSTRUCTIONS = [
    "1. 从 SAMPLE 下拉框中选择一个样品（如 NANOPARTICLES、ZEBRAFISH、METAL、MINERAL）",
    "2. 在示意图中点击 REMOVE，将空样品杆移出",
    "3. 点击 AIRLOCK 面板中的 PUMP 按钮，对气锁抽真空",
    "4. 点击 SPECIMEN 面板中的 INSERT 按钮，将样品插入电镜",
    "5. 在 ACC. VOLTAGE 下拉框中选择120 kV",
    "6. 点击 BEAM 面板中的 ON 按钮，打开电子束，并使用 FILAMENT CURRENT 滑块调节电子强度",
    "7. 在 MAGNIFICATION 下拉框中选择一个倍率（如 LOW、MEDIUM、HIGH），并使用 BRIGHTNESS 滑块调节图像明暗",
    "8. 使用 SPECIMEN STAGE POSITION 的 X/Y/Z 按钮调整样品台位置，使感兴趣区域位于视野中心",
    "9. 使用 OBJECTIVE LENS FOCUS 滑块调节物镜焦距，使图像清晰",
    "10. 在 CAMERA 面板中点击 INSERT 插入相机，然后点击 ACQUIRE 采集 TEM 图像",
]

TEM_SUBTASK_IDS = [f"T{i}" for i in range(1, 11)]


def _subtask_id_to_num(subtask_id: str) -> int:
    """T1 -> 1, T2 -> 2, ..., T10 -> 10"""
    m = re.match(r"^T(\d+)$", str(subtask_id).strip().upper())
    if m:
        n = int(m.group(1))
        if 1 <= n <= 10:
            return n
    raise ValueError(f"无效子任务 ID: {subtask_id}，应为 T1～T10")


def main():
    parser = argparse.ArgumentParser(
        description="将 TEM 模拟器设置为执行指定子任务前的状态，便于排查该步问题"
    )
    parser.add_argument(
        "--subtask",
        type=str,
        required=True,
        choices=TEM_SUBTASK_IDS,
        metavar="T1-T10",
        help="子任务 ID（T1～T10）。将设置为「执行该子任务前」的状态。",
    )
    parser.add_argument(
        "--tem-url",
        type=str,
        default="http://localhost:8080/static/simulator/tem_simulator/TEM_simulator.html",
        help="TEM 模拟器页面 URL",
    )
    parser.add_argument(
        "--no-pause",
        action="store_true",
        help="执行完跳转后不等待用户按 Enter，直接退出（浏览器会关闭）",
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        help="无头模式运行浏览器（不推荐，不便于检查界面）",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=60000,
        help="页面加载与资源就绪等待超时（毫秒），默认 60000",
    )
    args = parser.parse_args()

    subtask_id = args.subtask
    subtask_num = _subtask_id_to_num(subtask_id)
    tem_url = args.tem_url
    no_pause = args.no_pause
    headless = args.headless
    timeout = args.timeout

    print("=" * 60)
    print("TEM 状态设置脚本：设置为「执行 %s 前」的初始状态" % subtask_id)
    print("=" * 60)
    print("TEM URL: %s" % tem_url)
    if subtask_num == 1:
        print("%s：不进行跳转，仅打开页面（初始状态）" % subtask_id)
    else:
        print("将调用 TEM_JUMP_TO_STATE(%d)，跳过前 %d 个子任务" % (subtask_num - 2, subtask_num - 1))
    print("")
    print("本子任务应执行的操作：")
    print("  %s" % SUBTASK_INSTRUCTIONS[subtask_num - 1])
    print("")

    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(headless=headless)
        except Exception as e:
            print("启动浏览器失败，尝试 headless 模式: %s" % e)
            browser = p.chromium.launch(headless=True)

        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            device_scale_factor=1.0,
        )
        page = context.new_page()

        try:
            print("正在打开 TEM 模拟器..")
            page.goto(tem_url, wait_until="networkidle", timeout=timeout)
            time.sleep(3)
            page.wait_for_load_state("domcontentloaded", timeout=10000)
            time.sleep(2)

            print("等待 TEM 图像资源加载完成（promise_fullfilled_num >= 13）..")
            try:
                page.wait_for_function(
                    "window.promise_fullfilled_num >= 13", timeout=timeout
                )
                print("资源已加载")
            except Exception as e:
                print("警告：等待资源加载超时或失败: %s" % e)

            if subtask_num >= 2:
                step_index = subtask_num - 2
                print("正在跳转到状态 stepIndex=%d（前 %d 个子任务已完成）.." % (step_index, subtask_num - 1))
                page.evaluate(
                    "window.TEM_JUMP_TO_STATE && window.TEM_JUMP_TO_STATE(%d)"
                    % step_index
                )
                time.sleep(1.5)

                if subtask_num >= 7:
                    page.evaluate(
                        """
                        () => {
                            if (typeof sprites !== 'undefined' && typeof sample_set !== 'undefined' && sprites[sample_set]) {
                                if (typeof sprite_num === 'undefined') window.sprite_num = 0;
                                if (!window.displayed_img) {
                                    window.displayed_img = sprites[sample_set][1] || sprites[sample_set][0];
                                }
                                if (typeof origin_axis !== 'undefined') origin_axis = 240;
                                if (typeof source_x !== 'undefined') source_x = 240;
                                if (typeof source_y !== 'undefined') source_y = 240;
                                if (typeof radiusx !== 'undefined') radiusx = 256;
                                if (typeof radiusy !== 'undefined') radiusy = 256;
                                if (typeof window.draw_tem_preview === 'function') {
                                    window.draw_tem_preview();
                                } else if (typeof draw_tem === 'function') {
                                    draw_tem();
                                }
                            }
                        }
                        """
                    )
                    print("已执行画布强制绘制（draw_tem_preview / draw_tem）")

            print("")
            print("当前页面已设置为「执行 %s 前」的状态" % subtask_id)
            print("请在浏览器中检查：画布是否有图、控件是否可点、本步操作是否可正常执行")
            print("")

            if not no_pause:
                input("按 Enter 键关闭浏览器并退出..")
        except Exception as e:
            print("错误: %s" % e)
            if not no_pause:
                input("按 Enter 键关闭浏览器并退出..")
            raise
        finally:
            browser.close()


if __name__ == "__main__":
    main()
