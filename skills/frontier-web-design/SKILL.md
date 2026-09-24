---
name: frontier-web-design
description: 做 Google DeepMind / Apple / OpenAI 那一档的产品页与论文项目页（project page、launch page、model page）。里面是从 deepmind.google/models/veo 等真页面上量出来的 token：字号/字重/字距、栏宽与留白节奏、媒体卡圆角、pill 按钮、吸顶 tab 条、表格与图注的处理，以及一份「这些东西一律不要」的清单。当用户说「做个项目主页 / paper website / landing page / 产品页 / 参考 Apple 或 Google 的风格 / 页面太丑 / 重做这个网站」时使用。
---

# Frontier product pages

给论文或模型做一个「大厂级」主页。**不要凭印象模仿**——下面的数字是 2026-09-18
在 `deepmind.google/models/veo/` 上用 `getComputedStyle` 量出来的，直接用。

重做一个页面之前，先打开两三个真页面量一遍（Chrome + `javascript_tool`，
取 fontSize / lineHeight / letterSpacing / padding / borderRadius /
getBoundingClientRect），量到的数覆盖这里写的。

---

## 1. 最常见的失败：页面「信息密度很高但很丑」

这一档页面的共性不是「加了什么」，而是**拿掉了什么**。按拿掉的优先级排：

| 拿掉 | 为什么 |
| --- | --- |
| 全大写 + 字距的 mono 小标签（eyebrow / kicker） | 这是 AI 生成页的第一特征。DeepMind 全站没有一个 |
| 700/800 字重的标题 | 真页面的大标题是 **500**，靠字号和留白建立层级，不靠加粗 |
| 卡片描边 + 阴影 + 圆角三件套糊在每个块上 | 卡片只有一层极浅的填充（`#F8F9FC`），**没有 border，没有 shadow** |
| 彩色 badge / chip / pill 标签 | 强调靠字重和一行浅底色，不靠颜色标签 |
| 压在视频上的标题字幕 | 图注在**视频下方**，小号灰字 |
| 明暗条带交替（白段—黑段—白段） | 一个底色到底，媒体自己是黑的就够了 |
| 拥挤的竖向节奏 | 真页面段与段之间是 **160–280px** 的空白 |

自查：把页面截图缩到 30% 看。如果还能看出「一格一格的卡片网格」，就是太密了。

---

## 2. 量出来的 token（deepmind.google/models/veo，1728px 视口）

### 字体
一套字，两个字重（400 / 500），**没有第二个字族、没有 mono**。
原字体 `Google Sans Flex`。Google Fonts 上最接近的替代：**DM Sans**（几何、圆
`a`、同样的 `g`）；次选 Figtree。不要用 Inter / Space Grotesk。

| 角色 | 字号 | 行高 | 字距 | 字重 | 颜色 |
| --- | --- | --- | --- | --- | --- |
| Hero 标题 | **98px** | 96px（0.98） | **−2.67px（−0.027em）** | 500 | `#FFF` 压在视频上 |
| 整屏陈述句（一段话当一节） | 48px | 1.24 | −0.02em | 400 | `#121317` |
| 节标题（左对齐，两行） | 40px | 1.15 | −0.022em | 500 第一行 / 400 第二行 | 第一行墨色、**第二行灰色** |
| 卡片小标题 | 20px | 29px | −0.089px | 500 | `#121317` |
| 正文 | **17.5px** | **25.4px（1.45）** | **+0.21px（+0.012em）** | 400 | `#5F6368` |
| 图注 / 元信息 | 14px | 1.5 | 0 | 400 | `#5F6368` |

> 节标题那个两行写法很好用，直接抄：
> 第一行 `Introducing Veo 3.1`（墨色），第二行同字号但灰色，写这一节在讲什么。
> 右侧同一基线上放一个 pill 按钮。

### 颜色（浅色）
```
--page    #FFFFFF
--ink     #121317   /* rgb(18,19,23)：近黑带一点蓝 */
--muted   #5F6368
--surface #F8F9FC   /* 卡片填充，无描边 */
--hair    #E3E5EA   /* 分隔线，只在表格和 footer 用 */
```
深色：`--page #0B0B0D · --ink #E9EAEE · --muted #9AA0A6 · --surface #16171B · --hair #26272C`。
**强调色最多出现两三次**（表格里 ours 那一行、一个链接箭头）。没有渐变。

### 尺寸
```
页边距 gutter   80px（桌面）→ clamp(20px, 5vw, 80px)
媒体卡圆角      36px（hero）/ 28px（正文里的视频）/ 24px（内容卡片）
pill 按钮       padding 12px 24px · height 48px · radius 9999px · font 17.5px · weight 450
导航链接        padding 8px 16px · radius 9999px · font 14.5px · weight 500
节与节的间距    160–280px（`padding-block: clamp(96px, 14vw, 200px)`）
陈述句栏宽      ~20 词一行，`max-width: 17em` 于 48px 字号 ≈ 820px，居中
正文栏宽        ~65ch
```

