# PRD — 4Seas 清迈社区 Residency 系统（v2 重建）

- **状态**: ready-for-agent（本地文档；项目未配置 issue tracker，暂不发布到外部）
- **日期**: 2026-07-21（修订 v2）
- **来源**: 基于第一性原理讨论对齐后的产品方案；现有 v0 生成项目（`4-seas-crypto-residency`）仅作内容层参考素材
- **交付形态**: 全新 repo，同栈重建（Next.js 16 App Router + React 19 + TypeScript + Tailwind v4 + shadcn/ui + framer-motion + Supabase + Resend + Vercel）

**修订记录**
- v2.1（2026-07-21）：入住指引定时方案经讨论确认采用**每日 cron（Vercel Cron 组件）**；补充查证依据——Resend 定时投递（scheduledAt）预约上限为 30 天（官方文档），无法覆盖常态的录取→入住间隔，故 scheduledAt 方案被正式否决；明确入住日恒为每月 1 号或 15 号。
- v2（2026-07-21）：① 取消提交确认邮件（成功页承担即时确认）；② 取消同邮箱同 track 去重；③ 入住指引拆为独立邮件，入住日前 3 天自动送达（每日 cron）；④ 婉拒邮件沿用社区现有模板并附 coliving 居住折扣 promo code；⑤ 管理端认证从 Supabase Auth 独立账号改为共享长密码（服务端校验 + session cookie），Supabase 仅作数据库使用。
- v1（2026-07-20）：初版。

---

## Problem Statement（问题陈述）

4Seas 是清迈的一个社区，运营三条 residency 项目线（crypto / art / longevity）。当前面临的问题，从各角色视角看：

**申请人视角**：
- 提交申请后没有可靠的结果传达机制：录取、拒绝、面试邀请全靠管理员人肉逐个联系，容易遗漏、延迟。
- 被录取后缺少入住前的到达指引，临近入住还要在 Telegram 上追问地址与安排。
- 对未开放的 track 没有清晰指引，可能误填进不存在的批次。

**管理员视角**：
- 现有「后台」只有一道前端硬编码密码门，任何打开浏览器控制台的人都能绕过——申请人的 PII（姓名、邮箱、联系方式、个人陈述）暴露在无保护状态。
- 做出决定后还要手动逐封写邮件通知，「定夺」和「兑现通知」是两件事，后者经常被拖延或遗忘；入住指引更是全靠人记日历。
- 7+ 状态的招聘式流水线对 1-3 人拍板的小社区是仪式负担。

**维护者视角**：
- 内容模型双份漂移：配置文件里是含「oceanfront」等与清迈矛盾的死文案，真文案硬编码在各组件里；动态路由页被静态页 shadow 成死代码。
- 全客户端架构（浏览器 anon key 直连 Supabase）意味着邮件密钥、限流、PII 边界都无处安放。

## Solution（解决方案）

问题的本质是**一条筛选管道**：吸引对的人 → 收集足够判断 fit 的信号 → 高效决策 → 可靠地传达结果。据此重建：

- **营销与申请（公开侧）**：首页 + 三条 track 介绍页 + 申请页。每条 track 有独立状态（open / coming-soon / closed），由统一内容配置驱动，介绍页 CTA 随之联动。申请无需注册登录，全程 ≤10 分钟；提交成功页即时确认（不发确认邮件）。
- **推送式结果通知（邮件，四类，纯英文）**：
  1. **面试邀请**——进入面试时发送，含约时间方式；
  2. **录取通知**——决策后立即发送，候选人尽早知道结果、安排行程；
  3. **入住指引**——独立邮件，入住日前 3 天由系统自动送达，含到达与入住信息，零人肉记日历；
  4. **婉拒**——沿用社区现有模板措辞，附 coliving 居住折扣 promo code，保留良性关系并给出替代路径。
- **审核后台（管理侧）**：共享长密码登录（服务端校验，不再是前端密码门），列表 / 筛选 / 搜索 / 详情集中呈现判断信号，署名留言讨论，改状态时弹窗预览邮件后一键「更新并发送」。从打开后台到完成一次决策（含发信）≤1 分钟。
- **安全底线**：匿名端零直连读写——所有数据操作经服务端唯一写边界；三张表 RLS 全拒；密钥只存在于服务端环境变量。

