const FORBIDDEN_PATTERNS = [
  // 夸奖类（石悦文档：想夸就改成问下一个问题）
  /你很棒/u,
  /很厉害/u,
  /太厉害了/u,
  /真不错/u,
  /做得很好/u,
  /你很强/u,
  /优秀/u,
  /了不起/u,
  /一针见血/u,
  /核心价值/u,
  /这是你的/u,
  // 能力命名类（第一铁律：绝不预设命名）
  /管理能力/u,
  /领导力/u,
  /沟通能力/u,
  /执行力/u,
  /抗压/u,
  /情商/u,
  /高情商/u,
  // 禁止的复合命名（从真实反例中提取）
  /现金流管理/u,
  /情绪管理/u,
  /时间管理/u,
  /危机处理/u,
  /压力管理/u,
  /人脉/u,
  /资源整合/u,
  // 建议/诊断/评价类
  /建议/u,
  /应该/u,
  /可以尝试/u,
  /你不妨/u,
  /你缺乏/u,
  /你拥有/u,
  /天赋/u,
  /韧性/u,
  /优势在于/u,
  // 报告/评分/推荐类
  /推荐/u,
  /报告/u,
  /评分/u,
  /排行/u,
  /得分/u,
  /测评/u,
  /心理/u,
  /诊断/u,
  /评估/u,
  // 留资类
  /手机号/u,
  /微信/u,
  /邮箱/u,
  /联系方式/u
];

export function violatesGuardrails(text: string): boolean {
  if (text.length > 120) {
    return true;
  }

  if ((text.match(/[？?]/g) ?? []).length > 1) {
    return true;
  }

  return FORBIDDEN_PATTERNS.some((pattern) => pattern.test(text));
}

export function sanitizeAssistantReply(reply: string, fallback: string): string {
  const trimmed = reply.trim().replace(/^助手[:：]\s*/u, "");
  if (!trimmed || violatesGuardrails(trimmed)) {
    return fallback;
  }
  return trimmed;
}

export function isAffirmative(text: string): boolean {
  const trimmed = text.trim();
  // 必须是明确的确认，不能只是礼貌敷衍
  return /^(对|是|嗯|没错|对的|是的|确认|可以|好|ok|OK|yes|Yes|y|对的对的|对的哈)$/u.test(trimmed);
}

export function isPoliteAgreement(text: string): boolean {
  // 检测"是的对"这类礼貌但没被击中的回应
  return /是的对|嗯嗯嗯|好的好的|可以可以/u.test(text.trim());
}

export function isNegative(text: string): boolean {
  return /不是|不对|没有|错了|不确认|no|No/u.test(text.trim());
}
