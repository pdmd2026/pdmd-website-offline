---
name: genai-demo-skill
description: 为生成式 AI 论文/模型做一支 Apple / Sora / Veo / Seedance 级别的宣传片（launch film），以及配套的 demo 页。覆盖：用 yt-dlp 抓官方参考片并量出它们的节拍、基座选型（Remotion）、CC0 配乐与拍子网格、用 NumPy 合成音效、镜头语法与段落结构、素材去重与选片、逐版迭代的接法。当用户说「做个宣传片 / promo video / launch film / demo video / 参考 Apple 的广告 / 像 Veo 那样的片子 / 把结果剪成一支片 / 复刻大厂 demo」时使用。也用于这类片子的改版（换素材、卡点、加特效、加转场声、改 slogan）。
---

# GenAI Launch Film

给一个生成式模型（T2V、T2I、蒸馏、world model…）做一支 60–90 秒的发布片。
这份 skill 是 2026-09-05 那次会话（code-video-model 宣传片 v1→v7）的沉淀，
**已经踩过的坑不要再踩一遍**。

配套的另一件事是 demo 网页——那走 `video-website` / `bytedance-website-skill`，
**网页不用来做宣传片，宣传片不用来当网页**。两件事分开。

---

## 0. 开工前先确认三件事

1. **素材在哪。** 一个 manifest / 结果页 / TOS 目录。没有素材就没有片子，
   先把素材拉全，不要边剪边找。
2. **一句话主张。** 整支片子只讲一件事（「4 步也能有 50 步的画质」「你可以
   用代码导演视频」）。所有镜头都为这句话服务。
3. **结尾 slogan。** 祈使句 + 产品名，两张卡。早点定，因为它反过来决定
   中间章节怎么排。

---

## 1. 参考片：先下载，再量，不要凭印象

**永远先看真片子。** 记忆里的「Apple 风格」是假的，节拍只能量出来。

```bash
# 系统自带的 yt-dlp 会太旧（YouTube 报 "The page needs to be reloaded"）
# 用 GitHub 上的独立二进制
curl -L -o ~/.local/bin/yt-dlp https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos
chmod +x ~/.local/bin/yt-dlp
yt-dlp "ytsearch1:This is Sora 2 OpenAI" -f 'bv*[height<=1080]+ba/b' -o refs/sora2.mp4
```

这台机器上**没有系统 ffmpeg**，用 Python 包里的那个：

```python
import imageio_ffmpeg; FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
```

X / Twitter 上的片子走 syndication 接口拿直链（`cdn.syndication.twimg.com/tweet-result?id=<id>`）。

固定的四条参考片（够用了）：
OpenAI *This is Sora 2* · Google *Meet Veo 3* · BytePlus *Introducing Dreamina Seedance 2.0* ·
Apple *iPhone 17 Pro*。

**量什么：**

```bash
# 切镜表：scene change 时间戳
$FFMPEG -i refs/veo3.mp4 -filter:v "select='gt(scene,0.35)',showinfo" -f null - 2>&1 \
  | grep showinfo | sed -n 's/.*pts_time:\([0-9.]*\).*/\1/p'
# 抽帧拼图：每 2 秒一帧，贴成 contact sheet，自己看
$FFMPEG -i refs/veo3.mp4 -vf "fps=1/2,scale=320:-1,tile=8x6" -frames:v 1 analysis/veo3_sheet.jpg
```

量出来的三种原型，**直接抄这些数字**：

| 原型 | 参考 | 节拍 |
| --- | --- | --- |
| **A 排版** | Apple / Astra 快闪 | reveal 12 帧、exit 9 帧、单词卡 0.8–1.2 s、三连切 0.5 s、纯黑白底 |
| **B showreel** | Sora 2 / Veo 3 | 满屏素材 5–8 s、叠化 12 帧、Veo 每 7.9 s 一切 |
| **C 功能演示** | Seedance / iPhone | 角标、渐变卡 1.5 s、prompt 打字、分屏、粗体引导词字幕 |

**先各复刻 15 秒**再做正片。复刻是用来验证节拍数字对不对的，不是交付物。
不要一上来就剪 80 秒。

---

## 2. 基座：Remotion，不做兼容层

评估过三条路，结论固定：

