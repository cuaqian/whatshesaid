# WhatSheSaid 开发交接文档

## 1. 项目目标

WhatSheSaid（她说过）是一个黑客松 Demo 版 AI 访谈产品。

它不是聊天机器人、心理咨询、优势测评或报告生成工具。它只做一件事：引导女性讲述一件自己真实做过的事，并在最后把她自己说过、但没有真正听见的一句原话，确认后原样还给她。

本阶段目标是做出一个可以扫码打开、少量人稳定试用、能完整跑通五步访谈流程的 Web Demo。

## 2. 技术栈

- 前端：Next.js + React + TypeScript
- 样式：Tailwind CSS
- 后端：Next.js Route Handlers
- 数据库：Supabase Postgres，或比赛平台自带数据库
- 大模型：比赛平台指定国产模型 / 豆包类 API；封装为统一 LLM client
- 部署：Vercel 主部署，Cloudflare 负责自定义域名、HTTPS、DNS/CDN
- 备用：本机运行 + Cloudflare Tunnel，现场兜底

## 3. 部署策略

主方案：

```text
用户手机
  -> Cloudflare 自定义域名
  -> Vercel 上的 Next.js 应用
  -> /api/chat
  -> 访谈状态机
  -> 大模型 API
  -> Supabase/平台数据库
```

注意：

- Vercel + 普通 Cloudflare 不保证中国大陆稳定访问，只是最快上线方案。
- 不要把 `.vercel.app` 作为唯一正式二维码，优先使用自定义域名。
- 现场必须准备备用二维码：本机服务 + Cloudflare Tunnel。
- `/api/*` 不做缓存。
- 如果模型接口不稳定，准备 `DEMO_MODE=1`，保证演示能走完五步流程。

## 4. 产品红线

以下任意一条违反，都算访谈失败：

- AI 不能预设、编造或总结能力名称。
- AI 只能使用用户自己说过的话。用户没说过的词，一个都不能用来命名她。
- AI 不夸奖、不评价、不建议、不诊断、不安慰。
- AI 不生成报告、不打分、不排行、不推荐任何东西。
- AI 不索取手机号、微信号、邮箱等联系方式。
- 一次只问一个问题，问完停下。
- 语音或转写不确定时，必须先确认，不能脑补。
- 最后一击必须先确认用户原话，再原样还给她。

反面案例：

用户说“KTV 主要刷卡、现金不多”，AI 不能总结成“高压现金流管理”。这是用户没说过的高级命名，会破坏产品核心。

## 5. 五步访谈流程

### 5.1 带回现场

固定开场：

```text
我在做一个帮女性看见自己价值的东西。今天我不问你要什么，只想听你讲一件你做过的事。你可以直接说话，也可以打字。我不会保存你的任何信息。可以吗？
```

用户同意后：

```text
你做过的事里，印象最深的是哪一段？带我回那一天——那时候几点开始、什么环境、跟谁一起、先干啥？
```

### 5.2 咬住关键词追问

从用户回答中挑一个具体动词或名词，追 2-3 轮。

示例：

```text
你刚才说的“____”，具体咋弄的？出过岔子吗？那次咋办的？
```

如果用户岔开：

```text
咱先说你手里这件事。
```

### 5.3 被指定的证据

追问外部认可或依赖。

```text
哪个老板主动留过你、或者给你涨过钱、提前给你转正？他图你啥？
```

如果用户说没有：

```text
那客人里、同事里、老板嘴里，有没有谁说过你哪点好、老爱找你的？
```

### 5.4 换尺子

分两步问，不能一次讲完。

第一问：

```text
你身边干同样活的人，是不是都这样？
```

第二问：

```text
那换一个从没干过的人来，今晚让她顶你这个班，会咋样？
```

等用户自己说出差异后，只落一句：

```text
所以在那个圈子里，这是标配，你才看不见它。你一直站在一堆跟你一样的人里，量你自己。
```

### 5.5 把话还给她

从用户第一、二步中自己说过的原话里选一句，先确认：

```text
你前面说了一句话，我想跟你确认一下——你说的是『……』，对吗？
```

用户确认后，原样还给她：

```text
这就是你做的事。你已经说出来了，你只是没听见。
```

结束：

```text
就到这。我没有存你任何一句话，不会让你留联系方式，也不给你推荐什么。你可以关掉了——也许你不用再回来。
```

## 6. 推荐项目目录

```text
WhatSheSaid/
├─ app/
│  ├─ page.tsx
│  ├─ layout.tsx
│  └─ api/
│     └─ chat/
│        └─ route.ts
├─ components/
│  ├─ chat/
│  │  ├─ ChatWindow.tsx
│  │  ├─ MessageBubble.tsx
│  │  ├─ ChatInput.tsx
│  │  └─ QuoteConfirm.tsx
│  └─ ui/
│     ├─ Button.tsx
│     └─ LoadingDots.tsx
├─ lib/
│  ├─ interview/
│  │  ├─ stages.ts
│  │  ├─ state-machine.ts
│  │  ├─ prompts.ts
│  │  ├─ quote.ts
│  │  └─ guardrails.ts
│  ├─ llm/
│  │  ├─ client.ts
│  │  └─ types.ts
│  ├─ db/
│  │  ├─ supabase.ts
│  │  └─ queries.ts
│  └─ utils/
│     └─ id.ts
├─ types/
│  ├─ interview.ts
│  └─ message.ts
├─ docs/
│  ├─ DEVELOPMENT_HANDOFF.md
│  └─ WORKBUDDY_PROMPT.md
├─ .env.example
├─ package.json
├─ tsconfig.json
└─ README.md
```

