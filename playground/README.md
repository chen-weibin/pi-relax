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

## 动态头像

同一套形状、表情和单色，两页对照。查阅时机：比较 SVG 和 Three.js 的头像表现，还没决定是否写进 `app/web` 时。

- `demos/avatar-demo1.html`（侧栏「动态头像1」，`#avatar1`）。SVG。页内标有「Grok 4.7 实现」。10 款固定圆角几何基底。六个表情各有不同的头部动作。底色只选一个，头像本体是这块纯色。
- `demos/avatar-demo2.html`（侧栏「动态头像2」，`#avatar2`）。Three.js 挤出同一批圆角几何，页内同样标有「Grok 4.7 实现」，动作和选色与动态头像1对应。`three` 从 CDN 加载，不进 `package.json`。

## 卡通头像（可配置）

`demos/avatar-demo3.html`（侧栏「卡通头像」，`#avatar3`）。独立实现，不复用动态头像1/2。Three.js 和 addons 从 CDN 的 importmap 加载。查阅时机：调头像视觉，新增形状、表情或动画，或者要把头像配置搬进 `app/web` 时。

单文件内按顺序分区，各部分互不依赖：

- `DEFAULT_CONFIG`：纯 JSON，就是面板「配置」里复制出来的结构。`{ shape, expression, faceSize, colors: { body, face, outline, background }, outline: { enabled, width }, animation: { loop, speed, paused } }`。`setConfig` 会校验：未知的形状、表情和五官尺寸忽略，颜色只接受 `#rrggbb`，数值会被限制在范围内。
- `faceSize`：五官尺寸档 `small`（默认）/ `middle` / `large`，在面板「表情」区切换，切换时平滑过渡。
- `SHAPES`：每个形状提供 `outline()`（最大半径为 1 的归一化轮廓点）和 `face`。`face` 按尺寸档各存一组 `{ y, scale, grow? }`：`scale` 同时放大五官的间距和大小；`grow` 只放大五官本身，不改变位置。middle 已接近正面平面区能容纳的整体缩放上限，所以 large 用 `grow` 再放大五官，避免挤到侧面的鼓边上。主体由轮廓内缩后 `ExtrudeGeometry` 挤出，用大 bevel 鼓回原尺寸，再合并顶点得到平滑法线。新增形状只需加一项。
- 面部特征：每只眼睛和嘴都是一条「粗曲线」，参数为 `{ x, y, w, bend, thick, bulge, lift, rot }`，由 `sampleFeature` 采样成固定 48×2 个顶点的三角带。`thick ≥ w/2` 时是椭圆，`bend` 控制弯成 ^ 或 ∪，`bulge` 加 `lift: -1` 是 D 形张嘴。顶点数固定，所以任意两个表情之间可以逐帧插值，只就地改写 position。
- `EXPRESSIONS`：`features: [左眼, 右眼, 嘴]`、可选的 `body: { y, rx, ry, rz }` 基础姿态、`loops` 动画名列表。新增表情只需加一项，缩略图会自动从同一个采样函数生成。
- `ANIMATIONS`：`run(t, pose, weight)` 在基础参数上叠加偏移。动画用自己的时钟，所以速度、暂停、重置都在这一层处理；切换表情时各动画权重淡入淡出。
- `AvatarRenderer`：`setConfig(patch)` 做增量更新（换形状只重建主体几何，换颜色只改材质颜色），另有 `resetView()`、`resetAnimation()`、`dispose()`。页面隐藏时停止渲染循环，`pagehide` 时释放资源。
- 主体着色是自定义 shader，只有两档纯色：正面是原色，背光侧整块压暗，没有渐变。
- 加载时 `selfCheck()` 用 `console.assert` 检查注册表数据，控制台无报错即通过。

### SVG 版

`demos/avatar-demo4.html`（侧栏「卡通头像 SVG」，`#avatar4`）。纯 SVG，不依赖任何 CDN，`file://` 直接打开就能用。查阅时机：比较 SVG 和 Three.js 两种实现，或者要在不想引入 WebGL 的场景落地头像时。

