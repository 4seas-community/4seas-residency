# 技术方案 — 4Seas Residency 系统（v2 重建）

- **日期**: 2026-07-21
- **上游文档**: `docs/PRD.md`（产品需求，已定稿）
- **方法**: 第一性原理推导 + 深模块（deep module）设计语言
- **Stack**: Next.js 16 App Router · React 19 · TypeScript · Tailwind v4 · shadcn/ui · framer-motion · Supabase (仅 Postgres) · Resend · Vercel

---

## 1. 第一性原理分析

**核心问题**：用最少的技术面积实现「公开投递 → 服务端效应（存储 + 邮件）→ 管理决策」管道，密钥与 PII 永不出服务端。

### 被挑战的技术假设

| 惯性假设 | 挑战 | 裁决 |
|---|---|---|
| 「前后端接口」需要 REST/JSON API 层 | 接口唯一消费方是自家 Next 前端 | **推翻**：0 条 REST 路由；Server Actions 即类型安全 RPC，TS 编译器替代接口文档。唯一 HTTP 端点是 cron（调用方是 Vercel 平台） |
| 需要 session/auth 库 | 需求本质 =「一个防伪造的 cookie」 | **推翻**：node:crypto HMAC 签名 cookie，~25 行 stdlib |
| 需要限流基础设施（Redis 等） | 限流数据（ip_hash + created_at）已在主表 | **推翻**：一条 count 查询 |
| 需要 @supabase/ssr + 浏览器 client | 浏览器零直连是安全底线 | 只装 supabase-js，service key，server-only |
| 需要 react-hook-form / 客户端 zod / codegen / 状态管理库 | 12 字段表单手写 state 已验证；3 张表手写类型即可；单页 dashboard | 全部不装；权威校验只在服务端 zod |
| 管理端需要分页/服务端筛选 | 总量 < 2k 行 | 全量下发 + 客户端纯函数筛选 |
| 乐观更新框架（useOptimistic 等） | action 返回更新后的行即可 | 客户端简单 merge |

### Ground Truths

1. 唯一前端是自家 app → 接口形态可以是**函数调用**而非网络协议
2. 密钥（service role / Resend / 管理密码）只能存在于服务端 → 一切效应必须是 server module
3. cron 的调用方是 Vercel 平台 → 必须且只需**一个** route handler
4. 「所见即所发」→ 邮件渲染必须是**纯函数**，预览与发送共用同一个
5. 月申请 < 100、总量 < 2k → 全量下发、每日扫描、count 限流全部成立

### 推理链

```
Ground Truths
  → 页面层：RSC 直读内容配置 / 数据库（无 API 中转）
  → 交互层：两个 client 岛（申请表单、admin dashboard）
  → 效应层：5 个服务端入口（4 server actions + 1 cron route）
  → 支撑层：3 个深模块（auth / email / db）+ 1 份内容配置（纯数据）
```

## 2. 系统拓扑

```
浏览器（匿名访客）                    浏览器（管理员）              Vercel Cron
   │  RSC HTML                          │  RSC HTML                    │ GET + Bearer CRON_SECRET
   │  submitApplication()               │  login/updateStatus/          │
   │  (server action)                   │  addNote/resendEmail()        │
   ▼                                    ▼                              ▼
┌─────────────────────────── Next.js (Vercel, Node runtime) ───────────────────────────┐
│  app/ 页面（RSC）      lib/actions/*（效应入口）        app/api/cron/movein-guide     │
│         │                    │        │                        │                      │
│  lib/content/*（纯数据） lib/auth.ts  lib/email/*（渲染纯函数＋发送）                   │
│                              │        │                        │                      │
│                          lib/db.ts（server-only，service role key）                    │
└───────────────┬──────────────────────────────────┬───────────────────────────────────┘
                ▼                                  ▼
        Supabase Postgres（RLS 全拒）          Resend API
```

浏览器不持有任何数据库凭证；客户端 bundle 中唯一的「后端知识」是 server action 的引用 ID。

## 3. 页面清单

