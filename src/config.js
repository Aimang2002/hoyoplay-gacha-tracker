export const GAME_CONFIG = {
  zzz: {
    id: 'zzz',
    name: '绝区零',
    title: '米游：抽卡统计',
    recordLabel: '调频记录',
    pools: [
      { type: '2', name: '独家频段' },
      { type: '3', name: '音擎频段' },
      { type: '1', name: '常驻频段' },
      { type: '5', name: '邦布频段' },
    ],
    rankFilters: [
      { value: 4, label: '仅S级' },
      { value: 3, label: 'A级以上' },
    ],
    rankConfig: {
      4: { label: 'S', fullLabel: 'S级', color: '#f59e0b' },
      3: { label: 'A', fullLabel: 'A级', color: '#8b5cf6' },
      2: { label: 'B', fullLabel: 'B级', color: '#94a3b8' },
    },
    pityMax: 90,
    pityRules: {
      2: { type: 'up', pityMax: 90, standardItems: ['11号', '莱卡恩', '丽娜', '珂蕾妲', '猫宫又奈', '格莉斯'] },
      3: { type: 'up', pityMax: 80, standardItems: ['深海访客', '啜泣摇篮', '钢铁肉垫', '拘缚者', '硫磺石', '嵌合编译器', '燃狱齿轮', '加农转子'] },
      1: { type: 'none', pityMax: 90 },
      5: { type: 'none', pityMax: 80 },
    },
  },
  genshin: {
    id: 'genshin',
    name: '原神',
    title: '米游：抽卡统计',
    recordLabel: '祈愿记录',
    pools: [
      { type: '301', name: '角色活动祈愿' },
      { type: '302', name: '武器活动祈愿' },
      { type: '200', name: '常驻祈愿' },
      { type: '500', name: '集录祈愿' },
      { type: '100', name: '新手祈愿' },
    ],
    rankFilters: [
      { value: 5, label: '仅5星' },
      { value: 4, label: '4星以上' },
    ],
    rankConfig: {
      5: { label: '五星', fullLabel: '五星', color: '#f59e0b' },
      4: { label: '四星', fullLabel: '四星', color: '#8b5cf6' },
      3: { label: '三星', fullLabel: '三星', color: '#94a3b8' },
    },
    pityMax: 90,
    // 卡池相位周期（用于命定值轮换判定，仅武器池/集录池需要）：
    // 42天一版本，上半场自版本日 11:00 起，下半场自 20天7小时后（当日 18:00）起；
    // anchor = 7.0版本开启时间（2026-08-12 11:00）。若版本周期调整需同步更新。
    phaseSchedule: {
      anchor: '2026-08-12T11:00:00+08:00',
      versionDays: 42,
      phaseTwoOffsetHours: 487,
    },
    // 各池保底判定规则：type 'up' = 有UP概念可判大小保底（standardItems 为"歪"的对象名单）；
    // 'chronicled' = 集录定轨机制（定轨物品不在API记录中，仅能按卡池周期推断状态）；
    // 'none' = 无UP概念（常驻池），不显示大小保底标签
    // guaranteeWindowDays: 命定值只在当期卡池有效，距上次"歪"超过一个卡池周期(约21天)即视为已清零
    pityRules: {
      301: { type: 'up', pityMax: 90, radiance: true, standardItems: ['琴', '刻晴', '迪卢克', '七七', '莫娜', '提纳里', '迪希雅', '梦见月瑞希'] },
      302: { type: 'up', pityMax: 80, guaranteeWindowDays: 21, standardItems: ['天空之刃', '天空之傲', '天空之脊', '天空之卷', '天空之翼', '阿莫斯之弓', '四风原典', '和璞鸢', '磐岩结绿', '狼的末路'] },
      500: { type: 'chronicled', pityMax: 90, guaranteeWindowDays: 21 },
      200: { type: 'none', pityMax: 90 },
      100: { type: 'none', pityMax: 90 },
    },
  },
}