**成功标准**：
1. 申请人从了解到提交 ≤ 10 分钟，全程无需注册登录
2. 面试 / 录取 / 拒绝三个跃迁点均自动发信；被录取者在入住前 3 天自动收到入住指引——全程零人肉兑现
3. 管理员从打开后台到完成一次决策（含发信）≤ 1 分钟
4. 匿名访客无法读取或篡改任何申请数据

**规模封顶假设**：月申请量 < 100，管理员 1-3 人。一切复杂度按此规模裁剪。

## User Stories（用户故事）

### 访客 / 潜在申请人

1. As a 访客, I want 一个介绍 4Seas 与三条 residency track 的首页, so that 我能在 3 分钟内判断「这地方适不适合我」。
2. As a 访客, I want 每条 track 有独立介绍页（What It Is、Residency Cycle、Themes、Questions We Explore、What Residents Bring）, so that 我能深入了解该 track 的主题与节奏后再决定申请。
3. As a 访客, I want 清晰看到每条 track 当前是否开放申请（open / coming soon / closed）, so that 我不会误填进不存在的批次。
4. As a 对未开放 track 感兴趣的访客, I want 「Coming Soon」页面告知开放预期与关注渠道, so that 我可以留下关注而不是流失。
5. As a 访客, I want 页面在手机上完整可用, so that 我在社交媒体上点进链接后能直接浏览与申请。
6. As a 访客, I want 页面上有社区链接（Telegram / X / WhatsApp）, so that 我在申请前后都能与社区建立联系。
7. As a 访客, I want 旧的 `/apply` 链接仍然有效（重定向到 crypto 申请页）, so that 历史传播的链接不会失效。

### 申请人

8. As a 申请人, I want 无需注册登录直接填表提交, so that 申请摩擦最小。
9. As a 申请人, I want 表单字段清晰标注必填项并有内联校验提示, so that 我在提交前就能修正错误。
10. As a 申请人, I want 「关于你」输入框有 300 词实时计数与超限提示, so that 我知道篇幅约束并控制表达。
11. As a 申请人, I want 从预设的入住日期选项中选择期望开始时间, so that 我的时间预期与项目周期对齐。
12. As a 申请人, I want 提交成功后立即看到明确的成功页（含审核时间预期与社区链接）, so that 我确定提交已完成、知道接下来会发生什么（这是提交环节唯一的确认触点，不发确认邮件）。
13. As a 进入面试环节的申请人, I want 收到面试邀请邮件（含约时间方式与时区提示）, so that 我知道下一步怎么做。
14. As a 被录取的申请人, I want 决策后立即收到录取邮件（祝贺 + 确认入住时间 + 下一步）, so that 我能尽早安排签证与行程。
15. As a 被录取的申请人, I want 入住日前 3 天自动收到入住指引邮件（地址、到达方式、入住安排）, so that 我带着最新、正确的信息顺利入住。
16. As a 未被录取的申请人, I want 收到措辞得体的婉拒邮件（沿用社区现有模板，附 coliving 居住折扣 promo code）, so that 我保留与社区的良性关系，并有折扣入住的替代路径。
17. As a 申请人, I want 我的个人信息（姓名、邮箱、联系方式、陈述）不被任何匿名访客读取, so that 我的隐私得到保护。

### 管理员

