// 本地模型模拟器：OpenAI 兼容的流式接口，用于无外网/无 Key 环境下的端到端测试。
// 用法：node scripts/mock-llm.mjs 9099
// 然后设置 DEEPSEEK_BASE_URL=http://127.0.0.1:9099/v1 启动主应用即可。
import http from "http";

const port = parseInt(process.argv[2] ?? "9099", 10);

const server = http.createServer((req, res) => {
  if (!req.url?.endsWith("/chat/completions")) {
    res.writeHead(404).end();
    return;
  }
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    });
    const chunks = [
      "## 模拟输出\n\n",
      "这是**本地模拟模型**返回的流式内容，",
      "用于端到端测试。\n\n",
      "- 收到的请求长度：" + body.length + " 字节\n",
      "- 一切工作正常 ✅\n",
    ];
    let i = 0;
    const timer = setInterval(() => {
      if (i < chunks.length) {
        const payload = { choices: [{ delta: { content: chunks[i] } }] };
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
        i++;
      } else {
        res.write("data: [DONE]\n\n");
        res.end();
        clearInterval(timer);
      }
    }, 80);
  });
});

server.listen(port, () => {
  console.log(`mock-llm listening on http://127.0.0.1:${port}/v1`);
});
