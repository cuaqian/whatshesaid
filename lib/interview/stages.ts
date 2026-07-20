import type { InterviewStage } from "@/types/interview";

export const INTERVIEW_STAGES: InterviewStage[] = [
  "opening",
  "story",
  "keyword_followup",
  "external_evidence",
  "reference_shift",
  "quote_confirm",
  "mirror_back",
  "end"
];

// 固定开场（石悦原话）
export const OPENING_TEXT = "我在做一个帮女性看见自己价值的东西。今天我不问你要什么，只想听你讲一件你做过的事。你可以直接说话，也可以打字。我不会保存你的任何信息。可以吗？";

// 带回现场
export const STORY_PROMPT = "你做过的事里，印象最深的是哪一段？带我回那一天——那时候几点开始、什么环境、跟谁一起、先做了什么？";

// 岔开时拽回
export const FALLBACK_FOCUS = "咱先说你手里这件事。";

// 被指定的证据
export const EXTERNAL_EVIDENCE_PROMPT = "哪个老板主动留过你、或者给你涨过钱、提前给你转正？他图你什么？";

export const EXTERNAL_EVIDENCE_FALLBACK = "那客人里、同事里、老板嘴里，有没有谁说过你哪点好、老爱找你的？";

// 换尺子（两步，慢）
export const REFERENCE_PEER_PROMPT = "你身边干同样活的人，是不是都这样？";

export const REFERENCE_OUTSIDER_PROMPT = "那换一个从没干过的人来，今晚让她顶你这个班，会怎样？";

// 换尺子收束——不替她命名，不举例，不上课
export const REFERENCE_SHIFT_LINE = "所以在那个圈子里，这是标配，你才看不见它。你一直站在一堆跟你一样的人里，量你自己。";

// 原话确认 + 返还（石悦原话）
export const MIRROR_BACK_TEXT = "这就是你做的事。你已经说出来了，你只是没听见。";

// 如果原话里已有具体比喻，顺着她的词补一句
export const MIRROR_BACK_WITH_METAPHOR = "你把自己干的事，说得比谁都准。";

// 结束语（石悦原话）
export const END_TEXT = "就到这。我没有存你任何一句话，不会让你留联系方式，也不给你推荐什么。你可以关掉了——也许你不用再回来。";

// Demo 剧本：基于堂姐真实案例（做图书排版，十天出师）
export const DEMO_SCRIPT: { role: "user" | "assistant"; content: string; delay?: number }[] = [
  { role: "assistant", content: OPENING_TEXT, delay: 0 },
  { role: "user", content: "可以。", delay: 800 },
  { role: "assistant", content: STORY_PROMPT, delay: 2000 },
  {
    role: "user",
    content: "我在一个小印刷厂做图书排版。每天早上八点半到，有时候加班到晚上八九点。就我一个人负责排版，老板接活，我排。",
    delay: 1500
  },
  {
    role: "assistant",
    content: '你刚说的「排版」，具体怎么做的？出过岔子吗？',
    delay: 2000
  },
  {
    role: "user",
    content: "就是老板把客户的稿子发给我，图片文字都有，我得把它们整成能印出来的样子。有时候客户给的图不行，我自己调。有一次急活，第二天就要，我熬到凌晨两点，弄完了。",
    delay: 2000
  },
  {
    role: "assistant",
    content: "你自己调图那次，具体是怎么弄的？老板知道吗？",
    delay: 2000
  },
  {
    role: "user",
    content: "他不知道。我就自己试了几个方法，把图的分辨率调了一下，又加了一层底色，印出来就不糊了。其实我也不知道算不算弄得好，就是能用了。",
    delay: 2000
  },
  {
    role: "assistant",
    content: EXTERNAL_EVIDENCE_PROMPT,
    delay: 2000
  },
  {
    role: "user",
    content: "没有老板给我涨钱……不过我刚去第十天，老板就说我出师了，让我直接上高阶的排版。本来试用期要一个月的。他说我已经可以独立做了。",
    delay: 1500
  },
  {
    role: "assistant",
    content: REFERENCE_PEER_PROMPT,
    delay: 2000
  },
  {
    role: "user",
    content: "应该是吧……我身边干这个的都这样。我们印刷厂好几个排版的，大家都能排。",
    delay: 1500
  },
  {
    role: "assistant",
    content: REFERENCE_OUTSIDER_PROMPT,
    delay: 2000
  },
  {
    role: "user",
    content: "那肯定不行啊。她连软件都不会用，图怎么调也不知道，印出来肯定糊。今晚让她顶，明天客户就得骂人了。",
    delay: 2000
  },
  {
    role: "assistant",
    content: `${REFERENCE_SHIFT_LINE}\n\n你前面说了一句话，我想跟你确认一下——你说的是"我刚去第十天，老板就说我出师了，让我直接上高阶的排版"，对吗？`,
    delay: 2500
  },
  { role: "user", content: "对。", delay: 1000 },
  {
    role: "assistant",
    content: MIRROR_BACK_TEXT,
    delay: 2000
  },
  {
    role: "assistant",
    content: END_TEXT,
    delay: 3000
  }
];
