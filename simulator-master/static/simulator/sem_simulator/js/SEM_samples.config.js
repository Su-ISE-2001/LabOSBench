/* SEM sample configuration
 * Modify this file to add/remove samples without changing simulator logic.
 *
 * tuning（可选）：每个样品一套「成像退化」目标，决定清晰/合适画面时旋钮与对比度基线不同。
 *   randomBrightness / randomContrast — 与 onRotateKnob 中旋钮角度一致，0–270
 *   contrastAmount — drawIt 里对比度基线
 *   astigmBlur — 有符号，影响像散支路（与原先 random×astigm 同量级，约 ±2～5）
 *   noise — "tv_rate" | "scan1"，扫描噪声模式不同
 * 若不写 tuning，则按 id 做确定性哈希派生，仍保证不同 id 参数不同。
 *
 * test_subject_03 … test_subject_26：由单张原图各复制为 _SE / _BSE 同名文件（内容相同），
 * 对应原文件名依次为 0.05g_m003、0.8-4_m003_001、0.8-4_m004_001、5_m002_012、5_m004_003、
 * 6_q032_006、6_q032、7_q027_007、7_q028_006、7_q031_002、7_q044、8_q029_004、9_003、9_m005_001、
 * 9_q007_001、9_q017_005、9_q047_003、9-_m001_002、MOR-2_q073、MOR-3_q077、MOR-5_q049、ni_q048、
 * SD-707_q023、sd-3010_q021。（pollen / rock 已有独立 SE/BSE，未重复注册。）
 */
