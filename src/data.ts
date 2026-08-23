export const FONT =
  '"Noto Serif SC", "Songti SC", "STSong", "SimSun", serif';

/** 后天八卦，南（上）起顺时针 */
export const HOU_TIAN = [
  { name: "离", lines: [1, 0, 1] },
  { name: "坤", lines: [0, 0, 0] },
  { name: "兑", lines: [0, 1, 1] },
  { name: "乾", lines: [1, 1, 1] },
  { name: "坎", lines: [0, 1, 0] },
  { name: "艮", lines: [1, 0, 0] },
  { name: "震", lines: [0, 0, 1] },
  { name: "巽", lines: [1, 1, 0] },
] as const;

export const LUO_SHU = ["九", "二", "七", "六", "一", "八", "三", "四"];

export const DIRECTIONS_8 = ["南", "西南", "西", "西北", "北", "东北", "东", "东南"];

/** 二十四山，午在上 */
export const MOUNTAINS_24 = [
  "午",
  "丁",
  "未",
  "坤",
  "申",
  "庚",
  "酉",
  "辛",
  "戌",
  "乾",
  "亥",
  "壬",
  "子",
  "癸",
  "丑",
  "艮",
  "寅",
  "甲",
  "卯",
  "乙",
  "辰",
  "巽",
  "巳",
  "丙",
];

export const SOLAR_TERMS = [
  "夏至",
  "小暑",
  "大暑",
  "立秋",
  "处暑",
  "白露",
  "秋分",
  "寒露",
  "霜降",
  "立冬",
  "小雪",
  "大雪",
  "冬至",
  "小寒",
  "大寒",
  "立春",
  "雨水",
  "惊蛰",
  "春分",
  "清明",
  "谷雨",
  "立夏",
  "小满",
  "芒种",
];

export const MANSIONS_28 = [
  "角",
  "亢",
  "氐",
  "房",
  "心",
  "尾",
  "箕",
  "斗",
  "牛",
  "女",
  "虚",
  "危",
  "室",
  "壁",
  "奎",
  "娄",
  "胃",
  "昴",
  "毕",
  "觜",
  "参",
  "井",
  "鬼",
  "柳",
  "星",
  "张",
  "翼",
  "轸",
];

const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const BRANCHES = [
  "子",
  "丑",
  "寅",
  "卯",
  "辰",
  "巳",
  "午",
  "未",
  "申",
  "酉",
  "戌",
  "亥",
];

export const JIA_ZI = Array.from(
  { length: 60 },
  (_, i) => STEMS[i % 10] + BRANCHES[i % 12],
);

export type LayerId = "core" | "rings" | number;

export const LAYER_GUIDE: Array<{
  id: LayerId;
  name: string;
  text: string;
}> = [
  {
    id: "core",
    name: "天池",
    text: "盘心圆池。磁针指南北，红线是海底线，用来把整盘转正。太极只是底纹。",
  },
  {
    id: 0,
    name: "卦象",
    text: "后天八卦的爻画，离南坎北，用来定八方。",
  },
  {
    id: 1,
    name: "卦名",
    text: "八卦的名字，与内圈卦象一一对应。",
  },
  {
    id: 2,
    name: "洛书",
    text: "九宫数理：一白居北、九紫居南，用来排星。",
  },
  {
    id: 3,
    name: "方位",
    text: "东南西北与四隅，读盘时的地理方向。",
  },
  {
    id: 4,
    name: "二十四山",
    text: "罗盘正盘。八干、四维、十二支，用来定坐向。",
  },
  {
    id: 5,
    name: "节气",
    text: "二十四节气，对应太阳在黄道上的位置。",
  },
  {
    id: 6,
    name: "六十甲子",
    text: "六十干支，用来排山家、择日、纳音。",
  },
  {
    id: 7,
    name: "二十八宿",
    text: "周天星宿，对照天星与分野。",
  },
  {
    id: 8,
    name: "周天",
    text: "一圈刻度，把圆周均匀分格，方便对度数。",
  },
  {
    id: 9,
    name: "六十四卦",
    text: "周易六十四卦，有的盘用来配卦气。",
  },
  {
    id: "rings",
    name: "浑仪环",
    text: "外圈活动环，模仿浑天仪的赤道与子午圈，是骨架不是风水盘层。",
  },
];

export const RING_INSCRIPTIONS = [
  ...MOUNTAINS_24,
  ...MANSIONS_28,
  ...SOLAR_TERMS,
  "太极",
  "两仪",
  "四象",
  "八卦",
  "河图",
  "洛书",
  "浑天",
  "璇玑",
];
