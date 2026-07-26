// 基础敏感内容拦截：本地词表初筛。
// ⚠️ 这只是第一道闸，正式对公众运营前必须接入专业内容安全服务
// （如阿里云内容安全 / 网易易盾），并按《生成式人工智能服务管理暂行办法》完成备案。

const BLOCKED_WORDS = [
  // 违法交易类
  "代开发票",
  "银行卡四件套",
  "假证",
  "假币",
  "枪支",
  "弹药",
  "毒品交易",
  "冰毒",
  "海洛因",
  "赌博网站",
  "博彩平台",
  "洗钱",
  "刷单兼职",
  "裸聊",
  "色情服务",
  "买凶",
  "人口贩卖",
  "器官买卖",
  "翻墙软件",
  "电信诈骗话术",
];

/** 返回命中的敏感词，未命中返回 null */
export function checkSensitive(text: string): string | null {
  for (const word of BLOCKED_WORDS) {
    if (text.includes(word)) return word;
  }
  return null;
}

/** 校验一组用户输入，命中返回错误消息 */
export function moderateInputs(values: Record<string, string>): string | null {
  for (const v of Object.values(values)) {
    if (typeof v !== "string") continue;
    const hit = checkSensitive(v);
    if (hit) return "输入内容包含违规信息，请修改后重试";
  }
  return null;
}