| # | 路由 | 渲染 | 内容/数据来源 | 交互 |
|---|---|---|---|---|
| 1 | `/` | RSC（静态） | `lib/content/site.ts` + tracks 摘要 | 纯浏览；track 卡片按 `state` 显示 Now Open / Coming Soon 标签 |
| 2 | `/residency/[track]` | RSC，`generateStaticParams`（3 个 track 预渲染） | `lib/content/tracks.ts` 对应切片 | 区块：Hero → WhatItIs → ResidencyCycle → ThemesWeCare → QuestionsWeExplore → WhatResidentsBring（longevity 用 grouped 变体）→ Footer；CTA 按 state：open→Apply / coming_soon→提示 / closed→提示 |
| 3 | `/residency/[track]/apply` | RSC 外壳 + client 表单岛 | track 配置（标题/色/state）+ `site.ts` 统一三步流程 + `start-dates.ts` | state=open 时先展示 Apply → Review（可能面试）→ Decision，再渲染 `<ApplicationForm>`；提交成功后原地切换成功态。state 非 open 时渲染关闭提示 |
| 4 | `/apply` | `redirect()` | — | 永久重定向到 `/residency/crypto/apply` |
| 5 | `/admin/login` | RSC 外壳 + client 表单岛 | — | 共享密码 → `login` action（统一身份 `Admin`）→ 成功 redirect `/admin` |
| 6 | `/admin` | RSC（动态，每次请求读库）| `requireAdmin()` 门禁；`getDashboardData()` 全量读取 applications + notes + email_log | client 岛 `<AdminDashboard>`：状态汇总、筛选/搜索/排序；行点击打开完整 Sheet，展示所有申请字段、状态控制、留言、发信历史与 Retry |
| 7 | `not-found.tsx` / `loading.tsx` | 静态 | — | M5 补 |

**共享组件**：`Header`（导航，唯一一份）、`Footer`（合并旧 repo 两份为一份）、track 区块组件（全部只接收 config 切片 props，零内嵌文案）、admin 子组件（表格/卡片、Sheet、StatusSelect、EmailPreviewDialog、NoteComposer、EmailLogList）。

## 4. 前后端接口

接口形态 = server actions（类型安全函数，非 HTTP 契约）+ 一个 cron route。**统一错误契约**：所有 action 返回可辨识联合，不跨 seam 抛异常：

```ts
type ActionResult<T = {}> =
  | ({ ok: true } & T)
  | { ok: false; error: string /* 错误码 */; message?: string /* 面向用户的话 */ }
```

### 4.1 公开 action（1 个）

```ts
// lib/actions/public.ts
submitApplication(input: {
  track: 'crypto' | 'art' | 'longevity'
  fullName: string; email: string
  telegramOrWhatsapp: string; country: string
  preferredStartDate: string          // 'YYYY-MM-DD'，须 ∈ 配置的日期选项
  about: string                       // ≤300 词（服务端权威复核）
  contribution: string
  primaryLink: string                 // 必填社交/作品链接
  linkedin?: string; extraLink?: string
  contentStudioPlans?: string
  website?: string                    // honeypot（对人不可见；有值→假成功）
}): Promise<ActionResult>
// 错误码: 'validation' | 'track_closed' | 'rate_limited'
// 内部顺序: zod 校验(含 track state 权威校验) → honeypot → 限流(ip_hash ≤3/h) → insert
```

### 4.2 管理 actions（5 个，除 login 外全部先过 requireAdmin）

```ts
// lib/actions/admin.ts
login(input: { password: string }): Promise<ActionResult>
// 校验 ADMIN_PASSWORD(常数时间比较) + 登录限流 → 签发 session cookie。错误码: 'bad_password' | 'rate_limited'

logout(): Promise<void>                      // 清 cookie，redirect /admin/login

updateStatus(input: {
  applicationId: string
  status: 'submitted' | 'reviewing' | 'interview' | 'accepted' | 'rejected' | 'cancelled'
  sendEmail: boolean                         // 仅 interview/accepted/rejected 有意义
}): Promise<ActionResult<{
  application: Application                   // 更新后的行(客户端 merge 用)
  email?: { outcome: 'sent' | 'failed' | 'skipped'; error?: string }
}>>
// 语义: 先 update 状态(含 status_changed_at/by)，后发信；发信失败 ok 仍为 true，email.outcome='failed'

addNote(input: { applicationId: string; note: string }):
  Promise<ActionResult<{ note: ReviewNote }>>   // author_name 取自 session，客户端不可传

resendEmail(input: { applicationId: string; emailType: EmailType }):
  Promise<ActionResult<{ outcome: 'sent' | 'failed'; error?: string }>>
// 用申请当前数据重渲染重发，落新 log 行；triggered_by = 'Admin'
```

