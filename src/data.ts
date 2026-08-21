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
