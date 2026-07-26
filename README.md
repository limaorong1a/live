# 🚉 技能中转站 SkillRelay

> 把专业者调好的 AI 工作流，"中转"给普通人一键使用。
> 用户不需要懂提示词、不需要 API Key、不需要订阅任何大模型——充值积分，按次使用，填内容拿结果。

## 商业模式

平台赚三层钱：

1. **积分差价**：用户充值积分，平台以批发价调用底层大模型（DeepSeek / 通义千问），赚取毛利；
2. **技能抽成**（路线图）：开放创作者入驻后，专业者上传技能定价，平台抽成 30%；
3. **创作者订阅**（路线图）：为创作者提供数据看板、私有技能等 Pro 功能。

## MVP 已实现功能

- ✅ 12 个内置刚需技能（简历优化、面试押题、小红书文案、公众号标题、短视频脚本、合同风险速查、周报生成、高情商邮件、中英互译润色、留学文书、长文速读、起名大师）
- ✅ 技能执行引擎：`{{占位符}}` 提示词模板 + 动态表单 + 流式输出（打字机效果）
- ✅ 模型中转层：OpenAI 兼容协议统一接入 DeepSeek / 通义千问，按模型名自动路由，新增厂商只需加一条配置（`src/lib/llm.ts`）
- ✅ 账号体系：邮箱注册/登录（JWT + httpOnly cookie），注册送 20 体验积分
- ✅ 积分体系：按次预扣积分、失败自动全额退款、卡密充值、使用记录
- ✅ **创作者入驻**：任何用户可在 `/create` 可视化配置自己的技能（输入字段 + 提示词模板 + 定价），提交后进入审核队列，通过即上架并标注创作者
- ✅ **管理后台** `/admin`（仅管理员）：核心数据看板、技能审核、在线批量生成卡密
- ✅ 首页搜索 + 分类筛选 + 🔥热门技能榜（按使用次数）
- ✅ 接口限流：技能运行 10 次/分钟，登录 10 次/5 分钟，注册 5 次/小时，防刷防爆破
- ✅ 命令行工具：`npm run codes -- <数量> <面值>` 生成卡密；`npm run admin -- <邮箱>` 设置管理员

## 技术栈

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Prisma + SQLite（生产可换 MySQL/PostgreSQL）

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env：填入 DEEPSEEK_API_KEY（https://platform.deepseek.com 注册获取）
# 和/或 DASHSCOPE_API_KEY，并修改 JWT_SECRET

# 3. 初始化数据库并写入内置技能（会打印 5 张 100 积分体验卡密）
npm run db:push
npm run db:seed

# 4. 启动
npm run dev
# 打开 http://localhost:3000

# 5.（可选）注册账号后，把自己设为管理员以访问 /admin
npm run admin -- you@example.com
```

## 目录结构

```
prisma/
  schema.prisma        # 数据模型：User / Skill / Run / RedeemCode
  seed.ts              # 内置技能种子数据 + 体验卡密
scripts/
  gen-codes.ts         # 批量生成充值卡密
src/
  lib/
    llm.ts             # 模型中转层（多厂商路由 + 流式）
    auth.ts            # JWT 会话
    skills.ts          # 技能输入定义 + 模板渲染
  app/
    page.tsx           # 首页：技能广场
    skills/[slug]/     # 技能运行页（流式输出）
    login/ register/   # 登录注册
    account/           # 积分余额 / 卡密兑换 / 使用记录
    api/
      run/             # 技能执行（SSE 流式，预扣积分失败退款）
      auth/ me/ redeem/
```

## 路线图

- [x] 创作者入驻：技能上传、定价、审核上架
- [x] 管理后台（技能审核、卡密管理、数据看板）
- [x] 热门技能榜、搜索与分类筛选
- [ ] 微信 / 支付宝在线充值（需办理主体资质与支付商户号）
- [ ] 创作者分成结算与数据看板
- [ ] 技能评分与评论
- [ ] 手机号 + 短信验证码登录
- [ ] 敏感词过滤与内容安全接入

## ⚠️ 合规提示（面向中国大陆运营）

- 底层模型使用国产合规模型（DeepSeek、通义千问），**不要**转售海外模型 API 给大陆用户（违反相关厂商服务条款且有合规风险）；
- 正式对公众运营前，需关注《生成式人工智能服务管理暂行办法》的备案要求，并接入内容安全审核；
- 网站上线需完成 ICP 备案；涉及在线收款需具备相应主体资质。

## 部署

任何支持 Node.js 的服务器均可（国内建议阿里云/腾讯云轻量服务器）：

```bash
npm run build && npm run start
```

生产环境建议：将 `DATABASE_URL` 换成 MySQL/PostgreSQL，用 PM2 守护进程，Nginx 反向代理 + HTTPS。