- **网页 HTML** —— 只做 demo page。不要用来做片子。
- **HyperFrames** —— 纯排版行，混剪真实素材 + 音频弱。
- **Remotion** —— 逐帧确定性渲染、直出 mp4、素材/字幕/分屏/音频一起编。**用这个。**

不要为了「以后可能换渲染器」写抽象层。镜头语法本来就只是一堆数字
（帧数、位置、缓动），天然与渲染器无关，抽象层只会吃掉 Remotion 的性能。

```bash
npx create-video@latest --blank promo && cd promo && npm i
npx remotion render src/index.ts Promo out/promo_720p.mp4 --scale=0.667
```

工程结构：`src/theme.ts`（色板、字体、缓动）、`src/components/`（可复用镜头单元）、
`src/Promo.tsx`（时间线）、`src/assets.ts`（素材清单 + id，用来查重）。

**渲染分辨率**：先只渲 720p。1080p 留到定稿。Remotion 直出的 720p 80 秒
大约 38 MB，超过聊天发送上限，另压一份 ~20 MB 预览：

```bash
$FFMPEG -i out/promo_720p.mp4 -c:v libx264 -crf 30 -preset slow -c:a aac -b:a 96k out/promo_preview.mp4
```

---

## 3. 音乐：CC0，而且整条时间线要卡在拍子上

**配乐来源**：Wikimedia Commons API 按 CC0 检索，按时长 / 速度 / 响度曲线预筛。
已验证好用的两首（Komiku，CC0）：

- **Ambiant Hope** —— 100.29 bpm，沉稳。默认选它。
- **Opening** —— 129.97 bpm，更有推动力。（一次试过，Gordon 否了，说「不好」。
  想换更激扬的先问。）

转码 +9 dB 带限幅，别削波。版权写进 `public/audio/CREDITS.md`。

**拍子网格是硬要求**，不是加分项：

1. 测 bpm 和第一个拍点的相位（onset detection 或人工对齐）。
2. 每一段的时长改成**整数拍**（100.29 bpm → 1 拍 = 0.598 s，素材单元 8 拍 = 4.79 s）。
   注意：素材本身 5.17 s，8 拍比它短，是**故意的**——每段都在素材放完前切走。
3. 配乐从拍点起播，不是从 0 起播。
4. 渲完用切镜检测验证：**每个硬切离拍点 < 10 ms**，超了就是没卡上。

**音效自己合成**，不要找音效库（版权 + 找不到合适的）。`scripts/make_sfx.py`，
纯 NumPy 写 wav，五个就够：

| 音效 | 用在哪 | 大致做法 |
| --- | --- | --- |
| `tick` | 代码逐行流出 / 打字 | 极短噪声 burst + 快速衰减 |
| `whoosh` | 擦除转场 | 带通滤波白噪声，频率扫上去 |
| `thump` | 单词卡落地 | 低频正弦，60→40 Hz 下滑 |
| `shimmer` | 画面出现 | 高频泛音叠加 + 慢衰减 |
| `riser` | 主镜头擦除前 | 1–2 s 上升扫频 |
| `transition` | 大转场 | 0.5 s 上升扫频 → 低频撞击 + 明亮和弦 → 1.2 s 闪光尾音 |

`transition` 的撞击要**对准竖线到达右边缘的那一帧**，不是对准转场开始。
成片音轨加限幅防削波。

---

## 4. 结构：一条已经过审的骨架

```
① 钩子        prompt 打字（字号要大，56 px / 框宽 1500 px；24 px 太小，被否过）
② 方法一遍    代码流出 → Three.js / 中间表示 → 全屏 → 竖线擦成生成视频
③ 能力分章    每章一张两拍的祈使句标题卡
④ 应用        满屏字卡 + 斜线分割单元
⑤ slogan      "Direct your dreams." → 产品名
```

章节标题用**祈使句**，不用名词：`Control the camera` / `Control the subject` /
`One image sets the look` / `Applications`。

**核心可复用单元**（每个都验证过）：

- **`CodeToVideo`**（5.1 s）：前 1.7 s 左代码逐行流出（每行一声 tick）+ 右中间表示；
  12 帧放大到全屏；2.35 s 竖线擦到**同一时刻**的生成视频；剩余时间放生成视频 + 左下字幕。
