#!/usr/bin/env python3
"""Build the full timeline, applying the current shot revisions from data/.

Character physics is implemented separately in modules/character/.
"""
import json
from pathlib import Path

OUT_PATH = Path("/Users/weckham/Desktop/MUSIC/petalwake/mv_sunshine/data/timeline_full.json")

CHAPTERS = [
    {"id": "ch1", "title": "前奏 · 海岛正午", "start": 0.00, "end": 15.42},
    {"id": "ch2", "title": "主歌一 · 烧水翻书晒被", "start": 15.42, "end": 57.20},
    {"id": "ch3", "title": "副歌一 · 晒暖棉被与间奏", "start": 57.20, "end": 99.38},
    {"id": "ch4", "title": "主歌二 · 单车晾衣与晴空", "start": 99.38, "end": 126.76},
    {"id": "ch5", "title": "副歌二与桥段 · 云端晒衣", "start": 126.76, "end": 182.40},
    {"id": "ch6", "title": "终章尾奏 · 醒来半杯温水", "start": 182.40, "end": 228.89},
]

LYRICS = [
    {"index": 1, "start": 15.42, "end": 18.25, "text": "时针走到十二，水刚烧到沸"},
    {"index": 2, "start": 18.64, "end": 21.80, "text": "我从柜子里面，拿了常用的杯"},
    {"index": 3, "start": 22.24, "end": 25.18, "text": "翻开书才发现，书签在上一回"},
    {"index": 4, "start": 25.50, "end": 28.92, "text": "原来上次也是，读着读着就睡"},
    {"index": 5, "start": 29.20, "end": 32.15, "text": "阳台上的床单，被风推了又推"},
    {"index": 6, "start": 32.66, "end": 35.65, "text": "楼下有人说笑，谁又在叫谁"},
    {"index": 7, "start": 36.14, "end": 39.15, "text": "我把棉被抱出来，抖了几回"},
    {"index": 8, "start": 39.84, "end": 42.75, "text": "顺手拉过椅子，坐着听风吹"},
    {"index": 9, "start": 44.04, "end": 48.15, "text": "麻雀落在栏杆，梳了梳后背"},
    {"index": 10, "start": 51.04, "end": 55.28, "text": "还没等我招手，它又转身起飞"},
    {"index": 11, "start": 57.20, "end": 60.05, "text": "阳光晒暖了棉被"},
    {"index": 12, "start": 60.14, "end": 63.48, "text": "我在旁边发呆，风轻轻吹"},
    {"index": 13, "start": 63.92, "end": 67.02, "text": "玻璃杯的影子，晃了几个来回"},
    {"index": 14, "start": 67.48, "end": 71.32, "text": "连一口温水，都有甜甜的滋味"},
    {"index": 15, "start": 71.36, "end": 74.32, "text": "云停在屋顶，像忘记了起飞"},
    {"index": 16, "start": 74.34, "end": 77.84, "text": "书里的故事，留到下次再回味"},
    {"index": 17, "start": 77.86, "end": 80.95, "text": "靠着椅背，慢慢伸直了腿"},
    {"index": 18, "start": 81.56, "end": 86.15, "text": "闭上眼睛，准了困意作陪"},
    {"index": 19, "start": 99.38, "end": 102.82, "text": "楼下单车经过，铃声干净清脆"},
    {"index": 20, "start": 103.00, "end": 106.06, "text": "衣架上的衬衫，摇摇晃晃来回"},
    {"index": 21, "start": 106.14, "end": 109.50, "text": "我把被子收回来，阳光还留着余味"},
    {"index": 22, "start": 109.52, "end": 113.15, "text": "还没走到床边，就有一点想睡"},
    {"index": 23, "start": 113.64, "end": 117.60, "text": "风把窗帘掀开，又轻轻放回"},
    {"index": 24, "start": 120.06, "end": 124.60, "text": "晾好的那件衬衫，替我占了椅背"},
    {"index": 25, "start": 126.76, "end": 129.60, "text": "阳光晒暖了棉被"},
    {"index": 26, "start": 129.70, "end": 133.10, "text": "我在旁边发呆，风轻轻吹"},
    {"index": 27, "start": 133.38, "end": 136.64, "text": "玻璃杯的影子，晃了几个来回"},
    {"index": 28, "start": 137.00, "end": 140.92, "text": "连一口温水，都有甜甜的滋味"},
    {"index": 29, "start": 141.12, "end": 143.84, "text": "云停在屋顶，像忘记了起飞"},
    {"index": 30, "start": 143.94, "end": 147.38, "text": "书里的故事，留到下次再回味"},
    {"index": 31, "start": 147.42, "end": 150.48, "text": "靠着椅背，慢慢伸直了腿"},
    {"index": 32, "start": 151.12, "end": 155.66, "text": "闭上眼睛，准了困意作陪"},
    {"index": 33, "start": 155.88, "end": 161.46, "text": "光从我的手边，挪到了椅背"},
    {"index": 34, "start": 161.62, "end": 167.88, "text": "钟声隔着一道门，比刚才慢了几倍"},
    {"index": 35, "start": 168.12, "end": 174.80, "text": "我还想再看一眼，眼皮却往下垂"},
    {"index": 36, "start": 175.46, "end": 181.92, "text": "梦里晾着一片云，和晒暖的棉被"},
    {"index": 37, "start": 182.40, "end": 185.25, "text": "阳光晒暖了棉被"},
    {"index": 38, "start": 185.34, "end": 188.62, "text": "我在梦里发呆，风轻轻吹"},
    {"index": 39, "start": 188.76, "end": 192.38, "text": "门外的脚步声，轻轻走了个来回"},
    {"index": 40, "start": 192.62, "end": 195.68, "text": "一下午的时间，够我慢慢体会"},
    {"index": 41, "start": 195.94, "end": 200.90, "text": "等到醒来，光已经挪到床尾"},
    {"index": 42, "start": 201.12, "end": 204.20, "text": "伸个懒腰，天还没黑"},
    {"index": 43, "start": 205.36, "end": 207.90, "text": "水还剩半杯"},
    {"index": 44, "start": 208.80, "end": 211.30, "text": "我再坐一会"},
]

