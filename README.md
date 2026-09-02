# 轻购（LightBuy）

C 端电商跨端 Demo：一套 TypeScript monorepo 覆盖 iOS、Android 与 NestJS API，跑通「逛 → 搜 → 买」闭环。

- 移动端：Expo SDK 52、React Native、React Navigation、React Native Paper
- 后端：NestJS、TypeORM、MySQL 8
- 鉴权：Access JWT + Refresh Token 旋转、单飞刷新与复用检测
- 观测：Sentry（崩溃/性能）+ PostHog（业务事件/漏斗/会话回放）
- 支付：Mock 支付

项目使用原生观测和安全存储模块，必须使用 Expo Dev Client，不能使用 Expo Go。

## 项目状态

M1–M10 已实现：基础设施、鉴权、商品、交易、移动端闭环、Analytics、CI、EAS profile 与交付文档均已落地。

权威文档：

- [product-brief.md](./product-brief.md)：产品需求与验收标准
- [build-spec.md](./build-spec.md)：技术栈、接口、数据模型与安全约束
- [execution-backlog.md](./execution-backlog.md)：Task 级实施与验收清单

## 环境要求

- Node.js 20
- pnpm 9.15.9
- Docker Desktop
- Xcode / Android Studio（本地原生构建时）
- EAS 账号（云构建时）

如果 shell 被 Conda 切到旧 Node，请先执行 `nvm use 20`。

## 一键启动 API

```bash
pnpm install
cp .env.example .env
docker compose up --build
```

Compose 会等待 MySQL 健康，执行 migration，并在 `SEED_ON_BOOT=1` 时写入演示数据。

- Health：`http://localhost:3000/api/v1/health`
- Swagger UI：`http://localhost:3000/api/docs`
- Swagger JSON：`http://localhost:3000/api/docs-json`
- 演示账号：`13800000000` / `password123`

API 开发模式可复用 Compose MySQL：

```bash
pnpm --filter api start:dev
```

## 启动移动端

```bash
cp apps/mobile/.env.example apps/mobile/.env
pnpm --filter mobile start
```

`EXPO_PUBLIC_API_URL` 按运行目标设置：

| 目标           | URL                            |
| :------------- | :----------------------------- |
| iOS 模拟器     | `http://localhost:3000`        |
| Android 模拟器 | `http://10.0.2.2:3000`         |
| 真机           | 电脑局域网 IP，或 HTTPS tunnel |

修改 `EXPO_PUBLIC_*` 后需重启 Metro；影响原生 plugin/profile 的配置变更需要重新构建 Dev Client。

商品 seed 默认使用 `picsum.photos`。若当前网络返回 503/522，可按 [seed.ts](apps/api/src/database/seed.ts) 注释换成可访问的 HTTPS CDN。

## Dev Client 与 EAS

本地原生构建：

```bash
export LANG=en_US.UTF-8
pnpm --filter mobile exec expo run:ios
pnpm --filter mobile exec expo run:android
```

Sentry / PostHog / `expo-application` 是原生模块。改过这些依赖后必须重编 Dev Client，不能只刷新 Metro。若 `pod install` 报 UTF-8 / `unicode_normalize`，先导出上面的 `LANG`。当前 Metro 仍带 `expo-application` shim，避免旧二进制白屏；原生崩溃、真实 version/build、完整 Session Replay 以重编后的 Dev Client 为准。

EAS 命令在移动端目录运行：

```bash
cd apps/mobile
pnpm dlx eas-cli@latest build --profile development
pnpm dlx eas-cli@latest build --profile preview
```

- `development`：Dev Client + internal distribution，允许局域网明文 HTTP
- `preview`：internal distribution，仅允许 HTTPS API
- `production`：商店构建，仅允许 HTTPS API，自动递增构建号

preview/production 构建前，应在 EAS 对应 environment 配置 `EXPO_PUBLIC_API_URL`、Sentry DSN 和 PostHog key。`SENTRY_AUTH_TOKEN` 属于构建秘密，只能放 EAS secret/本地未提交环境文件。

## 环境变量

后端：

- `DATABASE_URL`：MySQL 连接串
- `JWT_SECRET`：至少 32 字节
- `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL`：双 Token 有效期
- `ORDER_PAY_TIMEOUT_SEC`：待支付自动取消，默认 60 秒
- `ORDER_SHIP_AFTER_SEC`：已支付进入待收货，默认 180 秒
- `ORDER_AWAITING_RECEIPT_AFTER_SEC`：待收货自动完成，默认 300 秒
- `SENTRY_DSN` / `SENTRY_RELEASE`：API Sentry
- `SEED_ON_BOOT`：容器启动时是否 seed

移动端：

- `EXPO_PUBLIC_API_URL`：API 根地址，不含 `/api/v1`
- `EXPO_PUBLIC_SENTRY_DSN`：移动端 Sentry DSN；为空时 no-op
- `EXPO_PUBLIC_POSTHOG_KEY`：PostHog project key；为空时 no-op
- `EXPO_PUBLIC_POSTHOG_HOST`：默认 `https://us.i.posthog.com`
- `EXPO_PUBLIC_APP_ENV`：`development` / `preview` / `production`
- `EXPO_PUBLIC_TELEMETRY_IN_DEV=1`：仅用于开发环境接线验证；默认不上报

PostHog key 和 Sentry DSN 会进入客户端包，不应当作服务端秘密；上传 source map 使用的 auth token 仍必须保密。

## 订单状态流转

```text
待支付 --60 秒未付--> 已取消（回滚库存）
待支付 --Mock 支付--> 待发货 --约 3 分钟--> 待收货 --约 5 分钟--> 已完成
```

