# 4Seas Residency 本次上线与平台迁移清单

这份清单只用于完成本次上线。执行人按顺序勾选即可；操作细节见[部署与维护手册](./MAINTENANCE-AND-DEPLOYMENT.md)。

团队协作版：[在 Notion 中查看、评论和编辑](https://app.notion.com/p/3ac6e778b24d8119a0bada92e6eb426c)。

> 上线门槛：下方 P0 项全部完成，且每个关键平台都已填写“资产归属、主管理员、备用管理员、恢复方式”，才可以切换正式域名。

## 1. 已确定的管理原则

- 平台资产归属 4Seas，实际操作权限授予个人账号；不多人共用一个账号密码。
- 每个关键平台至少有一名主管理员和一名备用管理员。主管理员可以授权、撤销成员。
- GitHub `main` 是唯一生产分支；只有 PR 合并到 `main` 才部署 Production。
- 密码、API Key、数据库连接串、2FA 恢复码只放团队密码管理器。本文件只记录密码管理器中的条目名称。
- 平台成员、域名、账单、恢复邮箱或密钥发生变化时，当天更新本文件对应台账。

## 2. 现在用什么，准备迁到哪里

| 平台 | 当前资产与入口 | 当前控制情况 | 本次上线决定 |
| --- | --- | --- | --- |
| GitHub | [4seas-community](https://github.com/4seas-community) / [4seas-residency](https://github.com/4seas-community/4seas-residency) | 已属于 4Seas Organization；目前只核实到 `huaruic` 一名 Owner/Admin | 保持不变；新增一名备用 Organization Owner |
| Vercel | [4seas-residency 项目](https://vercel.com/ernestchen247-3332s-projects/4seas-residency) / [当前线上地址](https://4seas-residency.vercel.app) | Ernest 的个人 Hobby scope：`ernestchen247-3332s-projects` | 本次上线继续使用；不共享登录。需要多人直接管理后台时再升级并迁入 4Seas Pro Team |
| Supabase | [Production 项目](https://supabase.com/dashboard/project/zccyfyjjfptnntwarowy)，ref `zccyfyjjfptnntwarowy` | 当前由 TK 控制，组织名显示为 `vercel_icfg_…`；Production 与旧版共用项目 | 创建 4Seas Supabase Pro Organization，将 Production 转入；另建独立 Preview 项目。TK 不再是唯一控制人 |
| Resend | [Resend Dashboard](https://resend.com/domains) | 当前由 Ernest 控制，现有发件域名为 `mail.huaruic.com` | 创建 4Seas Resend Team，改用 `mail.4seas.xyz`，Production 与 Preview 使用不同 Key |
| Cloudflare | [Cloudflare Dashboard](https://dash.cloudflare.com/)；Zone：`4seas.xyz` | 当前账号和成员待核实 | 保留现有 Zone；确认其受 4Seas 控制，添加主管理员和备用管理员，不盲目搬迁 Zone |
| Namecheap | [4seas.xyz 管理入口](https://ap.www.namecheap.com/Domains/DomainControlPanel/4seas.xyz/domain) | 域名注册账号待核实 | 明确 4Seas 资产归属，保留一名主负责人，并通过 Share Access 增加备用管理人 |
| Webflow | [Webflow Dashboard](https://webflow.com/dashboard)；根站 `4seas.xyz` | Workspace 所有人待核实 | 本次不改页面；确认根站在 4Seas 可接管的 Workspace，并补一名备用管理员 |

“4Seas 所有”指团队能够持续接管资产，不代表建立一个多人共用密码的“公共账号”。支持 Team/Organization 的平台统一用个人账号加入团队；不支持或当前套餐不支持的，必须明确主管理员、备用接管人和恢复方式。

## 3. 平台资产与权限台账

先填写本表，再开始平台迁移。`待指定` 和 `待核实` 都属于未完成状态。

| 平台 | 资产归属 | 管理员（主 / 备） | 账单与恢复记录 | 状态 |
| --- | --- | --- | --- | --- |
| GitHub | 4Seas | Ernest / `huaruic`；待指定 | 不适用或待核实；待填写 | 进行中 |
| Vercel | 本次暂由 Ernest 持有 | Ernest；待指定接管人 | Ernest；待填写 | 进行中 |
| Supabase | 目标：4Seas Organization | Ernest；待指定 | 待指定；待填写 | 待迁移 |
| Resend | 目标：4Seas Team | Ernest；待指定 | 待指定；待填写 | 待迁移 |
| Cloudflare | 目标：4Seas | 待核实；待指定 | 待核实；待填写 | 待核实 |
| Namecheap | 4Seas 域名资产 | 待核实；待指定 | 待核实；待填写 | 待核实 |
| Webflow | 目标：4Seas Workspace | 待核实；待指定 | 待核实；待填写 | 待核实 |

恢复记录只填写团队密码管理器中的条目名称，例如 `4Seas / Cloudflare / Recovery`，不得把实际密码、Key 或恢复码写进文档。

## 4. P0：正式上线前逐项完成

### 4.1 先补齐团队接管能力

- [ ] 指定一名备用管理员，并填写到上方所有关键平台。
- [ ] 确认一个用于平台通知、账单和账号恢复的 4Seas 管理邮箱。
- [ ] 在团队密码管理器中建立本项目目录，并为各平台记录登录/恢复条目。
- [ ] 为主管理员和备用管理员开启个人 2FA；恢复码已安全保存。
- [ ] 核实每个平台的账单或续费负责人。

### 4.2 GitHub

- [ ] 打开 [4seas-community People](https://github.com/orgs/4seas-community/people)，邀请备用管理员并设置为 Organization Owner。
- [ ] 确认所有开发者使用个人 GitHub 账号加入；离开团队时可单独撤权。
- [ ] 确认仓库默认分支为 `main`，且 `main` 只能通过 PR 合并。
- [ ] 确认合并前必须通过 `Typecheck and build` 与 `Vercel` 检查。

### 4.3 Vercel

- [ ] 确认项目仍位于 `ernestchen247-3332s-projects/4seas-residency`，并绑定 GitHub 仓库。
- [ ] 确认 Production Branch 是 `main`；非 `main` 分支只能生成 Preview。
- [ ] 记录 Ernest 账号的恢复方式和付款责任；不把登录密码发给其他成员。
- [ ] 在项目中添加 `residency.4seas.xyz`，并按 Production/Preview 分开配置环境变量。
- [ ] 记录一个已验证可用的 Production Deployment，供回滚使用。

本次使用 Hobby 不阻塞上线。以后出现“第二个人必须直接查看日志、改环境变量或回滚”的需求时，再执行 P1 的 Vercel Team 迁移。

### 4.4 Supabase

- [ ] 在 Supabase 创建由 4Seas 管理的 Pro Organization。
- [ ] 将 Ernest 设为 Owner，并邀请备用 Owner/Admin。
- [ ] 对当前 Production 项目做备份，并记录项目 ref `zccyfyjjfptnntwarowy`。
- [ ] 将当前 Production 项目从 TK 控制的 Organization 转入 4Seas Organization。
- [ ] 转移后确认现有数据、Project URL、Key、数据库连接和 Vercel 集成仍可使用。
- [ ] 在同一 4Seas Organization 新建 `4seas-residency-preview`，不复制真实申请数据。
- [ ] 在 Preview 执行仓库全部 migrations，并将 Preview 变量配置到 Vercel Preview。
- [ ] 将 Production 变量只配置到 Vercel Production。
- [ ] 全部验证通过后，再撤销不再需要的旧组织或个人权限。

### 4.5 Resend

- [ ] 创建 4Seas Resend Team，邀请 Ernest 和备用 Admin。
- [ ] 在 Resend 添加发件域名 `mail.4seas.xyz`。
- [ ] 把 Resend 提供的 SPF/DKIM 记录添加到 Cloudflare，并等待 Verified。
- [ ] 创建两把独立、仅发送权限的 Key：Production 与 Preview。
- [ ] 在 Vercel 中按环境配置新 Key；Preview 保留 `EMAIL_RECIPIENT_OVERRIDE=delivered+residency-preview@resend.dev`。
- [ ] 验证 Production 发件人与 Reply-To 后，再撤销原 Ernest 账号下不再使用的 Key。

### 4.6 域名与根站

- [ ] Namecheap：核实 `4seas.xyz` 当前所有人、到期日、自动续费、付款方式和恢复邮箱。
- [ ] Namecheap：使用 Share Access 授权备用管理人，不共享主账号密码。
- [ ] Cloudflare：核实 `4seas.xyz` 所在账号和现有成员。
- [ ] Cloudflare：添加主管理员和备用管理员，并导出一份 DNS 记录备份。
- [ ] Cloudflare：为 `residency` 添加 Vercel 要求的 CNAME，保持 DNS only。
- [ ] Webflow：确认 `4seas.xyz` 根站的 Workspace Owner 和备用管理员。
- [ ] 确认 `residency.4seas.xyz` 已获得有效 SSL，且 Webflow 根站未受影响。

### 4.7 最终上线

- [ ] GitHub CI 与 Vercel Preview 均成功。
- [ ] Preview 已人工验证，且连接 Preview Supabase、只发送测试邮件。
- [ ] Production Supabase 已备份；必要 migrations 已按手册完成。
- [ ] 合并 PR 到 `main`，等待 Vercel Production 成功。
- [ ] 检查首页、申请页、后台登录、数据库读写和 Vercel 日志。
- [ ] 在 Cloudflare 先开启旧 `/residency/*` 到新子域名的 302。
- [ ] 验证旧链接、查询参数和新域名正常后，再将 302 改为 301。
- [ ] 在本文记录最终 Production Deployment、上线日期和本次执行人。

## 5. P1：上线后再做，不阻塞本次发布

- [ ] 需要多人直接操作 Vercel 时，升级为 4Seas Pro Team，并把现有项目转入 Team。
- [ ] 每三个月复查所有平台成员、2FA、账单、域名到期时间和不再使用的 Key。
- [ ] 成员离开团队时，当天撤销其平台权限并轮换其接触过的共享密钥。
- [ ] Notion 中的讨论形成决定后，通过 PR 同步回仓库中的这份清单。

## 6. 以后每次改代码只走这四步

```text
创建分支并修改
→ 提交 PR，等待 CI 与 Vercel Preview
→ 人工验收后合并到 main
→ Vercel 自动部署 Production，由合并人完成线上检查
```

不要从本地直接运行生产部署，不要绕过 PR 向 `main` 推送，也不要只在平台后台修改数据库结构而不提交 migration。

## 7. 本次上线记录

| 项目 | 填写内容 |
| --- | --- |
| 执行人 | 待填写 |
| 上线日期 | 待填写 |
| PR | 待填写 |
| Production Deployment | 待填写 |
| 正式域名 | `https://residency.4seas.xyz` |
| 回滚基线 Deployment | 待填写 |
| 未完成但已接受的 P1 项 | 待填写 |
