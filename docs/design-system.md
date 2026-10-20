CURSOR UI DESIGN SYSTEM
Reference: Cursor Desktop UI / Settings UI
Version: 1.0

==================================================
0. DESIGN PHILOSOPHY
==================================================

整体设计关键词：

- Dark
- Minimal
- Professional
- Developer Tool
- Dense but Calm
- Native Desktop
- Content-first
- Low Contrast
- Functional
- Subtle

整体不是传统 Web SaaS 风格，而更接近：

“现代开发者 IDE + AI Agent 工作台”

核心设计目标：

1. 让用户长时间使用时保持舒适
2. 大量信息同时存在，但不产生视觉噪音
3. 通过层级、间距、背景和边框区分内容
4. 强调功能，而不是装饰
5. 交互反馈必须明确，但视觉变化要克制
6. 整体 UI 应该融入开发环境，而不是像独立网站


==================================================
1. OVERALL VISUAL STYLE
==================================================

整体采用：

Dark Native Application Style

视觉结构主要由：

Background
+
Surface
+
Border
+
Typography
+
Subtle Accent

构成。

不依赖：

- 大面积渐变
- 大面积阴影
- 玻璃拟态
- 复杂背景
- 3D
- 插画
- 强烈装饰


核心原则：

“让 UI 看起来像工具，而不是营销页面。”


==================================================
2. COLOR SYSTEM
==================================================

2.1 Global Background

主背景压在暗部,侧栏比主区亮一档,分界靠灰阶而不是亮色:

App Background:
#151515

Sidebar:
#252525

Extension panel:
#1C1C1C

Main Content:
#151515

Elevated Surface:
#2B2B2B

Hover:
#303030

Active:
#353535


重点：

侧栏与主区靠这一档灰分开,整体仍压在暗部。

控件浮起靠同一条阶梯,不单把侧栏抬亮。

文字与强调色保持原亮度。


2.2 Text

Brightest (hover/active/highlight):

#F5F5F5

Primary:

#E5E5E5

Secondary:

#C7C7C7

Tertiary:

#A1A1A1

Disabled:

#737373


文字不使用纯白作为大面积正文。

避免：

#FFFFFF

大面积使用。


2.3 Border

默认：

#2A2A2A

Hover：

#3F3F3F

Active：

#444444


Border 非常克制。

通常：

1px


2.4 Accent

主要交互色：

绿色 / 蓝绿色系

主要用于：

- Toggle ON
- Success
- Active State
- Positive Status

典型：

#00C487


Accent 不作为大面积页面主色。


2.5 Semantic Colors

Success:
Green

Error:
Red

Warning:
Yellow / Orange

Info:
Blue


语义颜色只用于状态表达。

例如 Git Changes：

+4026

使用绿色

-1148

使用红色


==================================================
3. TYPOGRAPHY
==================================================

整体字体：

优先使用系统字体。

推荐：

- Inter
- SF Pro
- -apple-system
- BlinkMacSystemFont
- Segoe UI

如果是中文：

- PingFang SC
- Microsoft YaHei


3.1 Font Scale

App Title:
13px ~ 14px

Page Title:
20px ~ 24px

Section Title:
15px ~ 17px

Body:
13px ~ 14px

Secondary:
12px ~ 13px

Caption:
11px ~ 12px


整体字号偏小。

这是 Developer Tool UI 的重要特征。


3.2 Font Weight

Title:
500 ~ 600

Body:
400

Secondary:
400

Button:
500

不要大量使用：

700 / 800


==================================================
4. DENSITY
==================================================

整体属于：

Medium / High Information Density


特点：

- 小字号
- 紧凑间距
- 小按钮
- 小 Icon
- 轻量 Border
- 多层信息同时存在


但是：

Density ≠ Crowded


必须通过视觉层级控制信息密度。


==================================================
5. APP LAYOUT
==================================================

核心布局：

┌──────────────┬──────────────────────┬──────────────────┐
│              │                      │                  │
│   Sidebar    │     Main Content     │    Secondary     │
│              │                      │      Panel       │
│              │                      │                  │
└──────────────┴──────────────────────┴──────────────────┘


支持：

- Sidebar
- Main
- Secondary Panel


不同区域拥有独立滚动。


==================================================
6. SIDEBAR
==================================================

Sidebar 是非常重要的一级导航区域。

宽度：

约 280px


视觉：

