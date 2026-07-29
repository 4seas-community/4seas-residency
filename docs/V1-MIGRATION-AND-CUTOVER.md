# v1 → v2 迁移与上线

> 本文是旧 `/residency` 路径迁移的历史记录。当前部署目标已改为 `https://residency.4seas.xyz`；实际操作以 [`MAINTENANCE-AND-DEPLOYMENT.md`](./MAINTENANCE-AND-DEPLOYMENT.md) 为准。

替换线上 `4seas.xyz/residency` 的完整记录。截至 2026-07-28，代码改动和数据迁移已完成并验证，**流量尚未切换**。

## 两套系统

|  | v1（线上） | v2（本仓库） |
|---|---|---|
| 代码 | v0.app 生成，源码不在本仓库 | `4seas-community/4seas-residency` |
| URL | `4seas.xyz/residency/*`，`basePath: '/residency'` | 同上（本次改动对齐） |
| 托管 | origin 未知，不在 `ernestchen247-3332` 这个 Vercel 账号下 | Vercel `4seas-residency` |
| 数据库访问 | 浏览器直连 anon key | server-only service role，RLS 默认拒绝 |
| 状态机 | 10 个（DB CHECK 约束） | 6 个 |

`4seas.xyz` 根域是独立的 **Webflow** 站点，只有 `/residency/*` 这个前缀属于本项目。DNS 在 Cloudflare。

两套系统现在**共用同一个 Supabase 项目** `zccyfyjjfptnntwarowy`（org `vercel_icfg_…`，项目名 supabase-teal-dog）：v1 的 `residency_applications` / `admin_comments` 作为归档保留原样，v2 的 `applications` / `review_notes` / `email_log` 建在旁边。

原本规划的独立 v2 库 `nxnngaludycgchajtgks` 只有 63 条 seed 假数据，**已弃用**。

## 已完成

### 一、代码：basePath

线上 URL 保持 `4seas.xyz/residency/*` 完全不变，Cloudflare 只需一条规则。

- `next.config.mjs` 加 `basePath: '/residency'`
- `app/residency/[track]` 上移到 `app/[track]`，公开 URL 因此不变

Next 会自动加前缀的：路由、`<Link>`、server component 里的 `redirect()`。
**不会**自动加、必须手写的（踩过的坑）：

| 位置 | 原因 |
|---|---|
| `middleware.ts` | `NextResponse.redirect` 只 set Location header，不加前缀。改用 `nextUrl.clone()` + 设 pathname |
| `public/` 资源（12 处） | Next 官方文档明确 `next/image` 的 src 也要手写。分布在 `app/layout.tsx` 的 icons、header/footer 的 logo、`lib/content/tracks.ts` 和 `site.ts` 的图片、admin login 页和 dashboard 的头像 |

反过来，5 处 `href` 是**去掉** `/residency` 前缀（`<Link>` 会自己加）。

未采用的方案：不加 basePath、靠 Cloudflare 多条规则转发。原因是 Webflow 根站已占用 `/images/*`（实测 `4seas.xyz/images/logo100.png` 返回 200），会冲突。

### 二、代码：后台默认时间范围

`components/admin/dashboard.tsx` 的 move-in scope 原本默认「当前自然年」。v1 数据跨 2025–2026 两个年度，导致 43 条里只显示 30 条。起始值改为固定 `2025-01-01`，结束值仍跟随当前年份。

副作用：统计卡会把 2025 那批已结束的申请一并计入。

### 三、数据：001–009 已在 `zccyfyjjfptnntwarowy` 执行

001–008 建表（内容与仓库文件一致），009 是新写的一次性导入。

**源数据体检（43 行 / 43 条评论）**

- 状态实际只用到 4 个：rejected 24 / accepted 12 / interview_needed 6 / reviewing 1。DB 的 CHECK 约束不允许 `interview_passed`、`accepted_post_interview` 等值，所以映射无歧义
- track：crypto 37 / art 5 / longevity 1，无 `other`
- `preferred_start_date` 在 v1 是 **text 不是 date**，两种格式共存：19 条 ISO、24 条 `June 15, 2026`。43/43 可 `::date` 转换
- 数据分两代表单：19 条新版（`telegram`/`bio`/`country`/`proposed_contribution`），24 条老版（只有 `contact_info` + 合并的 `about_and_contribution`）
- 43 个不重复邮箱，43 条评论覆盖 28 个申请、无孤儿