18. As a 管理员, I want 用一个共享的长随机密码登录后台（服务端校验、真实会话）, so that 后台不再是任何人开控制台就能绕过的前端密码门，同时无需维护账号体系。
19. As a 管理员, I want 登录时填写自己的显示名, so that 我的留言与操作有署名可追溯。
20. As a 未登录访问者, I want 访问后台时被重定向到登录页，且所有管理操作在服务端拒绝无会话请求, so that 不存在未认证的入口。
21. As a 管理员, I want 打开后台第一眼看到申请列表与各状态汇总数, so that 新申请一目了然。
22. As a 管理员, I want 按 track 与状态筛选、按姓名/邮箱/联系方式搜索, so that 我能快速定位目标申请。
23. As a 管理员, I want 按提交时间等排序, so that 我按自己的节奏处理队列。
24. As a 管理员, I want 点开申请后在详情面板集中看到全部判断信号（about、contribution、社交链接、入住时间等）, so that 我不需要在多处拼凑信息。
25. As a 管理员, I want 在申请详情里署名留言, so that 我和搭档能异步讨论且知道是谁说的。
26. As a 管理员, I want 看到搭档留下的全部留言, so that 决策讨论有完整上下文。
27. As a 管理员, I want 沿 5 态状态机推进申请状态（submitted → reviewing → interview → accepted | rejected）, so that 流程与小团队实际决策节奏匹配。
28. As a 管理员, I want 改状态到 interview / accepted / rejected 时先弹窗预览将要发出的邮件全文, so that 我不担心手滑误发或发错内容（所见即所发）。
29. As a 管理员, I want 预览弹窗有「更新并发送」「更新但不发送」「取消」三个选择, so that 对拿不准的申请可以先改状态、内部讨论后再统一发信。
30. As a 管理员, I want 邮件发送失败时状态变更仍然生效并收到明确报错, so that 内部决策不被外部服务故障绑架。
31. As a 管理员, I want 对发送失败的邮件一键 Retry 补发, so that 故障恢复后不需要重走决策流程。
32. As a 管理员, I want 入住指引由系统在入住日前 3 天自动发送并落审计记录, so that 我不用记日历人肉发送。
33. As a 管理员, I want 把申请从 accepted 改走后，尚未发送的入住指引自动不再发送, so that 撤销录取不会泄漏错误的入住承诺。
34. As a 管理员, I want 在申请详情里看到该申请的完整发信历史（类型、时间、结果、触发者——含系统自动发送的记录）, so that 我确切知道申请人收到过什么。
35. As a 手机上处理事务的管理员, I want 后台在移动端可用, so that 我不必回到电脑前才能处理申请。

### 运营者 / 内容维护者

36. As a 运营者, I want 在单一内容配置处修改某条 track 的开放状态, so that 介绍页 CTA、申请页可用性、首页标签三处自动联动。
37. As a 运营者, I want 全部文案（首页、track 页、申请页、邮件模板）集中在内容配置中, so that 改文案不需要动组件代码、不会出现双源漂移。
38. As a 运营者, I want 入住日期选项集中配置, so that 每个周期开始前只改一处。
39. As a 运营者, I want coliving 折扣 promo code 单点配置, so that 换码时只改一处、婉拒邮件自动生效。

### 开发者 / 运维

40. As a 开发者, I want 一个 seed 脚本灌入 20 条假申请, so that 后台联调不依赖真实提交。
41. As a 开发者, I want 类型检查干净的构建（不设 ignoreBuildErrors）, so that 构建通过即类型正确。
42. As a 开发者, I want 所有密钥（service role、Resend key、后台密码）只存在于服务端环境变量, so that 客户端 bundle 里字面上不含任何敏感能力。
43. As a 运维者, I want 服务端限流（同 IP 每小时 ≤3 次提交）与 honeypot, so that 垃圾提交不会淹没审核队列。
44. As a 运维者, I want 每次邮件发送尝试都落 email_log（含失败原因与触发者）, so that 对外承诺有完整审计痕迹。
45. As a 运维者, I want 入住指引定时任务天然幂等（同一申请只成功发送一次，重跑不重发）, so that 定时任务重试或重复触发不会骚扰申请人。

## Implementation Decisions（实现决策）

### 架构

- **全新 repo**，不在旧项目上迭代；旧项目仅作内容与交互参考。新 repo 不设 `ignoreBuildErrors`。
- **服务端唯一写边界**：所有数据读写走服务端入口 + service-role 客户端（server-only 模块）；浏览器端不做任何数据库直连。服务端入口共五个：公开一个（提交申请）；管理三个（更新状态·可选发信、添加留言、补发邮件）；定时一个（入住指引 cron 路由，用 `CRON_SECRET` 保护）。
- **RLS 策略**：三张表全部启用 row level security 且**不写任何 policy（默认全拒）**。理由：单一写边界 + 集中审计，该规模不值得维护 per-table policy。
- **Supabase 仅作 Postgres 数据库使用**，不使用 Supabase Auth、不引入浏览器端 Supabase 客户端。
- **术语**：新系统统一用 **track**（旧系统的 "program"）；状态词汇表见下。

### 管理端认证（共享长密码）