Background:
#252525


内容结构：

Navigation
+
Repositories
+
Sessions / Projects
+
User


示例：

New Chat
Search
Automations
Customize

----------------

Repositories

project-a
project-b

----------------

workspace-a

----------------

User
Settings


特点：

- 信息密度高
- 不使用大卡片
- Icon + Text
- Section Label
- Active Item 有明显背景


==================================================
7. SIDEBAR NAVIGATION
==================================================

Navigation Item：

Height:
30px ~ 34px

Padding:
6px ~ 8px

Radius:
6px


结构：

[Icon] Text


默认：

Text:
Secondary

Icon:
Secondary


Hover：

Background:
#202020


Active：

Background:
#2E2E2E

Text:
Primary


Active 不使用强烈 Accent 色。

重点是：

“当前在哪里”

而不是：

“强调品牌色”。


==================================================
8. SIDEBAR SECTION
==================================================

Section Label：

字号：
11px ~ 12px

颜色：

Tertiary

Uppercase 可选。

Section 与 Section 之间：

16px ~ 24px


列表项之间：

2px ~ 4px


==================================================
9. TOP BAR
==================================================

顶部区域非常紧凑。

结构：

← Back / Navigation

Title

Context / Status

Actions


例如：

Course detail sharing issue
IDE
...
Changes


Top Bar：

Height:
40px ~ 48px


不要使用传统 Web Header：

- 大 Logo
- 大标题
- 大导航
- 大面积背景


==================================================
10. MAIN CONTENT
==================================================

主内容区域强调：

Reading
+
Conversation
+
Action


典型 Agent 页面：

User Message
↓
Agent Status
↓
Agent Result
↓
Action
↓
Follow-up Input


整体采用纵向信息流。


==================================================
11. CONVERSATION MESSAGE
==================================================

用户消息：

使用轻量 Surface Card。


Background:

#202020


Border：

#2A2A2A


Radius：

10px ~ 12px


Padding：

12px ~ 16px


例如：

┌──────────────────────────────┐
│ 最后仔细检查下当前修改不能影响到已有的功能 │
└──────────────────────────────┘


特点：

- 不需要明显头像
- 不需要气泡式聊天 UI
- 更接近 IDE / Agent Console


==================================================
12. ASSISTANT MESSAGE
==================================================

Assistant 内容：

尽量减少容器感。

正文直接显示在：

Main Background


结构：

Status
↓
Description
↓
Result
↓
Metadata


例如：

Worked for 30s

Explored SKILL.md, ran 4 commands

已提交到 feature/1.9.1 : 31645c42


重要内容可以通过：

Bold
+
Code Inline
+
Status Color

强调。


==================================================
13. INLINE CODE
==================================================

代码、Branch、Commit、命令等使用：

Monospace
+
Subtle Surface


例如：

feature/1.9.1

31645c42


Background：

#2E2E2E


Radius：

4px


Padding：

2px 5px


不要使用完整 Code Block 的视觉重量。


==================================================
14. AGENT STATUS
==================================================

Agent 执行状态应该非常轻。

例如：

Worked for 30s
Explored SKILL.md, ran 4 commands


使用：

Small Text
+
Muted Color


不要使用：

大型 Loading Animation

不要让执行状态成为视觉中心。


==================================================
15. MESSAGE ACTIONS
==================================================

消息底部提供：

Like
Dislike
Copy
Branch / Share
Timestamp


Icon Size：

14px ~ 16px


默认：

Muted


Hover：

Primary Text


Timestamp：

Tertiary


按钮之间：

6px ~ 10px


==================================================
16. FOLLOW-UP INPUT
==================================================

这是 Agent 产品的核心组件。

推荐：

Pill / Rounded Input Container


Height：

40px ~ 44px


Radius：

20px ~ 22px


Background：

#202020


Border：

#2A2A2A


结构：

[ + ]  Send follow-up                    Medium   [Mic]


特点：

- 输入区域圆润
- 内部操作高度集成
- 不使用传统 Form Input
- 更接近 AI Command Bar


==================================================
17. INPUT ACTION
==================================================

左侧：

+

用于：

- Attachment
- Context
- Command
- Tool


右侧：

Model / Mode

以及：

Voice / Submit


这些操作应该：

Integrated

而不是独立 Button。


==================================================
18. MODEL SELECTOR
==================================================

例如：

Medium


使用：

