# 4Seas Residency 代码维护与部署方案

本文档是 `4seas-community/4seas-residency` 的代码修改、部署上线和后续维护流程。范围限于 GitHub、Vercel、Supabase migration 以及 `4seas.xyz/residency/*` 的生产发布；平台资产与财务治理不在本文范围内。

## 1. 发布原则

- GitHub `main` 是唯一生产分支。
- 所有修改通过 Pull Request 进入 `main`，任何人都不得日常直接 push `main`。
- PR 不强制另一人批准，但必须通过 GitHub CI 和 Vercel Preview。
- PR 合并到 `main` 后，Vercel 自动创建 Production 部署；其他分支只能创建 Preview，不能绑定正式域名。
- Preview 和 Production 使用完全分离的 Supabase、邮件配置和测试数据。
- 不设置固定发布时间。合并者负责部署后的检查和必要回滚。

## 2. 角色与权限

权限授予平台中的个人账号，不共享登录密码。

| 角色 | 权限 |
| --- | --- |
| Owner | 长期最高权限；管理成员、角色和紧急绕过权限。当前 Owner 为 Ernest。 |
| Production Admin | 合并 PR、查看和管理 Vercel Production、执行回滚、修改 Vercel 环境变量、执行经过验证的生产 migration。 |
| Developer | 创建分支、提交代码和 PR、查看 CI 与 Preview；不能合并或操作 Production。 |

- 只有 Owner 可以授予或撤销平台权限。
- Production Admin 和 Developer 不能邀请成员或继续向他人授权。
- Production Admin 可以在故障时直接回滚，无需等待 Owner 批准。
- Owner 只在 GitHub PR 流程不可用的紧急情况下绕过 `main` 保护；恢复后必须补齐 PR 或事故记录。

## 3. GitHub 仓库设置

为 `main` 建立 branch protection 或 ruleset：

1. Require a pull request before merging。
2. Required approvals 设为 `0`，允许授权合并者自行合并。
3. Require status checks before merging：
   - `Typecheck and build`
   - Vercel Preview deployment
4. Require branches to be up to date before merging。
5. 禁止 force push 和删除 `main`。
6. 默认不允许管理员绕过，仅 Owner 保留紧急 bypass。

仓库启用：

- Dependency Graph
- Dependabot Alerts
- Dependabot Security Updates

Dependabot 只为已知安全漏洞创建 PR，不配置普通 Version Updates，也不允许自动合并。安全 PR 与其他 PR 使用相同的 CI、Preview 和人工合并流程。

## 4. 日常修改流程

### 4.1 创建任务

功能、Bug、内容更新和技术债先创建 GitHub Issue，至少写清：

- 当前问题或修改目标；
- 可验证的完成条件；
- 是否影响申请、后台、邮件、数据库或部署配置。

只有拼写修正等极小改动可以直接创建 PR。

### 4.2 开发

1. 从最新 `main` 创建短期分支，例如 `feat/...`、`fix/...`、`docs/...` 或 `chore/...`。
2. 只修改与 Issue 有关的内容，不混入无关重构。
3. 本地至少执行：

   ```bash
   pnpm install
   pnpm typecheck
   pnpm build
   ```

4. 涉及页面或交互时，本地人工检查对应路径。
5. 推送分支并创建 PR，关联 Issue。

仓库不设置强制 PR 模板，也暂不引入 Playwright、单元测试或 lint 门禁。

### 4.3 PR 与 Preview 验收

每次 PR 自动触发两类检查：

1. GitHub Actions 使用 lockfile 安装依赖，执行 `pnpm typecheck` 和 `pnpm build`。
2. Vercel 使用 Preview 环境变量创建独立 Preview URL。

合并前必须确认：

- `Typecheck and build` 成功；
- Vercel Preview 构建成功；
- Preview 使用测试 Supabase，不包含 Production service-role key；
- Preview 邮件不会发送给真实申请人；
- 修改涉及的页面和流程已人工验证。

任一检查失败都不得合并。

## 5. Vercel 环境配置

Vercel 项目保留三个环境：

| 环境 | 来源 | 数据与邮件 | 域名 |
| --- | --- | --- | --- |
| Development | 本地开发 | 本地 `.env.local` 或测试资源 | `localhost` |
| Preview | 非 `main` 分支 / PR | 独立测试 Supabase、测试邮件配置 | Vercel Preview URL |
| Production | `main` | 正式 Supabase、正式 Resend | `4seas.xyz/residency/*` |

当前应用需要以下环境变量：

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
EMAIL_FROM
EMAIL_REPLY_TO
ADMIN_PASSWORD
SESSION_SECRET
IP_HASH_SALT
NEXT_PUBLIC_SITE_URL
```

要求：

- 密钥只保存在 Vercel/Supabase 等平台，不提交到 GitHub。
- `SUPABASE_SERVICE_ROLE_KEY`、`RESEND_API_KEY`、`ADMIN_PASSWORD` 和 `SESSION_SECRET` 不得以 `NEXT_PUBLIC_` 开头。
- Preview 与 Production 的数据库和邮件变量不得共用。
- 环境变量修改依赖 Vercel Activity/Audit Logs 留痕，不要求重复记录到 Issue/PR。
- Vercel 环境变量修改只影响后续部署；修改后必须重新部署并进行冒烟检查。
- `NEXT_PUBLIC_SITE_URL` 在 Production 应指向 `https://4seas.xyz`。

