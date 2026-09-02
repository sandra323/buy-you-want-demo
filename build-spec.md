# Build Spec

Source: [`product-brief.md`](./product-brief.md) v1.3 (LightBuy / 轻购 C-end ecommerce demo).
This document is the implementation contract for the MVP. Do not add features listed as out of scope in §3.

> **Agent index** (read this block first; jump by need — do not ingest the whole file)
>
> | §                                                        | One-liner                                                                                                                            | When to open                   |
> | :------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------- | :----------------------------- |
> | [§1 Summary](#1-technical-summary)                       | RN+Nest+MySQL; dual-token; Sentry+PostHog; monorepo assumptions                                                                      | Kickoff / constraints          |
> | [§2 Stack](#2-recommended-tech-stack)                    | Prefer existing libs; Paper, Navigation, Nest, TypeORM; design tokens                                                                | Dep choice / theme colors      |
> | [§3 Scope](#3-system-scope)                              | MVP in / out lists                                                                                                                   | “Is X in scope?”               |
> | [§4 Architecture](#4-high-level-architecture)            | Tabs/stacks; modules; `/api/v1`; integration points                                                                                  | Structure / routing            |
> | [§5 Modules](#5-core-modules)                            | **Algorithms:** refresh, single-flight, sort/LIKE, cart, address default, **create-order**, state machine, `tick`, analytics, ui-kit | Implementing a domain          |
> | [§6 Data model](#6-data-model)                           | 7 tables + indexes/FKs                                                                                                               | Migrations / entities          |
> | [§7 API](#7-api--interface-contracts)                    | Envelope `{code,message,data}`; routes; HTTP↔code map                                                                                | Endpoint / error codes         |
> | [§8 State / UX](#8-state-and-data-flow)                  | zustand; cold start; loading/empty/error; guest; SecureStore/AsyncStorage                                                            | Client state / screens         |
> | [§9 Security](#9-security-and-permission-considerations) | Guest vs member; IDOR→40401; env secrets; privacy                                                                                    | AuthZ / secrets                |
> | [§10 NFR](#10-non-functional-technical-expectations)     | Perf, a11y, logging, **test baseline**, deploy loop                                                                                  | Tests / CI / ops               |
> | [§11 Risks](#11-delivery-risks-and-trade-offs)           | Refresh loop, oversell, ATS, Metro shared, 1-min cancel                                                                              | Known pitfalls                 |
> | [§12 Build order](#12-suggested-build-order)             | Steps 1–15 → PRD M1–M5                                                                                                               | Sequencing (detail in backlog) |
> | [§13 Open Q](#13-open-questions)                         | Defaults in force (no blockers)                                                                                                      | Do not re-litigate             |
>
> **Siblings:** PRD → [`product-brief.md`](./product-brief.md); task-by-task → [`execution-backlog.md`](./execution-backlog.md). Hotspots: refresh algorithm §5 auth; create-order §5 order; interceptor §5 http-client; envelope §7.

---

## 1. Technical Summary

LightBuy is a **React Native + NestJS + MySQL** demo that must prove three capabilities:

1. One TypeScript RN codebase on **iOS and Android**.
2. Dual-token auth with **silent refresh** (single-flight + rotation + reuse detection).
3. **Sentry** (crash/perf) + **PostHog** (business events, funnel, session replay) via official SDKs.

Business loop to implement: home (search + sort + two-column waterfall) → search → product detail → cart → address → order → mock pay → order list/detail, plus cron jobs for unpaid-timeout cancel and paid-to-complete.

### Main technical goals

- Ship a reusable monorepo skeleton (`apps/mobile`, `apps/api`, `packages/shared`) that a later real project can fork.
- Make auth, pricing, stock, and IDOR **server-authoritative**. Client interceptors are UX only.
- One-command local API: `docker compose up` starts MySQL + API (wait-for-db → migrate → optional seed → listen). Expo Dev Client is a second command.
- CI that fails the PR if lint, typecheck, or tests fail.
- Demo-scale observability without a self-hosted analytics pipeline.

### Key implementation assumptions

- **Monorepo**: pnpm workspaces. `packages/shared` holds **pure TS only**: error codes, sort enums, and public response/request **types**. No `class-validator`, Nest, or Node-only deps (those stay in `apps/api` so Metro never bundles them). Expo Metro must include the workspace package (`watchFolders` / `pnpm` `exports`).
- **Mobile**: Expo SDK 52 (RN 0.76) + **Expo Dev Client** (Sentry native + SecureStore). Navigation is **React Navigation** (Native Stack + Bottom Tabs), not Expo Router. At kickoff, confirm SDK 52 still bootstraps; do not jump SDK mid-MVP.
- **Access Token TTL**: default **30 minutes** (`JWT_ACCESS_TTL=30m`) so demo refresh is easy to show; config can be `2h` without code changes.
- **Refresh Token TTL**: default **30 days** (`JWT_REFRESH_TTL=30d`). Stored as `expires_at` on insert.
- **Images**: HTTPS URLs in seed data. No object storage in MVP.
- **Payment**: mock `POST /orders/:id/pay` only. No PSP, no webhook.
- **Backend Sentry**: `@sentry/nestjs` on the API in addition to RN Sentry. Stated because the PRD only specifies the app SDK; API errors still need a sink for SDLC.
- **Deploy path**: local Docker Compose is the MVP. GitHub Actions for CI. EAS Build for binaries. A public API (Railway/Fly) is optional later so physical devices are not stuck on `localhost`.
- **UI copy**: Chinese. This spec is English for implementation tools.
- **Sales counter**: increment on **successful mock pay**, not on order create. Cancel of unpaid orders does not touch `sales`.

---

## 2. Recommended Tech Stack

### Selection principles

**Prefer existing libraries over custom code.** When choosing or adding a dependency, reach for a mature npm package (or an official vendor SDK) if it covers most of the need. Do not reinvent wheels for solved problems.

| Prefer a package when…                                                         | Build in-repo only when…                                                                                             |
| :----------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| A maintained library fits Expo SDK 52 / RN 0.76 and the monorepo toolchain     | No reasonable package exists, or every candidate breaks Dev Client / Metro / Nest constraints                        |
| An official SDK exists (Sentry, PostHog, `@nestjs/*`, Paper, React Navigation) | The gap is **LightBuy-specific** domain UI or business rules (product card, server-side pricing, token rotation)     |
| The dependency is already in the stack table below                             | A package would add heavy native surface area for a one-liner (e.g. do not add FastImage when `expo-image` suffices) |

Concrete defaults already following this rule: Paper for generic UI primitives; React Navigation for routing; `class-validator` + Nest pipes for DTO validation; TypeORM migrations for schema; `axios` interceptors for refresh (not a hand-rolled `fetch` layer); `@shopify/flash-list` or RN `FlatList` for lists — **do not** write a custom virtualized list. Before adding any new dependency, check Expo's recommended modules and the NestJS ecosystem first; document the reason in the PR if the choice is non-obvious.

Custom code belongs in `ui-kit` and domain services — not in reimplementing buttons, navigators, validators, or analytics transports.

### Frontend (`apps/mobile`)

| Choice                                        | Why for MVP                                                                                       |
| :-------------------------------------------- | :------------------------------------------------------------------------------------------------ |
| Expo SDK 52 + TypeScript (strict)             | Fast bootstrap, EAS CI/CD, still RN 0.76. Dev Client required for native Sentry and SecureStore.  |
| React Navigation (Native Stack + Bottom Tabs) | Matches PRD; native stack performance; screen events feed `page_view`.                            |
| React Native Paper                            | Material primitives (Button/Card/Badge/Snackbar) + theme object for the orange ecommerce palette. |
| zustand                                       | Auth/session, cart badge, catalog sort/keyword. Avoid Redux for this demo.                        |
| axios                                         | One interceptor owns token inject, 401 single-flight refresh, and one replay.                     |
| expo-secure-store                             | Refresh + Access in iOS Keychain / Android Keystore.                                              |
| @react-native-async-storage/async-storage     | Search history (last 10, login-only) and analytics opt-out flag.                                  |
| expo-image                                    | List/detail images with lazy load. Do **not** add FastImage.                                      |
| react-native-reanimated (already in Expo)     | Add-to-cart parabola + cart-badge pulse.                                                          |

**Do not use Expo Router.** Keep a classic `App.tsx` + navigator tree so the auth gate and analytics screen names stay explicit.

### UI design tokens

Wire these into Paper `MD3LightTheme` as `theme.colors` plus a `tokens.ts` for spacing/radius. Do not invent extra palettes.

- **Brand / CTA**: `#FF5000` (primary), `#E64500` (pressed), `#FFF3EE` (soft / chip selected bg)
- **Page**: `#F5F5F5` background, `#FFFFFF` cards and bars
- **Price / emphasis**: `#FF5000` on price text; original price `#999999` + strikethrough
- **Text**: `#1A1A1A` primary, `#666666` secondary, `#999999` tertiary / placeholders
- **Line**: `#EEEEEE` hairline / divider
- **Disabled**: `#CCCCCC` text, `#F0F0F0` fill
- **Status**: success `#00B42A`, warning `#FF7D00`, error `#F53F3F`
- **Radius**: 8 (inputs, chips), 12 (cards, sheets)
- **Spacing**: 4pt grid — 4 / 8 / 12 / 16 / 24
- **Icons**: one linear set (e.g. MaterialCommunityIcons already used by Paper). No mixed icon families.
- **Type**: system SF / Roboto via RN defaults. Price uses a slightly heavier weight than title.

Interaction notes from the PRD that the UI kit must support: skeleton instead of full-screen spinner on first list load; empty states with illustration + CTA; login-failure copy is always `手机号或密码错误`; add-to-cart parabola into tab badge.

### Backend (`apps/api`)

| Choice                                                                 | Why for MVP                                                                                                                                  |
| :--------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------- |
| NestJS 10 + TypeScript                                                 | Module + Guard model matches JWT auth. One process; no microservices.                                                                        |
| TypeORM + mysql2                                                       | Migrations are the schema source of truth. `synchronize: true` only when `NODE_ENV=development` **and** `TYPEORM_SYNC=1`. Never in CI/prod.  |
| @nestjs/jwt + passport-jwt                                             | Access JWT verify in a global guard. Refresh is **not** a JWT.                                                                               |
| bcryptjs cost 10                                                       | Password hash. Never reversible crypto.                                                                                                      |
| class-validator + ValidationPipe (`whitelist`, `forbidNonWhitelisted`) | All body/query DTOs.                                                                                                                         |
| @nestjs/throttler                                                      | Register / login / refresh only (e.g. 10/min/IP). Office NAT may share one IP — document that reviewers can raise the limit in `.env`.       |
| @nestjs/schedule                                                       | Unpaid cancel (1 min), paid → awaiting receipt (~3 min), then complete (~5 min). Cron calls `OrderJobs.tick(now)` every 60s. **One API replica only** (no leader election). |
| @nestjs/swagger                                                        | `/api/docs` for reviewers.                                                                                                                   |
| nestjs-pino (or Nest Logger + JSON in prod)                            | Request id + user id on API logs.                                                                                                            |

### Database

MySQL 8.x (InnoDB, `utf8mb4`). One schema `lightbuy`. Docker image `mysql:8.4`.

### Authentication

- Access: JWT HS256, claims `{ sub: userId }` only (no phone / `phoneMask` in the JWT). Header `Authorization: Bearer <access>`.
- Refresh: 64-byte CSPRNG, stored **only** as SHA-256 hex in `refresh_tokens`. Raw value returned once to the client. TTL from `JWT_REFRESH_TTL`.
- Client: both tokens in SecureStore; Access **also** kept in memory for the axios default header.

### Storage

None. Product `main_image` / `images[]` are HTTPS URLs in seed. User avatars: nullable URL, unused in MVP UI beyond a default glyph.

### Deployment

- **Local**: `docker compose up` runs `mysql` + `api`. API entrypoint: wait for MySQL healthy → run migrations → seed if `SEED_ON_BOOT=1` → start HTTP. Mobile is `pnpm --filter mobile start` (Expo Dev Client).
- **Cleartext HTTP**: simulators may use `http://localhost:3000` (iOS) / `http://10.0.2.2:3000` (Android emulator). Physical devices need `EXPO_PUBLIC_API_URL` = LAN IP or HTTPS tunnel. The **development** EAS/`app.json` profile must allow cleartext (`NSAppTransportSecurity` / Android `usesCleartextTraffic`). Prefer a tunnel for review installs.
- **API replicas**: Compose and any later host run **one** API process. Do not horizontally scale until jobs have a DB advisory lock.
- **CI**: GitHub Actions — `pnpm lint`, `pnpm typecheck`, API unit + e2e (MySQL service container), mobile Jest.
- **API image**: multi-stage Docker (node 20-alpine). No Kubernetes.
- **App binaries**: EAS profiles `development` (Dev Client), `preview` (internal), `production`.
- **Secrets**: GitHub Actions secrets + local `.env` (gitignored). Commit `.env.example` only.

### Third-party services

| Service                  | Role                                                      | MVP config                                                                                    |
| :----------------------- | :-------------------------------------------------------- | :-------------------------------------------------------------------------------------------- |
| Sentry Cloud (Developer) | RN JS + native crash, screen transactions; API exceptions | `enabled: !__DEV__`; `tracesSampleRate: 1.0` in production; `release` = app version           |
| PostHog Cloud            | Events, identify, session replay, later flags             | `host: https://us.i.posthog.com`; replay on; mask all inputs + images; password always masked |

Analytics traffic **does not** go through Nest. Changing PostHog to self-host later is a `host` config change only.

### AI / model integration

Not used. Do not add LLM features.

---

## 3. System Scope

### Required for MVP

- Auth: register, login, refresh (rotate), logout (revoke **all** user refresh tokens), silent restore on cold start.
- Catalog: home = search bar + sort strip + two-column waterfall; search page + login-only history; product detail (gallery, price, sales, stock, rich text).
- Cart: CRUD, select/select-all, live totals, invalid (off-shelf / stock 0) rows greyed and not checkoutable. Login required.
- Address: CRUD + default. Snapshot into the order at create time.
- Orders: create (from cart selected lines **or** buy-now SKU), list by status tab, detail, mock pay, cancel if unpaid.
- Jobs: unpaid > 1 minute → cancel + restock; paid > ~3 minutes → awaiting receipt; awaiting receipt > ~5 minutes → completed.
- Guest vs member gates (see §9).
- Analytics wrapper + settings opt-out.
- Swagger, seed products, README one-command run.

### Intentionally excluded

- Real payment, refunds, invoices.
- OAuth / SMS OTP / third-party login.
- Coupons, flash sale, group buy, Banner, 金刚区, category nav.
- Merchant app, admin CMS, inventory backoffice.
- Push, IM, customer service.
- Dedicated search engine (Elasticsearch etc.). MySQL `LIKE` only.
- Self-built analytics SDK or in-house dashboards (use PostHog UI).
- Object storage, CDN pipeline, image upload.
- Multi-warehouse, SKU variants beyond a single product row, logistics statuses.

---

## 4. High-Level Architecture

```
[ iOS / Android ]
  RN screens (Paper + ui-kit)
  zustand (auth, cartBadge, catalogFilters)
  axios client  -- single-flight refresh --+\
  SecureStore / AsyncStorage                |
  Sentry RN SDK  ---- HTTPS ------------> Sentry Cloud
  PostHog RN SDK ---- HTTPS ------------> PostHog Cloud

[ NestJS monolith :3000 ]
  JwtAuthGuard (skip @Public)
  AuthModule / UsersModule / ProductsModule / CartModule / AddressesModule / OrdersModule
  ScheduleModule (order jobs)
  TypeORM
       |
       v
[ MySQL 8 ]
```

### Client

- Bottom tabs: `Home` | `Cart` | `Me`.
- Stacks on top: Search, ProductDetail, Checkout, OrderList, OrderDetail, AddressList, AddressEdit, Login, Register, Settings.
- Cart and Me tabs, if guest, render a logged-out panel with CTA to Login (Login always has “没有账号？去注册”).

### Server

- One Nest app, global prefix `/api/v1`.
- Exception filter maps domain errors → `{ code, message, data: null }` using the appendix A codes from the PRD.
- Transactions on create-order / pay / cancel / timeout-cancel.
- Jwt strategy loads `users.status`; `status = 0` is treated as unauthenticated (`40110` on protected routes, `40201` on login/refresh). A still-valid Access JWT is **not** enough if the user is banned.

### Database

- Single MySQL instance. Migrations are the schema source of truth.

### External services

- Sentry + PostHog: **client → vendor**. API → Sentry only for unhandled exceptions.

### Major integration points

1. `Authorization: Bearer` on every non-`@Public` route.
2. `POST /auth/refresh` is `@Public` but rate-limited; body is the raw refresh token.
3. Cron jobs share the same order state machine as HTTP handlers (same service methods).
4. Seed script inserts ≥ 20 products so waterfall, sort, and search have something to show.

---

## 5. Core Modules

### auth (`apps/api` AuthModule + `apps/mobile` auth store + interceptor)

- **Purpose**: dual-token session.
- **Responsibilities**: register/login; issue access JWT + raw refresh; persist `sha256(refresh)`; rotate on refresh; 60s reuse grace; revoke-all on logout and on confirmed reuse; bcrypt verify; throttle.
- **In**: `{ phone, password }` or `{ refreshToken }`.
- **Out**: `{ accessToken, refreshToken, user }`.
- **Deps**: `users`, `refresh_tokens`, `@nestjs/jwt`, throttler.

**Refresh algorithm (implement exactly):**

1. `hash = sha256(raw)`.
2. Lookup by `token_hash`. Missing → `40103` (treat as expired/unknown).
3. If `revoked = true`:
   - if `now - revoked_at <= 60s` → `40102`, **do not** family-revoke (network retry).
   - else → revoke **all** tokens for `user_id`, return `40102`.
4. If `expires_at < now` → `40103`.
5. Load user; if missing or `status = 0` → `40201` (same login copy; do not rotate).
6. Else rotate: revoke current row (`revoked_at = now`, `replaced_by = newId`), insert new hash, sign new access, return new pair.

**Client single-flight:**

- Shared `refreshPromise`. Concurrent HTTP 401 with `code === 40100` wait on it. **Never** start a refresh because `/auth/refresh` itself failed (`40102` / `40103` / `40201`) — that is a logout path, not a retry loop.
- Replay each failed request **once**. Second 40100 → fail the call.
- `40101` / `40110` → do **not** refresh; treat as logged out on protected screens.
- Refresh failure `40102` / `40103` / `40201` → `logoutLocal()` then, if current route is checkout/pay, show `登录已过期，请重新登录` and navigate to Login.
- Logout: **always** clear SecureStore, zustand, search history, `Sentry.setUser(null)`, `PostHog.reset()`. Call `POST /auth/logout` best-effort (refresh first if Access expired). API failure still clears local state.

### user-profile (`UsersModule` + Me / Settings screens)

- **Purpose**: current user + settings.
- **Responsibilities**: `GET /users/me` (masked phone); Settings: logout, analytics opt-out.
- **In**: access token. **Out**: `{ id, phoneMask, nickname, avatar }` from the DB — **not** from JWT claims.
- **Deps**: auth guard.

### catalog (`ProductsModule` + Home / Search / Detail)

- **Purpose**: browse and search.
- **Responsibilities**: paginated list with `sort`; keyword search with `%`/`_` escape; empty search → fallback recommended list (`isFallback: true`); product detail; seed.
- **In**: `keyword?`, `sort`, `page`, `pageSize`. **Out**: `{ items, page, pageSize, total }`.
- **Deps**: `products` table.

**Sort map:**

- `comprehensive` (default, also the “综合推荐” menu item): `sales DESC, created_at DESC`
- `price_desc` / `price_asc`
- `sales`: `sales DESC, id DESC`
- `newest`: `created_at DESC, id DESC`

**Search SQL:** escape `\`, `%`, `_` in keyword; `name LIKE %escaped% ESCAPE '\'`; prefer prefix matches then `sales DESC`. Only `status = 1` (on sale).

**Home vs list:** `GET /home` and `GET /products` may share one service method. Home does not send `keyword`. Keep both routes as in the PRD.

**Description:** `products.description` is **plain text** (short Markdown rendered as `Text` is optional). Do **not** load it in a WebView.

### cart (`CartModule` + Cart screen)

- **Purpose**: logged-in cart.
- **Responsibilities**: add (upsert quantity on `UNIQUE(user_id, product_id)`); patch qty/selected; delete; list with live product status/stock/price joined; mark line `invalid` if product off-shelf or `stock == 0`. Do **not** auto-delete invalid rows.
- **In**: `{ productId, quantity }` / `{ quantity?, selected? }`. Quantity is always `1–min(99, stock)` on the server for on-sale products. Patch on an invalid line: do not increase quantity (`40901` / `40001`). **Out**: lines + `selectedAmount`.
- **Deps**: `cart_items`, `products`, auth.

### address (`AddressesModule`)

- **Purpose**: shipping addresses.
- **Responsibilities**: CRUD; at most one `is_default` per user. Enforce in a transaction (`SELECT ... FOR UPDATE` that user's addresses, unset others, set one). Optional extra: generated column unique on “the default row per user”. First address becomes default.
- **In**: receiver fields. **Out**: address list. **Deps**: auth. IDOR: `WHERE id = :id AND user_id = :uid`.

### order (`OrdersModule` + Checkout / Order screens)

- **Purpose**: checkout, pay mock, cancel, list/detail.
- **Responsibilities**: server-side price; conditional stock decrement; snapshots; state machine; clear selected cart lines on cart-checkout.
- **In**: `{ addressId }` plus **exactly one** of: `fromCart: true` **or** `items: [{ productId, quantity }]`. If both or neither → `40001`. **Out**: `{ id, orderNo, status, totalAmount, ... }`.
- **Deps**: products, cart, addresses, jobs.

**Create-order algorithm (one DB transaction):**

1. Load address `WHERE id AND user_id` else `40401`.
2. Resolve lines: XOR — if `fromCart === true` use selected cart rows and ignore `items`; else require `items` (buy-now). Reject empty. Each qty must be `1–min(99, stock)` after the product lock.
3. For each line, `SELECT ... FOR UPDATE` on product. Must be `status = 1`.
4. `UPDATE products SET stock = stock - :qty WHERE id = :id AND stock >= :qty AND status = 1`. Rows affected 0 → rollback `40901`.
5. `totalAmount = sum(db.price * qty)` — ignore any client price.
6. Insert `orders` (`status = 0`) + `order_items` snapshots (`product_name`, `price`, `quantity`, `image`).
7. Snapshot `receiver_snapshot` JSON from the address row.
8. If `fromCart`, delete those cart rows.
9. Commit. Client then `PostHog.capture('create_order', ...)`.

**State machine (always conditional update):**

```
0 pending_pay --pay--> 1 paid --job ~3min--> 4 awaiting_receipt --job ~5min--> 2 completed
0 pending_pay --cancel or job 1min--> 3 cancelled  (+ restock)
```

`UPDATE orders SET status = :next, <timestamp> = NOW() WHERE id = :id AND status = :expected`. 0 rows → `40902`.

- Pay: expected `0`, next `1`, set `paid_at`, increment sales in SQL in the same transaction: `UPDATE products SET sales = sales + :qty WHERE id = :id` (never read–modify–write in JS).
- Cancel / timeout: expected `0`, next `3`, set `cancelled_at`, `stock += qty`.
- Awaiting-receipt job: expected `1`, next `4`, set `awaiting_receipt_at`.
- Complete job: expected `4`, next `2`, set `completed_at`.

`order_no`: `LB` + `yyyyMMddHHmmss` + 6 CSPRNG digits (or nanoid). Unique index; retry a few times on collision.

### jobs (`OrderJobs` in API)

- **Purpose**: time-based transitions.
- **Responsibilities**: `tick(now: Date)` runs three scans (`pending_pay` with `created_at <= now-60s` → cancel+restock via the same service as user cancel; `paid` with `paid_at <= now-3min` → awaiting receipt; `awaiting_receipt` with `awaiting_receipt_at <= now-5min` → complete). Cron is only `EVERY_MINUTE` → `tick(new Date())`. Tests **must** call `tick` with an injected clock — never sleep the live timeouts in e2e.
- **In/Out**: none (cron). **Deps**: order service. Process rows in small batches (e.g. 100). Do not run two API processes.

### http-client (`apps/mobile/src/api`)

- **Purpose**: all REST calls.
- **Responsibilities**: base URL from `EXPO_PUBLIC_API_URL`; attach Bearer; map `{ code !== 0 }` to typed errors; single-flight refresh **only** when HTTP 401 **and** `code === 40100` **and** the URL is not `/auth/refresh`; do **not** attach access token on `/auth/login|register|refresh`.
- **Deps**: auth store, SecureStore.

### analytics (`apps/mobile/src/analytics`)

- **Purpose**: one init module for Sentry + PostHog.
- **Responsibilities**: init with shared `environment` + `release`; `identifyUser(id)` / `clearUser()` called from auth login/logout; `capture(event, props)` no-ops when opt-out or `__DEV__` (unless `EXPO_PUBLIC_TELEMETRY_IN_DEV=1`); viewport exposure helper for product cards; navigation `page_view`. Disable PostHog automatic `$screen` / screen autocapture so they do not double-count `page_view`.
- **Events** (names fixed): `app_launch`, `page_view`, `click`, `exposure`, `search`, `view_product`, `add_to_cart`, `create_order`, `pay_success`, `login_success`, `logout`.
- `login_success`: fire on password login **and** on successful silent refresh / cold-start restore (`login_type`: `password` | `silent`).
- `click`: **CTA whitelist only** (search submit, add-to-cart, buy-now, checkout, pay, login, register, logout). Do not capture every press.
- **Props must not include**: phone, address, receiver, tokens, passwords.
- **Deps**: auth store, navigation, settings flag.

### ui-kit (`apps/mobile/src/components`)

- **Purpose**: ecommerce primitives Paper does not give you.
- **Components**: `ProductCard` (waterfall), `PriceText`, `QtyStepper`, `EmptyState`, `ListSkeleton`, `LoginGate`, `SortBar` (综合 dropdown + 销量 + 上新).
- **Deps**: Paper theme tokens only.

---

## 6. Data Model

All PK `id` = `char(36)` UUID v4 (or `varchar(36)`). Timestamps `created_at` / `updated_at`. Money = `decimal(10,2)`.

### users

- Purpose: account.
- Fields: `phone` varchar(11) unique, `password_hash` varchar(72), `nickname` varchar(32) default `用户xxxx` (last 4 of phone), `avatar` varchar(512) null, `status` tinyint default 1 (1 active / 0 banned).
- Relations: 1:N refresh_tokens, cart_items, addresses, orders.

### refresh_tokens

- Purpose: rotation + reuse detection.
- Fields: `user_id` FK, `token_hash` char(64) unique (sha256 hex), `expires_at` datetime, `revoked` boolean default false, `revoked_at` datetime null, `replaced_by` char(36) null (id of successor).
- Index: `(user_id, revoked)`.
- Relations: N:1 users.

### products

- Purpose: catalog.
- Fields: `name` varchar(120), `price` decimal(10,2), `original_price` decimal(10,2) null, `main_image` varchar(512), `images` json (string[]), `stock` int unsigned, `sales` int unsigned default 0, `description` text (**plain text**, not HTML), `status` tinyint (1 on sale / 0 off).
- Indexes: `name` (prefix 32 for LIKE), `(status, sales)`, `(status, created_at)`, `(status, price)`.
- Relations: referenced by cart_items and order_items. MVP never deletes products. FK: cart `ON DELETE RESTRICT`; `order_items.product_id` `ON DELETE RESTRICT` (history is the snapshot columns, not the live product row).

### cart_items

- Purpose: per-user cart line.
- Fields: `user_id` FK, `product_id` FK, `quantity` int unsigned (≥1, max 99), `selected` boolean default true.
- Unique: `(user_id, product_id)`.

### addresses

- Purpose: shipping.
- Fields: `user_id` FK, `receiver_name` varchar(32), `phone` varchar(11), `province` / `city` / `district` varchar(32), `detail` varchar(128), `is_default` boolean.
- App-enforced: only one row with `is_default = true` per `user_id` (transaction + row lock; see §5 address).

### orders

- Purpose: order header.
- Fields: `order_no` varchar(32) unique, `user_id` FK, `total_amount` decimal(10,2), `status` tinyint (`0` pending_pay, `1` paid/to_ship, `4` awaiting_receipt, `2` completed, `3` cancelled), `receiver_snapshot` json, `paid_at` / `awaiting_receipt_at` / `completed_at` / `cancelled_at` datetime null.
- Index: `(user_id, status, created_at)`.
- `receiver_snapshot` shape: `{ receiverName, phone, province, city, district, detail }`.

### order_items

- Purpose: immutable line snapshot.
- Fields: `order_id` FK cascade, `product_id` char(36), `product_name` varchar(120), `price` decimal(10,2), `quantity` int, `image` varchar(512).
- Relations: N:1 orders.

---

## 7. API / Interface Contracts

Envelope for every response:

```json
{ "code": 0, "message": "ok", "data": {} }
```

Errors: `data` is `null`, `code` from PRD appendix A, `message` is a client-safe Chinese string. **HTTP status and `code` are both required** — do not return HTTP 200 with a business error, and do not return Nest default bodies without this envelope. Clients key off `code`; axios refresh uses HTTP status **and** `code` as in the table.

| `code`            | HTTP                                              | Client interceptor                                                                      |
| :---------------- | :------------------------------------------------ | :-------------------------------------------------------------------------------------- |
| `0`               | 200 (201 only if you must; prefer 200 + envelope) | success                                                                                 |
| `40001`           | 400                                               | show `message`                                                                          |
| `40100`           | 401                                               | single-flight refresh + one replay; **not** on `/auth/refresh`                          |
| `40101`           | 401                                               | no refresh; invalid token                                                               |
| `40102` / `40103` | 401                                               | refresh endpoint only; `logoutLocal()`; never chain another refresh                     |
| `40110`           | 401                                               | no refresh; missing token on protected route                                            |
| `40201`           | 400                                               | login/refresh: wrong password **or** banned; always copy `手机号或密码错误`; no refresh |
| `40202`           | 409                                               | register: phone taken                                                                   |
| `40301`           | 403                                               | reserved; unused in MVP (banned users use `40201` / `40110`)                            |
| `40401`           | 404                                               | show `message` (IDOR looks like this, never `403`)                                      |
| `40901` / `40902` | 409                                               | stock / state dialogs                                                                   |
| `42900`           | 429                                               | throttle copy                                                                           |
| `50000`           | 500 (health DB down: 503)                         | retry / generic error                                                                   |

ValidationPipe, Throttler, and JWT guard **must** go through the same exception filter so the envelope is never skipped.

Pagination query: `page` default 1, `pageSize` default 10, max 50.
List `data`: `{ items, page, pageSize, total }`.

User object in auth payloads: `{ id, phoneMask, nickname, avatar }` where `phoneMask` is `138****0000`.

### Auth

**POST `/api/v1/auth/register`** — public, throttled

- In: `{ phone, password, confirmPassword }` (`phone` CN `1[3-9]\d{9}`, password 6–20).
- Out: `{ accessToken, refreshToken, user }`.
- Errors: `40001` validation, `40202` phone taken, `42900`.

**POST `/api/v1/auth/login`** — public, throttled

- In: `{ phone, password }`.
- Out: same as register.
- Errors: `40201` (always this copy, never “user not found”; banned users use the same code), `42900`.

**POST `/api/v1/auth/refresh`** — public, throttled

- In: `{ refreshToken }`.
- Out: `{ accessToken, refreshToken, user }`.
- Errors: `40102` revoked/reuse, `40103` expired/unknown, `40201` if user banned, `42900`.

**POST `/api/v1/auth/logout`** — auth

- In: none (user from JWT).
- Out: `{ ok: true }`. Revokes **all** refresh rows for that user.

### Users

**GET `/api/v1/users/me`** — auth

- Out: `user`.

### Catalog

**GET `/api/v1/home`** — public

- Query: `sort`, `page`, `pageSize`.
- Out: product cards `{ id, name, price, originalPrice, mainImage, sales, stock }`.

**GET `/api/v1/products`** — public

- Query: `keyword?`, `sort`, `page`, `pageSize`.
- Out: same cards plus `isFallback?: true` when keyword missed and server substituted recommendations.

**GET `/api/v1/products/:id`** — public

- Out: card fields + `images[]`, `description`, `status`.
- Error: `40401` if missing or off-shelf (treat off-shelf as 404 for guests; logged-in detail of off-shelf still 404 for MVP simplicity).

### Cart (all auth, IDOR by `user_id`)

**GET `/api/v1/cart`**

- Out: `{ items: [{ id, productId, name, image, price, quantity, selected, stock, invalid }], selectedAmount }`.

**POST `/api/v1/cart`**

- In: `{ productId, quantity }`. Upsert. Error `40901` if `quantity > stock`, `40401` if product not on sale. Server clamps/rejects outside `1–99`.

**PATCH `/api/v1/cart/:id`**

- In: `{ quantity?, selected? }`. Same stock/qty rules as POST. Error `40401` if not owner. Invalid lines cannot raise quantity.

**DELETE `/api/v1/cart/:id`** — owner only.

### Addresses (all auth, IDOR)

**GET `/api/v1/addresses`** — list, default first.  
**POST `/api/v1/addresses`** — body: `{ receiverName, phone, province, city, district, detail, isDefault? }`.  
**PUT `/api/v1/addresses/:id`** — same body.  
**DELETE `/api/v1/addresses/:id`**. If default deleted, promote latest remaining row.

### Orders (all auth, IDOR)

**POST `/api/v1/orders`**

- In: `{ addressId, fromCart: true }` **or** `{ addressId, items: [{ productId, quantity }] }` — mutually exclusive.
- Out: `{ id, orderNo, status, totalAmount, items, receiverSnapshot, createdAt }`.
- Errors: `40901` stock, `40401` address/product, `40001` empty items or both/neither line sources.

**GET `/api/v1/orders`**

- Query: `status?` (`all` omit, or `0|1|2|3|4`), `page`, `pageSize`.

**GET `/api/v1/orders/:id`** — header + items + snapshots.

**POST `/api/v1/orders/:id/pay`** — mock. Errors `40902` if not pending. On success client fires `pay_success`.

**POST `/api/v1/orders/:id/cancel`** — pending only, then restock.

### Health (SDLC; not in PRD, required for deploy)

**GET `/api/v1/health`** — public

- Out: `{ status: "ok", db: "up", uptimeSec }`. `db: "down"` → HTTP 503, `code` `50000`.

### Error codes to implement (from PRD)

`0`, `40001`, `40100`, `40101`, `40102`, `40103`, `40110`, `40201`, `40202`, `40301`, `40401`, `40901`, `40902`, `42900`, `50000`.

Put the enum in `packages/shared` and import **types only** from API + mobile. API validator classes live in `apps/api`.

JWT guard mapping: expired signature → `40100`; malformed → `40101`; missing on protected route → `40110`; user `status = 0` → `40110` (or `40201` on login/refresh).

---

## 8. State and Data Flow

### Client state (zustand)

- `auth`: `{ user, accessToken, isHydrating }`. Persist tokens only via SecureStore, not zustand persist middleware. Cart line items are **not** a second source of truth — only `cartBadge` plus server cart GET.
- `cartBadge`: integer from last cart GET / add-to-cart success. Refresh on Cart tab focus.
- `catalogFilters`: `{ sort, keyword }` for Home/Search. Reset keyword when leaving Search.

Cold start: if SecureStore has a refresh token → **always** call `/auth/refresh` (even if Access is still inside TTL) so the demo restore path is obvious; no UI spinner on Home. On failure continue as guest (`logoutLocal()`). Do not skip refresh just because a cached Access exists.

### Server state

- Source of truth for cart, addresses, orders, stock, tokens.
- Access JWT is stateless; revocation of access before TTL is **not** required (short TTL + refresh revoke is enough).

### Async operations

- Only Nest `@Cron(EVERY_MINUTE)` for order timeouts. No queues (Bull/Redis) in MVP.
- Client: list pagination (`onEndReached`), pull-to-refresh, add-to-cart request with button disabled until response.

### Loading / empty / error

| Surface          | Loading                   | Empty                                                                | Error                         |
| :--------------- | :------------------------ | :------------------------------------------------------------------- | :---------------------------- |
| Home/search list | `ListSkeleton`            | illustration + “去逛逛”                                              | retry snackbar                |
| Search no hits   | —                         | server already returns fallback; if fallback also empty, empty state | retry                         |
| Cart             | skeleton                  | empty + CTA Home                                                     | retry                         |
| Orders           | skeleton per tab          | per-status copy                                                      | retry                         |
| Checkout submit  | button disabled + spinner | —                                                                    | `40901` dialog, stay on page  |
| Auth forms       | submit disabled           | —                                                                    | inline `40001`; toast `40201` |

No full-screen blocking loader for silent refresh.

### Caching / persistence

- Access + refresh: SecureStore.
- Search history: AsyncStorage key `search_history`, max 10, **only if logged in**. Not written for guests. Cleared on logout (client) in addition to token wipe.
- Analytics opt-out: AsyncStorage `telemetry_opt_out`.
- No product-list disk cache. In-memory page items only.

### Guest flow

Browse Home / Search / Detail freely. Tapping add-to-cart, buy-now, Cart tab, Me tab, or address/order routes → `LoginGate` → Login → after success `navigation.goBack()` to the source screen and retry the action if it was add-to-cart.

Checkout with no addresses: empty state + CTA to AddressEdit; do not POST orders without `addressId`. Province/city/district use a **static CN region JSON picker** in the app; API still stores plain strings.

---

## 9. Security and Permission Considerations

### Authentication

- Passwords bcrypt cost 10. Login and register throttled.
- Refresh raw token never logged. DB stores hash only.
- Access in memory + SecureStore; do not put tokens in PostHog/Sentry extras.

### Authorization

- Guest: `GET /home`, `GET /products`, `GET /products/:id`, auth endpoints, `/health`.
- Member: everything else.
- **IDOR**: every `findOne` / `update` / `delete` on cart, address, order uses `AND user_id = :currentUser`. Integration tests must try another user’s id and expect `40401` (do not leak `403`).

### Session

- Logout: local wipe is mandatory even if `POST /auth/logout` fails (expired Access → try refresh then logout; if refresh fails, still `logoutLocal()`).
- Killing the app: refresh token still in SecureStore → silent refresh on next launch.

### Secret management

- Env: `JWT_SECRET` (≥32 bytes), `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`, `ORDER_PAY_TIMEOUT_SEC`, `ORDER_SHIP_AFTER_SEC`, `ORDER_AWAITING_RECEIPT_AFTER_SEC`, `DATABASE_URL`, `SENTRY_DSN` (api), `SENTRY_RELEASE`, `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_POSTHOG_KEY`, `EXPO_PUBLIC_POSTHOG_HOST`, `EXPO_PUBLIC_TELEMETRY_IN_DEV`, `EXPO_PUBLIC_API_URL`, `SEED_ON_BOOT`.
- Never commit `.env`. Rotate `JWT_SECRET` invalidates all access tokens (acceptable for demo).

### Input validation

- Global ValidationPipe. Phone regex. Quantity 1–99. Keyword length ≤ 40 after trim. Escape LIKE wildcards in the repository, not in the client.

### Privacy

- Mask phone in all user payloads.
- PostHog replay: mask all text inputs and images; password fields always masked.
- Event properties: ids, amounts, counts, `page_name`, `from` — never PII.
- Settings switch: opt-out stops `capture` and disables session replay.

### Abuse prevention (MVP-sized)

- Throttle register/login/refresh.
- Server-side price and stock conditionals.
- Order pay/cancel are state-conditional to block double-pay / pay-vs-cancel races.
- No SMS, so no OTP brute force. Phone uniqueness is the only identity.

---

## 10. Non-Functional Technical Expectations

### Performance

- Home first page (10 items) from local API p95 &lt; 2s on a mid-range simulator.
- Waterfall: Expo `Image` with lazy load; do not load description text on the list.
- Target 60fps on scroll; exposure observer must be throttled (e.g. 200ms) and fire once per product id per screen session.
- Silent refresh: no spinner, no navigation.

### Reliability

- API process restart-safe: jobs are idempotent via `WHERE status = expected`.
- Compose `restart: unless-stopped` for mysql + api. **One API replica.**
- Health endpoint used by compose `healthcheck` and any later host.

### Responsiveness

- Add-to-cart toast + badge animation starts on **HTTP success**, not on tap (avoids lying if `40901`).
- Checkout button locked until response (no double create).

### Accessibility baseline

- Touch targets ≥ 44pt.
- Icon-only buttons have `accessibilityLabel` (搜索, 购物车, 返回).
- Price and primary buttons: contrast against white ≥ WCAG AA for this palette (`#FF5000` on white is for large/bold price; CTA button uses white text on `#FF5000`).
- No extra a11y library required.

### Observability / logging

- API: log `method path status latency userId? requestId` in JSON in production. Do not log bodies of auth routes.
- Sentry `release` = `app.json` version + build number; same string on API `SENTRY_RELEASE`.
- `__DEV__`: Sentry `enabled: false`, PostHog `capture` no-op (still allow a debug flag `EXPO_PUBLIC_TELEMETRY_IN_DEV=1` for wiring tests).
- Replay sample rate 0.2 if quota pressure; start at 1.0 for the demo week then lower.
- Watch Sentry/PostHog free-tier usage in the vendor UI; no custom quota service.

### Maintainability

- TypeORM **migrations only** in CI/prod. `synchronize: true` allowed only when `NODE_ENV=development` and an explicit flag.
- `packages/shared` is the only place error codes and `ProductSort` live (types only; API DTOs with class-validator stay in `apps/api`).
- Swagger at `/api/docs`.
- Seed: `pnpm --filter api seed` loads demo user `13800000000` / `password123` plus products.

### Testing baseline

- **API unit**: refresh reuse grace (59s vs 61s), rotate `replaced_by`, stock `UPDATE` 0-row → `40901`, pay/cancel race → `40902`, LIKE escape of `%`.
- **API e2e**: register → login → refresh → logout; IDOR on order GET; create order + pay + `OrderJobs.tick(now)` complete (inject clock; **no** 10-minute sleep). Two concurrent create-order on the same low-stock SKU → one `40901`.
- **Mobile Jest**: axios single-flight (N parallel 40100 → 1 refresh); `/auth/refresh` 40102 does not trigger another refresh; guest cannot call cart API helpers.
- **No Detox/Maestro in MVP.** Manual checklist in README from PRD appendix B.
- CI must run lint + typecheck + the tests above on every PR.

### Dev / deploy / maintain loop

1. `pnpm install` && `docker compose up` (MySQL + API migrate/seed) && `pnpm --filter mobile start` (Expo Dev Client). For API hot reload, `pnpm --filter api start:dev` against Compose MySQL is allowed.
2. PR → GitHub Actions.
3. API: build Docker image on `main`. App: `eas build --profile preview`.
4. Ops: Sentry issues + PostHog funnel `view_product → add_to_cart → create_order → pay_success`.
5. Schema change = new migration, never hand-edit prod tables.

---

## 11. Delivery Risks and Trade-Offs

| Risk                                | Why it matters                                          | Mitigation                                                                                                                                                           |
| :---------------------------------- | :------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Concurrent 401 refresh              | Duplicate rotate → valid client holds a revoked refresh | Client single-flight + server rotate; interceptor tests **before** catalog screens                                                                                   |
| Refresh 401 loop                    | `/auth/refresh` 401 treated as 40100                    | Never refresh on that URL; Jest covers 40102                                                                                                                         |
| Oversell                            | Demo reviewers will parallel-tap buy                    | Conditional `stock >= n` inside a transaction; e2e with two concurrent POSTs                                                                                         |
| Reuse false positive                | Retry after timeout looks like theft                    | 60s grace: `40102` without family revoke                                                                                                                             |
| 1-minute unpaid cancel              | Live demo may lose the order while talking              | Keep 1 min as specified; document it in README; TTL is env `ORDER_PAY_TIMEOUT_SEC=60` so a reviewer build can use 300 if needed **without changing product default** |
| Two API replicas                    | Cron would fire twice                                   | MVP: one replica; jobs still idempotent                                                                                                                              |
| ATS / cleartext                     | Physical device cannot hit `http://LAN:3000`            | Dev Client cleartext exception **or** HTTPS tunnel; document both                                                                                                    |
| `packages/shared` in Metro          | Nest/class-validator pulled into RN                     | Shared package is types-only; Metro `watchFolders`                                                                                                                   |
| PostHog CN network + data residency | Cloud is US/EU; may be slow or non-compliant later      | Direct Cloud US host for demo; `host` config for self-host; no PII in events                                                                                         |
| Expo Dev Client vs Expo Go          | Sentry native / SecureStore need a custom client        | README: `eas build --profile development` once per machine                                                                                                           |
| Physical device vs localhost        | Phone cannot hit `localhost:3000`                       | `EXPO_PUBLIC_API_URL` + LAN IP or Cloudflare Tunnel                                                                                                                  |
| Seed image hotlink                  | Broken pictures kill the waterfall demo                 | Prefer stable picsum ids or bundle a few images in the app as fallback URI                                                                                           |
| LIKE search quality                 | `%` spam / slow table                                   | Escape wildcards; 20–50 seed rows; no extra index gymnastics                                                                                                         |
| JWT in query logs                   | Reverse proxies may log Authorization                   | Disable verbose HTTP body logs on auth; pino redact `req.headers.authorization`                                                                                      |
| Speed vs structure                  | Over-splitting services delays M1                       | One Nest app, three RN folders (`screens`, `api`, `components`) until a second client exists                                                                         |

---

## 12. Suggested Build Order

1. **Monorepo skeleton**: pnpm workspaces, `apps/api` Nest, `apps/mobile` Expo Dev Client, `packages/shared` (error codes, sort enum, **types only**), ESLint/Prettier, `.env.example`, `docker-compose.yml` (MySQL 8 + API entrypoint migrate).
2. **DB schema + migrations**: seven tables including `revoked_at` / order timestamps; seed script.
3. **Auth API + e2e**: register/login/refresh/logout/me; rotation; reuse grace; throttling; banned user; Swagger.
4. **Health + pino + API Sentry** so CI and compose have a probe.
5. **Catalog API**: home/products/detail, sort, escaped LIKE, fallback flag.
6. **Cart + address APIs** with IDOR tests.
7. **Order API + `OrderJobs.tick(now)`** (injectable clock, e2e without sleep) **then** wire `@Cron` to `tick`.
8. **Mobile theme + ui-kit + navigation shell** (tabs, Paper theme tokens, LoginGate, skeletons).
9. **Mobile auth**: SecureStore, login/register screens, cold-start silent refresh.
10. **Axios interceptor + Jest**: single-flight, one replay, no refresh-on-refresh; wire to all API modules **before** catalog screens.
11. **Catalog screens**: Home (search bar + SortBar + waterfall + exposure), Search (history rules), Detail.
12. **Cart / address / checkout / order screens** + mock pay + Chinese empty/error copy.
13. **Analytics module**: Sentry + PostHog init, identify/reset, event map, `login_success` silent, CTA-only `click`, opt-out in Settings, `__DEV__` off by default.
14. **CI**: GitHub Actions (lint, typecheck, API tests with MySQL service, mobile Jest). EAS `development` / `preview` profiles.
15. **README + Swagger polish + PRD appendix B checklist** (dual-token, oversell, 1 min cancel, 3 min awaiting receipt, 5 min complete, telemetry opt-out). Point README at this spec and `product-brief.md` (not the deleted self-built analytics SDK).

This maps to PRD milestones M1 (1–4), M2 (5, 8, 11), M3 (6–7, 12), M4 (13), M5 (14–15).

---

## 13. Open Questions

None blocking build. Defaults below are **in force** unless the PRD changes.

Resolved in this spec (do not re-litigate during build unless the PRD changes):

- Expo Dev Client + React Navigation (not Expo Router). Expo Image, not FastImage.
- Increment `sales` on **pay**, not on create (`UPDATE ... sales = sales + :qty`).
- No Redis/queue; cron in **one** API process; jobs exposed as `tick(now)`.
- No object storage; seed URLs only.
- `GET /health` and API Sentry are in scope for SDLC even though the PRD did not name them.
- JWT claims = `{ sub }` only. Refresh TTL `JWT_REFRESH_TTL=30d`. Access default `30m` for demo recordings; `2h` is env-only.
- `packages/shared` = types + enums only.
- PostHog Cloud **US** host for demo (`https://us.i.posthog.com`); switch via env if the org is EU-only.
- Public API (Fly/Railway) is optional deploy, not MVP scope; LAN + cleartext or tunnel for devices.
- Province picker: **static CN JSON** in the app; API strings unchanged.
- Off-shelf / zero-stock cart lines stay in the cart (`invalid`); never auto-deleted.
- Banned `users.status = 0`: login/refresh `40201`; Guard rejects remaining Access with `40110`. Seed-only; no admin UI.