## 7. 核心模块设计

### 7.1 前端聊天模块

职责：

- 展示移动端对话页。
- 展示用户消息和 AI 消息。
- 接收用户输入。
- 显示加载状态。
- 在 quote confirm 阶段展示确认交互。
- 在 end 阶段展示结束状态。

要求：

- 移动端优先。
- 第一屏直接是可用的聊天体验，不做营销落地页。
- 不出现“功能介绍式”的大段说明。
- 文案短、安静、克制。

### 7.2 API 模块

入口：

```text
POST /api/chat
```

职责：

- 接收 `sessionId` 和用户输入。
- 创建或读取会话。
- 保存用户消息。
- 调用访谈状态机。
- 必要时调用大模型。
- 保存 AI 回复。
- 返回下一阶段、回复、是否结束、是否需要确认原话。

### 7.3 访谈状态机

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

状态机是产品核心。不要让模型自由决定流程。模型只能在当前阶段内帮忙生成短问题或挑选用户原话。

### 7.4 提示词模块

集中维护：

- 角色定义
- 五步流程
- 禁止事项
- 反面案例
- 每个阶段的输出限制

提示词必须方便石悦快速查看和改。

### 7.5 原话模块

职责：

- 从用户历史消息中提取候选原话。
- 优先选择具体、有动作、有现场感、有用户本人表达特征的句子。
- 禁止输出用户没说过的词。
- 在第五步必须先确认，再使用。

MVP 可以先用简单策略：

- 只从用户消息中截取原句。
- 排除太短、太泛、只有情绪判断的句子。
- 需要模型辅助选择时，让模型只返回原文片段，不允许改写。

### 7.6 守护规则模块

对 AI 输出做简单校验：

- 是否太长。
- 是否包含明显夸奖词。
- 是否生成报告、建议、评价。
- 是否在最终阶段使用了不在用户原话中的能力标签。

发现违规时，优先回退成固定安全话术或重新调用模型。

## 8. 数据模型

MVP 不做用户系统，只做临时会话。

### sessions

```text
id                  string primary key
stage               string
final_quote          text nullable
quote_confirmed      boolean default false
demo_mode            boolean default false
created_at           timestamp
updated_at           timestamp
expires_at           timestamp nullable
```

### messages

```text
id                  string primary key
session_id           string
role                 string  # user / assistant
content              text
stage                string
created_at           timestamp
```

### quote_candidates

```text
id                  string primary key
session_id           string
source_message_id    string
quote_text            text
confirmed            boolean default false
created_at           timestamp
```

## 9. API 契约

### POST /api/chat

请求：

```json
{
  "sessionId": "optional-session-id",
  "message": "用户输入"
}
```

响应：

```json
{
  "sessionId": "session-id",
  "stage": "keyword_followup",
  "reply": "你刚才说的“协调”，具体是怎么做的？",
  "requiresConfirmation": false,
  "quoteCandidate": null,
  "ended": false
}
```

确认原话阶段响应：

```json
{
  "sessionId": "session-id",
  "stage": "quote_confirm",
  "reply": "你前面说了一句话，我想跟你确认一下——你说的是『……』，对吗？",
  "requiresConfirmation": true,
  "quoteCandidate": "……",
  "ended": false
}
```

## 10. 环境变量

```text
OPENAI_API_KEY=
OPENAI_BASE_URL=
OPENAI_MODEL=

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

DEMO_MODE=0
```

注意：

- API Key 只能在服务端读取。
- `SUPABASE_SERVICE_ROLE_KEY` 不能暴露到前端。
- `.env.local` 不要提交。

## 11. P0 开发清单

- 初始化 Next.js + TypeScript + Tailwind 项目。
- 建立移动端聊天页。
- 实现 `/api/chat`。
- 实现访谈阶段状态机。
- 接入大模型 API。
- 实现临时会话保存。
- 实现候选原话提取。
- 实现原话确认与返还。
- 实现结束话术。
- 增加基础 guardrails。
- 配置 Vercel 部署环境变量。
- 配置 Cloudflare 自定义域名。
- 准备本机 Tunnel 备用演示地址。

## 12. P1 开发清单

- 优化视觉设计。
- 优化候选原话选择。
- 增加 Demo Mode。
- 增加管理员测试入口。
- 增加分享最后一句原话的静态卡片。

## 13. 暂不做

- 登录注册。
- 用户画像。
- 长期历史记录。
- 访谈报告。
- 能力测评。
- 能力标签体系。
- 推荐课程、服务或咨询。
- 应用商店发布。

## 14. 代码规范

- 使用 TypeScript，避免 `any`。
- 业务类型放在 `types/`。
- 模型调用只能通过 `lib/llm/client.ts`。
- 状态流转只能通过 `lib/interview/state-machine.ts`。
- 提示词只能集中在 `lib/interview/prompts.ts`。
- 数据库访问集中在 `lib/db/queries.ts`。
- 前端组件保持小而清晰。
- 不在前端写死任何密钥。
- 不在日志里记录敏感个人信息。
- AI 回复默认短句，一次只问一个问题。

## 15. 验收用例

通过：

- 用户能扫码打开。
- 用户能从开场走到结束。
- AI 每次只问一个问题。
- AI 能追问具体动作。
- AI 能进行“换尺子”问题。
- AI 能确认并返还用户原话。
- AI 结束后不继续挽留或推荐。

失败：

- AI 说“你很棒”“你很有韧性”等夸奖。
- AI 生成用户没说过的能力名称。
- AI 输出报告、建议、评分。
- AI 向用户索取联系方式。
- AI 没确认就使用可能听错的关键原话。