---

## 3. 版式骨架（照这个顺序排）

```
① 吸顶细导航        白底 + blur，左 logo，右两个 pill
② Hero              一张内缩的圆角媒体卡（不是通栏！gutter 80px，radius 36px）
                    标题 98px 居中压在卡上，副标题一行 17.5px 灰白
                    下面一排 3 个 pill 按钮，居中
③ 吸顶 pill tab 条   居中浮在内容上方，浅底 blur，5 项以内
④ 整屏陈述句        48px 居中，一句话说清这是什么。上下各 200px 空白
⑤ 「节标题两行」+ 媒体 左对齐两行标题，右侧 pill；下面一张 28px 圆角视频；
                    视频下方小灰字图注 + 「+」展开完整 prompt
⑥ 三栏要点          无描边、无卡片，只有小标题 + 灰色两行说明
⑦ 数据/表格         无外框，只有横向发丝线
⑧ 尾部             细线 + 小灰字
```

Hero 的媒体卡左右各露出一点相邻卡片的边（carousel 的暗示），是这一档页面的
标志性细节：`overflow:visible` + 两侧各 96px 的兄弟元素。

---

## 4. 媒体

- **内缩，不通栏。** 媒体卡宽 = 视口 − 2×gutter，圆角 28–36px，`object-fit:cover`。
- **图注在下面**，不是压在上面：`14px` 灰字 + 一个 `+` 展开完整 prompt。
- 视频 `muted / loop / playsinline / preload="none"`，用 IntersectionObserver
  在进入视口时才 `src = dataset.src` 再 `play()`；离开视口 `pause()`；
  被挤出「最多同时 6 个」的队列时把 `src` 摘掉释放解码器。
- 海报图（poster）是必须的：没有 poster 的网格在首屏是一片黑。
  抽帧 `-ss 5`，宽 768，JPEG q5。
- 竖版/方版素材不要塞进 16:9 的格子里，按每条素材真实的 `aspect-ratio` 排，
  网格列宽随比例变（竖版 160px、方版 200px、横版 250px）。

---

## 5. 表格（论文页一定会有）

大厂页面里表格很少，但论文页必须有。做法：

- **没有外框、没有斑马纹**，只有 `1px` 发丝线分隔行。
- 表头：14px，`--muted`，**不要全大写、不要 mono**。
- 数字列右对齐 + `font-variant-numeric: tabular-nums`。
- 我们的那一行：**只加字重**，外加极浅的一层底色；不要彩色边框、不要 badge。
- 基线行（teacher / 未蒸馏）用 `--muted` 压暗，让主行浮出来。
- 表格外面套 `overflow-x:auto`，窄屏不要让整页横向滚动。

---

## 6. 动效

- 只做一件事：进入视口时 `opacity 0→1` + `translateY(16px→0)`，600ms
  `cubic-bezier(.22,.7,.3,1)`，**静止态是可见的**（JS 没跑也要能读）。
- 不要视差、不要逐字、不要 hover 放大、不要滚动劫持。
- `prefers-reduced-motion` 一律关掉。

---

## 7. 交付前的自查

1. 缩到 30% 看截图：是不是一片一片的卡片？是 → 拆掉卡片。
2. 全页搜 `text-transform:uppercase` 和 `monospace`：应该是 0 处。
3. 全页搜 `font-weight:700`：应该只在表格里那一行。
4. 相邻两节之间的空白有没有到 160px。
5. 每张视频下面有没有图注、有没有 poster。
6. 400px 宽下有没有横向滚动条。
7. 非 ASCII 字符（⊥ · — × →）一律写成 HTML 实体，否则本地打开是乱码。

---

## 8. 「不够 cool」怎么办：再往上一档的语汇

DeepMind Veo 那一档是**克制**，Gordon 的原话是「还不够 cool」。要更有态度，
就换到**编辑设计**的语汇。下面是从 `follow.art` 和 `affinity.studio` 上量到的，
按「拿来就能用」排。

### 8.1 巨型压缩字当底layer（follow.art）

整个页面最强的一招：**一个超大超窄的词，左右都出血，压在内容底下**，
前景的媒体/卡片横跨它的中段。

```css
.wall{
  position:absolute; left:50%; transform:translateX(-50%); width:112%;
  z-index:0; white-space:nowrap; text-align:center; pointer-events:none;
  font-size:clamp(90px,23.5vw,430px);
  font-variation-settings:"wdth" 62,"wght" 600;   /* Archivo 可变字，最窄 62 */
  line-height:.78; letter-spacing:-.012em; text-transform:uppercase;
}
.wallbox{position:relative; isolation:isolate}
.wallbox > *:not(.wall){position:relative; z-index:2}
```