**字段映射**

| v2 | 来源 |
|---|---|
| `id` / `created_at` | 原样保留（因此 009 可重复执行，`on conflict do nothing`） |
| `track` | `coalesce(program_type, 'other')` |
| `status` | 10 → 6 的 CASE，无 `else`：未知状态返回 null 触发 NOT NULL 报错，而非静默导错 |
| `telegram_or_whatsapp` | `coalesce(telegram, whatsapp, contact_info)` |
| `contact_method` | 显式列优先，否则按格式推断（同 migration 004）。t.me 链接单独补规则 |
| `country` | `coalesce(country, nationality, current_location, city, '')` |
| `preferred_start_date` | `preferred_start_date::date` |
| `confirmed_start_date` | `coalesce(actual_start_date, preferred_start_date::date)` |
| `about` | `coalesce(bio, about_and_contribution)` |
| `contribution` | `coalesce(proposed_contribution, about_and_contribution)` |
| `ip_hash` | 常量 `'v1-migrated'` |
| `status_changed_at` / `_by` | `reviewed_at` / `coalesce(reviewed_by, assigned_admin)` |

**决策记录**

- 老版那 24 条的 `about_and_contribution` 是一个合并回答，**同一段文字写进 `about` 和 `contribution` 两个字段**。备选方案是只写 `about`、让 Contribution 区块空着
- `decided_after_interview` 全部留 **null**。CLAUDE.md 写明 legacy 行就是 null 且按 direct variant 渲染，且 v1 根本没有 post-interview 变体
- `past_contribution` / `participation_commitment`（migration 007 的两个必答题）**全部为 null**——v1 从没问过
- `country` 有 **17 条为空串**，v1 那批行完全没有任何地点信息。其余 NOT NULL 字段无空值
- `contact_method` 有 **3 条为 null**：7–8 字符的裸字符串，两种 messenger 都可能，猜错会生成打不开的深链。原始值仍在 `telegram_or_whatsapp` 里显示

**无处安放的字段**

只有 `needs_support`（12 条，各不相同）作为 `v1 migration` 备注保留。其余四个候选逐一验证后丢弃，都不是信息损失：

| 字段 | 丢弃原因 |
|---|---|
| `about_and_contribution` | 与 `bio` 逐字相同，已作为 About 显示 |
| `nationality` | 那批行 `country` 为空，回退链已把它填进 Country/Region |
| `admin_notes` | 7/7 与 `admin_comments` 里某条评论逐字相同，而评论已迁入 |
| `preferred_duration` | 19 条值全是常量 `1 month`，无区分度 |

v1 全表为空、迁移零损失的字段：`why_4seas`、`why_this_track`、`role_title`、`organization`、`anything_else`、`program_specific_answers`、`city`、`website`、`portfolio_url`、`availability`、`contribution_type`、`previous_community_experience`。

### 四、删除入住指南定时任务

迁移时发现：`movein_guide` 是四种邮件里唯一不走管理员预览对话框的——一个每天 09:00 GMT+7 跑的 Vercel cron 自动扫「`accepted` 且 `confirmed_start_date` 在 3 天内」直接发信，无人工确认。导入的 12 条 accepted 里有 3 条入住日是 2026-08-15，会在 2026-08-12 静默发给 v1 历史申请人。

按「所有邮件都必须经过预览对话框」的一致性要求，删掉了整个定时任务：`app/api/cron/movein-guide/route.ts`、`vercel.json`（内容只有 crons，整个文件删除）、`.env.example` 的 `CRON_SECRET`。曾短暂插入过 3 条压制用的 `email_log` 记录，定时任务删除后已一并清除，`email_log` 现为空。

`movein_guide` 的类型定义和邮件模板保留在 `lib/types.ts` / `lib/email/templates.ts`，但目前没有任何触发路径。`001_init.sql` 建的 `applications_cron_idx` 索引也不再被使用，43 行数据下开销可忽略，未单独删除。

