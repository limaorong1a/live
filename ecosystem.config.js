// PM2 进程守护配置：pm2 start ecosystem.config.js
// 注意：内存限流器是单进程实现，instances 固定为 1；
// 需要多实例时先把限流与会话改造为 Redis。
module.exports = {
  apps: [
    {
      name: "skill-relay",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      env: { NODE_ENV: "production" },
    },
  ],
};