**读接口**：`/admin` 在通过认证后调用 `getDashboardData(): { applications, notes, emailLogs }`，一次下发列表与完整抽屉所需的数据（<2k 行规模）。它直接调用 server-only db 模块，**没有任何客户端可调用的读 action**。

### 4.3 Cron route（唯一 HTTP 端点）

```
GET /api/cron/movein-guide
Authorization: Bearer <CRON_SECRET>        // 不符 → 401

扫描: status='accepted'
   AND preferred_start_date BETWEEN current_date AND current_date+3
   AND NOT EXISTS (email_log: 同 application、email_type='movein_guide'、outcome='sent')
对命中者逐个 sendApplicationEmail(type='movein_guide', triggeredBy='cron')

响应: 200 { scanned: n, sent: n, failed: n }   // 幂等：重跑不重发
```

vercel.json：`{ "crons": [{ "path": "/api/cron/movein-guide", "schedule": "0 2 * * *" }] }`（02:00 UTC = 09:00 GMT+7；Hobby 档每日一次精度即满足）。

### 4.4 邮件预览（零接口）

预览不走网络：`lib/email/templates.ts` 是**同构纯模块**（无 server-only、无密钥；promo code 本就发给每个被拒者，非机密），EmailPreviewDialog 直接 import `getEmailContent(type, application)` 在客户端渲染（iframe srcDoc）。发送端 `sendApplicationEmail` 调用同一函数——所见即所发由「同一个函数」保证，而非「两端努力保持一致」。

## 5. 模块设计（深模块）

| 模块 | 接口（调用者需要知道的全部） | 藏在背后的行为 | Seam 说明 |
|---|---|---|---|
| `lib/actions/public.ts` | 1 个函数 `submitApplication(input) → ActionResult` | zod 校验、track state 权威校验、honeypot 假成功、ip 哈希与限流、插库 | **系统主 seam**（PRD 测试决策）；Supabase 是其背后的 mock 边缘 |
| `lib/actions/admin.ts` | 5 个函数，统一 ActionResult | 会话校验、状态机更新、邮件编排（先库后信）、审计落库 | 同上 |
| `lib/email/send.ts` | 1 个函数 `sendApplicationEmail({ application, type, triggeredBy }) → outcome` | 渲染（调 templates）、Resend 调用、email_log 落库（成败都落）、错误吞吐 | Resend 在此被隔离；server-only |
| `lib/email/templates.ts` | 1 个纯函数 `getEmailContent(type, application) → { subject, html, text }` | 布局包装、四类槽位、text 版生成、promo code/日期格式化 | 同构（客户端预览共用）；免 mock 直测 |
| `lib/auth.ts` | `createSession(name)` / `requireAdmin() → { displayName }`（未认证即 redirect）/ `destroySession()` | cookie 读写、HMAC-SHA256 签验（node:crypto）、过期检查、常数时间比较 | server-only；无第三方依赖 |
| `lib/db.ts` | supabase admin client + `getDashboardData()` 等具名查询 | `import 'server-only'`、service key 实例化、类型标注（手写 ~30 行） | Supabase 唯一入口；被两个 action 模块与 cron 共用 |
| `lib/content/*` | 导出的常量对象（TS 类型即接口） | — | 纯数据非模块；`satisfies` 约束 shape |
| `components/*` | props | 渲染 | 无业务逻辑，不在测试面内 |

