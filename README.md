# ZZZ Gacha Stats / 绝区零抽卡统计

绝区零（Zenless Zone Zero）抽卡记录统计与可视化桌面工具，基于 Electron + React 构建。

## 功能特性

- 多卡池统计：独家频段、音擎频段、常驻频段、邦布频段独立统计
- 环形图可视化：各卡池 S/A/B 级出率一目了然
- 时间线记录：按时间轴展示 S/A 级获取记录，标注抽数间隔
- 保底计数：实时显示当前保底进度，渐变色直观提示
- 多账号管理：支持多 UID 切换浏览
- 增量同步：仅拉取新增记录，避免重复请求
- 一键导出：将时间线导出为 1080x1920 分享图片
- 图标自动获取：从米哈游 Wiki API 拉取物品图标

## 技术栈

- Electron - 桌面应用框架
- React 18 - 前端 UI
- Vite 5 - 构建工具
- ECharts 5 - 数据可视化
- sql.js - 本地 SQLite 数据库（WASM，无需原生编译）

## 环境要求

- Node.js >= 18
- npm >= 9
- 绝区零游戏客户端（用于读取 Player.log）

## 安装与运行

```bash
# 克隆仓库
git clone https://github.com/Aimang/zzz-gacha-stats.git
cd zzz-gacha-stats

# 安装依赖
npm install

# 启动开发环境
npm run dev
```

## 使用方法

1. 启动绝区零游戏客户端
2. 在游戏内打开「调频」页面的抽卡历史记录（生成 authkey）
3. 点击工具界面的「同步数据」按钮
4. 等待数据拉取完成，即可查看统计信息

## 数据存储

所有数据保存在本地 `data/gacha.db`（SQLite），首次运行时自动创建，不会上传至任何服务器。

## 项目结构

```
zzz-gacha-stats/
  electron/
    main.js      # Electron 主进程
    preload.js   # 预加载脚本（IPC 桥接）
    db.js        # 数据库操作
    api.js       # 米哈游 API 请求
    parser.js    # Player.log 解析
  src/
    App.jsx      # 主应用组件
    App.css      # 全局样式
    main.jsx     # React 入口
    components/
      GachaPieChart.jsx  # 环形图组件
      STimeline.jsx      # 时间线组件
      ShareExport.jsx    # 导出分享组件
      TitleBar.jsx       # 自定义标题栏
  data/          # 运行时数据（已忽略）
  启动.bat       # 一键启动脚本
```

## 开源协议

[MIT License](LICENSE)