Compact Select


特点：

- 无明显 Button 背景
- Text + Chevron
- Hover 才出现背景


适合：

Model
Mode
Agent
Context


==================================================
19. BOTTOM STATUS BAR
==================================================

底部可以存在：

Branch
+
Environment
+
Status


例如：

feature/1.9.1
This Mac


高度：

28px ~ 32px


视觉：

非常弱

字号：

11px ~ 12px


不要抢夺内容注意力。


==================================================
20. SETTINGS LAYOUT
==================================================

Settings 采用：

Left Navigation
+
Centered Content


结构：

┌──────────────┬──────────────────────────┐
│              │                          │
│ Settings Nav │       Settings Content   │
│              │                          │
└──────────────┴──────────────────────────┘


Settings 内容区：

Max Width:
760px ~ 800px


不会铺满整个屏幕。


==================================================
21. SETTINGS SIDEBAR
==================================================

Settings Sidebar：

Width:
300px 左右


结构：

Back
Search
Categories


例如：

General
Profile
Appearance
Plan & Usage
Agents
Cloud Agents
Models
Git & PRs
Worktrees
Browser & Network
Tab
Code Intelligence
Beta
Docs


Navigation Item：

Height:
32px


Active：

Background:
#2E2E2E

Radius:
7px


==================================================
22. SETTINGS SEARCH
==================================================

Search：

Height:
32px ~ 36px


Background:

#202020


Border:

#343434


Radius:

6px


结构：

[Search Icon] Search Settings


Search 应该固定在导航顶部。


==================================================
23. SETTINGS PAGE
==================================================

Settings 页面：

Title
↓
Section
↓
Setting Group
↓
Setting Item


例如：

General

Cursor Account
Manage your account and billing

Startup

Tips
Show rotating tips on the empty screen


层级非常明确。


==================================================
24. SETTINGS SECTION
==================================================

Section Title：

字号：
14px ~ 16px

Weight:
500


颜色：

Primary


Section 之间：

28px ~ 40px


Section Caption：

字号：
12px

颜色：

Secondary / Tertiary


例如：

Startup

Notifications

Privacy


==================================================
25. SETTINGS GROUP
==================================================

多个设置项使用一个：

Surface Container


Background：

#202020


Radius：

10px ~ 12px


内部 Item：

Border-bottom


最后一项：

No Border


结构：

┌───────────────────────────────┐
│ Setting                       │
│ Description          Control  │
├───────────────────────────────┤
│ Setting                       │
│ Description          Control  │
├───────────────────────────────┤
│ Setting                       │
│ Description          Control  │
└───────────────────────────────┘


==================================================
26. SETTING ITEM
==================================================

左侧：

Title
Description


右侧：

Control


Title：

13px ~ 14px


Description：

12px ~ 13px


Description：

Muted


右侧 Control：

根据类型使用：

Toggle
Select
Button
Input
Checkbox


==================================================
27. SETTING ALIGNMENT
==================================================

Setting Row：

Display:
Flex

Align:
Center


左侧：

flex: 1


右侧：

Auto


这样可以保证：

Title / Description
和
Control

始终保持清晰对齐。


==================================================
28. TOGGLE
==================================================

Toggle 非常简洁。

OFF：

Dark Gray Track

ON：

Green Track


尺寸：

Width:
34px ~ 36px

Height:
20px


Knob：

约 16px


ON：

绿色

OFF：

灰色


不要使用：

巨大 Switch


==================================================
29. SELECT
==================================================

Select：

Height:
30px ~ 34px

Background:
Transparent / Surface

Border:
#343434

Radius:
6px


例如：

Default ˅


适合：

- Window Restoration
- Model
- Mode
- Preference


==================================================
30. BUTTON
==================================================

Button：

Compact
+
Neutral
+
Functional


Height：

28px ~ 32px


Radius：

6px


Padding：

8px ~ 12px


Primary Button：

浅色背景
+
深色文字


Secondary Button：

Transparent
+
Border


例如：

Open
Dismiss
Create Draft PR


不要默认使用大号彩色 Button。


==================================================
31. ALERT / BANNER
==================================================

顶部 Banner：

用于：

Important Information
Migration
System Message
Announcement


结构：

┌──────────────────────────────────────────┐
│ Message                         Action   │
└──────────────────────────────────────────┘


Background：

深色 Surface + 轻微蓝色倾向


Border：