window.SEM_SAMPLE_CONFIG = [
    {
        id: "sample1",
        label: "WOOD",
        seImage: "/static/simulator/sem_simulator/images/simulator/SEM/wood_SE.jpg",
        bseImage: "/static/simulator/sem_simulator/images/simulator/SEM/wood_BSE.jpg",
        chamberTopFrame: 76,
        scaleBarSize: 5.4,
        scaleBarUnit: 20,
        tuning: {
            randomBrightness: 166,
            randomContrast: 124,
            contrastAmount: 1.22,
            astigmBlur: -2.9,
            noise: "scan1"
        }
    },
    {
        id: "sample2",
        label: "POLLEN",
        seImage: "/static/simulator/sem_simulator/images/simulator/SEM/pollen_SE.jpg",
        bseImage: "/static/simulator/sem_simulator/images/simulator/SEM/pollen_BSE.jpg",
        chamberTopFrame: 88,
        scaleBarSize: 5.3,
        scaleBarUnit: 5,
        tuning: {
            randomBrightness: 192,
            randomContrast: 168,
            contrastAmount: 0.78,
            astigmBlur: 3.7,
            noise: "scan1"
        }
    },
    {
        id: "sample3",
        label: "ROCK",
        seImage: "/static/simulator/sem_simulator/images/simulator/SEM/rock_SE.jpg",
        bseImage: "/static/simulator/sem_simulator/images/simulator/SEM/rock_BSE.jpg",
        chamberTopFrame: 93,
        scaleBarSize: 4.1,
        scaleBarUnit: 10,
        tuning: {
            randomBrightness: 171,
            randomContrast: 102,
            contrastAmount: 1.48,
            astigmBlur: -3.6,
            noise: "scan1"
        }
    },
    {
        id: "sample4",
        label: "STEEL",
        seImage: "/static/simulator/sem_simulator/images/simulator/SEM/steel_SE.jpg",
        bseImage: "/static/simulator/sem_simulator/images/simulator/SEM/steel_BSE.jpg",
        chamberTopFrame: 99,
        scaleBarSize: 6.6,
        scaleBarUnit: 5,
        tuning: {
            randomBrightness: 204,
            randomContrast: 181,
            contrastAmount: 0.86,
            astigmBlur: 4.1,
            noise: "scan1"
        }
    },
    {
        id: "sample5",
        label: "sample1",
        seImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_01_SE.png",
        bseImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_01_BSE.png",
        chamberTopFrame: 76,
        scaleBarSize: 5.0,
        scaleBarUnit: 10,
        tuning: {
            randomBrightness: 158,
            randomContrast: 138,
            contrastAmount: 1.08,
            astigmBlur: 2.65,
            noise: "scan1"
        }
    },
    {
        id: "sample6",
        label: "sample2",
        seImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_02_SE.png",
        bseImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_02_BSE.png",
        chamberTopFrame: 88,
        scaleBarSize: 5.0,
        scaleBarUnit: 10,
        tuning: {
            randomBrightness: 185,
            randomContrast: 114,
            contrastAmount: 1.33,
            astigmBlur: -2.35,
            noise: "scan1"
        }
    },
    {
        id: "sample7",
        label: "0.05g m003",
        seImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_03_SE.png",
        bseImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_03_BSE.png",
        chamberTopFrame: 78,
        scaleBarSize: 5.1,
        scaleBarUnit: 10,
        tuning: { randomBrightness: 160, randomContrast: 128, contrastAmount: 1.15, astigmBlur: -2.4, noise: "scan1" }
    },
    {
        id: "sample8",
        label: "0.8-4 m003",
        seImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_04_SE.png",
        bseImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_04_BSE.png",
        chamberTopFrame: 80,
        scaleBarSize: 5.2,
        scaleBarUnit: 10,
        tuning: { randomBrightness: 172, randomContrast: 142, contrastAmount: 1.05, astigmBlur: 2.8, noise: "tv_rate" }
    },
    {
        id: "sample9",
        label: "0.8-4 m004",
        seImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_05_SE.png",
        bseImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_05_BSE.png",
        chamberTopFrame: 79,
        scaleBarSize: 5.0,
        scaleBarUnit: 10,
        tuning: { randomBrightness: 168, randomContrast: 155, contrastAmount: 0.92, astigmBlur: -3.1, noise: "scan1" }
    },
    {
        id: "sample10",
        label: "5 m002",
        seImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_06_SE.png",
        bseImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_06_BSE.png",
        chamberTopFrame: 81,
        scaleBarSize: 5.3,
        scaleBarUnit: 5,
        tuning: { randomBrightness: 178, randomContrast: 118, contrastAmount: 1.28, astigmBlur: 3.2, noise: "scan1" }
    },
    {
        id: "sample11",
        label: "5 m004",
        seImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_07_SE.png",
        bseImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_07_BSE.png",
        chamberTopFrame: 77,
        scaleBarSize: 4.9,
        scaleBarUnit: 10,
        tuning: { randomBrightness: 154, randomContrast: 162, contrastAmount: 0.88, astigmBlur: -2.7, noise: "tv_rate" }
    },
    {
        id: "sample12",
        label: "6 q032 (006)",
        seImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_08_SE.png",
        bseImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_08_BSE.png",
        chamberTopFrame: 83,
        scaleBarSize: 5.4,
        scaleBarUnit: 10,
        tuning: { randomBrightness: 188, randomContrast: 108, contrastAmount: 1.38, astigmBlur: -2.0, noise: "scan1" }
    },
    {
        id: "sample13",
        label: "6 q032",
        seImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_09_SE.png",
        bseImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_09_BSE.png",
        chamberTopFrame: 82,
        scaleBarSize: 5.0,
        scaleBarUnit: 5,
        tuning: { randomBrightness: 164, randomContrast: 148, contrastAmount: 1.02, astigmBlur: 2.5, noise: "tv_rate" }
    },
    {
        id: "sample14",
        label: "7 q027",
        seImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_10_SE.png",
        bseImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_10_BSE.png",
        chamberTopFrame: 84,
        scaleBarSize: 5.2,
        scaleBarUnit: 10,
        tuning: { randomBrightness: 196, randomContrast: 120, contrastAmount: 1.18, astigmBlur: -3.4, noise: "scan1" }
    },
    {
        id: "sample15",
        label: "7 q028",
        seImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_11_SE.png",
        bseImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_11_BSE.png",
        chamberTopFrame: 76,
        scaleBarSize: 4.8,
        scaleBarUnit: 10,
        tuning: { randomBrightness: 158, randomContrast: 170, contrastAmount: 0.82, astigmBlur: 3.6, noise: "tv_rate" }
    },
    {
        id: "sample16",
        label: "7 q031",
        seImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_12_SE.png",
        bseImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_12_BSE.png",
        chamberTopFrame: 86,
        scaleBarSize: 5.5,
        scaleBarUnit: 5,
        tuning: { randomBrightness: 182, randomContrast: 136, contrastAmount: 1.12, astigmBlur: -2.55, noise: "scan1" }
    },
    {
        id: "sample17",
        label: "7 q044",
        seImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_13_SE.png",
        bseImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_13_BSE.png",
        chamberTopFrame: 85,
        scaleBarSize: 5.1,
        scaleBarUnit: 10,
        tuning: { randomBrightness: 170, randomContrast: 144, contrastAmount: 1.08, astigmBlur: 2.15, noise: "tv_rate" }
    },
    {
        id: "sample18",
        label: "8 q029",
        seImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_14_SE.png",
        bseImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_14_BSE.png",
        chamberTopFrame: 87,
        scaleBarSize: 5.3,
        scaleBarUnit: 10,
        tuning: { randomBrightness: 174, randomContrast: 152, contrastAmount: 0.98, astigmBlur: -2.9, noise: "scan1" }
    },
    {
        id: "sample19",
        label: "9 (003)",
        seImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_15_SE.png",
        bseImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_15_BSE.png",
        chamberTopFrame: 88,
        scaleBarSize: 5.6,
        scaleBarUnit: 10,
        tuning: { randomBrightness: 190, randomContrast: 112, contrastAmount: 1.32, astigmBlur: 3.0, noise: "scan1" }
    },
    {
        id: "sample20",
        label: "9 m005",
        seImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_16_SE.png",
        bseImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_16_BSE.png",
        chamberTopFrame: 89,
        scaleBarSize: 5.4,
        scaleBarUnit: 10,
        tuning: { randomBrightness: 166, randomContrast: 158, contrastAmount: 0.94, astigmBlur: -3.0, noise: "tv_rate" }
    },
    {
        id: "sample21",
        label: "9 q007",
        seImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_17_SE.png",
        bseImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_17_BSE.png",
        chamberTopFrame: 80,
        scaleBarSize: 4.9,
        scaleBarUnit: 5,
        tuning: { randomBrightness: 180, randomContrast: 126, contrastAmount: 1.22, astigmBlur: 2.45, noise: "scan1" }
    },
    {
        id: "sample22",
        label: "9 q017",
        seImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_18_SE.png",
        bseImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_18_BSE.png",
        chamberTopFrame: 83,
        scaleBarSize: 5.2,
        scaleBarUnit: 10,
        tuning: { randomBrightness: 162, randomContrast: 166, contrastAmount: 0.86, astigmBlur: -2.25, noise: "tv_rate" }
    },
    {
        id: "sample23",
        label: "9 q047",
        seImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_19_SE.png",
        bseImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_19_BSE.png",
        chamberTopFrame: 84,
        scaleBarSize: 5.0,
        scaleBarUnit: 10,
        tuning: { randomBrightness: 176, randomContrast: 140, contrastAmount: 1.14, astigmBlur: 2.7, noise: "scan1" }
    },
    {
        id: "sample24",
        label: "9- m001",
        seImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_20_SE.png",
        bseImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_20_BSE.png",
        chamberTopFrame: 90,
        scaleBarSize: 5.5,
        scaleBarUnit: 10,
        tuning: { randomBrightness: 198, randomContrast: 104, contrastAmount: 1.42, astigmBlur: -3.5, noise: "scan1" }
    },
    {
        id: "sample25",
        label: "MOR-2 q073",
        seImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_21_SE.png",
        bseImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_21_BSE.png",
        chamberTopFrame: 81,
        scaleBarSize: 5.1,
        scaleBarUnit: 5,
        tuning: { randomBrightness: 168, randomContrast: 150, contrastAmount: 1.06, astigmBlur: 2.2, noise: "tv_rate" }
    },
    {
        id: "sample26",
        label: "MOR-3 q077",
        seImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_22_SE.png",
        bseImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_22_BSE.png",
        chamberTopFrame: 79,
        scaleBarSize: 4.8,
        scaleBarUnit: 10,
        tuning: { randomBrightness: 184, randomContrast: 134, contrastAmount: 1.26, astigmBlur: -2.65, noise: "scan1" }
    },
    {
        id: "sample27",
        label: "MOR-5 q049",
        seImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_23_SE.png",
        bseImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_23_BSE.png",
        chamberTopFrame: 86,
        scaleBarSize: 5.3,
        scaleBarUnit: 10,
        tuning: { randomBrightness: 156, randomContrast: 172, contrastAmount: 0.9, astigmBlur: 3.4, noise: "tv_rate" }
    },
    {
        id: "sample28",
        label: "Ni q048",
        seImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_24_SE.png",
        bseImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_24_BSE.png",
        chamberTopFrame: 82,
        scaleBarSize: 5.0,
        scaleBarUnit: 5,
        tuning: { randomBrightness: 172, randomContrast: 122, contrastAmount: 1.2, astigmBlur: -2.1, noise: "scan1" }
    },
    {
        id: "sample29",
        label: "SD-707 q023",
        seImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_25_SE.png",
        bseImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_25_BSE.png",
        chamberTopFrame: 85,
        scaleBarSize: 5.4,
        scaleBarUnit: 10,
        tuning: { randomBrightness: 186, randomContrast: 146, contrastAmount: 1.1, astigmBlur: 2.55, noise: "scan1" }
    },
    {
        id: "sample30",
        label: "SD-3010 q021",
        seImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_26_SE.png",
        bseImage: "/static/simulator/sem_simulator/images/simulator/SEM/test_subject_26_BSE.png",
        chamberTopFrame: 87,
        scaleBarSize: 5.2,
        scaleBarUnit: 10,
        tuning: { randomBrightness: 160, randomContrast: 138, contrastAmount: 1.04, astigmBlur: -2.8, noise: "tv_rate" }
    }
];