**深度检查（deletion test）**：删掉 `sendApplicationEmail` → 渲染+发送+落库逻辑会在 updateStatus / resendEmail / cron 三处重现，故它挣得其复杂度。删掉任何「repository 接口层」→ 无复杂度重现（只有一个 Supabase 适配器），故不建——一个 adapter 是假想 seam，两个才是真 seam。

## 6. 数据库 Schema（migration 001）

```sql
create table applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  track text not null check (track in ('crypto','art','longevity')),
  status text not null default 'submitted'
    check (status in ('submitted','reviewing','interview','accepted','rejected')),
  full_name text not null,
  email text not null,
  telegram_or_whatsapp text not null,
  country text not null,
  preferred_start_date date not null,
  about text not null,
  contribution text not null,
  primary_link text not null,
  linkedin text,
  extra_link text,
  content_studio_plans text,
  ip_hash text not null,
  status_changed_at timestamptz,
  status_changed_by text
);
create index applications_rate_limit_idx on applications (ip_hash, created_at);
create index applications_cron_idx on applications (status, preferred_start_date);

create table review_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  author_name text not null,
  note text not null,
  created_at timestamptz not null default now()
);

create table email_log (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  email_type text not null check (email_type in ('interview','accepted','rejected','movein_guide')),
  recipient text not null,
  subject text not null,
  outcome text not null check (outcome in ('sent','failed','skipped')),
  resend_id text,
  error text,
  triggered_by text not null,
  created_at timestamptz not null default now()
);

alter table applications enable row level security;
alter table review_notes enable row level security;
alter table email_log enable row level security;
-- 不写任何 policy：默认全拒。所有访问走 service role。
```

## 7. 目录结构

```
4seas-residency/
├─ app/
│  ├─ layout.tsx  globals.css  page.tsx        # 首页
│  ├─ apply/page.tsx                            # redirect
│  ├─ residency/[track]/page.tsx                # 介绍页（generateStaticParams）
│  ├─ residency/[track]/apply/page.tsx          # 申请页
│  ├─ admin/login/page.tsx  admin/page.tsx      # 管理端列表 + 完整申请抽屉
│  └─ api/cron/movein-guide/route.ts            # 唯一 HTTP 端点
├─ components/
│  ├─ shared/    header.tsx  footer.tsx
│  ├─ residency/ hero.tsx  what-it-is.tsx  residency-cycle.tsx  themes.tsx
│  │             questions.tsx  residents-bring.tsx  application-form.tsx
│  ├─ admin/     dashboard.tsx  details-sheet.tsx  status-select.tsx
│  │             email-preview-dialog.tsx  note-composer.tsx  email-log-list.tsx
│  └─ ui/        (shadcn 按需装)
├─ lib/
│  ├─ content/   tracks.ts  site.ts  start-dates.ts
│  ├─ actions/   public.ts  admin.ts
│  ├─ email/     templates.ts  send.ts
│  ├─ auth.ts    db.ts    types.ts    utils.ts(cn)
│  └─ applications/ utils.ts           # 旧 repo 移植的筛选/排序纯函数（砍 legacy）
├─ supabase/migrations/001_init.sql
├─ scripts/seed.ts
├─ middleware.ts                        # 仅 /admin 体验层重定向（cookie 存在性检查）
├─ vercel.json                          # cron 一行
└─ .env.example
```

## 8. 关键机制细节

- **Session cookie**：值 = `base64(displayName|expiresAt) + '.' + HMAC-SHA256(payload, SESSION_SECRET)`；`httpOnly; Secure; SameSite=Lax; Path=/`；有效期 30 天。`requireAdmin` 验签 + 验期，失败 `redirect('/admin/login')`。轮换 `ADMIN_PASSWORD` 或 `SESSION_SECRET` 即全局登出。
- **限流**：`ip_hash = sha256(ip + IP_HASH_SALT)`（不存原始 IP）；提交前 `count(applications where ip_hash=? and created_at > now()-1h) >= 3 → rate_limited`。登录限流同理（内存 Map 即可，冷启动重置可接受）。
- **Honeypot**：表单渲染一个 CSS 隐藏的 `website` 字段；服务端见非空 → 返回 `{ ok: true }`，不落库不发信。
- **Cron 幂等语义**：唯一性由「email_log 存在 outcome='sent' 的 movein_guide 行」定义；失败行不计入，次日自动重试；申请改出 accepted 自动脱离扫描；日期按 GMT+7 上午运行时的 `current_date` 计算。
- **状态→邮件映射**：`interview→interview`、`accepted→accepted`、`rejected→rejected`（updateStatus 内固定映射）；`movein_guide` 只由 cron / resendEmail 触发。
- **Dashboard 数据流**：RSC 全量下发 applications、notes 与 email_log → client useState 持有 → 筛选/排序/搜索用纯函数 → 打开抽屉时按 application ID 选择关联数据 → mutation 成功后本地 merge。