- 单一长随机密码（≥32 字符）存于环境变量 `ADMIN_PASSWORD`；登录页输入密码 + 显示名（用于留言署名与操作审计）。
- 服务端校验通过后签发 httpOnly 签名 session cookie（`SESSION_SECRET` 签名，含显示名与过期时间）；middleware 仅做体验层重定向，**安全边界在每个管理服务端入口内部的会话校验**。
- 登录尝试做服务端限流，防暴力猜测。
- 不建账号表、不用 Supabase Auth、无邮箱白名单。信任模型：1-3 名互相信任的管理员共享一个密码；泄露时轮换环境变量即可全局登出。

### 内容模型（单一内容源）

- 统一内容配置模块承载全部文案：每 track 的 hero、whatItIs、cycle、themes、questions、residentsBring、longevity 专属 section、apply 页文案、`state: 'open' | 'coming_soon' | 'closed'`；站点级的首页 hero、offers、howItWorks、whoWeWelcome、exploreMore、社群链接；入住日期选项（**入住日恒为每月 1 号或 15 号**，选项按此规则生成）；coliving promo code（非机密，放内容配置）。
- **组件规则**：任何组件不得内嵌 per-track 文案，只接收配置切片作 props。
- 三个静态 track 页合并为一个动态路由页 + 静态参数生成；旧配置中的 PROGRAMS 文案与 applicationQuestions 全部丢弃（只保留 id/name/color/state 的结构思想）。
- 表单字段唯一权威 = 旧 repo 申请表单组件的已验证字段集（不是旧 PROGRAMS 配置）。
- 两个重复 Footer 合一；explore-more 双份内容合一；图片资源与主题 token 从旧 repo 原样拷贝。

### 状态机

```
submitted → reviewing → interview → accepted
                                  ↘ rejected
```

- 5 态：`submitted`、`reviewing`、`interview`、`accepted`、`rejected`。管理端下拉可直接设置任意状态（小团队信任模型，不强制线性推进）。
- 邮件触发映射：进入 `reviewing` 直接更新、无邮件；进入 `interview` / `accepted` / `rejected` 触发邮件预览弹窗（立即发送）；`movein_guide`（入住指引）不绑定状态跃迁，由定时任务按日期自动触发。
- **邮件与状态解耦**：状态更新先落库，发信后置；发信失败状态仍生效。「改状态」是可撤回的内部操作，「发邮件」是不可撤回的对外承诺，两者不能无条件耦合。
- 不迁移旧系统的 7+ 状态与 legacy 状态映射逻辑。

### 数据模型（三张表）

| 表 | 字段要点 |
|---|---|
| **applications** | track、status（5 态 check 约束）、full_name、email、telegram_or_whatsapp、country、preferred_start_date、about、contribution、primary_link、linkedin、extra_link、content_studio_plans、ip_hash、status_changed_at / status_changed_by、created_at |
| **review_notes** | application_id、author_name（取自登录会话显示名）、note、created_at |
| **email_log** | application_id、email_type（interview / accepted / rejected / movein_guide）、recipient、subject、outcome（sent / failed / skipped）、resend_id、error、triggered_by（管理员显示名或 `cron`）、created_at |

旧表 ~37 列砍到 1:1 对应真实表单字段 + 最小审核元数据。

### 提交流程（公开侧）

1. schema 校验（含 track 开放状态的服务端权威校验——前端渲染关闭提示不作为安全依据）
2. honeypot 隐藏字段有值 → 返回假成功，不落库
3. DB-backed 限流：ip_hash（加盐哈希，不存原始 IP）每小时 ≤3 次
4. 入库（status = `submitted`）
5. 前端渲染成功页（即时确认 + 审核时间预期 + 社群链接）

**不发确认邮件、不做重复提交去重、不上验证码**。重复提交由管理员在后台按邮箱搜索自行甄别（月 <100 量级可承受）。

### 邮件

- 四种类型：
  - **interview**：进入面试时管理员预览后发送；含回信约时间方式 + GMT+7 时区提示。
  - **accepted**：录取决策后管理员预览后**立即**发送；祝贺 + 确认入住时间 + 下一步指引。
  - **rejected**：管理员预览后发送；**沿用社区现有婉拒模板文案**（实现时由社区提供），附 **coliving 居住折扣 promo code**（固定码，单点配置）。
  - **movein_guide**：**每日定时任务自动发送**——扫描 status = accepted、preferred_start_date 距今 ≤3 天（含当天，覆盖临近入住才录取的情况）、且无成功 movein_guide 记录的申请，发送入住指引（地址、到达方式、入住安排）并落 log。幂等由 email_log 保证；申请被改出 accepted 后自然不再命中扫描条件（撤销录取自动止损）；改期后按新日期自然重算。