SHOTS = [
    # ==================== CH1: INTRO (0.00 - 15.42) ====================
    {
        "id": "IMG-01",
        "sceneTitle": "无人空镜·海港波光与摇曳渔船",
        "lyricHint": "前奏 · 海湾碎金与水鸟",
        "start": 0.00, "end": 2.60, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.006},
        "camera": {
            "type": "world_lerp",
            "from": [-65.5, 2.35, 1155.5], "to": [-50.5, 3.15, 1149.5],
            "lookFrom": [-55.0, 4.8, 1132.0], "lookTo": [-58.0, 7.5, 1118.0],
            "fovFrom": 56, "fovTo": 52, "sway": 0.016
        }
    },
    {
        "id": "IMG-02",
        "sceneTitle": "无人空镜·紫藤断桥与溪流瀑布",
        "lyricHint": "前奏 · 溪桥紫藤随风轻晃",
        "start": 2.60, "end": 5.20, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.008},
        "camera": {
            "type": "world_lerp",
            "from": [-162.5, 117.6, -472.5], "to": [-156.5, 118.4, -462.5],
            "lookFrom": [-177.5, 115.6, -458.5], "lookTo": [-179.5, 116.2, -457.5],
            "fovFrom": 54, "fovTo": 50, "sway": 0.012
        }
    },
    {
        "id": "IMG-03",
        "sceneTitle": "无人空镜·日晷花甸与逆光绒絮",
        "lyricHint": "前奏 · 蒲公英绒球飘向暖阳",
        "start": 5.20, "end": 7.80, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.008},
        "camera": {
            "type": "world_lerp",
            "from": [-1230.0, 108.2, -360.0], "to": [-1234.5, 108.8, -364.5],
            "lookFrom": [-1243.0, 107.2, -372.0], "lookTo": [-1245.0, 108.5, -375.0],
            "fovFrom": 56, "fovTo": 50, "sway": 0.012
        }
    },
    {
        "id": "IMG-04",
        "sceneTitle": "无人空镜·向阳花坡风车与飞鸟",
        "lyricHint": "前奏 · 白帽风车与南草甸飞鸟",
        "start": 7.80, "end": 10.40, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.010},
        "camera": {
            "type": "world_lerp",
            "from": [-56.0, 28.2, 586.0], "to": [-61.5, 29.5, 579.0],
            "lookFrom": [-66.5, 29.0, 568.5], "lookTo": [-69.0, 31.5, 563.0],
            "fovFrom": 50, "fovTo": 46, "sway": 0.010
        }
    },
    {
        "id": "IMG-05",
        "sceneTitle": "无人空镜·午后广场喷泉与炊烟",
        "lyricHint": "前奏 · 安静石板街与烘焙坊屋檐",
        "start": 10.40, "end": 13.00, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.010},
        "camera": {
            "type": "orbit_arc", "focus": [-63.0, 6.4, 1052.0],
            "angleFromDeg": -128, "angleToDeg": -86,
            "radiusFrom": 14.5, "radiusTo": 12.2,
            "heightFrom": 2.4, "heightTo": 4.2,
            "lookLiftFrom": 1.2, "lookLiftTo": 3.4,
            "fov": 54, "sway": 0.010
        }
    },
    {
        "id": "IMG-06",
        "sceneTitle": "书院海台·Claude背靠碧海浅滩迎风浅笑",
        "lyricHint": "前奏尾拍 · 迎着正午海风轻立露台",
        "start": 13.00, "end": 15.42, "mode": "stand_pad", "pose": "mocap_look_around",
        "dof": {"focusDist": "auto", "aperture": 0.028},
        "rider": {"pos": [-2.25, 30.394, 952.05], "yawDeg": 318.0},
        "camera": {
            "type": "orbit_arc", "focus": [-2.25, 31.92, 952.05],
            "angleFromDeg": 206, "angleToDeg": 238,
            "radiusFrom": 1.72, "radiusTo": 1.52,
            "heightFrom": 0.10, "heightTo": 0.06,
            "lookLiftFrom": -0.02, "lookLiftTo": 0.02,
            "fov": 43, "sway": 0.004
        }
    },

    # ==================== CH2: VERSE 1 & PRE-CHORUS 1 (15.42 - 57.20) ====================
    {
        "id": "IMG-07",
        "sceneTitle": "扫描精模·胡桃木挂钟走上正午十二点",
        "lyricHint": "时针走到十二，",
        "start": 15.42, "end": 17.02, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.032},
        "camera": {
            "type": "world_lerp",
            "from": [-153.16, 14.00, 1058.42], "to": [-153.22, 14.05, 1058.20],
            "lookFrom": [-153.25, 14.05, 1057.64], "lookTo": [-153.25, 14.06, 1057.64],
            "fovFrom": 40, "fovTo": 34, "sway": 0.003
        }
    },
    {
        "id": "IMG-08",
        "sceneTitle": "海崖茶席·橡木桌鹅颈壶与青花茶具冒汽",
        "lyricHint": "水刚烧到沸",
        "start": 17.02, "end": 18.64, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.034},
        "camera": {
            "type": "orbit_arc", "focus": [-37.58, 31.38, 976.82],
            "angleFromDeg": 78, "angleToDeg": 108,
            "radiusFrom": 0.90, "radiusTo": 0.76,
            "heightFrom": 0.22, "heightTo": 0.16,
            "lookLiftFrom": -0.02, "lookLiftTo": 0.02,
            "fov": 40, "sway": 0.003
        }
    },
    {
        "id": "IMG-09",
        "sceneTitle": "暖阳木柜·阳光洒入半敞胡桃木柜与骨瓷杯",
        "lyricHint": "我从柜子里面，",
        "start": 18.64, "end": 20.15, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.032},
        "camera": {
            "type": "orbit_arc", "focus": [-54.33, 23.66, 1021.88],
            "angleFromDeg": 94, "angleToDeg": 122,
            "radiusFrom": 0.92, "radiusTo": 0.76,
            "heightFrom": 0.10, "heightTo": 0.05,
            "lookLiftFrom": -0.02, "lookLiftTo": 0.02,
            "fov": 40, "sway": 0.003
        }
    },
    {
        "id": "IMG-10",
        "sceneTitle": "晴空风台·Claude迎着钟楼晴空弯眉浅笑",
        "lyricHint": "拿了常用的杯",
        "start": 20.15, "end": 22.24, "mode": "stand_pad", "pose": "mocap_greeting",
        "dof": {"focusDist": "auto", "aperture": 0.030},
        "rider": {"pos": [-43.96, 17.50, 1071.43], "yawDeg": 180.0},
        "camera": {
            "type": "orbit_arc", "focus": [-43.96, 19.04, 1071.43],
            "angleFromDeg": -18, "angleToDeg": 18,
            "radiusFrom": 1.56, "radiusTo": 1.38,
            "heightFrom": 0.08, "heightTo": 0.05,
            "lookLiftFrom": -0.02, "lookLiftTo": 0.02,
            "fov": 42, "sway": 0.004
        }
    },
    {
        "id": "IMG-11",
        "sceneTitle": "扫描书桌·烫金典籍与圆框铜眼镜沐浴暖阳",
        "lyricHint": "翻开书才发现，书签在上一回",
        "start": 22.24, "end": 25.50, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.034},
        "camera": {
            "type": "orbit_arc", "focus": [-1.08, 31.18, 951.04],
            "angleFromDeg": 195, "angleToDeg": 235,
            "radiusFrom": 0.92, "radiusTo": 0.78,
            "heightFrom": 0.30, "heightTo": 0.22,
            "lookLiftFrom": -0.02, "lookLiftTo": 0.02,
            "fov": 40, "sway": 0.003
        }
    },
    {
        "id": "IMG-12",
        "sceneTitle": "书院花海·Claude困意轻袭缓缓合上双眸",
        "lyricHint": "原来上次也是，读着读着就睡",
        "start": 25.50, "end": 29.20, "mode": "stand_pad", "pose": "mocap_sleepy",
        "dof": {"focusDist": "auto", "aperture": 0.030},
        "rider": {"pos": [-2.25, 30.394, 952.05], "yawDeg": 317.0},
        "camera": {
            "type": "orbit_arc", "focus": [-2.25, 31.94, 952.05],
            "angleFromDeg": 208, "angleToDeg": 238,
            "radiusFrom": 1.56, "radiusTo": 1.40,
            "heightFrom": 0.08, "heightTo": 0.10,
            "lookLiftFrom": -0.02, "lookLiftTo": 0.02,
            "fov": 42, "sway": 0.004
        }
    },
    {
        "id": "IMG-13",
        "sceneTitle": "原生晾衣绳·向阳巷口白床单随风轻推",
        "lyricHint": "阳台上的床单，被风推了又推",
        "start": 29.20, "end": 32.66, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.016},
        "camera": {
            "type": "world_lerp",
            "from": [-126.2, 6.25, 1085.4], "to": [-127.4, 6.45, 1084.6],
            "lookFrom": [-130.0, 6.10, 1082.76], "lookTo": [-130.2, 6.25, 1082.60],
            "fovFrom": 46, "fovTo": 42, "sway": 0.008
        }
    },
    {
        "id": "IMG-14",
        "sceneTitle": "街巷俯仰·石板街市集屋檐与温暖烟火",
        "lyricHint": "楼下有人说笑，谁又在叫谁",
        "start": 32.66, "end": 36.14, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.010},
        "camera": {
            "type": "world_lerp",
            "from": [-86.0, 16.5, 1072.5], "to": [-78.5, 14.8, 1069.5],
            "lookFrom": [-72.0, 6.2, 1058.5], "lookTo": [-65.5, 6.0, 1055.0],
            "fovFrom": 52, "fovTo": 48, "sway": 0.010
        }
    },
    {
        "id": "IMG-15",
        "sceneTitle": "向阳晒场·海港微风吹拂洁白床单",
        "lyricHint": "我把棉被抱出来，抖了几回",
        "start": 36.14, "end": 39.84, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.014},
        "camera": {
            "type": "world_lerp",
            "from": [-144.8, 5.95, 1107.6], "to": [-146.2, 6.15, 1106.5],
            "lookFrom": [-148.58, 5.75, 1104.4], "lookTo": [-149.0, 5.95, 1104.0],
            "fovFrom": 48, "fovTo": 43, "sway": 0.008
        }
    },
    {
        "id": "IMG-16",
        "sceneTitle": "海崖摇椅·海风推动胡桃木摇椅轻轻摇晃",
        "lyricHint": "顺手拉过椅子，坐着听风吹",
        "start": 39.84, "end": 44.04, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.016},
        "camera": {
            "type": "orbit_arc", "focus": [-37.65, 31.02, 971.90],
            "angleFromDeg": 76, "angleToDeg": 112,
            "radiusFrom": 1.62, "radiusTo": 1.44,
            "heightFrom": 0.34, "heightTo": 0.26,
            "lookLiftFrom": -0.02, "lookLiftTo": 0.04,
            "fov": 44, "sway": 0.005
        }
    },
    {
        "id": "IMG-17",
        "sceneTitle": "白鸽塔檐·阳光屋脊白鸽与掠过晴空的飞鸟",
        "lyricHint": "麻雀落在栏杆，梳了梳后背",
        "start": 44.04, "end": 50.80, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.012},
        "camera": {
            "type": "orbit_arc", "focus": [-43.61, 20.2, 1016.95],
            "angleFromDeg": 125, "angleToDeg": 165,
            "radiusFrom": 8.8, "radiusTo": 7.6,
            "heightFrom": 0.4, "heightTo": 1.2,
            "lookLiftFrom": 0.4, "lookLiftTo": 1.0,
            "fov": 46, "sway": 0.006
        }
    },
    {
        "id": "IMG-18",
        "sceneTitle": "观海高台·Claude在晴空露台目送飞鸟入海",
        "lyricHint": "还没等我招手，它又转身起飞",
        "start": 50.80, "end": 57.20, "mode": "stand_pad", "pose": "mocap_goodbye",
        "dof": {"focusDist": "auto", "aperture": 0.028},
        "rider": {"pos": [-55.36, 22.638, 1024.75], "yawDeg": 90.0},
        "camera": {
            "type": "orbit_arc", "focus": [-55.36, 24.18, 1024.75],
            "angleFromDeg": 74, "angleToDeg": 106,
            "radiusFrom": 1.68, "radiusTo": 1.50,
            "heightFrom": 0.10, "heightTo": 0.14,
            "lookLiftFrom": -0.02, "lookLiftTo": 0.04,
            "fov": 44, "sway": 0.005
        }
    },

    # ==================== CH3: CHORUS 1 & INSTRUMENTAL (57.20 - 99.38) ====================
    {
        "id": "IMG-19",
        "sceneTitle": "晴空卧榻·4K亚麻木榻与编织靠枕沐浴暖阳",
        "lyricHint": "阳光晒暖了棉被",
        "start": 57.20, "end": 60.14, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.026},
        "camera": {
            "type": "orbit_arc", "focus": [-20.25, 26.82, 935.95],
            "angleFromDeg": 162, "angleToDeg": 198,
            "radiusFrom": 2.05, "radiusTo": 1.82,
            "heightFrom": 0.34, "heightTo": 0.24,
            "lookLiftFrom": -0.02, "lookLiftTo": 0.04,
            "fov": 44, "sway": 0.004
        }
    },
    {
        "id": "IMG-20",
        "sceneTitle": "海崖花甸·Claude迎风呼吸温柔发呆",
        "lyricHint": "我在旁边发呆，风轻轻吹",
        "start": 60.14, "end": 63.92, "mode": "stand_pad", "pose": "mocap_idle_warm",
        "dof": {"focusDist": "auto", "aperture": 0.032},
        "rider": {"pos": [-37.99, 30.516, 974.35], "yawDeg": 90.0},
        "camera": {
            "type": "orbit_arc", "focus": [-37.99, 32.06, 974.35],
            "angleFromDeg": 72, "angleToDeg": 108,
            "radiusFrom": 1.56, "radiusTo": 1.40,
            "heightFrom": 0.08, "heightTo": 0.05,
            "lookLiftFrom": -0.02, "lookLiftTo": 0.02,
            "fov": 42, "sway": 0.004
        }
    },
    {
        "id": "IMG-21",
        "sceneTitle": "海崖茶桌·切面水晶花瓶与青花茶盏日影",
        "lyricHint": "玻璃杯的影子，晃了几个来回",
        "start": 63.92, "end": 67.48, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.036},
        "camera": {
            "type": "orbit_arc", "focus": [-37.48, 31.36, 976.68],
            "angleFromDeg": 112, "angleToDeg": 76,
            "radiusFrom": 0.86, "radiusTo": 0.74,
            "heightFrom": 0.26, "heightTo": 0.20,
            "lookLiftFrom": -0.02, "lookLiftTo": 0.02,
            "fov": 38, "sway": 0.003
        }
    },
    {
        "id": "IMG-22",
        "sceneTitle": "海湾背景·Claude琥珀眼眸弯起甜笑",
        "lyricHint": "连一口温水，都有甜甜的滋味",
        "start": 67.48, "end": 71.36, "mode": "stand_pad", "pose": "mocap_blush_happy",
        "dof": {"focusDist": "auto", "aperture": 0.032},
        "rider": {"pos": [-2.25, 30.394, 952.05], "yawDeg": 318.0},
        "camera": {
            "type": "orbit_arc", "focus": [-2.25, 31.94, 952.05],
            "angleFromDeg": 236, "angleToDeg": 208,
            "radiusFrom": 1.48, "radiusTo": 1.32,
            "heightFrom": 0.06, "heightTo": 0.10,
            "lookLiftFrom": -0.02, "lookLiftTo": 0.02,
            "fov": 41, "sway": 0.004
        }
    },
    {
        "id": "IMG-23",
        "sceneTitle": "仰角空镜·赤陶屋檐与停驻晴云飞鸟",
        "lyricHint": "云停在屋顶，像忘记了起飞",
        "start": 71.36, "end": 74.34, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.006},
        "camera": {
            "type": "world_lerp",
            "from": [-68.0, 12.5, 1064.0], "to": [-64.0, 14.2, 1060.5],
            "lookFrom": [-50.2, 26.5, 1041.2], "lookTo": [-48.0, 32.0, 1036.0],
            "fovFrom": 54, "fovTo": 50, "sway": 0.008
        }
    },
    {
        "id": "IMG-24",
        "sceneTitle": "扫描微距·圆框眼镜与精装典籍沐浴金光",
        "lyricHint": "书里的故事，留到下次再回味",
        "start": 74.34, "end": 77.86, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.036},
        "camera": {
            "type": "orbit_arc", "focus": [-1.05, 31.18, 951.04],
            "angleFromDeg": 28, "angleToDeg": 72,
            "radiusFrom": 0.86, "radiusTo": 0.74,
            "heightFrom": 0.28, "heightTo": 0.22,
            "lookLiftFrom": -0.02, "lookLiftTo": 0.02,
            "fov": 38, "sway": 0.003
        }
    },
    {
        "id": "IMG-25",
        "sceneTitle": "书院远景·Claude在晴空花坡前悠然舒展",
        "lyricHint": "靠着椅背，慢慢伸直了腿",
        "start": 77.86, "end": 81.56, "mode": "stand_pad", "pose": "mocap_relax",
        "dof": {"focusDist": "auto", "aperture": 0.028},
        "rider": {"pos": [-2.25, 30.394, 952.05], "yawDeg": 317.0},
        "camera": {
            "type": "orbit_arc", "focus": [-2.25, 31.90, 952.05],
            "angleFromDeg": 240, "angleToDeg": 206,
            "radiusFrom": 1.82, "radiusTo": 1.62,
            "heightFrom": 0.12, "heightTo": 0.08,
            "lookLiftFrom": -0.02, "lookLiftTo": 0.02,
            "fov": 44, "sway": 0.005
        }
    },
    {
        "id": "IMG-26",
        "sceneTitle": "温柔小憩·Claude合眼浅眠沐浴海风",
        "lyricHint": "闭上眼睛，准了困意作陪",
        "start": 81.56, "end": 86.11, "mode": "stand_pad", "pose": "mocap_sleepy",
        "dof": {"focusDist": "auto", "aperture": 0.034},
        "rider": {"pos": [-37.99, 30.516, 974.35], "yawDeg": 90.0},
        "camera": {
            "type": "orbit_arc", "focus": [-37.99, 32.08, 974.35],
            "angleFromDeg": 76, "angleToDeg": 106,
            "radiusFrom": 1.42, "radiusTo": 1.28,
            "heightFrom": 0.06, "heightTo": 0.04,
            "lookLiftFrom": -0.02, "lookLiftTo": 0.0,
            "fov": 40, "sway": 0.004
        }
    },
    # Instrumental Break (86.11 - 99.38)
    {
        "id": "IMG-27",
        "sceneTitle": "间奏空镜一·果园农庄晾衣绳与苹果树",
        "lyricHint": "吉他间奏 · 田园果林与微风白床单",
        "start": 86.11, "end": 90.55, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.008},
        "camera": {
            "type": "world_lerp",
            "from": [-415.5, 49.2, 268.5], "to": [-418.0, 49.6, 266.2],
            "lookFrom": [-421.1, 48.6, 263.6], "lookTo": [-423.5, 49.0, 261.0],
            "fovFrom": 52, "fovTo": 48, "sway": 0.010
        }
    },
    {
        "id": "IMG-28",
        "sceneTitle": "间奏空镜二·祈愿古松巅俯瞰蔚蓝海湾",
        "lyricHint": "吉他间奏 · 山巅松风与层叠云影",
        "start": 90.55, "end": 95.00, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.006},
        "camera": {
            "type": "world_lerp",
            "from": [692.0, 279.5, 62.0], "to": [696.5, 280.8, 56.5],
            "lookFrom": [704.0, 279.0, 50.0], "lookTo": [706.0, 281.0, 46.0],
            "fovFrom": 54, "fovTo": 50, "sway": 0.012
        }
    },
    {
        "id": "IMG-29",
        "sceneTitle": "间奏空镜三·金色浅滩与海浪轻拍",
        "lyricHint": "吉他间奏 · 金盏花海滩与碎浪",
        "start": 95.00, "end": 99.38, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.006},
        "camera": {
            "type": "world_lerp",
            "from": [-1465.0, 6.2, 475.0], "to": [-1472.0, 5.4, 468.0],
            "lookFrom": [-1482.0, 3.6, 456.0], "lookTo": [-1488.0, 4.2, 450.0],
            "fovFrom": 54, "fovTo": 50, "sway": 0.014
        }
    },

    # ==================== CH4: VERSE 2 & PRE-CHORUS 2 (99.38 - 126.76) ====================
    {
        "id": "IMG-30",
        "sceneTitle": "街巷跟拍·青绿复古单车滑过向阳花甸石板路",
        "lyricHint": "楼下单车经过，铃声干净清脆",
        "start": 99.38, "end": 103.00, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.024},
        "camera": {
            "type": "world_lerp",
            "from": [-105.5, 5.75, 1068.65], "to": [-94.2, 5.88, 1068.45],
            "lookFrom": [-106.5, 5.48, 1065.90], "lookTo": [-95.5, 5.52, 1065.90],
            "fovFrom": 48, "fovTo": 44, "sway": 0.008
        }
    },
    {
        "id": "IMG-31",
        "sceneTitle": "原生晾衣绳·海港小巷白衣随风摇晃",
        "lyricHint": "衣架上的衬衫，摇摇晃晃来回",
        "start": 103.00, "end": 106.14, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.018},
        "camera": {
            "type": "world_lerp",
            "from": [-110.8, 6.15, 1082.2], "to": [-111.6, 6.28, 1081.4],
            "lookFrom": [-113.89, 6.05, 1079.96], "lookTo": [-114.1, 6.18, 1079.80],
            "fovFrom": 44, "fovTo": 40, "sway": 0.006
        }
    },
    {
        "id": "IMG-32",
        "sceneTitle": "染坊风台·Claude感受午后阳光余味",
        "lyricHint": "我把被子收回来，阳光还留着余味",
        "start": 106.14, "end": 109.52, "mode": "stand_pad", "pose": "mocap_blush_happy",
        "dof": {"focusDist": "auto", "aperture": 0.030},
        "rider": {"pos": [-43.96, 17.50, 1071.43], "yawDeg": 182.0},
        "camera": {
            "type": "orbit_arc", "focus": [-43.96, 19.04, 1071.43],
            "angleFromDeg": -20, "angleToDeg": 16,
            "radiusFrom": 1.56, "radiusTo": 1.38,
            "heightFrom": 0.08, "heightTo": 0.12,
            "lookLiftFrom": -0.02, "lookLiftTo": 0.02,
            "fov": 43, "sway": 0.005
        }
    },
    {
        "id": "IMG-33",
        "sceneTitle": "书院花海·Claude倦意微醺轻眨双眸",
        "lyricHint": "还没走到床边，就有一点想睡",
        "start": 109.52, "end": 113.64, "mode": "stand_pad", "pose": "mocap_sleepy",
        "dof": {"focusDist": "auto", "aperture": 0.030},
        "rider": {"pos": [-2.25, 30.394, 952.05], "yawDeg": 318.0},
        "camera": {
            "type": "orbit_arc", "focus": [-2.25, 31.94, 952.05],
            "angleFromDeg": 236, "angleToDeg": 208,
            "radiusFrom": 1.54, "radiusTo": 1.38,
            "heightFrom": 0.08, "heightTo": 0.06,
            "lookLiftFrom": -0.02, "lookLiftTo": 0.02,
            "fov": 42, "sway": 0.004
        }
    },
    {
        "id": "IMG-34",
        "sceneTitle": "山庄晒场·微风掀起花园晾衣绳白布又轻落",
        "lyricHint": "风把窗帘掀开，又轻轻放回",
        "start": 113.64, "end": 120.06, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.014},
        "camera": {
            "type": "world_lerp",
            "from": [-8.8, 46.9, 318.2], "to": [-10.0, 47.2, 316.8],
            "lookFrom": [-12.31, 46.85, 314.71], "lookTo": [-12.6, 47.05, 314.4],
            "fovFrom": 46, "fovTo": 42, "sway": 0.006
        }
    },
    {
        "id": "IMG-35",
        "sceneTitle": "静物精模·靠枕轻搭芒果天鹅绒扶手椅",
        "lyricHint": "晾好的那件衬衫，替我占了椅背",
        "start": 120.06, "end": 126.76, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.032},
        "camera": {
            "type": "orbit_arc", "focus": [-55.36, 23.12, 1023.86],
            "angleFromDeg": 88, "angleToDeg": 128,
            "radiusFrom": 1.52, "radiusTo": 1.36,
            "heightFrom": 0.24, "heightTo": 0.18,
            "lookLiftFrom": -0.02, "lookLiftTo": 0.04,
            "fov": 42, "sway": 0.004
        }
    },

    # ==================== CH5: CHORUS 2 & BRIDGE DREAM (126.76 - 182.40) ====================
    {
        "id": "IMG-36",
        "sceneTitle": "卧榻金晖·4K亚麻床榻与靠枕沐浴午后暖光",
        "lyricHint": "阳光晒暖了棉被",
        "start": 126.76, "end": 129.70, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.028},
        "camera": {
            "type": "orbit_arc", "focus": [-20.15, 26.82, 935.95],
            "angleFromDeg": 200, "angleToDeg": 164,
            "radiusFrom": 1.92, "radiusTo": 1.72,
            "heightFrom": 0.28, "heightTo": 0.22,
            "lookLiftFrom": -0.02, "lookLiftTo": 0.04,
            "fov": 43, "sway": 0.004
        }
    },
    {
        "id": "IMG-37",
        "sceneTitle": "书院露台·Claude迎着碧海晴云安静发呆",
        "lyricHint": "我在旁边发呆，风轻轻吹",
        "start": 129.70, "end": 133.38, "mode": "stand_pad", "pose": "mocap_thinking",
        "dof": {"focusDist": "auto", "aperture": 0.030},
        "rider": {"pos": [-2.25, 30.394, 952.05], "yawDeg": 318.0},
        "camera": {
            "type": "orbit_arc", "focus": [-2.25, 31.94, 952.05],
            "angleFromDeg": 206, "angleToDeg": 236,
            "radiusFrom": 1.56, "radiusTo": 1.42,
            "heightFrom": 0.08, "heightTo": 0.12,
            "lookLiftFrom": -0.02, "lookLiftTo": 0.02,
            "fov": 43, "sway": 0.005
        }
    },
    {
        "id": "IMG-38",
        "sceneTitle": "向海茶具·白瓷茶壶与水晶花瓶日影轻摇",
        "lyricHint": "玻璃杯的影子，晃了几个来回",
        "start": 133.38, "end": 137.00, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.036},
        "camera": {
            "type": "orbit_arc", "focus": [-37.52, 31.35, 976.60],
            "angleFromDeg": 74, "angleToDeg": 110,
            "radiusFrom": 0.80, "radiusTo": 0.68,
            "heightFrom": 0.22, "heightTo": 0.16,
            "lookLiftFrom": -0.02, "lookLiftTo": 0.02,
            "fov": 38, "sway": 0.003
        }
    },
    {
        "id": "IMG-39",
        "sceneTitle": "海风浅笑·Claude在蜜金斜阳里温柔微笑",
        "lyricHint": "连一口温水，都有甜甜的滋味",
        "start": 137.00, "end": 141.12, "mode": "stand_pad", "pose": "mocap_poise",
        "dof": {"focusDist": "auto", "aperture": 0.032},
        "rider": {"pos": [-37.99, 30.516, 974.35], "yawDeg": 90.0},
        "camera": {
            "type": "orbit_arc", "focus": [-37.99, 32.06, 974.35],
            "angleFromDeg": 108, "angleToDeg": 74,
            "radiusFrom": 1.52, "radiusTo": 1.36,
            "heightFrom": 0.08, "heightTo": 0.06,
            "lookLiftFrom": -0.02, "lookLiftTo": 0.02,
            "fov": 41, "sway": 0.004
        }
    },
    {
        "id": "IMG-40",
        "sceneTitle": "海岛全景·白云低垂停驻港湾屋顶",
        "lyricHint": "云停在屋顶，像忘记了起飞",
        "start": 141.12, "end": 143.94, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.004},
        "camera": {
            "type": "world_lerp",
            "from": [-128.0, 28.5, 1098.0], "to": [-118.0, 31.0, 1092.0],
            "lookFrom": [-65.0, 24.0, 1055.0], "lookTo": [-55.0, 28.0, 1045.0],
            "fovFrom": 54, "fovTo": 50, "sway": 0.010
        }
    },
    {
        "id": "IMG-41",
        "sceneTitle": "晴空座钟·雕花座钟与机械计时腕表微距",
        "lyricHint": "书里的故事，留到下次再回味",
        "start": 143.94, "end": 147.42, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.036},
        "camera": {
            "type": "orbit_arc", "focus": [-21.67, 27.03, 936.01],
            "angleFromDeg": 162, "angleToDeg": 202,
            "radiusFrom": 0.78, "radiusTo": 0.66,
            "heightFrom": 0.16, "heightTo": 0.12,
            "lookLiftFrom": -0.02, "lookLiftTo": 0.02,
            "fov": 38, "sway": 0.003
        }
    },
    {
        "id": "IMG-42",
        "sceneTitle": "向海木摇椅·金色午后摇椅与海湾花甸",
        "lyricHint": "靠着椅背，慢慢伸直了腿",
        "start": 147.42, "end": 151.12, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.030},
        "camera": {
            "type": "orbit_arc", "focus": [-37.65, 31.02, 971.90],
            "angleFromDeg": 112, "angleToDeg": 76,
            "radiusFrom": 1.56, "radiusTo": 1.40,
            "heightFrom": 0.20, "heightTo": 0.26,
            "lookLiftFrom": -0.02, "lookLiftTo": 0.04,
            "fov": 42, "sway": 0.004
        }
    },
    {
        "id": "IMG-43",
        "sceneTitle": "海崖浅眠·Claude在古堡长廊合眼入梦",
        "lyricHint": "闭上眼睛，准了困意作陪",
        "start": 151.12, "end": 155.88, "mode": "stand_pad", "pose": "mocap_sleepy",
        "dof": {"focusDist": "auto", "aperture": 0.032},
        "rider": {"pos": [-37.99, 30.516, 974.35], "yawDeg": 90.0},
        "camera": {
            "type": "orbit_arc", "focus": [-37.99, 32.08, 974.35],
            "angleFromDeg": 106, "angleToDeg": 76,
            "radiusFrom": 1.38, "radiusTo": 1.24,
            "heightFrom": 0.06, "heightTo": 0.04,
            "lookLiftFrom": -0.02, "lookLiftTo": 0.0,
            "fov": 40, "sway": 0.004
        }
    },
    # Bridge (155.88 - 182.40)
    {
        "id": "IMG-44",
        "sceneTitle": "绒椅暖光·斜阳抚过芒果天鹅绒扶手椅与绿植",
        "lyricHint": "光从我的手边，挪到了椅背",
        "start": 155.88, "end": 161.62, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.030},
        "camera": {
            "type": "orbit_arc", "focus": [-55.36, 23.12, 1023.86],
            "angleFromDeg": 130, "angleToDeg": 90,
            "radiusFrom": 1.62, "radiusTo": 1.44,
            "heightFrom": 0.22, "heightTo": 0.28,
            "lookLiftFrom": -0.04, "lookLiftTo": 0.06,
            "fov": 42, "sway": 0.004
        }
    },
    {
        "id": "IMG-45",
        "sceneTitle": "教堂钟楼·高塔铜钟与隔门慢淌的午后金光",
        "lyricHint": "钟声隔着一道门，比刚才慢了几倍",
        "start": 161.62, "end": 168.12, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.012},
        "camera": {
            "type": "orbit_arc", "focus": [-91.87, 23.5, 1048.56],
            "angleFromDeg": 55, "angleToDeg": 92,
            "radiusFrom": 12.5, "radiusTo": 10.5,
            "heightFrom": -1.2, "heightTo": 0.8,
            "lookLiftFrom": 0.0, "lookLiftTo": 1.2,
            "fov": 48, "sway": 0.008
        }
    },
    {
        "id": "IMG-46",
        "sceneTitle": "睡意朦胧·Claude背靠金色海湾长睫微垂",
        "lyricHint": "我还想再看一眼，眼皮却往下垂",
        "start": 168.12, "end": 175.46, "mode": "stand_pad", "pose": "mocap_sleepy",
        "dof": {"focusDist": "auto", "aperture": 0.034},
        "rider": {"pos": [-2.25, 30.394, 952.05], "yawDeg": 318.0},
        "camera": {
            "type": "orbit_arc", "focus": [-2.25, 31.96, 952.05],
            "angleFromDeg": 212, "angleToDeg": 232,
            "radiusFrom": 1.36, "radiusTo": 1.22,
            "heightFrom": 0.06, "heightTo": 0.04,
            "lookLiftFrom": -0.01, "lookLiftTo": 0.01,
            "fov": 39, "sway": 0.003
        }
    },
    {
        "id": "IMG-47",
        "sceneTitle": "山巅晒衣绳·高岗白床单与漫天积云同框",
        "lyricHint": "梦里晾着一片云，和晒暖的棉被",
        "start": 175.46, "end": 182.40, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.012},
        "camera": {
            "type": "world_lerp",
            "from": [-762.8, 102.05, -234.8], "to": [-764.0, 102.25, -235.9],
            "lookFrom": [-766.33, 102.85, -238.47], "lookTo": [-766.8, 103.35, -239.2],
            "fovFrom": 52, "fovTo": 47, "sway": 0.010
        }
    },

    # ==================== CH6: FINAL CHORUS & OUTRO (182.40 - 228.89) ====================
    {
        "id": "IMG-48",
        "sceneTitle": "云海草甸·山巅风吹白衣与金色流云",
        "lyricHint": "阳光晒暖了棉被 / 我在梦里发呆，风轻轻吹",
        "start": 182.40, "end": 188.76, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.010},
        "camera": {
            "type": "orbit_arc", "focus": [-766.33, 102.6, -238.47],
            "angleFromDeg": 25, "angleToDeg": 68,
            "radiusFrom": 6.2, "radiusTo": 5.2,
            "heightFrom": -0.3, "heightTo": 0.2,
            "lookLiftFrom": 0.2, "lookLiftTo": 0.7,
            "fov": 50, "sway": 0.008
        }
    },
    {
        "id": "IMG-49",
        "sceneTitle": "石阶暖影·门外安静城门回廊与拉长日影",
        "lyricHint": "门外的脚步声，轻轻走了个来回 / 一下午的时间，够我慢慢体会",
        "start": 188.76, "end": 195.94, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.010},
        "camera": {
            "type": "world_lerp",
            "from": [-60.5, 6.8, 1058.5], "to": [-55.2, 7.4, 1053.5],
            "lookFrom": [-50.2, 7.2, 1043.0], "lookTo": [-48.5, 8.5, 1041.2],
            "fovFrom": 50, "fovTo": 46, "sway": 0.008
        }
    },
    {
        "id": "IMG-50",
        "sceneTitle": "暮金斜阳·温暖夕照漫过4K亚麻木榻床尾",
        "lyricHint": "等到醒来，光已经挪到床尾",
        "start": 195.94, "end": 200.90, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.026},
        "camera": {
            "type": "orbit_arc", "focus": [-20.55, 26.80, 935.95],
            "angleFromDeg": 166, "angleToDeg": 200,
            "radiusFrom": 1.95, "radiusTo": 1.75,
            "heightFrom": 0.30, "heightTo": 0.22,
            "lookLiftFrom": -0.02, "lookLiftTo": 0.04,
            "fov": 43, "sway": 0.004
        }
    },
    {
        "id": "IMG-51",
        "sceneTitle": "暮空苏醒·Claude轻仰脸庞望向橘蓝暮空",
        "lyricHint": "伸个懒腰，天还没黑",
        "start": 200.90, "end": 205.36, "mode": "stand_pad", "pose": "mocap_wake_joy",
        "dof": {"focusDist": "auto", "aperture": 0.028},
        "rider": {"pos": [-43.96, 17.50, 1071.43], "yawDeg": 180.0},
        "camera": {
            "type": "orbit_arc", "focus": [-43.96, 19.04, 1071.43],
            "angleFromDeg": -18, "angleToDeg": 18,
            "radiusFrom": 1.66, "radiusTo": 1.48,
            "heightFrom": 0.06, "heightTo": 0.12,
            "lookLiftFrom": -0.02, "lookLiftTo": 0.04,
            "fov": 44, "sway": 0.005
        }
    },
    {
        "id": "IMG-52",
        "sceneTitle": "夕照茶盏·海湾背景下的青花骨瓷杯微距",
        "lyricHint": "水还剩半杯",
        "start": 205.36, "end": 208.55, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.038},
        "camera": {
            "type": "orbit_arc", "focus": [-37.45, 31.32, 976.34],
            "angleFromDeg": 82, "angleToDeg": 108,
            "radiusFrom": 0.58, "radiusTo": 0.48,
            "heightFrom": 0.15, "heightTo": 0.11,
            "lookLiftFrom": -0.01, "lookLiftTo": 0.01,
            "fov": 36, "sway": 0.003
        }
    },
    {
        "id": "IMG-53",
        "sceneTitle": "温柔陪伴·Claude凭栏静看暮金海湾",
        "lyricHint": "我再坐一会",
        "start": 208.55, "end": 213.80, "mode": "stand_pad", "pose": "mocap_relax",
        "dof": {"focusDist": "auto", "aperture": 0.026},
        "rider": {"pos": [-37.99, 30.516, 974.35], "yawDeg": 90.0},
        "camera": {
            "type": "orbit_arc", "focus": [-37.99, 32.04, 974.35],
            "angleFromDeg": 74, "angleToDeg": 108,
            "radiusFrom": 1.65, "radiusTo": 1.88,
            "heightFrom": 0.10, "heightTo": 0.18,
            "lookLiftFrom": -0.02, "lookLiftTo": 0.04,
            "fov": 44, "sway": 0.005
        }
    },
    # Guitar Outro Fade (213.80 - 228.89)
    {
        "id": "IMG-54",
        "sceneTitle": "尾奏摇臂一·从书院海台缓缓升向暮金碧海",
        "lyricHint": "木吉他尾奏 · 晚风拂过露台与花坡",
        "start": 213.80, "end": 219.00, "mode": "stand_pad", "pose": "mocap_idle_warm",
        "dof": {"focusDist": "auto", "aperture": 0.010},
        "rider": {"pos": [-2.25, 30.394, 952.05], "yawDeg": 318.0},
        "camera": {
            "type": "orbit_arc", "focus": [-2.25, 31.85, 952.05],
            "angleFromDeg": 218, "angleToDeg": 244,
            "radiusFrom": 2.40, "radiusTo": 5.80,
            "heightFrom": 0.35, "heightTo": 1.85,
            "lookLiftFrom": 0.0, "lookLiftTo": 0.35,
            "fov": 48, "sway": 0.008
        }
    },
    {
        "id": "IMG-55",
        "sceneTitle": "尾奏摇臂二·暮色海港渔船与橘粉晴空",
        "lyricHint": "木吉他尾奏 · 天还没黑的温柔海湾",
        "start": 219.00, "end": 224.00, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.006},
        "camera": {
            "type": "world_lerp",
            "from": [-62.0, 5.8, 1148.0], "to": [-72.0, 11.5, 1162.0],
            "lookFrom": [-55.0, 6.5, 1126.0], "lookTo": [-58.0, 12.0, 1095.0],
            "fovFrom": 54, "fovTo": 58, "sway": 0.012
        }
    },
    {
        "id": "IMG-56",
        "sceneTitle": "终章远景·整座海岛沐浴余晖渐隐",
        "lyricHint": "终章 · 阳光晒暖了被",
        "start": 224.00, "end": 228.89, "mode": "unmanned",
        "dof": {"focusDist": "auto", "aperture": 0.004},
        "camera": {
            "type": "world_lerp",
            "from": [-95.0, 36.0, 1185.0], "to": [-108.0, 46.0, 1212.0],
            "lookFrom": [-72.0, 18.0, 1065.0], "lookTo": [-68.0, 22.0, 1055.0],
            "fovFrom": 56, "fovTo": 60, "sway": 0.010
        }
    },
]

