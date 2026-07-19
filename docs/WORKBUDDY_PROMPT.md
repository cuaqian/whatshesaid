# 给 workbuddy 的提示词

你将接手开发一个黑客松 Demo 项目：`WhatSheSaid`。

请先阅读并遵守本项目文档：

- `docs/DEVELOPMENT_HANDOFF.md`

## 项目背景

产品名：她说过 / WhatSheSaid。

这是一个面向女性的 AI 访谈工具。它不是聊天机器人、心理咨询、优势测评、报告生成器或教练产品。

它只做一件事：引导用户讲一件自己真实做过的事，然后把用户自己说过、但没有真正听见的一句原话，确认后原样还给她。

## 当前开发目标

请在 `WhatSheSaid` 目录下实现一个黑客松 Demo 版 Web 应用：

- 能在手机浏览器打开。
- 有一个极简聊天界面。
- 用户可以和 AI 完成五步访谈。
- AI 最后必须从用户原话中挑一句，先确认，再原样还给用户。
- 支持部署到 Vercel。
- 后续通过 Cloudflare 绑定自定义域名。

## 技术栈

请使用：

- Next.js
- React
- TypeScript
- Tailwind CSS
- Next.js Route Handlers
- Supabase/Postgres 或先用可替换的存储接口
- 大模型 API 封装为统一 client

不要上复杂后端框架。不要做原生 App。不要做登录系统。

## 产品红线

实现时必须把这些约束写进提示词和流程控制里：

- AI 不能预设、编造或总结能力名称。
- AI 只能使用用户自己说过的话。
- 用户没说过的词，不能用于最终命名或返还。
- AI 不夸奖、不评价、不建议、不诊断、不安慰。
- AI 不生成报告、不打分、不排行、不推荐。
- AI 不索取手机号、微信号、邮箱等联系方式。
- AI 一次只问一个问题，问完停下。
- 语音或转写不确定时，必须确认，不能脑补。
- 最后必须先确认用户原话，再原样还给她。

反面案例：

用户说“KTV 主要刷卡、现金不多”，AI 绝不能说她做的是“高压现金流管理”。这是用户没说过的高级命名。

## 五步访谈状态机

请实现状态机，不要让模型自由聊天。

阶段：

```text
opening
story
keyword_followup
external_evidence
reference_shift
quote_confirm
mirror_back
end
```

流程：

1. `opening`：固定开场，说明不保存隐私，只听她讲一件做过的事。
2. `story`：请用户带回现场，说具体一天、环境、跟谁、先干什么。
3. `keyword_followup`：从用户回答中挑一个具体动词或名词，追问 2-3 轮。
4. `external_evidence`：问是否有人主动认可、留用、依赖、指定她。
5. `reference_shift`：先问同行是不是都这样，再问外行来顶班会怎样。
6. `quote_confirm`：从用户原话中选一句，问“你说的是『……』，对吗？”
7. `mirror_back`：用户确认后，回复“这就是你做的事。你已经说出来了，你只是没听见。”
8. `end`：固定结束，不挽留、不推荐。

## 推荐目录

请按这个结构实现：

```text
app/
  page.tsx
  layout.tsx
  api/chat/route.ts
components/
  chat/
    ChatWindow.tsx
    MessageBubble.tsx
    ChatInput.tsx
    QuoteConfirm.tsx
  ui/
    Button.tsx
    LoadingDots.tsx
lib/
  interview/
    stages.ts
    state-machine.ts
    prompts.ts
    quote.ts
    guardrails.ts
  llm/
    client.ts
    types.ts
  db/
    supabase.ts
    queries.ts
  utils/
    id.ts
types/
  interview.ts
  message.ts
```

## P0 任务

请优先完成：

- 初始化 Next.js + TypeScript + Tailwind 项目。
- 创建移动端聊天页。
- 创建 `/api/chat` 接口。
- 实现访谈状态机。
- 实现基础提示词。
- 实现大模型 client。
- 实现候选原话提取。
- 实现原话确认和返还。
- 实现结束话术。
- 增加基础 guardrails。
- 增加 `.env.example`。
- 写 README，说明本地运行、环境变量、部署方式。

## 实现建议

- MVP 可以先用内存存储或轻量存储接口，但要把数据库访问封装好，方便之后换 Supabase。
- `DEMO_MODE=1` 时，不依赖真实大模型，也能演示完整流程。
- AI 输出如果违反红线，优先回退为固定安全话术。
- 所有模型调用集中在 `lib/llm/client.ts`。
- 所有流程判断集中在 `lib/interview/state-machine.ts`。
- 所有提示词集中在 `lib/interview/prompts.ts`，方便产品负责人石悦检查。

## 验收标准

完成后请确认：

- 手机尺寸下可正常使用。
- 用户能完整走完五步访谈。
- AI 没有夸奖、建议、诊断、总结报告。
- AI 没有生成用户没说过的能力标签。
- 最后一句是用户原话，且先确认再返还。
- 结束后不继续追问、不推荐、不留资。

请保持实现小而清晰。这个产品的重点不是功能多，而是 AI 被流程和红线约束住。

