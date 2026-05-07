# HoyoPlay Gacha Tracker / 米游抽卡统计

绝区零（Zenless Zone Zero）与原神（Genshin Impact）抽卡记录统计与可视化桌面工具，基于 Electron + React 构建，数据完全本地存储。

## 功能特性

- **双游戏支持**：绝区零 / 原神一键切换，独立数据管理
- **多卡池统计**：
  - 绝区零：独家频段、音擎频段、常驻频段、邦布频段
  - 原神：角色活动祈愿、武器活动祈愿、常驻祈愿、集录祈愿
- **环形图可视化**：各卡池最高稀有度出率一目了然
- **时间线记录**：按时间轴展示获取记录，标注抽数间隔
- **保底计数**：实时显示当前保底进度，渐变色直观提示
- **保底类型判断**：自动识别小保底 / 大保底状态
- **捕获明光概率**：原神小保底时显示捕获明光触发概率（基于社区统计模型）
- **多账号管理**：支持多 UID 切换浏览
- **增量同步**：仅拉取新增记录，避免重复请求
- **一键导出**：将时间线导出为 1080×1920 分享图片
- **图标自动获取**：从米哈游 Wiki API 拉取物品图标

## 技术栈

| 技术 | 用途 |
|------|------|
| Electron 33 | 桌面应用框架 |
| React 18 | 前端 UI |
| Vite 5 | 构建工具 |
| ECharts 5 | 数据可视化 |
| sql.js | 本地 SQLite 数据库（WASM，无需原生编译） |
| html2canvas | 图片导出 |

## 环境要求

- Windows 操作系统
- Node.js >= 18
- npm >= 9
- 绝区零或原神游戏客户端（用于读取日志提取 authkey）

## 安装与运行

```bash
# 克隆仓库
git clone https://github.com/Aimang2002/hoyoplay-gacha-tracker.git
cd hoyoplay-gacha-tracker

# 安装依赖
npm install

# 启动开发环境
npm run dev

# 构建 Windows 版本
npm run build:win
```

## 使用方法

1. 启动游戏客户端（绝区零或原神）
2. 在游戏内打开抽卡历史记录页面（生成 authkey）
3. 在工具界面选择对应游戏，点击「同步数据」按钮
4. 等待数据拉取完成，即可查看统计信息

## 数据存储

所有数据保存在本地 `data/gacha.db`（SQLite），首次运行时自动创建，不会上传至任何服务器。

## 捕获明光概率模型

原神 5.0 版本（2024 年 8 月 28 日起）引入了「捕获明光」机制：小保底歪了之后，下次小保底不歪的概率会提升。连歪次数越多，捕获明光触发概率越高。

本工具使用的概率模型来自社区统计：

| 连歪次数 | 捕获明光概率 |
|----------|-------------|
| 1 | 4.55% |
| 2 | 45.45% |
| 3 | 100% |

**数据来源**：[知乎 - 原神5.0捕获明光机制讨论](https://www.zhihu.com/question/664442510)

## 致谢

本项目参考了以下项目获取 authkey 的方式：

- [genshin-wish-export](https://github.com/biuuu/genshin-wish-export)
- [zzz-signal-search-export](https://github.com/earthjasonlin/zzz-signal-search-export)

捕获明光概率模型来源：

- [知乎 - 原神5.0捕获明光机制讨论](https://www.zhihu.com/question/664442510)

## 开源协议

[MIT License](LICENSE)