- **选每日 cron 而非 Resend 定时投递（scheduledAt）的理由**（已查证并与社区确认）：① scheduledAt 预约上限 **30 天**（Resend 官方文档），而 rolling admissions + 固定 1 号/15 号入住意味着录取→入住间隔超 30 天是常态，预约方案必须再配一个到点兜底——兜底本身就是 cron；② 预约后状态撤销 / 改期需要 cancel/update 补偿逻辑，漏掉即向不该收的人发出入住地址；③ 预约邮件内容在录取时冻结，指引信息更新无法传导。cron 在发送时刻读取数据库当前状态，内容与时机天然正确，无需任何取消逻辑。
- **cron 组件**：Vercel Cron（平台配置一行 + 一个受 `CRON_SECRET` 保护的路由，内含约几十行扫描发送逻辑），非自建调度器。扫描窗口「距入住 ≤3 天且未发过」自带自愈：某天运行失败，次日运行自动补发。入住日恒为 1 号/15 号，实际发送日固定落在每月 12 号与月底前 3 天，但扫描仍每日运行（简单且自愈）。
- Resend SDK 仅在 server-only 模块实例化；发件人 `4Seas Residency <residency@mail.<域名>>`，reply-to 指向真实收件箱（面试约时间靠回信，无需日历集成）。
- **纯 HTML 字符串模板，不用 react-email**：纯文字事务邮件，共享一个布局包装函数 + 各类型内容槽位函数，同时产出 text 版。
- **预览与发送共用同一个纯函数** `getEmailContent(type, application)` → 所见即所发的结构性保证（movein_guide 无人工预览，但同走此函数，内容可在管理端随时查看）。
- 幂等顺序：先落库/先改状态，后发信；每次发送尝试一条 log。月发信量 < 100，不上队列与发送回执 webhook。

### 环境变量

