# 她说过 / WhatSheSaid

黑客松 Demo 版 AI 访谈 Web 应用。

它不是聊天机器人、心理咨询、优势测评、报告生成器或教练产品。它只做一件事：引导用户讲一件自己真实做过的事，然后从用户原话中挑一句，先确认，再原样还给她。

## 技术栈

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Next.js Route Handlers
- 内存存储 MVP，可替换为 Supabase/Postgres
- OpenAI-compatible LLM client

## 本地运行

```bash
cp .env.example .env.local
npm install          # 项目已配置 .npmrc，自动走 npmmirror 国内镜像
npm run dev
```

如果本机环境带有不兼容的 `NODE_OPTIONS`，可临时清空后运行：

```bash
NODE_OPTIONS="" npm run build
```

打开：

```text
http://localhost:3000
```

## 环境变量

```text
OPENAI_API_KEY=
OPENAI_BASE_URL=
OPENAI_MODEL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
DEMO_MODE=1
```

说明：

- `DEMO_MODE=1` 时不依赖真实大模型，也能完整演示流程。
- 未配置 `OPENAI_API_KEY` 时会自动按 Demo Mode 回退。
- 当前版本使用 `lib/db/queries.ts` 的内存存储，不做登录，不长期保存用户数据。
- 后续接 Supabase 时保留同一查询接口即可。

## 核心流程

状态机位于：

```text
lib/interview/state-machine.ts
```

阶段：

```text
opening -> story -> keyword_followup -> external_evidence -> reference_shift -> quote_confirm -> mirror_back -> end
```

模型不能自由决定流程，只能在当前阶段内辅助生成短追问或挑选用户原话。

## 产品红线

提示词集中在：

```text
lib/interview/prompts.ts
```

守护规则集中在：

```text
lib/interview/guardrails.ts
```

实现约束：

- AI 不能预设、编造或总结能力名称。
- AI 只能使用用户自己说过的话。
- 用户没说过的词，不能用于最终命名或返还。
- AI 不夸奖、不评价、不建议、不诊断、不安慰。
- AI 不生成报告、不打分、不排行、不推荐。
- AI 不索取手机号、微信号、邮箱等联系方式。
- AI 一次只问一个问题，问完停下。
- 语音或转写不确定时，必须确认，不能脑补。
- 最后必须先确认用户原话，再原样还给她。

## Vercel 部署

1. 将项目推到 Git 仓库（已完成：`github.com/cuaqian/whatshesaid`）。
2. 在 [vercel.com/import](https://vercel.com/import) 导入仓库，Root Directory 留空即可。
3. 配置以下 Environment Variables：

| 名称 | 说明 |
|---|---|
| `DEMO_MODE` | 现场演示设 `1`，真实模型设 `0` |
| `OPENAI_API_KEY` | 模型 API Key |
| `OPENAI_BASE_URL` | 模型 API 地址 |
| `OPENAI_MODEL` | 模型名称 |

4. 点 Deploy，等待构建完成。
5. 手机浏览器打开 `https://xxx.vercel.app` 测试。

> ⚠️ **不要在代码或仓库里硬编码 API Key**。聊天中讨论过的 Key 部署后建议换新。

## Cloudflare 绑定自定义域名

Vercel 的 `.vercel.app` 域名在国内访问可能不稳定。通过 Cloudflare 绑定自己的域名更可靠：

1. **域名托管到 Cloudflare**：在 Cloudflare 添加你的域名，按提示修改 DNS 服务器。
2. **Vercel 添加自定义域名**：Vercel 项目 → Settings → Domains → 添加你的域名（如 `whatshesaid.your-domain.com`）。
3. **Cloudflare 配置 DNS**：
   - 类型：`CNAME`
   - 名称：`whatshesaid`（子域名）
   - 目标：`cname.vercel-dns.com`
   - 代理状态：开启（橙色云朵，走 Cloudflare CDN）
4. **SSL/TLS**：Cloudflare → SSL/TLS → 选 `Full`。
5. **缓存规则**：Cloudflare → Rules → Page Rules：
   - `whatshesaid.your-domain.com/api/*` → Cache Level: `Bypass`

## 现场兜底方案

黑客松现场网络不确定，准备三个后备：

**后备 1：本机服务 + Cloudflare Tunnel**

```bash
# 终端 1：启动本地服务
cd WhatSheSaid
npm run dev

# 终端 2：安装并启动 Cloudflare Tunnel
brew install cloudflare/cloudflare/cloudflared
cloudflared tunnel --url http://localhost:3000
```

Tunnel 会输出一个 `https://xxx.trycloudflare.com` 地址，做成备用二维码。

**后备 2：DEMO_MODE 预置剧本**

如果模型接口挂了，Vercel 环境变量切 `DEMO_MODE=1`，重新部署。会走堂姐（图书排版十天出师）的预置剧本，完整跑完五步访谈。

**后备 3：本机 + 手机热点**

电脑开热点，手机连同一 WiFi，访问 `http://本机IP:3000`。
