# playground/

视觉 / 交互 / 组件效果的预览沙盒。在写进 `app/web/src/` 之前,先在这里用单文件 HTML 跑视觉效果,确认 OK 再按项目结构落地。

## 目录

- `index.html` — 侧栏导航 + iframe 容器,所有 demos 的入口
- `demos/` — 各 demo 独立 HTML,自带 `<style>`,不依赖构建

## 什么时候用

- 设计新组件,先看多种动效 / 配色 / 尺寸对比
- 评估主题色搭配
- 任何「先看效果再决定怎么写」的视觉探索

## 什么时候不要用

- 已是项目代码 → `app/web/src/`
- 设计规范文档 → `docs/design-system.md`
- 临时单次实验 → `tmp/`

## Demo 命名

kebab-case + 后缀(如 `loading-dots-demo.html`、`theme-colors.html`)。
进入 playground 后,`tmp/` 同名文件删除,避免双份。

## 配色与字体

playground 不走 Vite,各 demo 直接用与项目一致的色值:

- 背景 `#171717`、侧栏 `#1E1E1E`、边框 `#2A2A2A`
- 字体 `-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif`

## 禁止

- 不要放依赖 `npm install` / 构建的代码(纯静态)
- 不要把已落地组件代码拷一份对照(对照应在 `app/web/src/ui/`)