### 五、验证结果

**数据层**

| 项 | 结果 |
|---|---|
| 行数 | 43 → 43，双向无孤儿 |
| 状态 / track 映射 | 逐类 1:1 |
| 日期 | `date_mismatch` 0、`confirmed_mismatch` 0，范围 2025-06-15 ~ 2026-09-15 |
| 备注 | 55 条 = 43 条 v1 评论（保留原 id 和时间戳）+ 12 条 `needs_support` |
| 无损失 | `combined_lost` / `nationality_lost` / `admin_notes_lost` / `support_lost` 均为 0 |

**应用层**（本地生产构建 + dev，均连真实数据）

- `/residency/admin` 200，`Showing 43 of 43 applications`，无错误标记
- 挑 3 条最易出问题的行（空 `country` + null `contact_method` + about/contribution 重复）渲染详情页，全部 200，页面无 `null` / `undefined` / `NaN` / `Invalid Date` 泄漏
- 路由：`/residency/*` 全部正常，`/crypto`、`/admin`、`/images/*` 在根路径全部 404，无泄漏
- 构建产物 grep 确认所有 asset 路径都在 `/residency/` 下
- `pnpm typecheck`、`pnpm build` 通过

## 待办

### 1. 部署

- [ ] commit + push，开 PR 合 main
- [ ] Vercel production 改**两个**变量：`SUPABASE_URL` → `https://zccyfyjjfptnntwarowy.supabase.co`，`SUPABASE_SERVICE_ROLE_KEY` → 对应值
- [ ] 在 `4seas-residency.vercel.app` 验：提交一条申请、登录后台看到 43 条

`NEXT_PUBLIC_SITE_URL` 和 `EMAIL_FROM` 本次不动，等切换域名时统一处理。

注意 `zccyfyjjfptnntwarowy` 在 Vercel 托管的 org 下，如果它和某个 Vercel 项目挂了 Supabase 集成，手动设的变量可能被集成覆盖。

### 2. 切换（可秒回滚）

- [ ] **重跑 009**。导入快照停在 v1 最后一条提交 `2026-07-27 02:28 GMT+7`；v1 还在线，期间的新提交只会进 `residency_applications`。009 是幂等的，重跑只补增量
- [ ] Cloudflare 把 `4seas.xyz/residency/*` 的 origin 从 v1 改到 `4seas-residency.vercel.app`
- [ ] 验：`4seas.xyz/residency/crypto` 出新页、提交测试申请、后台可见

### 3. 收尾

- [ ] v1 下线，或把它的申请表单 302 到新地址
- [ ] 再跑一次 009 捞漏网
- [ ] **收紧旧表 RLS**（见下）

## ⚠️ 未修复的数据泄露

v1 遗留，非本次迁移引入。**v1 站点下线之前不能动**（它靠这两条策略工作）：

| 表 | 策略 | 实际效果 |
|---|---|---|
| `residency_applications` | `FOR SELECT TO public USING (true)`（名字是 "Service role can view all"，但 role 写的是 `public`） | 任何拿到 anon key 的人可读全部 43 位申请人的姓名、邮箱、Telegram、个人陈述 |
| `admin_comments` | `FOR ALL TO public USING (true)` | 匿名可读、可写、可删全部管理员评论 |

anon key 是编译进 v1 前端 bundle 的公开值。新建的 3 张表 RLS 开启且零 policy，不受影响——但历史数据同时存在于两边，不收紧就等于新表白锁。

切走之后执行：

```sql
drop policy "Service role can view all"     on residency_applications;
drop policy "Anyone can submit application" on residency_applications;
drop policy "Service role manages comments" on admin_comments;
```

Supabase security advisor 只把 `admin_comments` 的 `FOR ALL` 标成 WARN，`residency_applications` 的 SELECT 策略被它主动排除（认为公开读常是有意为之），所以别指望 advisor 提醒这条。

## 回滚

Cloudflare 规则改回 v1。数据库是纯新增，`residency_applications` 和 `admin_comments` 全程未被修改，v1 立即恢复原状。
