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

1. 将项目推到 Git 仓库。
2. 在 Vercel 导入项目目录 `WhatSheSaid`。
3. 配置环境变量：
   - `DEMO_MODE=1` 可先保证现场演示。
   - 如接真实模型，配置 `OPENAI_API_KEY`、`OPENAI_BASE_URL`、`OPENAI_MODEL`。
4. 部署后测试手机浏览器访问。

## Cloudflare 绑定自定义域名

1. 在 Cloudflare 托管域名 DNS。
2. 在 Vercel 项目里添加自定义域名。
3. 按 Vercel 提示在 Cloudflare 添加 `CNAME` 或 `A` 记录。
4. 确认 SSL/TLS 正常。
5. `/api/*` 不做缓存规则。

## 现场兜底

如果 Vercel 或模型接口不稳定：

- 设置 `DEMO_MODE=1`。
- 本机运行 `npm run dev`。
- 使用 Cloudflare Tunnel 暴露本机地址，生成备用二维码。