## 6. 数据库 migration 流程

所有结构或数据迁移都必须以新的编号 SQL 文件提交到 `supabase/migrations/`，禁止只在 Supabase SQL Editor 中修改而不保留 migration。

发布顺序：

1. 开发者编写 migration 和兼容它的应用代码。
2. 在独立测试 Supabase 执行 migration。
3. 使用 Preview 完成相关功能验证。
4. Production Admin 检查 SQL 影响范围并确认生产数据库已有可用备份。
5. Production Admin 在生产 Supabase 执行 migration，并验证结果。
6. migration 成功后才合并对应 PR，由 `main` 触发 Production 部署。
7. 完成生产冒烟检查。

数据库变更默认采用向前兼容方式：先加新结构并兼容旧代码，再部署新代码，最后在后续独立发布中清理旧结构。禁止把删除表、删除列或不可逆数据转换与依赖它的新代码放在一次无过渡发布中。

数据库出现问题时优先提交新的向前修复 migration，不直接对已有生产数据执行破坏性回滚。

## 7. Production 发布与检查

### 7.1 自动部署

授权合并者确认 CI 与 Preview 后合并 PR。Vercel Git 集成检测到 `main` 更新，自动构建 Production，并把正式域名指向新的成功部署。构建失败时旧 Production 保持在线。

### 7.2 上线冒烟检查

执行部署的 Production Admin 负责检查：

- `https://4seas.xyz/residency`；
- `/residency/crypto`、`/residency/art`、`/residency/longevity`；
- 对应申请页面可以打开；
- `/residency/admin/login` 返回正常登录页而不是 404；
- 管理员可以登录并读取申请列表；
- 本次修改涉及的功能正常；
- Vercel Build Logs 和 Function Logs 没有新增错误。

普通发布不向真实申请人发送测试邮件。修改涉及提交或邮件链路时，使用约定的测试申请做专项检查，并确认收件地址安全。

当前不配置外部 uptime monitor。上线状态由部署者人工确认。

## 8. 回滚

### 8.1 应用代码回滚

冒烟检查失败或出现严重线上回归时：

1. Production Admin 立即在 Vercel 回滚到上一个已验证的成功部署。
2. 确认正式域名恢复并重新执行关键冒烟检查。
3. 创建 revert 或 fix PR，使 `main` 与线上状态重新一致。
4. PR 通过 CI 和 Preview 后合并，生成新的 Production 部署。
5. 在原 PR 或 Issue 记录原因、影响范围和处理结果。

不要只在 Vercel 长期停留于旧部署而让 `main` 保持故障版本。

### 8.2 数据库故障

- 不自动执行 down migration。
- 优先部署兼容旧、新 schema 的应用版本并执行向前修复 SQL。
- 只有确认数据恢复范围、备份时间点和影响后，才能实施数据库级恢复。

## 9. 首次正式切流

`4seas.xyz` 根路径继续由 Webflow 提供，只有 `/residency/*` 由 Cloudflare 转发到本 Vercel 项目。

切流步骤：

1. 确认最新 `main` 的 CI 与 Vercel Production 部署成功。
2. 在 Vercel Production 直连地址验证公开页、申请提交和后台登录。
3. 重跑幂等 migration `009_migrate_v1_data.sql`，补齐切换前新增的 v1 数据。
4. Cloudflare 将 `/residency/*` 的 origin 切换到新的 Vercel Production。
5. 在 `4seas.xyz` 完成全部生产冒烟检查。
6. 若失败，立即把 Cloudflare 路由恢复到 v1，并调查修复。
7. 新系统验证成功后关闭 v1 写入和访问入口，再运行一次 `009` 捕获漏网数据。
8. 删除 `residency_applications` 与 `admin_comments` 的旧匿名 RLS policies，确认 anon key 无法读取申请或修改评论。
9. 再次验证新系统的申请提交、后台读取和状态修改。

旧 RLS policies 删除后，v1 不再是安全的回滚目标；之后的应用回滚只使用 Vercel 历史部署。

## 10. 当前上线阻塞项

截至 2026-07-29 的只读检查结果：

- 本地 `pnpm typecheck` 和 `pnpm build` 通过。
- 最新 `main` 已有成功的 Vercel Production deployment 记录。
- `https://4seas.xyz/residency/admin/login` 当前返回 404，必须在宣布上线完成前修复 Cloudflare/Vercel 路由并复测。
- `main` 当前没有 branch protection/ruleset；本文件对应的 CI 合并后才能把 `Typecheck and build` 设为 required check。
- 旧 Supabase 表仍各有 43 条历史数据；切流后必须删除迁移文档列出的匿名 RLS policies。
- Production 的 Supabase、Resend、发件域名和 `NEXT_PUBLIC_SITE_URL` 实际值必须在 Vercel 中逐项核对，不能以本地 `.env.local` 代替生产配置验证。

## 11. 完成标准

一次修改只有同时满足以下条件才算完成：

1. Issue 的验收条件已经实现。
2. PR 的 CI 和 Vercel Preview 成功。
3. 授权合并者将 PR 合并到 `main`。
4. Vercel Production 部署成功。
5. 部署者完成生产冒烟检查。
6. 若涉及 migration、环境变量或切流，对应的生产步骤也已验证。