## 9. 依赖清单

**装**：next、react、react-dom、typescript、tailwindcss v4（+postcss）、tw-animate-css、shadcn 所需的按需 Radix 包（dialog / sheet / select / label / slot）、class-variance-authority、clsx、tailwind-merge、lucide-react、framer-motion、sonner、zod、@supabase/supabase-js、resend、server-only、tsx（seed 脚本用，dev）。

**明确不装（及理由）**：@supabase/ssr（无浏览器直连）、NextAuth / iron-session / jose（HMAC 自写 25 行）、react-hook-form / @hookform/resolvers（手写 state 已验证）、react-email（字符串模板）、recharts / embla / vaul / cmdk / date-fns 等旧 repo 全家桶（无对应需求）、任何队列/Redis 客户端（count 限流 + 每日 cron）。

## 10. 部署与配置

- Vercel 项目，Node runtime（默认 Fluid Compute），无 Edge 依赖。
- 环境变量（全部 server-only）：`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`RESEND_API_KEY`、`EMAIL_FROM`、`EMAIL_REPLY_TO`、`ADMIN_PASSWORD`、`SESSION_SECRET`、`IP_HASH_SALT`、`CRON_SECRET`；唯一 `NEXT_PUBLIC_SITE_URL`（邮件内链接/OG 用）。
- `next.config`：**不设** `typescript.ignoreBuildErrors`；`npx tsc --noEmit` 为合并门禁。
- 新 Supabase project（与旧数据隔离），migration 经 SQL editor 或 CLI 应用。

## 11. 被否决的备选方案（汇总）

| 备选 | 否决理由 |
|---|---|
| REST API routes 层 | 无第三方消费者；server actions 类型安全且少一层序列化契约 |
| Resend scheduledAt 定时投递 | 预约上限 30 天 < 常态录取→入住间隔；撤销/改期需补偿逻辑；内容冻结（PRD v2.1 已定） |
| Supabase Auth / NextAuth | 共享长密码 + HMAC cookie 覆盖 1-3 人信任模型（PRD v2 已定） |
| pg_cron / Edge Function 定时 | 发信逻辑被拆到第二平台，密钥与代码分裂两处 |
| Inngest / Trigger.dev / QStash / Vercel Workflow | 月 <100 封，杀鸡用牛刀 |
| DB repository 抽象层 | 只有一个 adapter（Supabase）——假想 seam（PRD 测试决策已否决） |
| supabase codegen 类型 | 3 张表，手写类型更短且无生成链路 |
| 客户端乐观更新框架 | action 返回行 + 本地 merge 已满足 ≤1 分钟决策体验 |

## 12. 与 PRD 里程碑的映射

| 里程碑 | 本文档对应部分 |
|---|---|
| M1 | §3 页面 1-4、§7 content/ + components/、shadcn 按需装 |
| M2 | §6 migration、§4.1 submitApplication、§8 限流/honeypot |
| M3 | §4.2 login/addNote、§8 session、§3 页面 5-6 |
| M4 | §4.2 updateStatus/resendEmail、§4.3 cron、§5 email 模块、§4.4 预览 |
| M5 | §3 页面 7、§10 部署、seed 脚本、域名切换 |

**默认待确认**：新 repo 位置默认 `~/orca/projects/4seas-residency`（与参考 repo 平级），repo 名可改。
