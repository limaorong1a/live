// 内容安全过滤：本地词表初筛（同步）+ 可插拔的专业审核接口（异步）。
// ⚠️ 本地词表只是降级兜底。正式对公众运营前必须接入专业内容安全服务
// （如阿里云内容安全 / 网易易盾），并按《生成式人工智能服务管理暂行办法》完成备案。

const BLOCKED_WORDS = [
  // 违法交易
  "代开发票", "银行卡四件套", "假证", "假币", "枪支", "弹药",
  "毒品交易", "冰毒", "海洛因", "赌博网站", "博彩平台", "洗钱",
  "刷单兼职", "裸聊", "色情服务", "买凶", "人口贩卖", "器官买卖",
  "电信诈骗话术", "偷渡",
  // 暴恐
  "制造炸弹", "炸药配方", "恐怖袭击",
  // 其他高风险（涉政等类目请在接入专业服务时补全，本地表不穷举以免误伤）
  "邪教",
];

/** 同步初筛：返回命中的敏感词，未命中返回 null */
export function checkSensitive(text: string): string | null {
  // 去除空白与常见分隔符，降低"空格拆分"绕过
  const normalized = text.replace(/[\s​·.．,，、\-_*]/g, "");
  for (const word of BLOCKED_WORDS) {
    if (text.includes(word) || normalized.includes(word)) return word;
  }
  return null;
}

/** 校验一组用户输入，命中返回错误消息 */
export function moderateInputs(values: Record<string, string>): string | null {
  for (const v of Object.values(values)) {
    if (typeof v !== "string") continue;
    if (checkSensitive(v)) return "输入内容包含违规信息，请修改后重试";
  }
  return null;
}

/**
 * 异步文本审核挂载点。默认仅用本地词表；配置了专业服务后在此接入。
 * 返回 { ok: true } 或 { ok: false, reason }。
 */
export async function moderateText(
  text: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const hit = checkSensitive(text);
  if (hit) return { ok: false, reason: "内容包含违规信息" };
  // TODO: 接入阿里云内容安全 / 网易易盾的文本检测 API（输入送审 + 输出分段送审）
  return { ok: true };
}
