# 轻购（LightBuy）

C 端电商跨端 Demo：一套 TypeScript 代码覆盖 iOS / Android，跑通「逛 → 搜 → 买」闭环，并验证三项能力：

1. **跨端**：Expo（Dev Client）+ React Native + TypeScript
2. **双 Token**：Access JWT + Refresh 旋转 / 单飞刷新 / 复用检测
3. **观测**：Sentry（崩溃与性能）+ PostHog（业务事件、漏斗、会话回放）；官方 SDK 直连云，不经过自研后端

后端：NestJS + MySQL 8。支付为 Mock。不使用 Expo Go（需要原生 Sentry 与 SecureStore）。

## 文档

| 文档 | 用途 |
| :--- | :--- |
| [product-brief.md](./product-brief.md) | 产品需求（PRD v1.3） |
| [build-spec.md](./build-spec.md) | 实施合同（栈、API、数据模型、安全、构建顺序） |
| [execution-backlog.md](./execution-backlog.md) | 按里程碑拆分的执行 backlog（Task 级验收） |

范围以 PRD §3 / Build Spec §3 为准，不要把已排除项加回来。

## 状态

🚧 规格已评审，工程脚手架尚未落地。下列命令是目标用法，代码就位后即可按此执行。

## 本地运行（目标）

需要：Node 20、pnpm、Docker、Expo Dev Client（每台机器先打一次 development 包）。

```bash
pnpm install
cp .env.example .env   # 填 JWT_SECRET、DSN 等
docker compose up      # MySQL + API（等待健康 → migrate → 可选 seed → 监听 :3000）
pnpm --filter mobile start
```

API 热更新可对着 Compose 里的 MySQL 跑 `pnpm --filter api start:dev`。

| 客户端 | `EXPO_PUBLIC_API_URL` |
| :--- | :--- |
| iOS 模拟器 | `http://localhost:3000` |
| Android 模拟器 | `http://10.0.2.2:3000` |
| 真机 | 电脑局域网 IP，或 HTTPS tunnel。Development profile 需允许明文 HTTP（ATS / `usesCleartextTraffic`），评审安装更推荐 tunnel。 |

- Swagger：`http://localhost:3000/api/docs`
- Health：`GET /api/v1/health`
- 种子账号：`13800000000` / `password123`（`SEED_ON_BOOT=1` 或 `pnpm --filter api seed`）
- Access Token 默认 **30 分钟**（`JWT_ACCESS_TTL`），便于演示无感刷新；可改为 `2h` 无需改代码
- **待支付 1 分钟**未付会自动取消并回滚库存（`ORDER_PAY_TIMEOUT_SEC=60`）。现场讲解可临时调到 300，不要改产品默认值
- 支付成功 **10 分钟**后定时任务将订单标为已完成
- 定时任务跑在 **单个** API 进程里，不要水平扩副本
- `__DEV__` 默认不上报 Sentry / PostHog；接线测试用 `EXPO_PUBLIC_TELEMETRY_IN_DEV=1`

## 仓库结构（目标）

```
apps/mobile     Expo Dev Client
apps/api        NestJS
packages/shared 错误码、排序枚举、纯 TS 类型（不含 class-validator / Nest）
```

## 验收（手工，对应 PRD 附录 B）

- 注册 / 登录返回双 Token；Access 过期自动刷新并重放，无 Loading、无跳转
- 并发 401 只打一次 refresh；Refresh 失效进登录页；登出后该用户全部 Refresh 失效；杀进程重启仍为登录态
- 首页搜索 + 排序 + 瀑布流；游客可浏览，加购 / 购物车 / 结算需登录
- 下单服务端计价；并发下单不超卖；Mock 支付；1 分钟未付取消；10 分钟后完成
- Sentry 能看到崩溃 / 性能；PostHog 能看到漏斗事件；设置页关闭采集后不再上报

自动化：lint、typecheck、API unit/e2e、mobile Jest 在 CI 中拦截 PR。无 Detox / Maestro。