- **`TriptychReveal`**：三个中间表示并列，相隔 0.3 s 依次擦成真实生成，**六段共用同一时钟**。
- **`RefToVideo`**：参考图放大成首帧。
- **`DiagonalReveal`**：斜线分割，左中间表示、右生成视频。起点在**画面外右侧**——
  先只显示左边的东西停 0.6 s，斜线 1.7 s 从最右扫到最左，扫完只剩视频，落转场音。

**擦除特效**（v5 加的，加完效果明显）：竖线柔光带（screen 混合）、露出侧 5% 宽度
先模糊后清晰、起点 35% 短闪、26 个光点、3% 回落缩放。

对比类的片子（蒸馏、加速、ablation）把 `CodeToVideo` 换成 **`BaselineWipe`**：
左 baseline、右 ours，同 prompt 同 seed，竖线擦过去。角标写 NFE / 步数 / 方法名。

---

## 5. 素材规则

1. **不许重复。** 脚本里做 id 校验，同一个素材 id 出现两次直接报错。
2. **场面要大。** 宏大、优美、有运动。玩具感的（塑料质感的车、静止的静物）
   一律换掉——Gordon 会一眼看出来并让你换。
3. **覆盖不同 category / application。** 一支片子里不要全是同一类场景。
4. **拉全再选。** 服务器上往往还有没拉过的页面。先把所有结果页的 manifest
   拉下来（几百个文件也拉），出**带标签的选片拼图**，一次选完，
   不要发现不够用再回头拉。

```bash
# 选片拼图：每个候选抽一帧，贴上 id 标签
for f in assets/*.mp4; do
  $FFMPEG -y -i "$f" -vf "select=eq(n\,24),scale=320:-1,drawtext=text='$(basename $f .mp4)':x=4:y=4:fontsize=14:fontcolor=white:box=1:boxcolor=black@0.6" -frames:v 1 "sheets/$(basename $f .mp4).jpg"
done
```

---

## 6. 迭代循环（这是真正花时间的地方）

出片 → Gordon 按**时间戳**给意见（`0:04 打字太小`、`0:25 后面怎么没有生成的视频了`）
→ 改 → 再出片。一版一个文件名（`promo_v3_720p.mp4`），**不要覆盖**，他会回头要旧版。

已经发生过的意见类型，提前避掉：

| 意见 | 含义 |
| --- | --- |
| 「打字太小」 | 屏上文字按 720p 缩略图能读为准，不是按 1080p |
| 「音乐卡点一点」 | 没上拍子网格，回第 3 节 |
| 「后面怎么没有生成的视频了」 | 那段的输出质量差到看不出是生成的 → **换素材**，不是加字幕解释 |
| 「重复素材太多」 | 第 5 节第 1 条 |
| 「换成好看的、场面宏大的」 | 第 5 节第 2 条 |
| 「这个 example 删掉」 | 直接换，并顺手把同族其余候选也拉下来看一遍 |
| 「还有应用呢！」 | 应用章不能省：3D/4D 重建、gaming、world models |

**片段回传**：Gordon 常常只要看某 12 秒。切片 + 压到能发送的体积：

```bash
$FFMPEG -ss 50 -i out/promo_v4_720p.mp4 -t 12 -vf scale=640:-2 -crf 30 out/share/v4_50_62.mp4
```

---

## 7. 交付

- 成片：`out/promo_v{N}_720p.mp4`（定稿再出 1080p）
- 预览：`out/promo_v{N}_720p_preview.mp4`（< 25 MB）
- 片段 + 抽帧图：`out/share/`
- 版权：`public/audio/CREDITS.md`（配乐 CC0 出处；参考片仅下载用于测量，不入片）
- **worklog 页面**：Gordon 会要一个「每一步我的完整 prompt + 这一步的视频结果」
  的页面，用 Artifact 发布。片子嵌 360p 压缩版，原片给路径。

---

## 8. 老实说清楚的事

片子里的东西哪些是真的、哪些是示意，**要在交付时说**：

- 片中的代码若是按 prompt 手写的示意（不是模型真实输出），说明。
- 音量若只按电平估计、没有耳听，说明。
- 素材若是低分辨率放大的（960×544 → 1080p），说明。
- 缺成对素材而用了近似的（「同一输入两种风格」其实不是同一输入），说明。
