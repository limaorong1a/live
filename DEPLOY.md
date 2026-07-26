# 部署上线指南（保姆级）

本指南帮你把「技能中转站」从零部署到一台云服务器上，面向没有太多运维经验的用户。

## 一、准备工作

1. **一台云服务器**：国内推荐阿里云/腾讯云「轻量应用服务器」，2 核 2G 起步，选 Ubuntu 22.04 系统。约 ¥60-100/月。
2. **一个域名**（可选但强烈建议）：国内服务器对外提供网站服务需要域名并完成 **ICP 备案**（在服务器厂商控制台提交，免费，约 3-15 个工作日）。没备案前可以先用服务器 IP + 端口自测。
3. **一个大模型 API Key**：
   - DeepSeek：https://platform.deepseek.com 注册，充 ¥10 就能测很久。
   - 或通义千问：https://bailian.console.aliyun.com

## 二、最简单的部署方式（Docker，推荐）

登录服务器后依次执行：

```bash
# 1. 安装 Docker（Ubuntu）
curl -fsSL https://get.docker.com | sh

# 2. 拉取代码（把下面地址换成你的仓库）
git clone <你的仓库地址> skillrelay && cd skillrelay

# 3. 创建配置文件
cp .env.example .env
# 用 nano 编辑，填入下面几项后按 Ctrl+O 保存、Ctrl+X 退出
nano .env
```

`.env` 里**必须**改这几项：

```
DATABASE_URL="file:./data/prod.db"
JWT_SECRET="这里粘贴一串随机长字符串"
DEEPSEEK_API_KEY="你的DeepSeek密钥"
NEXT_PUBLIC_SITE_URL="https://你的域名"
NEXT_PUBLIC_SUPPORT_CONTACT="客服微信：你的微信号"
```

生成随机 JWT_SECRET 的命令：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

然后启动：

```bash
docker compose up -d --build
```

容器会自动建表。访问 `http://你的服务器IP:3000` 就能看到网站了。

## 三、初始化数据（首次部署）

进入容器写入内置技能并生成第一批体验卡密：

```bash
docker compose exec web npm run db:seed     # 写入 23 个内置技能 + 5 张体验卡密
docker compose exec web npm run admin -- 你的注册邮箱   # 把自己设为管理员
```

之后用该邮箱在网站注册/登录，即可访问 `/admin` 管理后台。

## 四、绑定域名 + HTTPS（备案通过后）

用 Nginx 反向代理，并用 Certbot 免费签 HTTPS 证书：

```bash
apt install -y nginx certbot python3-certbot-nginx
```

新建 `/etc/nginx/sites-available/skillrelay`：

```nginx
server {
    server_name 你的域名;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Real-IP $remote_addr;
        # SSE 流式输出需要关闭缓冲
        proxy_buffering off;
    }
}
```

启用并签证书：

```bash
ln -s /etc/nginx/sites-available/skillrelay /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d 你的域名     # 自动配置 HTTPS
```

⚠️ 用了 Nginx 之后，在 `.env` 里加一行 `TRUSTED_PROXY="true"`，限流才能拿到真实用户 IP。改完 `docker compose restart web`。

## 五、收款设置

**起步阶段（无需资质）**：默认「人工确认」模式已经能跑。用户在充值页下单后，会看到订单号和你的客服微信；用户转账给你后，你在 `/admin` 后台「充值订单」里点「确认到账」，积分自动发放。

**规模化（需要资质）**：注册企业主体、申请微信支付/支付宝商户号后，在 `src/lib/payment.ts` 里实现对应的 `WechatProvider`/`AlipayProvider`（统一下单 + 回调验签），把 `.env` 的 `PAYMENT_PROVIDER` 改成 `wechat` 或 `alipay` 即可自动收款到账，订单系统无需改动。

## 六、日常运维

```bash
docker compose logs -f web        # 看日志
docker compose restart web        # 重启
docker compose exec web npm run codes -- 20 100   # 批量生成 20 张 100 积分卡密
git pull && docker compose up -d --build           # 更新代码
```

数据库文件在宿主机 `./data/prod.db`，**记得定期备份**（直接复制这个文件即可）。

## 七、合规必读

正式对公众运营前，请务必：
- 完成网站 **ICP 备案**；
- 关注《生成式人工智能服务管理暂行办法》的**算法/大模型服务备案**要求；
- 接入**专业内容安全服务**（阿里云内容安全 / 网易易盾），本项目内置的敏感词过滤仅为降级兜底；
- 在页脚已提供《用户协议》《隐私政策》，如涉及收款请确保主体资质合规。