- 配置 JSON、`SHAPES`、`EXPRESSIONS`、`ANIMATIONS`、`PALETTES`、五官采样函数和右侧面板，都是从 demo3 原样复制的。同一份配置在两个 demo 里效果一致。**改数据层或面板时，两个文件要一起改。**
- 只有渲染器不同，API 和 demo3 一样：`setConfig`、`getConfig`、`resetView`、`resetAnimation`、`dispose`。
- 体积感：主体减去一个向左上偏移的同形主体，剩下右下方一道纯色背光月牙（`fill-rule="evenodd"` 加主体裁剪）。
- 伪 3D 倾斜：拖拽或方向键倾斜，滚轮缩放，双击复位。五官按正面深度做视差位移和压缩，背光月牙的宽度随倾斜角度变化。不是真实旋转，倾斜角度有上限；要看侧面请用 demo3。

## 欢迎页 relax

`demos/welcome-demo.html`（侧栏「欢迎页 relax」，`#welcome`）。Three.js 从 CDN importmap 加载。数据全是 mock，Key 不离开页面。查阅时机：调欢迎页动效、配色、节奏，或要把欢迎页搬进 `app/web` 时。

流程：粒子从铺满全屏的散点聚成 "relax" → 文案「从一个想法，到无限可能」逐字淡入（右对齐到字形右缘），全部出现后循环扫光 → 提供商下拉上浮 → 选中后弹框填 Key、选模型 → 粒子向外上方消散、欢迎层缩放淡出 → 占位主页面（带「返回欢迎页」可重播）。

单文件内分区：

- `CONF`：所有可调参数。弹簧 `stiffness` / `damping`（阻尼小于 `2√stiffness` 时回聚略带回弹）、排斥 `repelRadius` / `repelForce`、入场 `introDur` / `introSpread`、文案和下拉出现时刻 `taglineAt` / `pickerAt`、呼吸周期、点阵间距 `dotStep` 和点径比例 `dotSize`、被挤压后绿色褪去速度 `heatDecay`。
- `PROVIDERS`：mock 提供商和模型，取自 server `KEY_PROVIDERS` 里常用几家。接真接口时换成 `/providers` 和 `/providers/:id/models`。
- 字形：`sampleText` 在离屏 canvas 画字，按字号定点距、近似规则点阵取点（只加少量抖动），返回相对墨迹中心的点。所有点同一大小。DOM 里 `.wordmark` 是一个按墨迹宽高撑开的空盒，粒子位置取它的中心，所以文案和下拉的排版完全由 DOM 决定。
- 粒子：正交相机，世界单位等于 CSS 像素。CPU 端逐粒子弹簧-阻尼积分，鼠标半径内按 `(1 - d/R)²` 径向推开，鼠标越快推力略大。被推开的粒子记一个 `heat` 值（按离鼠标距离平方衰减，只有近处一小圈明显），shader 按它提亮成纯白、略放大并加一圈柔光，随后按 `heatDecay` 快速褪回。另有一层稀疏灰色微尘缓慢上浮。
- 配色：底色和 token 与 `app/web` 暗色一致。字形粒子统一 `#f0f0f0`，不用强调色。
- 文案扫光：参照 React Bits ShinyText（120°、光带宽 40%、softness 0.8、带 glow）。`.sheen` 是同一行字的绝对定位叠影，`background-clip: text` 裁出白色光带，光带位置是 `@property` 注册的 `--shine`，`::after` 是模糊后的同款光带当柔光。一次扫过 2 秒、停 1.6 秒，逐字浮现结束后加 `.shine` 开始循环。
- `prefers-reduced-motion`：跳过散落入场和鼠标排斥，DOM 只做淡入。
- 加载时 `selfCheck()` 用 `console.assert` 检查采样点数和 mock 数据。

## Demo 命名

kebab-case + 后缀(如 `loading-dots-demo.html`、`theme-colors.html`)。
进入 playground 后,`tmp/` 同名文件删除,避免双份。

## 配色与字体

playground 不走 Vite,各 demo 直接用与项目一致的色值:

- 背景 `#151515`、侧栏 `#252525`、边框 `#2A2A2A`
- 字体 `-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif`

## 禁止

- 不要放依赖 `npm install` / 构建的代码(纯静态)
- 不要把已落地组件代码拷一份对照(对照应在 `app/web/src/ui/`)
