// 游戏前缀映射：gameBiz 前缀 → 游戏ID
const GAME_BIZ_PREFIXES = {
  'hk4e': 'genshin',
  'nap': 'zzz',
}

const GAMES = {
  zzz: {
    id: 'zzz',
    name: '绝区零',
    gameBiz: 'nap_cn',
    logFile: 'Player.log',
    logPath: 'miHoYo/绝区零',
    pools: {
      1: '常驻频段',
      2: '独家频段',
      3: '音擎频段',
      5: '邦布频段',
    },
    rankConfig: {
      4: { label: 'S', fullLabel: 'S级', color: '#f59e0b' },
      3: { label: 'A', fullLabel: 'A级', color: '#8b5cf6' },
      2: { label: 'B', fullLabel: 'B级', color: '#94a3b8' },
    },
    pityMax: 90,
    standardItems: ['11号', '莱卡恩', '丽娜', '珂蕾妲', '猫宫又奈', '格莉斯'],
    iconApi: 'https://act-api-takumi-static.mihoyo.com/common/blackboard/zzz_wiki/v1/home/content/list?app_sn=zzz_wiki&channel_id=2',
    apiUrl: 'https://public-operation-nap.mihoyo.com/common/gacha_record/api/getGachaLog',
  },
  genshin: {
    id: 'genshin',
    name: '原神',
    gameBiz: 'hk4e_cn',
    logFile: 'output_log.txt',
    logPath: 'miHoYo/原神',
    pools: {
      301: '角色活动祈愿',
      302: '武器活动祈愿',
      500: '集录祈愿',
      200: '常驻祈愿',
    },
    rankConfig: {
      5: { label: '5', fullLabel: '5星', color: '#f59e0b' },
      4: { label: '4', fullLabel: '4星', color: '#8b5cf6' },
      3: { label: '3', fullLabel: '3星', color: '#94a3b8' },
    },
    pityMax: 90,
    standardItems: ['琴', '刻晴', '迪卢克', '七七', '莫娜', '提纳里', '迪希雅', '梦见月瑞希'],
    iconApis: [
      'https://act-api-takumi-static.mihoyo.com/common/blackboard/ys_obc/v1/home/content/list?app_sn=ys_obc&channel_id=25',
      'https://act-api-takumi-static.mihoyo.com/common/blackboard/ys_obc/v1/home/content/list?app_sn=ys_obc&channel_id=5',
    ],
    apiUrl: 'https://public-operation-hk4e.mihoyo.com/gacha_info/api/getGachaLog',
    apiUrls: {
      'hk4e_cn': 'https://public-operation-hk4e.mihoyo.com/gacha_info/api/getGachaLog',
      'hk4e_global': 'https://public-operation-hk4e-sg.hoyoverse.com/gacha_info/api/getGachaLog',
    },
  },
}

module.exports = { GAMES, GAME_BIZ_PREFIXES }