Accent / Blue Subtle Border


Radius：

10px ~ 12px


高度：

约 48px ~ 64px


内容应该：

一眼可读

但不能阻塞页面。


==================================================
32. CARD
==================================================

Card 不应该被大量使用。

适用于：

- Account
- Settings Group
- Information
- Agent Result
- Important Context


Background：

#202020


Border：

#2A2A2A


Radius：

10px


Padding：

12px ~ 16px


卡片不是视觉装饰，而是：

“内容分组容器”。


==================================================
33. ICON SYSTEM
==================================================

图标：

Linear
+
Minimal


推荐：

Lucide
Phosphor
Ant Design Icons


Icon Size：

14px ~ 16px

Navigation：

14px ~ 16px

Toolbar：

14px ~ 16px

Primary Action：

16px ~ 18px


Stroke：

约 1.5px ~ 2px


避免：

- 彩色 Icon
- 大 Icon
- 3D Icon
- Emoji 作为 UI Icon


==================================================
34. BORDER RADIUS
==================================================

整体圆角：

小到中等。


推荐：

4px
6px
8px
10px
12px
20px


Button：

6px

Input：

6px / 20px

Card：

10px

Message：

10px

Modal：

12px

Pill：

20px


不要整个系统全部：

9999px


==================================================
35. SHADOW
==================================================

默认：

No Shadow


浮层：

Subtle Shadow


Modal：

Medium Shadow


重点：

深色 UI 中优先使用：

Background Difference
+
Border

而不是强阴影。


==================================================
36. MOTION
==================================================

动画：

Fast
+
Subtle


推荐：

100ms
150ms
200ms


适合：

- Hover
- Toggle
- Dropdown
- Modal
- Sidebar
- Expand / Collapse


动画不应该：

- 炫技
- 持续运动
- 大幅位移
- 弹跳


==================================================
37. SCROLLBAR
==================================================

滚动条：

Very Subtle


默认隐藏或低对比。

只有用户滚动时：

轻微显示。


避免：

传统浏览器粗滚动条。


==================================================
38. DIVIDER
==================================================

Divider：

#2A2A2A


1px


主要用于：

- Settings Row
- Navigation Section
- Toolbar
- Content Separation


Divider 不应该过多。


==================================================
39. HIERARCHY
==================================================

视觉层级：

Primary Content
>
Section
>
Title
>
Description
>
Metadata


颜色层级：

Primary
>
Secondary
>
Tertiary
>
Disabled


交互层级：

Primary Action
>
Secondary Action
>
Utility Action


==================================================
40. EMPTY SPACE
==================================================

Cursor UI 一个非常重要的特点：

“有意识的留白”。

但是这种留白不是：

Marketing Whitespace


而是：

Functional Whitespace


用于：

- 分隔 Agent 内容
- 分隔 Settings Section
- 分隔 Navigation
- 提升阅读性


==================================================
41. RESPONSIVE / ADAPTIVE
==================================================

Desktop 优先。

典型：

Sidebar
+
Main
+
Optional Right Panel


当窗口变窄：

优先：

Right Panel
↓
Sidebar
↓
Main Content


逐级收缩。

不要简单缩放整个 UI。


==================================================
42. MULTI-PANEL UI
==================================================

如果存在：

Chat
+
Code
+
Changes


推荐：

Resizable Panel


例如：

Chat 40%
+
Code / Changes 60%


Panel Border：

1px


Panel Header：

40px 左右


Panel 内容：

Independent Scroll


==================================================
43. CODE / CHANGE UI
==================================================

Git / Code Change：

增加语义色：

Added：
Green

Deleted：
Red

Modified：
Yellow / Orange


Diff：

+4026
-1148


但颜色仅用于：

“表达状态”

不能用于装饰。


==================================================
44. DESKTOP NATIVE PRINCIPLE
==================================================

整个 UI 应该遵循：

Desktop App First

而不是：

Responsive Website First


包括：

- Keyboard Shortcut
- Compact Control
- Context Menu
- Resizable Panel
- Sidebar
- Status Bar
- Command Bar
- Multi-panel Workspace


==================================================
45. UI COMPONENT PRIORITY
==================================================

第一优先级：

Sidebar
Navigation
Header
Panel
Input
Button
Card
Setting Group
Setting Row


第二优先级：

Select
Toggle
Dropdown
Tooltip
Modal
Alert
Toast


