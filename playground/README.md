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

## 欢迎页开场

`demos/welcome-demo-2.html`（侧栏「欢迎页 开场」，`#welcome-2`）。单文件，不依赖构建。查阅时机：调欢迎页字标入场、副文案描边接扫光、选择框边高光，或和粒子版欢迎页对照时。

流程：淡线网格只在光标附近亮起 → “relax” 逐字以虚线选区框出现并填实，然后停住 → 「从一个想法，到无限可能」描边画出、从左填上和描边同色的实色 → 整行向右滑到和 relax 右缘对齐，滑动时收到次级灰 → 到位后同一行扫光，选择框这时才淡入，边高光滑向指针，离开后回到右上。底部「重播」再看一遍入场。选择框先放了几条模型，选中不跳转。

取舍：Tech Text 去掉拖拽和点击弹开，入场后不再自动扫字，字母按字体自身间距排列。悬停某个字母时，该字改成虚线轮廓，并带选区框和尺寸标注。Stroke Text 不引 gsap，用 SVG 描边和 clip 填色，填色与描边同色。整行再右移对齐 relax 右缘，颜色收到次级灰后才扫光。扫光参数与粒子版欢迎页那条一致（120°、带宽 40%、一次 2 秒、停 1.6 秒）。Specular 的 WebGL 边光改成输入框上的 conic 描边。网格用线，不跟点击脉冲。配色只用暗色 token。

`prefers-reduced-motion`：字标、描边、扫光都不动，网格只留淡线。加载时 `selfCheck()` 检查网格衰减和副文案字数，并确认扫光类名这时还不在。

## 欢迎页 伙伴

`demos/welcome-demo-3.html`（侧栏「欢迎页 伙伴」，`#welcome-3`）。单文件，不依赖 CDN 和构建，`file://` 直接能开。数据全是 mock。查阅时机：调欢迎页的小伙伴、打字机字标、命令面板式提供商选择，或要和前两版欢迎页对照时。

流程：SVG 小伙伴弹出并在气泡里打招呼 → 「relax」打字机逐字落下（模糊上浮 + 光标）→ 「从一个想法 💡，到无限可能 ✨」字幕式逐字浮现 → 提供商胶囊和「开始」按钮浮出 → 点胶囊或 ⌘K / Ctrl K 打开命令面板 → 选中后背景柔光渐变到该提供商的色相，小伙伴跳一下并换台词 → 「开始」模拟准备后显示已就绪。底部「重播」再看一遍入场。

单文件内分区：

- `PROVIDERS`：mock，同粒子版欢迎页那份，多一个 `hue`，只用来定背景柔光和徽章色相。接真接口时换成 `/providers`。
- `TIMING`：入场各段的时刻和间隔。
- 背景：三团模糊径向渐变缓慢漂移，颜色全部由注册过的 `--hue`（`@property`）推导，所以换提供商时会平滑过渡。再叠一层 SVG 噪点颗粒、暗角，以及跟随光标的淡聚光。
- 小伙伴：超椭圆身体，右下背光月牙的做法同卡通头像 SVG 版（受光主体向左上偏移后被主体裁剪）。五官是简化参数 `EXPR`（眼睛椭圆，嘴是上下两条二次曲线，`open > 0` 时成 D 形张嘴），帧间指数插值。视线跟随指针，五官比身体多挪一点做视差，带随机眨眼、呼吸、点击跳一下并眨单眼。`thinking` 时固定看右上。页面隐藏时停循环。
- 气泡 `say(text, { mood, hold })`：字幕式替换（旧字模糊上移、新字下方浮入），可顺带换表情，`hold` 到时回到 `idle()` 的台词。
- 命令面板：搜索（名称 / 描述 / 模型）、↑↓ 浏览、空搜索时 ←→ 切模型、↵ 确认、双击确认、Esc 或点遮罩关闭、Tab 焦点留在面板内。右侧详情带模型单选和「使用 X」。窄屏改为单栏。
- `prefers-reduced-motion`：所有过渡和动画近乎瞬时，入场不排时间。
- 加载时 `selfCheck()` 检查 mock 数据、表情参数、嘴型路径和核心文案。

## 欢迎页 小剧场

`demos/welcome-demo-4.html`（侧栏「欢迎页 小剧场」，`#welcome-4`）。在「欢迎页 开场」上加入卡通小家伙，单文件，不依赖 CDN。查阅时机：调小家伙和字母的互动剧情、加新动作或新交互，或要把这一版搬进 `app/web` 时。

开场剧情（底部「跳过」直接到结尾，「重播」再看一遍）：relax 逐字带虚线选区打出，x 却歪着落在老远 → 小家伙从屏幕左侧滚进来，晕一下 → 沿底部灯带走过去，脚下的灯一颗颗亮 → 走到缺口发现 x 不在位 → 翻过 x 绕到右边，三下把它推回来（使劲脸、汗滴），归位时字母依次亮一下 → 一路跳上 x、a、l 顶，在 l 上庆祝，晃两下摔下来 → 落地哇哇哭，两边字母歪过来安慰，同时副文案开始描边 → 抖一抖恢复开心 → 爬回 x 顶上停好，选择框和操作提示这时才出现。

自由交互：拖字母（松手弹簧弹回，小家伙站在上面会被带着走，拖得远会被甩飞、摔哭）；拎起小家伙（随拖动方向摆，松手掉到正下方的字母顶或地面，摔得高会哭）；单击戳它；双击字母让它走过去爬上去；键盘敲 r / e / l / a / x 让对应字母跳一下；选提供商时它兴奋地跳。闲置约 10 秒后会自己巡逻灯带、东张西望或去别的字母上坐坐。

单文件内分区：

- 网格、副文案描边和扫光、选择框边高光：照搬「欢迎页 开场」，副文案改成返回 Promise，剧情等它结束再出选择框。选择框的选项换成提供商。
- 场景：字母画在 canvas，小家伙是叠在上面的 SVG，坐标都是场景内 CSS 像素。`glyphs` 存几何（resize 重算），`gs` 存每个字母的动态状态（弹簧位移 / 旋转 / 显示 / 虚线 / 发光）。字母以底边中点为轴旋转。
- 小家伙：形状和背光月牙同卡通头像 SVG 版。`EXPR` 是表情参数（多了眼睛倾斜 `tilt` 和腮红 `blush`），有 neutral / happy / excited / surprised / thinking / effort / cry / sad / dizzy。另有眼泪、汗滴、头顶 emoji 气泡。挤压用弹簧，落地时给冲量。
- 动作原语：`walkTo`、`rollIn`（滚动距离取整圈，停下时脸朝前；方块的角让中心一起一伏）、`jumpTo`（过起止点、指定最高点的抛物线）、`fallTo`（匀加速下落，可带初速和整圈翻滚）、`pushLetter`、`cry`、`recover`、`ground`（在空中就先落下）。都可取消：`perform` 让 `token` 加一，旧动作在下一帧抛 `CANCEL` 退出。
- `prefers-reduced-motion`：不播剧情，直接到结尾状态，也不做闲置动作。
- 加载时 `selfCheck()` 检查表情参数、嘴型路径、抛物线端点和最高点、超椭圆半径。

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