`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`RESEND_API_KEY`、`EMAIL_FROM`、`EMAIL_REPLY_TO`、`ADMIN_PASSWORD`、`SESSION_SECRET`、`IP_HASH_SALT`、`CRON_SECRET`、`NEXT_PUBLIC_SITE_URL`。

### 路由结构

| 路径 | 说明 |
|---|---|
| `/` | 首页（server component，读内容配置） |
| `/residency/[track]` | 介绍页，state 驱动 CTA（Apply / Coming Soon / Closed） |
| `/residency/[track]/apply` | 申请页；state ≠ open 时渲染关闭提示，服务端再校验 |
| `/apply` | redirect → crypto 申请页（保留旧链接） |
| `/admin/login` | 管理员登录（密码 + 显示名） |
| `/admin` | 审核后台（列表 + 筛选 + 详情面板，沿用旧项目交互模式） |
| 定时路由 | 入住指引每日扫描（Vercel Cron 触发，`CRON_SECRET` 保护，Asia/Bangkok 上午执行） |

### 里程碑

| 阶段 | 内容 | 验收要点 |
|---|---|---|
| M1 | 脚手架 + 内容层 + 三类公开页（表单纯 UI） | 与参考站逐页视觉对照；改 track state 三处联动；类型检查干净 |
| M2 | migration SQL + 提交链路 | 提交→落库+成功页；anon key 直连被拒；honeypot 不落库；限流生效 |
| M3 | 共享密码登录 + 仪表盘 + 留言 | 正确密码可进；错误密码被拒；未登录重定向；无会话的管理入口被服务端拒绝 |
| M4 | 决策流 + 三封决策信 + 入住指引 cron + 补发 | 走完整状态机；模拟发信失败→状态已变 + log=failed + Retry 可补发；cron 幂等（重跑不重发）；改出 accepted 后不再发指引 |
| M5 | 打磨 + 上线 | 生产真实邮箱全流程冒烟，四类邮件均达收件箱；anon 直连拒绝复测；线上 cron 实跑验证 |

## Testing Decisions（测试决策）

- **不建自动化测试体系**（规模不值得），按里程碑人工验收。以下决策确保「如果将来加自动化测试，不需要重构」。
- **唯一主 seam：服务端入口层**（四个 server actions + 一个 cron 路由）。全部业务规则（校验、honeypot、限流、状态机、邮件编排、定时扫描、审计落库）都在这一层背后，验证从这里抓取。仅有两个外部边缘可 mock：Supabase 服务端客户端、Resend 发送模块。不为测试引入额外抽象层（明确否决单独的 DB repository 接口层）。
- **纯函数免 mock 直测**：邮件模板函数（输入申请对象 → 输出 subject/html/text）、列表筛选/排序/计数工具函数。这些因「预览=发送共用同一函数」的设计天然可测。
- **好测试的标准**：只测外部行为——给定输入，断言落库结果、email_log 记录、返回值；不断言内部实现细节（调用次数、内部函数、私有状态）。
- **人工验收的关键动作**（与 seam 一致，都在边界上验证）：
  - 用 anon key 直连数据库读写 → 必须被 RLS 拒绝
  - honeypot 填值提交 → 返回成功但不落库、不发信
  - 拔掉 Resend key 后改状态 → 状态生效 + log=failed + Retry 可补发
  - cron 连跑两次 → 同一申请入住指引只发一封
  - 申请改出 accepted 后跑 cron → 不发指引
  - 错误密码登录被拒；持有效会话才能调用管理入口
- **先例**：旧 repo 无任何测试，无可参考先例；seed 脚本承担联调数据职责（含构造「距入住 3 天内的 accepted 申请」用于 cron 验收）。

## Out of Scope（范围外）

- **提交确认邮件**——成功页承担提交环节的即时确认，不占用发信额度与模板维护成本。
- **重复提交去重**——不做同邮箱同 track 拦截；月 <100 量级由管理员搜索甄别。
- **申请人账号体系与状态自查页**——推送邮件已覆盖关键跃迁，拉取式自查是伪需求。
- **通用队列 / 发送回执 webhook**——唯一定时任务是每日入住指引扫描；不做更通用的任务系统。
- **Resend 定时投递（scheduledAt）**——预约上限 30 天，无法独立覆盖常态录取→入住间隔；被 cron 方案替代，完整理由见实现决策。
- **验证码**——损伤转化；honeypot + 限流已够用。
- **Supabase Auth / 账号体系**——共享长密码方案替代。
- **Per-applicant 唯一 promo code**——用固定码；需要防转发/追踪归因时再升级为唯一码。
- **多租户 / 多社区支持**。
- **CSV 导出**——如需求出现，M5 时从旧 repo 低成本移植纯函数即可（明确为可选项，不是承诺）。
- **旧申请数据迁移**——默认不迁；新 Supabase project 与旧数据隔离。
- **日历集成**（面试约时间靠邮件回信）。
- **邮件多语言**（只发英文）。
- **7+ 状态流水线与 legacy 状态映射**——旧系统的复杂状态机不迁移。

## Further Notes（附注）

- **待确认 / 待社区提供**：发件域名具体值（已确认「有域名可用」，DNS 验证在 M5 前完成即可）；现有婉拒邮件模板文案；coliving 折扣 promo code 值；入住指引内容（地址、到达方式、入住安排）。
- **需要人工操作的外部步骤**（agent 无法代办）：创建新 Supabase project；Resend 域名 DNS 验证；Vercel 项目、环境变量与 Cron 配置；生成并保管 `ADMIN_PASSWORD` 长随机密码。
- **内容迁移的参考素材**（旧 repo）：申请表单组件是表单字段/校验/成功页的唯一权威；首页组件与各 residency 区块组件（what-it-is、themes、questions、what-residents-bring 等）是真实文案的迁移源；旧 PROGRAMS 配置的文案与 applicationQuestions 属于死配置，弃用；管理后台的筛选/排序纯函数可直接移植（砍掉 legacy 状态映射）。
- **被推翻的继承假设**（避免复活）：全客户端架构、招聘式多状态流水线、申请人状态自查页、前端密码门、双份内容源。
- 主题 token（暖米色 + 深青绿，源自 4seas.xyz 视觉）与图片资源从旧 repo 原样沿用。