def main():
    revisions = json.loads((OUT_PATH.parent / "shot_revisions_20261117.json").read_text(encoding="utf-8"))
    for shot in SHOTS:
        shot.update(revisions["shots"].get(shot["id"], {}))
        if shot["mode"].startswith("fly_"):
            shot.pop("pose", None)
    assert len(LYRICS) == 44
    prev_end = 0.0
    for s in SHOTS:
        assert abs(s["start"] - prev_end) < 1e-6, f"Gap at {s['id']}"
        dur = s["end"] - s["start"]
        assert 0.8 <= dur <= 7.6, f"Duration violation at {s['id']}: {dur}"
        prev_end = s["end"]
    assert abs(prev_end - 228.89) < 1e-6

    data = {
        "meta": {
            "title": "阳光晒暖了被",
            "artist": "Weckham",
            "clipDuration": 228.89,
            "fullDuration": 228.89,
            "fps": 30,
            "width": 720,
            "height": 960,
            "revision": revisions["revision"],
        },
        "titleCard": {"start": 0.55, "end": 4.85, "title": "阳光晒暖了被"},
        "endTitleCard": {"start": 223.20, "end": 228.10, "title": "阳光晒暖了被"},
        "chapters": CHAPTERS,
        "lyrics": LYRICS,
        "shots": SHOTS,
    }
    OUT_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[OK] Wrote {OUT_PATH} ({len(SHOTS)} shots, {revisions['revision']})")

if __name__ == "__main__":
    main()