词要选**页面本身的名字**。媒体卡从词的下半截压过去（卡片 `margin-top` 调到
词高的 ~70%），左右各露出首尾字母，这个「被挡住一半还认得出」的效果就是全部。

同一招放在浅底段落里就把 `opacity` 降到 **.05–.06** 当水印，别超过 .07，
否则正文没法读。

### 8.2 发丝线两栏（follow.art）

左窄栏只放一个小标签，右宽栏放大标题 + 短句，中间一条 1px 竖线。
比「居中大标题」有态度得多，而且天然左对齐、天然响应式。

```
grid-template-columns: minmax(150px,.72fr) 1.28fr;  右栏 border-left: 1px
窄屏（<760px）塌成一栏，竖线去掉
```

### 8.3 短破折号列表 + 固定右下角 CTA（follow.art）

- `li::before{content:"\2013"}`，破折号用强调色。三条以内。
- 右下角钉一个 **76px 高的实心块**，右上角一个描边圆圈里放箭头。
  它一直在，不抢内容，但永远有一个出口。手机隐藏。

### 8.4 每段一个自己的底色

follow.art 每一屏换一个饱和底（橙 / 苔绿 / 藕粉）。视频页不能这么干——
饱和底会跟素材打架。**改成一次硬反转**：整页近黑，中间一段翻成
骨白 `#EDE9E1` + 近黑字，没有过渡、没有渐变。一次就够，第二次就廉价了。

### 8.5 TL;DR / 贡献点：编号卡横向轨道（affinity.studio）

论文页最该抄的就是这个。节标题左、**一对描边圆形箭头**右，下面一条
`scroll-snap` 横向轨道，每张卡：

```
1/4        <- 12.5px，letter-spacing .08em，灰
大标题      <- 压缩字重 600 全大写，clamp(23px,2.6vw,33px)
两三句灰字   <- 15px/1.62，关键词 <b> 提亮
（可选）一个大数字
```

四张卡讲一条线：**问题 → 洞察 → 改动 → 结果**。读者滑一遍就拿到了 TL;DR，
不用读摘要。

```css
.rail{display:grid; grid-auto-flow:column; grid-auto-columns:min(430px,84vw);
      gap:14px; overflow-x:auto; scroll-snap-type:x mandatory; scroll-behavior:smooth}
.rail::-webkit-scrollbar{display:none}
.rcard{scroll-snap-align:start}
```
箭头按滚动位置 `disabled`，滚到头就变灰。

### 8.6 「一行改动」就要真的显示成一行代码

方法只改一行的论文，**别用散文描述这件事，直接放 diff**：

- 一个带行号的代码面板，5–7 行，上下文是原算法。
- 改动那一行：左边 2px 强调色竖条 + 11% 强调色底 + 行号也变强调色。
- 面板顶栏：左「The change · inside the DMD student update」，右「1 line added」。
- 面板下面一句话：「第 4 行就是全部，上下都是你已经有的循环。」

这比任何公式都更能把「改动极小」这件事讲清楚。公式另外放一条
上下发丝线的 `.eq` 横条里，字号 clamp(19px,2.3vw,31px)，被减掉的那一项用
`--faint` 压暗、结果项用强调色。

### 8.7 可拖的对比条（自创，但每个 A/B 论文都该有）

论文的主张如果是「A 崩了 B 没崩」，就让读者自己拖：

- 两个视频叠放，上面那个 `clip-path: inset(0 0 0 X%)`。
- `pointerdown/move` 改 X；中间 1px 白线 + 46px 描边圆 + `↔`。
- 两边角上各一个小标签：方法名 + 「3 000 iterations」。
- `timeupdate` 里对时，偏差 > 0.08s 就把右边拉回左边的 `currentTime`。
- 必须是**同 prompt、同 seed、同 step 数**，并且把这句话写在下面。

### 8.8 这一档的取舍

| 要 | 不要 |
| --- | --- |
| 一个可变字族（Archivo 62–125 宽度轴），宽度轴当层级用 | 三个字族 |
| 全大写只用在**压缩大标题**和 12.5px 小标签 | 全大写正文 |
| 一个强调色，出现 ≤ 6 次（破折号、ours 行、改动行、箭头） | 彩色 badge 满天飞 |
| 媒体 `border-radius: 0`，4px 缝隙拼成接触印相式网格 | 每块都 24px 圆角 |
| 胶片颗粒 3%（SVG feTurbulence 铺满 `position:fixed`） | 渐变、光晕、毛玻璃卡片 |
