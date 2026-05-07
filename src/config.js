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
    standardItems: ['11号', '莱卡恩', '丽娜', '珂蕾妲', '猫宫又奈', '格莉斯'],
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
    standardItems: ['琴', '刻晴', '迪卢克', '七七', '莫娜', '提纳里', '迪希雅', '梦见月瑞希'],
  },
}