定时任务跑在单个 API 进程内，当前 MVP 不支持水平扩容多个 scheduler 实例。`ORDER_COMPLETE_AFTER_SEC` 仅用于兼容旧的「支付至完成总时长」配置。

## Analytics 与隐私

固定事件：

`app_launch`、`page_view`、`click`、`exposure`、`search`、`view_product`、`add_to_cart`、`create_order`、`pay_success`、`login_success`、`logout`

- PostHog 使用 US host，关闭自动 screen/touch capture，页面事件由 React Navigation 统一发送
- `click` 只覆盖 CTA 白名单，且仅在表单校验通过后发送；交易成功事件仅在客户端确认 HTTP 成功后发送
- 注册成功与密码登录一样发送 `login_success`（`login_type=password`）
- 事件属性不包含手机号、地址、收件人、密码或 Token；搜索仅在首屏请求成功后上报长度桶和 `result_count`，不上传原始关键词
- 无命中而返回推荐列表（`isFallback`）时 `result_count` 记为 `0`；同一关键词再次提交会重新请求并再报一次 `search`
- Replay 遮罩所有文本输入、图片和系统沙箱视图；收货摘要、地址编辑和订单收件人区域额外标记 `ph-no-capture`
- 设置页“业务分析与会话回放”开关对游客也可用（我的 → 数据分析设置），持久化到 AsyncStorage；关闭后 PostHog 事件与 Replay 立即停止
- Sentry 崩溃监控不受该业务分析开关影响，但只关联内部 user id，不发送默认 PII
- `__DEV__` 默认不初始化上报。要在 [PostHog Live events](https://us.posthog.com) 验收漏斗，需在 `apps/mobile/.env` 填写 `EXPO_PUBLIC_POSTHOG_KEY` 并设 `EXPO_PUBLIC_TELEMETRY_IN_DEV=1`，然后重启 Metro

与 `product-brief.md` §3.4.3 的有意差异（隐私与 Demo 范围，不以 PRD 原文核对属性）：

| 事件 | PRD | 实现 |
| --- | --- | --- |
| `app_launch` | `launch_type` | 仅冷启动一次，无热启动区分 |
| `search` | `keyword` | `query_length_bucket` + `result_count` |
| `view_product` / `add_to_cart` | 含 `price` | 不含金额 |
| `create_order` / `pay_success` | `order_no`、`amount` | `order_id`（下单另有 `source`） |

其他已知行为：购物车「去结算」和结算页提交都是 `element_id=checkout`，用 `page_name` 区分；游客点加购/立即购买会先发 `click`，取消登录不会撤回。Demo 下 Sentry `tracesSampleRate` 与 Replay `sampleRate` 均为 `1`，正式环境需按额度下调。

## 测试与 CI

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm --filter api test
pnpm --filter mobile test
pnpm --filter api test:e2e
```

API e2e 使用独立库 `lightbuy_test`，不会清空演示库。GitHub Actions 对 push/PR 执行 lint、format、shared-first typecheck、API unit/e2e 和 mobile Jest。

## 手工验收清单（对应 PRD 附录 B）

### 登录鉴权

- [ ] 注册/登录返回 Access + Refresh Token
- [ ] Access 过期后自动刷新并重放，用户无 Loading、无跳转
- [ ] 并发 401 仅产生一次 refresh
- [ ] Refresh 过期或失效后进入登录页
- [ ] 主动登出后该用户全部 Refresh Token 失效
- [ ] 杀进程重启后仍能通过 cold-start refresh 恢复登录态

### 商品域

- [ ] 首页、搜索、列表、详情均可用
- [ ] 综合、销量、上新排序正确
- [ ] 瀑布流分页无重复、无遗漏
- [ ] 游客可浏览；搜索历史仅登录用户持久化

### 交易域

- [ ] 未登录加购、购物车和结算被拦截并引导登录
- [ ] 加购 → 结算 → 下单 → Mock 支付 → 待发货 → 待收货 → 已完成完整可用
- [ ] 下单金额由服务端计价，客户端不能改价
- [ ] 并发购买同一商品不超卖
- [ ] 待支付 60 秒自动取消并回滚库存
- [ ] 支付后约 3 分钟进入待收货，再约 5 分钟自动完成

### 监控与埋点

- [ ] Sentry 可查 JS/Native 崩溃与页面性能事务，release/source map 对应正确（Native 崩溃需重编含 Sentry 的 Dev Client，不能只靠 Metro shim）
- [ ] PostHog 可查 `page_view`、CTA `click` 和交易成功事件明细（开发包须同时配置 PostHog key 与 `EXPO_PUBLIC_TELEMETRY_IN_DEV=1`）
- [ ] 漏斗 `view_product → add_to_cart → create_order → pay_success` 可配置并出数
- [ ] 匿名浏览后登录，历史事件正确归并到内部 user id
- [ ] Replay 可回放，输入、图片、收件人、手机号和地址均不可见
- [ ] 游客可从「我的 → 数据分析设置」关闭采集；关闭后不再产生 PostHog 事件或 Replay
- [ ] Sentry/PostHog 免费额度使用率低于 50%

### 工程质量

- [ ] 新环境按 README 可启动 API 和移动端
- [ ] seed 可一键初始化
- [ ] Swagger 覆盖全部 MVP endpoint，受保护路由标记 Bearer Auth
- [ ] GitHub Actions 全部质量门禁通过

MVP 不包含 Detox/Maestro；双端原生崩溃和 Replay 遮罩采用以上手工清单验收。
