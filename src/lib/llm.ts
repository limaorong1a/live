// 模型中转层：统一接入多家大模型（OpenAI 兼容协议），按模型名路由到对应厂商。
// 新增厂商只需在 PROVIDERS 中加一条配置。

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type Provider = {
  name: string;
  baseUrl: string;
  baseUrlEnv: string; // 可用环境变量覆盖默认地址（自建网关/代理场景）
  apiKeyEnv: string;
  match: (model: string) => boolean;
};

const PROVIDERS: Provider[] = [
  {
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    baseUrlEnv: "DEEPSEEK_BASE_URL",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    match: (m) => m.startsWith("deepseek"),
  },
  {
    name: "通义千问",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    baseUrlEnv: "DASHSCOPE_BASE_URL",
    apiKeyEnv: "DASHSCOPE_API_KEY",
    match: (m) => m.startsWith("qwen"),
  },
];

function resolveProvider(model: string): {
  provider: Provider;
  baseUrl: string;
  apiKey: string;
} {
  const provider = PROVIDERS.find((p) => p.match(model));
  if (!provider) throw new Error(`不支持的模型: ${model}`);
  const apiKey = process.env[provider.apiKeyEnv];
  if (!apiKey) {
    throw new Error(
      `${provider.name} 的 API Key 未配置，请在 .env 中设置 ${provider.apiKeyEnv}`
    );
  }
  const baseUrl = process.env[provider.baseUrlEnv] || provider.baseUrl;
  return { provider, baseUrl, apiKey };
}

/** 流式对话：逐段产出模型输出文本 */
export async function* chatStream(
  model: string,
  messages: ChatMessage[]
): AsyncGenerator<string> {
  const { baseUrl, apiKey } = resolveProvider(model);

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, stream: true }),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(`上游模型请求失败 (${res.status}): ${detail.slice(0, 300)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const json = JSON.parse(payload);
        const delta: string | undefined = json.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // 忽略无法解析的心跳/注释行
      }
    }
  }
}