第三优先级：

Agent Message
Code Block
Diff
Command Bar
Status
Activity
Context Menu


==================================================
46. DESIGN TOKENS
==================================================

COLOR

--color-bg: #151515
--color-sidebar: #252525
--color-panel: #1C1C1C
--color-surface: #2B2B2B
--color-surface-hover: #303030
--color-surface-active: #353535

--color-text: #E5E5E5
--color-text-bright: #F5F5F5
--color-text-secondary: #C7C7C7
--color-text-tertiary: #A1A1A1
--color-text-disabled: #737373

--color-border: #2A2A2A
--color-border-hover: #3F3F3F

--color-primary: #00C487

--color-success: #00C487
--color-error: #F05252
--color-warning: #D9A441
--color-info: #5B9CF6


SPACING

--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-8: 32px
--space-10: 40px
--space-12: 48px


RADIUS

--radius-xs: 4px
--radius-sm: 6px
--radius-md: 8px
--radius-lg: 10px
--radius-xl: 12px
--radius-pill: 20px


TYPOGRAPHY

--font-xs: 11px
--font-sm: 12px
--font-md: 13px
--font-base: 14px
--font-lg: 16px
--font-xl: 20px
--font-2xl: 24px


==================================================
47. ANT DESIGN IMPLEMENTATION
==================================================

如果项目使用 Ant Design：

优先复用：

Menu
Button
Input
Select
Switch
Card
Dropdown
Tooltip
Modal
Alert
Tag
Divider
Tabs


但不要直接使用 Ant Design 默认主题。

需要覆盖：

- Color
- Border
- Radius
- Typography
- Height
- Background
- Hover
- Active


目标：

Ant Design 的组件能力
+
Cursor 的视觉语言


==================================================
48. UI IMPLEMENTATION RULE
==================================================

所有组件设计必须优先考虑：

1. 功能
2. 信息层级
3. 可读性
4. 操作效率
5. 一致性
6. 视觉美感


而不是：

1. 炫酷
2. 动画
3. 渐变
4. 装饰


==================================================
49. CORE DIFFERENCE FROM VIBEHUB STYLE
==================================================

如果与上一份 VibeHub UI System 配合：

VibeHub：

Knowledge Product
+
Editorial
+
Content-first
+
Medium Density


Cursor：

Developer Application
+
Native Desktop
+
High Density
+
Workspace-first


共同原则：

Clean
Minimal
Structured
Technical
Content-first


Cursor 特有：

- Multi Panel
- Compact UI
- Agent Console
- Command Bar
- Status Bar
- Sidebar
- Dense Navigation
- Developer Workflow


==================================================
50. FINAL DESIGN PRINCIPLE
==================================================

最终 UI 应该让用户感觉：

“这是一个真正每天可以使用几个小时的开发工具。”

而不是：

“这是一个展示 AI 能力的漂亮网站。”

核心关键词：

Dark
+
Quiet
+
Dense
+
Professional
+
Native
+
Functional
+
Technical


最终原则：

少装饰
+
高信息密度
+
强层级
+
低对比背景
+
克制 Accent
+
快速交互
+
统一组件


==================================================
51. AI DESIGN CONFIRMATION WORKFLOW
==================================================

AI Agent 开始实现 UI 前：

必须逐项确认：

1. Design Philosophy
2. Color
3. Typography
4. Density
5. Layout
6. Sidebar
7. Navigation
8. Header
9. Panel
10. Card
11. Message
12. Input
13. Button
14. Toggle
15. Select
16. Settings
17. Alert
18. Code / Diff
19. Icon
20. Border
21. Radius
22. Shadow
23. Motion
24. Scrollbar
25. Responsive
26. Dark Theme
27. Ant Design Mapping
28. Design Tokens


每确认一项：

[Confirmed]

或：

[Need Revision]


全部确认完成后：

生成最终 UI Design System。

实现过程中：

必须严格遵守已经 Confirmed 的规范。

如果新的页面需求与规范冲突：

必须暂停并询问。

禁止 AI 自行改变已经确认的设计规范。


==================================================
52. ONE-LINE DESIGN SUMMARY
==================================================

Cursor UI =

“低对比深色背景 + 紧凑信息密度 + 极简线性图标 +
轻量边框 + 克制圆角 + 弱阴影 + 明确层级 +
原生桌面工具感 + AI Agent 工作流。”