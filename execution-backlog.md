# Execution Backlog

Source of truth: [`build-spec.md`](./build-spec.md). Do not implement features listed as excluded in build-spec §3.

> **Agent index** (read this block first; execute **one** `Task X.Y` per session)
>
> | § / M                                                         | One-liner                                                              | Jump when…                 |
> | :------------------------------------------------------------ | :--------------------------------------------------------------------- | :------------------------- |
> | [§1 Strategy](#1-execution-strategy)                          | Backend-first → mobile shell → journey screens; early validation gates | Ordering / assumptions     |
> | [§2 Milestones](#2-milestones)                                | M1–M10 goals + “complete when”                                         | Progress overview          |
> | [§3 Tasks](#3-task-breakdown-by-milestone)                    | Full task bodies (Purpose / Scope / AC / commits / deps / risks)       | Implementing               |
> | [M1](#milestone-m1-monorepo--local-runtime)                   | Workspace, shared, api/mobile scaffold, lint, compose                  | Bootstrap                  |
> | [M2](#milestone-m2-database-schema--seed)                     | TypeORM, 7 tables, seed user+≥20 products                              | Schema                     |
> | [M3](#milestone-m3-api-platform--auth)                        | Harness, envelope, health, Sentry, JWT, auth, Swagger, e2e, early CI   | Dual-token API             |
> | [M4](#milestone-m4-catalog-api)                               | Home/list/sort/search/detail                                           | Catalog API                |
> | [M5](#milestone-m5-commerce-api--jobs)                        | Cart, address, order+pay, `tick`, commerce e2e, Swagger                | Commerce API               |
> | [M6](#milestone-m6-mobile-foundation)                         | Paper theme, ui-kit, nav shell                                         | App shell                  |
> | [M7](#milestone-m7-mobile-auth--http)                         | SecureStore, axios single-flight, login, Jest                          | **Before** catalog screens |
> | [M8](#milestone-m8-catalog-screens)                           | Home waterfall, Search history, Detail, exposure                       | Browse UI                  |
> | [M9](#milestone-m9-commerce-screens)                          | Cart, address, checkout, orders, Me/logout, parabola                   | Buy loop UI                |
> | [M10](#milestone-m10-analytics-ci--docs)                      | Sentry/PostHog, opt-out, CI, EAS, README                               | Ship                       |
> | [§4 Checks](#4-cross-cutting-checks)                          | Envelope, IDOR, secrets, a11y, etc.                                    | Every PR                   |
> | [§5 DoD](#5-definition-of-done-for-mvp)                       | Feature / quality / validation / deploy                                | MVP exit                   |
> | [§6 AI pattern](#6-recommended-working-pattern-for-ai-coding) | One task; verify AC; small commits                                     | How to run this backlog    |
>
> **Task quick map:** `1.1–1.6` scaffold → `2.1–2.3` DB → `3.0–3.9` auth platform → `4.1–4.4` catalog API → `5.1–5.7` commerce+jobs → `6.1–6.3` UI shell → `7.1–7.6` auth HTTP → `8.1–8.4` catalog UI → `9.1–9.6` commerce UI → `10.1–10.6` analytics/CI/docs. Spec wins on conflict.

---

## 1. Execution Strategy

**Approach:** Build backend-first in vertical slices, then mobile shell + auth transport, then screens in user-journey order (browse → auth → cart → checkout → orders → analytics → CI). Each task should land a verifiable increment.

**Dependency logic:**

- `packages/shared` (types + error codes only) must exist before API or mobile import contracts.
- Root `typecheck` / CI must build `@lightbuy/shared` **before** api/mobile `tsc` (dist or project references).
- DB migrations + seed before any API module that reads data.
- Global API envelope, exception filter, and JWT guard before feature modules.
- Auth API + e2e before cart/orders (they require `user_id`).
- **M7 must not start until M3 is complete** (at least Tasks 3.5–3.6); cold-start / login need a real refresh API.
- Mobile axios interceptor + Jest **before** catalog screens (refresh bugs are expensive to fix later).
- Order `OrderJobs.tick(now)` + unit/e2e **before** wiring `@Cron` (no 10-minute sleeps in tests).
- UI theme + navigation shell before feature screens.

**Critical path (P0 gates — do not skip or soft-pass):**

1. Task 3.6 + 3.8 — refresh rotation / reuse grace + auth e2e
2. Task 5.3 + 5.5 — order create stock lock + `OrderJobs.tick(now)` e2e
3. Task 7.3 + 7.5 — axios single-flight interceptor + Jest
4. Task 8.1 — Home waterfall on real API (first full client↔server browse proof)

**Parallel tracks (optional when two agents/devs available):**

- After M1: **Track A** = M2 → M5 (API). **Track B** = M6 only while Track A finishes M2–M3.
- **M7 (Tasks 7.1–7.5) must wait for M3** (auth register/login/refresh live). Do not start M7 against mocks.
- Merge before Task 7.6 / M8 (catalog/commerce clients need M4–M5).
- Solo / single AI session: stay serial M1→M10; still respect the critical-path order above.

**Staging:**

1. **Foundation** — monorepo, Docker, shared types, API/mobile scaffolds.
2. **Data + API core** — schema, auth, platform (health/logging/Sentry), catalog, commerce APIs; early CI after M3.
3. **Mobile platform** — Expo Dev Client, Paper theme, ui-kit, nav, auth store, axios.
4. **Mobile features** — catalog → cart → address → checkout/orders.
5. **Observability + ship** — analytics, full CI (mobile Jest), EAS profiles, README checklist.

**Validate early:**

- After M1: `docker compose up` starts MySQL healthy + API **boots** (health may be stub/404 until Task 3.2).
- After M3: `GET /api/v1/health` returns 200 with `db: "up"`; auth e2e (register → refresh → logout) passes; Task 3.9 CI green (lint + typecheck + API e2e).
- After M4: catalog list/detail via Swagger/curl with seed data.
- After M5: create-order + pay + `tick(now)` complete in e2e; commerce routes in Swagger.
- After M7: login + silent refresh on cold start in simulator (iOS and/or Android emulator).
- After M8: Home waterfall loads real API data.

**Assumptions (explicit):**

- Node 20, pnpm, Docker available locally.
- Workspace package name is `@lightbuy/shared` (lock in Task 1.2; api/mobile import that name only).
- Expo SDK 52 still bootstraps at kickoff; do not change SDK mid-MVP.
- One API replica; cron runs in-process only.
- Physical-device testing uses LAN IP or tunnel; cleartext allowed in Dev Client profile only. Document iOS sim / Android emulator (`10.0.2.2`) / device URLs in `.env.example`.
- Province/city/district picker uses static CN JSON in mobile (see Task 9.2 for source + size); API stores plain strings.
- Product `description` is **plain text** rendered as `Text` (build-spec §5). If §3 says “rich text”, §5 wins — no WebView.
- Error code `40301` is **reserved** in `@lightbuy/shared` for a later permission model; MVP auth uses `40110` / `40201` only — do not invent call sites for `40301`.

---

## 2. Milestones

| #   | Name                     | Goal                                                                      | Complete when                                                                                                              |
| :-- | :----------------------- | :------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------- |
| M1  | Monorepo & local runtime | Runnable skeleton with Docker MySQL + API process                         | `pnpm install`, `docker compose up` (MySQL healthy, API boots), lint/typecheck scripts exist — **not** full health 200 yet |
| M2  | Database schema & seed   | All 7 tables + demo data                                                  | Migrations apply cleanly; seed creates demo user + banned fixture user + ≥20 products                                      |
| M3  | API platform & auth      | Dual-token auth, envelope, guards, Swagger, health, e2e harness, early CI | Health 200 + `db: "up"`; auth e2e green; refresh rotation + reuse grace tested; Task 3.9 CI green                          |
| M4  | Catalog API              | Home/products/detail with sort + search                                   | Public catalog endpoints return paginated seed data; LIKE escape tested                                                    |
| M5  | Commerce API & jobs      | Cart, address, orders, mock pay, cron via `tick`                          | Order create/pay/cancel + injected `tick` e2e green; IDOR tests pass; commerce in Swagger                                  |
| M6  | Mobile foundation        | Expo Dev Client, theme, ui-kit, navigation shell                          | App boots to tab shell with Paper tokens; guest panels on Cart/Me                                                          |
| M7  | Mobile auth & HTTP       | SecureStore, login/register, axios single-flight, auth+user API client    | Jest interceptor tests pass; cold-start silent refresh works (**requires M3**)                                             |
| M8  | Catalog screens          | Home, Search, Detail end-to-end (+ remaining API clients)                 | Guest can browse waterfall; search history login-only; exposure fires                                                      |
| M9  | Commerce screens         | Cart, address, checkout, orders                                           | Full loop: add to cart → checkout → mock pay → order list/detail                                                           |
| M10 | Analytics, CI & docs     | Sentry/PostHog, full CI (mobile Jest), EAS, README                        | CI passes on PR (extends 3.9); settings opt-out works; manual checklist documented                                         |

---

## 3. Task Breakdown by Milestone

### Milestone M1: Monorepo & local runtime

**Goal**

- Establish pnpm workspaces, shared package, API/mobile scaffolds, and one-command local API startup.

#### Task 1.1: Initialize pnpm workspace root

**Purpose**

- Create the monorepo skeleton every other package depends on.

**Scope**

- **In:** `pnpm-workspace.yaml`, root `package.json` with workspace scripts (`lint`, `typecheck`, `test`), `.gitignore`, `.npmrc` if needed for hoisting.
- **Out:** Application code, Docker services, shared types.

**Suggested implementation notes**

- Workspaces: `apps/*`, `packages/*`.
- Root scripts delegate to filters: `pnpm --filter api …`, `pnpm --filter mobile …`.
- Confirm Node 20 in `engines` or `.nvmrc`.

**Acceptance criteria**

- `pnpm install` succeeds from repo root.
- `pnpm -r exec pwd` lists `apps/api`, `apps/mobile`, `packages/shared`.
- Root `pnpm typecheck` script exists (may no-op until packages have TS).

**Suggested commit granularity**

1. **chore: init pnpm workspace** — `pnpm-workspace.yaml`, root `package.json`, `.gitignore`, engine constraints.

**Dependencies**

- None

**Risks / failure modes**

- Wrong workspace globs → packages not linked. Verify with `pnpm why` after adding deps.

---

#### Task 1.2: Create `packages/shared` (types + enums only)

**Purpose**

- Single source for error codes, `ProductSort`, and public DTO **types** (no class-validator, no Nest).

**Scope**

- **In:** `packages/shared/src/index.ts`, error code constants/enum (`0`, `40001`, … `50000`), `ProductSort` enum, shared response envelope type, pagination types, minimal auth/catalog/cart/order **interfaces**.
- **Out:** Nest decorators, validators, runtime logic.

**Suggested implementation notes**

- `package.json` `"name": "@lightbuy/shared"` with `"exports"` for ESM/CJS as needed by Nest + Metro.
- Keep dependency list empty or dev-only (`typescript`).
- Mirror codes from build-spec §7 appendix; include `40301` as **reserved** (unused in MVP handlers — see §1 Assumptions).
- Root `typecheck` script order: `pnpm --filter shared build` (or `tsc -b`) **then** api/mobile `tsc --noEmit`. Document in root `package.json`.

**Acceptance criteria**

- Package name is exactly `@lightbuy/shared` (api/mobile depend on that string).
- `pnpm --filter shared build` or `tsc` emits without errors.
- No imports from `@nestjs/*`, `class-validator`, or `react-native` in shared source.
- API and mobile can import `ApiResponse<T>`, error codes, `ProductSort`.
- Root `pnpm typecheck` builds shared first so api/mobile do not fail on missing `dist` / project refs.

**Suggested commit granularity**

1. **feat(shared): add error codes and public API types** — enums, envelope, sort, core DTO interfaces.

**Dependencies**

- Task 1.1

**Risks / failure modes**

- Accidentally adding validators to shared → Metro bundles Nest. Grep shared for forbidden imports in CI later.
- CI running `tsc` on api before shared build → missing types. Lock script order early.

---

#### Task 1.3: Scaffold `apps/api` NestJS application

**Purpose**

- Bootstrappable API app with global prefix and module layout placeholders.

**Scope**

- **In:** Nest 10 app, `main.ts` with `/api/v1` prefix, `AppModule`, empty feature module folders, TypeScript config extending root, `package.json` scripts (`start`, `start:dev`, `build`, `test`).
- **Out:** Business logic, TypeORM entities, auth.

**Suggested implementation notes**

- Plan modules: `AuthModule`, `UsersModule`, `ProductsModule`, `CartModule`, `AddressesModule`, `OrdersModule`, `HealthModule`.
- Add `@lightbuy/shared` workspace dependency.

**Acceptance criteria**

- `pnpm --filter api start:dev` listens on port 3000 (or env).
- `GET /api/v1/health` returns 404 or a minimal stub until Task 3.2 — app must boot; **M1 does not require health 200**.

**Suggested commit granularity**

1. **feat(api): scaffold NestJS app with v1 prefix** — nest-cli, main, app module, scripts.

**Dependencies**

- Tasks 1.1, 1.2

**Risks / failure modes**

- Missing global prefix → mobile base URL mismatch. Lock prefix in `main.ts` early.

---

#### Task 1.4: Scaffold `apps/mobile` Expo SDK 52 Dev Client

**Purpose**

- RN app that can run on simulator with workspace shared package wired for Metro.

**Scope**

- **In:** Expo SDK 52, TypeScript strict, `app.json` / `app.config` with cleartext dev flags, `App.tsx` placeholder, Metro `watchFolders` for monorepo.
- **Out:** Navigation, Paper, Sentry native wiring (later tasks).

**Suggested implementation notes**

- Use Expo Dev Client template (not Expo Go-only).
- `EXPO_PUBLIC_API_URL` documented in `.env.example`.
- Configure Metro to resolve `@lightbuy/shared`.

**Acceptance criteria**

- `pnpm --filter mobile start` launches bundler.
- Dev Client build instructions noted in README stub (full EAS in M10).
- Import from `@lightbuy/shared` in a test file compiles.

**Suggested commit granularity**

1. **feat(mobile): scaffold Expo Dev Client with monorepo Metro config** — expo app, tsconfig, metro config, workspace dep on shared.

**Dependencies**

- Tasks 1.1, 1.2

**Risks / failure modes**

- Metro not watching `packages/shared` → stale types. Test by changing a shared type and reloading.

---

#### Task 1.5: ESLint, Prettier, and TypeScript baseline

**Purpose**

- Enforce consistent style and enable CI lint/typecheck gates.

**Scope**

- **In:** Root or per-package ESLint + Prettier configs, `pnpm lint`, `pnpm typecheck` at root.
- **Out:** Husky hooks (optional; not required for MVP).

**Suggested implementation notes**

- Nest and RN may need separate ESLint overrides.
- Mobile: extend `eslint-config-expo` or equivalent for SDK 52.

**Acceptance criteria**

- `pnpm lint` runs on all packages without config errors.
- `pnpm typecheck` runs `tsc --noEmit` (or build) on api, mobile, shared.

**Suggested commit granularity**

1. **chore: add eslint prettier and typecheck scripts** — configs + root scripts.

**Dependencies**

- Tasks 1.3, 1.4

**Risks / failure modes**

- Over-strict rules blocking generated Nest files. Scope lint to `src/` only.

---

#### Task 1.6: `.env.example` and Docker Compose skeleton

**Purpose**

- One-command local API: MySQL + API with migrate-on-start entrypoint.

**Scope**

- **In:** `.env.example` with all vars from build-spec §9 (`JWT_SECRET`, `DATABASE_URL`, TTLs, `ORDER_*_SEC`, Sentry, seed flag), `docker-compose.yml` with `mysql:8.4` + `api` service, API Dockerfile multi-stage stub, entrypoint: wait-for-db → migrate → optional seed → start.
- **Out:** Full migration SQL (M2), production deploy.

**Suggested implementation notes**

- MySQL healthcheck before API starts.
- `SEED_ON_BOOT=1` for first-run demo.
- API `healthcheck` hits `/api/v1/health` once implemented.

**Acceptance criteria**

- `cp .env.example .env` + `docker compose up` starts MySQL healthy and API **container/process boots** (migrations may be empty until M2; document expected state — **not** health 200 until Task 3.2).
- Compose file documents single API replica constraint.
- `.env.example` comments document `EXPO_PUBLIC_API_URL` for iOS sim (`localhost`), Android emulator (`10.0.2.2`), and LAN/tunnel for devices.

**Suggested commit granularity**

1. **chore: add env example and docker compose for mysql and api** — compose, dockerfile skeleton, entrypoint script, `.env.example`.

**Dependencies**

- Task 1.3

**Risks / failure modes**

- Entrypoint runs before migrations exist → fail loudly with clear log message, not silent hang.

---

### Milestone M2: Database schema & seed

**Goal**

- TypeORM entities, initial migration for all tables, seed script with demo user and products.

#### Task 2.1: TypeORM configuration and base entity patterns

**Purpose**

- Connect API to MySQL with migration-only workflow in CI/prod.

**Scope**

- **In:** `TypeOrmModule` config from `DATABASE_URL`, migration CLI scripts, `synchronize` gated by `NODE_ENV=development` **and** `TYPEORM_SYNC=1`.
- **Out:** Feature entities (next task).

**Suggested implementation notes**

- Files: `apps/api/src/database/`, `data-source.ts` for CLI.
- Document `pnpm --filter api migration:run` and `migration:generate`.
- Boot-time env validation (`JWT_SECRET`, `DATABASE_URL` required; fail fast with clear message if missing/empty).

**Acceptance criteria**

- API connects to Compose MySQL when `DATABASE_URL` set.
- `synchronize: true` impossible without explicit env flag.
- Migration run script exists and is invoked from Docker entrypoint.
- Starting API with empty `JWT_SECRET` exits non-zero with a clear log (no silent weak default).

**Suggested commit granularity**

1. **feat(api): configure TypeORM with migration workflow** — data source, app module wiring, npm scripts, env validation.

**Dependencies**

- M1 complete; MySQL running via Compose.

**Risks / failure modes**

- Accidental `synchronize` in CI. Add assertion in test bootstrap that sync is off.

---

#### Task 2.2: Entities and initial migration (7 tables)

**Purpose**

- Persist all MVP domain data per build-spec §6.

**Scope**

- **In:** Entities: `users`, `refresh_tokens`, `products`, `cart_items`, `addresses`, `orders`, `order_items` with fields, indexes, FKs (`ON DELETE RESTRICT` on cart/product refs).
- **Out:** Repository queries, seed data.

**Suggested implementation notes**

- UUID v4 string PKs `char(36)`.
- `refresh_tokens`: `token_hash`, `revoked`, `revoked_at`, `replaced_by`.
- `orders`: status tinyint, timestamp columns, `receiver_snapshot` JSON.
- `products.images` JSON string array.

**Acceptance criteria**

- `migration:run` creates all tables on empty DB.
- Re-running migration is idempotent (no duplicate object errors).
- Schema matches build-spec §6 field list (spot-check in MySQL client).

**Suggested commit granularity**

1. **feat(api): add domain entities and initial migration** — all 7 entities + one migration file.

**Dependencies**

- Task 2.1

**Risks / failure modes**

- Missing unique on `(user_id, product_id)` for cart → upsert bugs later. Verify constraints in migration.

---

#### Task 2.3: Seed script (demo user + ≥20 products)

**Purpose**

- Demo login and enough catalog data for waterfall, sort, and search.

**Scope**

- **In:** `pnpm --filter api seed` inserts demo user `13800000000` / `password123` (bcrypt cost 10), banned fixture user `13800000001` / `password123` with `status=0`, and ≥20 on-sale products with stable HTTPS image URLs.
- **Out:** Orders, cart seed rows.

**Suggested implementation notes**

- Prefer stable picsum URLs or bundled fallback URIs (build-spec §11 risk).
- Varied `price`, `sales`, `created_at` for sort testing.
- At least one product with `%`-like name fragment for LIKE escape test data.
- Banned user is for auth e2e / guard tests (Tasks 3.4, 3.8) — do not use as demo login in README.

**Acceptance criteria**

- Seed is idempotent or documented as wipe-and-reseed.
- After seed, `SELECT COUNT(*) FROM products WHERE status=1` ≥ 20.
- Demo user password verifies with bcrypt; banned user exists with `status=0`.

**Suggested commit granularity**

1. **feat(api): add database seed for demo user and products** — seed module/command, invoked when `SEED_ON_BOOT=1`.

**Dependencies**

- Task 2.2

**Risks / failure modes**

- Broken hotlinked images → empty waterfall. Use stable URLs; note fallback strategy in seed file comment.

---

### Milestone M3: API platform & auth

**Goal**

- Standard API envelope, exception filter, JWT guard, throttling, full dual-token auth with tests, Swagger, and early CI.

#### Task 3.0: API e2e / integration test harness

**Purpose**

- Stable MySQL-backed test bootstrap so auth and commerce e2e do not flake in local or CI.

**Scope**

- **In:** Test DB config (dedicated schema or Docker service DB name), migrate-before-test hook, truncate/cleanup helper between suites, env for high throttle limits or throttler mock, assertion that `synchronize` is off in test bootstrap.
- **Out:** Feature e2e cases (those land in 3.8 / 5.6).

**Suggested implementation notes**

- Prefer same MySQL 8 as Compose (service container in CI later); document `DATABASE_URL` for tests in `.env.example`.
- Export helpers: `createTestApp()`, `resetDb()`, optional `seedMinimal()`.
- Throttle: use `THROTTLE_TTL`/`THROTTLE_LIMIT` overrides or mock provider in test module.

**Acceptance criteria**

- `pnpm --filter api test:e2e` bootstraps Nest against test MySQL, runs a smoke “app boots” spec green.
- Truncate (or transaction rollback) leaves no cross-test pollution for users/orders.
- Documented one-liner in README stub / package script comments.

**Suggested commit granularity**

1. **test(api): add e2e harness with mysql migrate and reset** — jest-e2e config, helpers, smoke spec.

**Dependencies**

- Tasks 2.1, 2.2 (migrations exist)

**Risks / failure modes**

- Sharing the demo DB with e2e → wiped seed. Always use a separate database name (e.g. `lightbuy_test`).

---

#### Task 3.1: Global exception filter and response envelope

**Purpose**

- Every endpoint returns `{ code, message, data }` with correct HTTP status.

**Scope**

- **In:** `AllExceptionsFilter`, domain `AppException` helper throwing `{ code, message }`, success interceptor or helper wrapping `data`.
- **Out:** Feature-specific business logic.

**Suggested implementation notes**

- Map Nest validation errors → `40001`.
- Unknown errors → `50000`.
- ValidationPipe global: `whitelist`, `forbidNonWhitelisted`.

**Acceptance criteria**

- Invalid body on any route returns HTTP 400, `code: 40001`, Chinese `message`, `data: null`.
- Unhandled throw returns HTTP 500, `code: 50000`.
- Success responses always `code: 0`.

**Suggested commit granularity**

1. **feat(api): add global envelope and exception filter** — filter, app exception, validation pipe setup.

**Dependencies**

- Task 1.3, Task 2.1 (DB config available; entities not required for filter itself)

**Risks / failure modes**

- Guards throwing outside filter → non-envelope JSON. Test protected route without token early.

---

#### Task 3.2: Health endpoint and request logging

**Purpose**

- Compose healthcheck probe and structured API logs for SDLC.

**Scope**

- **In:** `GET /api/v1/health` public → `{ status, db, uptimeSec }`; DB down → 503 + `50000`. nestjs-pino (or JSON logger) with `method path status latency userId? requestId`; redact `Authorization` header.
- **Out:** Sentry (next task).

**Suggested implementation notes**

- `HealthModule` with TypeORM ping.
- Wire compose `healthcheck` to this route.

**Acceptance criteria**

- Healthy stack: HTTP 200, `code: 0`, `db: "up"`.
- Stopped MySQL: `db: "down"`, HTTP 503.
- Auth route bodies never logged.

**Suggested commit granularity**

1. **feat(api): add health endpoint and structured request logging** — health module, pino config, redaction.

**Dependencies**

- Tasks 2.1, 3.1

**Risks / failure modes**

- Logging JWT in headers → security leak. Add redact test or manual grep.

---

#### Task 3.3: API Sentry integration

**Purpose**

- Capture unhandled API exceptions in Sentry Cloud.

**Scope**

- **In:** `@sentry/nestjs` init from env `SENTRY_DSN`, `SENTRY_RELEASE`; disabled when DSN empty.
- **Out:** Mobile Sentry.

**Suggested implementation notes**

- Release string matches pattern used later in `app.json`.
- Do not send PII in Sentry context.

**Acceptance criteria**

- Thrown 500 in dev with DSN set appears in Sentry (or mock DSN test).
- App boots when `SENTRY_DSN` unset.

**Suggested commit granularity**

1. **feat(api): integrate Sentry for unhandled exceptions** — sentry module init in main.

**Dependencies**

- Task 3.1

**Risks / failure modes**

- Sentry swallowing errors in tests. Disable or mock in e2e.

---

#### Task 3.4: JWT access guard and `@Public()` decorator

**Purpose**

- Protect routes with access JWT; map errors to spec codes.

**Scope**

- **In:** `JwtAuthGuard`, `JwtStrategy` loading user `status`, `@Public()` metadata, global guard registration.
- **Out:** Refresh token logic.

**Suggested implementation notes**

- Claims `{ sub: userId }` only.
- Expired → `40100`; malformed → `40101`; missing on protected → `40110`; `status=0` → `40110`.
- Public routes: auth register/login/refresh, catalog GETs, health.
- Do **not** map any MVP path to `40301` — that code stays reserved in shared enums only.

**Acceptance criteria**

- Protected route without header → 401, `40110`.
- Expired JWT (test with short TTL) → 401, `40100`.
- Banned user with valid JWT → 401, `40110`.

**Suggested commit granularity**

1. **feat(api): add JWT guard with public route metadata** — strategy, guard, decorators.

**Dependencies**

- Tasks 3.1, 2.2

**Risks / failure modes**

- Guard applied to refresh route incorrectly. Mark auth public routes explicitly.
- Inventing `40301` responses for banned users — use `40110` / `40201` per build-spec.

---

#### Task 3.5: Auth module — register and login

**Purpose**

- Issue access JWT + raw refresh token; bcrypt passwords; throttle auth endpoints.

**Scope**

- **In:** `POST /auth/register`, `POST /auth/login`, DTOs with class-validator, `@nestjs/throttler` on auth routes, `UsersService` create/find, refresh token row insert with `sha256` hash.
- **Out:** Refresh rotation, logout.

**Suggested implementation notes**

- Register: phone `1[3-9]\d{9}`, password 6–20, confirm match.
- Login/register errors: `40201` same copy `手机号或密码错误`; register duplicate `40202`.
- User payload: `{ id, phoneMask, nickname, avatar }`.

**Acceptance criteria**

- Register + login return `{ accessToken, refreshToken, user }` with `code: 0`.
- Wrong password → 400, `40201`, message exactly `手机号或密码错误`.
- Duplicate phone → 409, `40202`.
- Throttle returns `42900` after limit (smoke test with low limit in test env).

**Suggested commit granularity**

1. **feat(api): implement auth register and login** — auth controller/service, user entity repo, throttler, DTOs.
2. **test(api): add auth register and login unit tests** — bcrypt, phone validation, error codes.

**Dependencies**

- Tasks 3.4, 2.2 (users table). Seed (2.3) optional for manual demo; e2e can register its own users.

**Risks / failure modes**

- Storing raw refresh in DB. Only store `sha256` hex.

---

#### Task 3.6: Auth module — refresh, logout, reuse grace

**Purpose**

- Implement rotation algorithm exactly per build-spec §5 auth.

**Scope**

- **In:** `POST /auth/refresh`, `POST /auth/logout`, full refresh algorithm (60s grace, family revoke), logout revokes **all** user refresh rows.
- **Out:** Client interceptor.

**Suggested implementation notes**

- Implement steps 1–6 from build-spec §5 verbatim.
- Set `replaced_by` on revoked row.
- Banned user on refresh → `40201`, no rotation.

**Acceptance criteria**

- Valid refresh returns new pair; old refresh invalid after rotation.
- Reuse within 60s of revoke → `40102`, no family revoke.
- Reuse after 60s → all user tokens revoked, `40102`.
- Expired/unknown hash → `40103`.
- Logout clears all refresh rows for user; subsequent refresh fails.

**Suggested commit granularity**

1. **feat(api): implement refresh rotation and logout revoke-all** — refresh service, logout endpoint.
2. **test(api): refresh reuse grace and rotation unit tests** — 59s vs 61s, `replaced_by` chain.

**Dependencies**

- Task 3.5

**Risks / failure modes**

- Grace window off-by-one on seconds. Use injected clock in unit tests.

---

#### Task 3.7: `GET /users/me` and Swagger setup

**Purpose**

- Current user endpoint and reviewer-friendly API docs.

**Scope**

- **In:** `UsersModule`, `GET /users/me`, Swagger at `/api/docs` documenting auth + users.
- **Out:** Catalog Swagger (extend in M4).

**Suggested implementation notes**

- Return user from DB, not JWT claims.
- Swagger bearer auth scheme.

**Acceptance criteria**

- Authenticated `GET /users/me` returns masked phone.
- Swagger UI loads at `/api/docs` with auth endpoints tryable.
- IDOR: N/A for me endpoint.

**Suggested commit granularity**

1. **feat(api): add users me endpoint and swagger bootstrap** — users module, swagger config.

**Dependencies**

- Tasks 3.5, 3.6

**Risks / failure modes**

- Swagger exposing internal error stacks. Use production-like filter in docs.

---

#### Task 3.8: Auth e2e test suite

**Purpose**

- Lock dual-token behavior before building dependent modules.

**Scope**

- **In:** e2e: register → login → refresh → logout; banned user paths; throttle smoke.
- **Out:** Catalog e2e.

**Suggested implementation notes**

- Use Task 3.0 harness (test MySQL + reset).
- Use supertest against Nest app.
- Banned paths: login/refresh as seed user `13800000001` (`status=0`) → `40201` / guard `40110` as applicable.

**Acceptance criteria**

- `pnpm --filter api test:e2e` passes auth scenarios.
- Refresh twice with same old token after grace fails appropriately.
- Banned user cases green without manual DB edits.

**Suggested commit granularity**

1. **test(api): add auth e2e covering register refresh logout** — e2e spec file using harness.

**Dependencies**

- Tasks 3.0, 3.5–3.7, 2.3 (banned fixture)

**Risks / failure modes**

- Flaky throttle tests. Use dedicated test env with high limit or mock throttler (from 3.0).

---

#### Task 3.9: Early GitHub Actions CI (lint + typecheck + API e2e)

**Purpose**

- Fail PRs as soon as auth platform exists — do not wait until M10 for the first CI gate.

**Scope**

- **In:** `.github/workflows/ci.yml` (or `api-ci.yml`): pnpm install, `shared` build, lint, typecheck, API unit + e2e with MySQL service container; auth e2e from Task 3.8 must run.
- **Out:** Mobile Jest (Task 10.4), EAS cloud build.

**Suggested implementation notes**

- Cache pnpm store; wait for MySQL healthy before e2e.
- Env: `JWT_SECRET`, `DATABASE_URL` → test DB (e.g. `lightbuy_test`).
- Keep workflow extendable: Task 10.4 adds mobile test + any commerce e2e jobs once those exist.

**Acceptance criteria**

- CI green on a PR that includes M3.
- Intentional lint failure fails the workflow.
- Workflow documents that mobile Jest lands in Task 10.4.

**Suggested commit granularity**

1. **ci: add github actions for lint typecheck and api e2e** — workflow + any script wiring.

**Dependencies**

- Tasks 3.0, 3.8, 1.5 (lint/typecheck scripts)

**Risks / failure modes**

- Flaky MySQL service startup — add health wait.
- Running api `tsc` before shared build — use root typecheck order from Task 1.2.

---

### Milestone M4: Catalog API

**Goal**

- Public home/products/detail endpoints with sort, search, fallback flag.

#### Task 4.1: Products repository — list, sort, pagination

**Purpose**

- Server-side catalog queries for home and product list.

**Scope**

- **In:** `GET /home`, `GET /products` sharing service method; query `sort`, `page`, `pageSize` (max 50); sort map from build-spec §5; only `status=1`.
- **Out:** Keyword search, detail endpoint.

**Suggested implementation notes**

- `ProductsModule`, repository with TypeORM query builder.
- Response card shape: `{ id, name, price, originalPrice, mainImage, sales, stock }`.
- Pagination envelope: `{ items, page, pageSize, total }`.

**Acceptance criteria**

- Default sort comprehensive orders by `sales DESC, created_at DESC`.
- Each sort enum returns deterministically ordered seed data.
- `pageSize` > 50 clamped or rejected per spec (max 50).
- Both `/home` and `/products` work without keyword.

**Suggested commit granularity**

1. **feat(api): add catalog list and home endpoints with sort** — products module, list service, controllers.

**Dependencies**

- M3 platform (3.1, 3.4), M2 seed

**Risks / failure modes**

- Missing composite indexes → slow demo. Indexes from §6 should be in migration.

---

#### Task 4.2: Keyword search with LIKE escape and fallback

**Purpose**

- Search products safely; return recommendations when no hits.

**Scope**

- **In:** `GET /products?keyword=` with trim, max length 40, escape `\`, `%`, `_`; prefix match preference; `isFallback: true` when substituting recommendations.
- **Out:** Detail endpoint.

**Suggested implementation notes**

- Empty keyword → same as list without filter (not an error).
- Unit test: keyword `%` does not match all rows.

**Acceptance criteria**

- Search matching name returns filtered items.
- No match returns recommended list with `isFallback: true`.
- Wildcard characters in keyword are literal, not SQL wildcards.

**Suggested commit granularity**

1. **feat(api): add catalog keyword search with like escape** — search method + unit test for escape.

**Dependencies**

- Task 4.1

**Risks / failure modes**

- Client-side escape only → SQL injection/wildcard blow-up. Escape in repository only.

---

#### Task 4.3: Product detail endpoint

**Purpose**

- Single product for detail screen.

**Scope**

- **In:** `GET /products/:id` returns card fields + `images[]`, `description` (plain text), `status`.
- **Out:** Off-shelf visible to admin (treat off-shelf/missing as `40401` for all).

**Suggested implementation notes**

- `40401` for missing or `status=0`.
- Description is plain text only (build-spec §5 overrides any “rich text” wording in §3).

**Acceptance criteria**

- Valid id returns full detail from seed.
- Off-shelf or random UUID → 404, `40401`.
- Public route, no auth required.
- `description` is a string suitable for RN `Text` — no HTML/WebView contract.

**Suggested commit granularity**

1. **feat(api): add product detail endpoint** — getById service + controller.

**Dependencies**

- Task 4.1

**Risks / failure modes**

- Loading HTML WebView assumption — description is plain text only.

---

#### Task 4.4: Extend Swagger for catalog routes

**Purpose**

- Document catalog for manual QA and mobile integration.

**Scope**

- **In:** Swagger decorators on catalog controllers; example responses.
- **Out:** Cart/order docs (M5).

**Acceptance criteria**

- `/api/docs` lists home, products list, product detail with query params.

**Suggested commit granularity**

1. **docs(api): document catalog endpoints in swagger** — decorators only.

**Dependencies**

- Tasks 4.1–4.3

**Risks / failure modes**

- None significant.

---

### Milestone M5: Commerce API & jobs

**Goal**

- Cart, addresses, orders with server-side pricing, stock conditionals, mock pay, and time-based jobs.

#### Task 5.1: Cart module (CRUD + invalid lines)

**Purpose**

- Logged-in cart with live product join and invalid state.

**Scope**

- **In:** `GET/POST/PATCH/DELETE /cart` per build-spec §7; upsert on `UNIQUE(user_id, product_id)`; `invalid` when off-shelf or stock 0; `selectedAmount`; qty rules `1–min(99, stock)`.
- **Out:** Order creation.

**Suggested implementation notes**

- IDOR: all queries `user_id = currentUser`.
- Do not auto-delete invalid rows.
- PATCH invalid line cannot increase qty → `40901`/`40001`.

**Acceptance criteria**

- Add/update/delete cart lines as spec.
- `GET` returns joined name, image, price, stock, invalid flag.
- `quantity > stock` → `40901`.
- Guest → 401 on all cart routes.
- IDOR: other user's cart line id → `40401`.

**Suggested commit granularity**

1. **feat(api): implement cart CRUD with invalid line rules** — cart module, service, controller.
2. **test(api): cart idor and stock validation tests** — unit/e2e cases.

**Dependencies**

- M3 auth, M2 schema, M4 products

**Risks / failure modes**

- Client-trusted price in cart GET — always join current `products.price` from DB.

---

#### Task 5.2: Addresses module (CRUD + single default)

**Purpose**

- Shipping addresses with transactional default enforcement.

**Scope**

- **In:** `GET/POST/PUT/DELETE /addresses`; first address auto-default; at most one `is_default` via transaction + `FOR UPDATE`; promote latest on default delete.
- **Out:** Order snapshots.

**Suggested implementation notes**

- IDOR on all mutations.
- Body fields: `receiverName`, `phone`, `province`, `city`, `district`, `detail`, `isDefault?`.

**Acceptance criteria**

- List returns default first.
- Setting new default unsets others atomically (concurrent test or unit with mocked repo).
- Delete default promotes another row.
- Other user's address id → `40401`.

**Suggested commit granularity**

1. **feat(api): implement addresses CRUD with default enforcement** — addresses module + transaction logic.

**Dependencies**

- M3 auth

**Risks / failure modes**

- Race on two simultaneous set-default without row lock. Use `FOR UPDATE` per spec.

---

#### Task 5.3: Order create (transaction, server pricing, stock lock)

**Purpose**

- Create pending orders from cart selection or buy-now items.

**Scope**

- **In:** `POST /orders` with XOR `fromCart` vs `items`; algorithm steps 1–9 from build-spec §5; `order_no` generation; address snapshot JSON.
- **Out:** Pay, cancel, jobs.

**Suggested implementation notes**

- Reject both/neither line sources → `40001`.
- `SELECT ... FOR UPDATE` on products; conditional stock update.
- Delete selected cart rows when `fromCart`.
- Ignore any client-sent price.

**Acceptance criteria**

- Cart checkout creates order, clears selected cart lines, decrements stock.
- Buy-now path works with `items` array.
- Insufficient stock → `40901`, no partial order.
- Wrong `addressId` → `40401`.
- Concurrent two orders on last unit: one succeeds, one `40901` (e2e or integration test).

**Suggested commit granularity**

1. **feat(api): implement order create with stock locking** — orders service create transaction.
2. **test(api): concurrent order create oversell test** — two parallel POSTs.

**Dependencies**

- Tasks 5.1, 5.2

**Risks / failure modes**

- Reading stock in JS then updating → race. Must use conditional `UPDATE` rows affected check.

---

#### Task 5.4: Order pay, cancel, list, detail

**Purpose**

- Mock payment and user-facing order reads with state machine.

**Scope**

- **In:** `POST /orders/:id/pay`, `POST /orders/:id/cancel`, `GET /orders`, `GET /orders/:id`; conditional status updates; pay increments `sales` in same transaction; cancel restocks.
- **Out:** Cron jobs.

**Suggested implementation notes**

- Pay: `0→1`, set `paid_at`, `sales += qty` per line in SQL.
- Cancel: pending only, `0→3`, restock.
- Wrong state → `40902`.
- List filter by `status` query; pagination `page` default 1, `pageSize` default 10, max 50 (build-spec §7).

**Acceptance criteria**

- Pay pending order → status 1; `sales` incremented on products.
- Double pay → `40902`.
- Cancel pending → status 3, stock restored.
- Pay vs cancel race → one wins, other `40902`.
- IDOR on GET/pay/cancel → `40401`.
- `GET /orders` returns `{ items, page, pageSize, total }`; `pageSize` > 50 clamped or rejected; second page returns distinct items when enough seed/fixture orders exist.

**Suggested commit granularity**

1. **feat(api): implement order pay cancel list and detail** — controller methods + state machine updates.
2. **test(api): pay cancel race and sales increment tests** — unit tests with injected repos or e2e.

**Dependencies**

- Task 5.3

**Risks / failure modes**

- Incrementing sales on create instead of pay. Assert sales unchanged after create in test.
- Omitting list pagination — clients in M9 must paginate; API contract must match §7.

---

#### Task 5.5: `OrderJobs.tick(now)` and cron wire-up

**Purpose**

- Time-based cancel, paid → awaiting-receipt, and awaiting-receipt → completed transitions.

**Scope**

- **In:** `OrderJobs.tick(now: Date)` batch processing; reuse order service conditional transition methods; `@Cron(EVERY_MINUTE)` calls `tick(new Date())`.
- **Out:** Client UI for job timing.

**Suggested implementation notes**

- Env: default 60s pay timeout, 180s paid-to-awaiting-receipt, 300s awaiting-receipt-to-complete.
- Tests call `tick` with injected clock — **never sleep for wall-clock status transitions**.
- Process batches of 100.

**Acceptance criteria**

- Unit/e2e: create unpaid order, `tick(now + 61s)` → cancelled + restock.
- Paid order, `tick(now + 10min)` → completed.
- Idempotent: second tick does not double-restock or re-complete.
- Cron registered but tests use direct `tick` only.

**Suggested commit granularity**

1. **feat(api): add OrderJobs tick for timeout cancel and auto complete** — job service + order service hooks.
2. **test(api): order jobs tick e2e with injected clock** — no real-time wait.

**Dependencies**

- Task 5.4

**Risks / failure modes**

- Two API replicas double-running cron. Document single replica; jobs still idempotent via conditional update.

---

#### Task 5.6: Commerce API e2e (IDOR + full order flow)

**Purpose**

- Integration confidence before mobile commerce screens.

**Scope**

- **In:** e2e: user A cannot GET user B order; register → add cart → create → pay → tick complete.
- **Out:** Mobile tests.

**Suggested implementation notes**

- Extend existing e2e harness from Task 3.0 / 3.8.

**Acceptance criteria**

- `pnpm --filter api test:e2e` includes commerce + IDOR cases all green.
- Order list pagination smoke covered if fixtures create enough rows (or unit-level page clamp).

**Suggested commit granularity**

1. **test(api): add commerce flow and idor e2e tests** — single spec file or extend suite.

**Dependencies**

- Tasks 5.1–5.5, 3.0

**Risks / failure modes**

- Test order pollution. Use harness reset between tests.

---

#### Task 5.7: Extend Swagger for commerce routes

**Purpose**

- Document cart, addresses, and orders for mobile integration before M9 — do not wait until M10.

**Scope**

- **In:** Swagger decorators on cart, addresses, orders controllers; bearer auth; example error codes for IDOR/`40901`/`40902`.
- **Out:** Mobile UI.

**Acceptance criteria**

- `/api/docs` lists cart, addresses, orders (create/pay/cancel/list/detail) with tryable auth.

**Suggested commit granularity**

1. **docs(api): document commerce endpoints in swagger** — decorators only.

**Dependencies**

- Tasks 5.1–5.4

**Risks / failure modes**

- None significant.

---

### Milestone M6: Mobile foundation

**Goal**

- Expo app shell with Paper theme, ui-kit primitives, and navigation tree.

#### Task 6.1: Paper theme and design tokens

**Purpose**

- Apply ecommerce palette to React Native Paper.

**Scope**

- **In:** `theme.ts` extending `MD3LightTheme`, `tokens.ts` for spacing/radius; wrap app in `PaperProvider`.
- **Out:** Screen implementations.

**Suggested implementation notes**

- Colors from build-spec §2 UI design tokens.
- Chinese UI copy convention established in comments.

**Acceptance criteria**

- Primary color `#FF5000` on buttons.
- Page background `#F5F5F5`, cards white.
- Theme imported by ui-kit components.

**Suggested commit granularity**

1. **feat(mobile): add Paper theme and design tokens** — theme + tokens files, provider in App.

**Dependencies**

- Task 1.4

**Risks / failure modes**

- Inventing extra palette colors. Stick to spec list.

---

#### Task 6.2: ui-kit components (skeleton set)

**Purpose**

- Reusable ecommerce primitives not provided by Paper.

**Scope**

- **In:** `PriceText`, `EmptyState`, `ListSkeleton`, `LoginGate`, `QtyStepper`, `SortBar`, `ProductCard` (waterfall layout props).
- **Out:** Screen wiring, parabola animation.

**Suggested implementation notes**

- `apps/mobile/src/components/`.
- `LoginGate` shows CTA → navigate to Login.
- Define a **pending-action contract** used by Detail (and later Cart): before navigating to Login, set `pendingAction` in zustand (or route params), e.g. `{ type: 'add_to_cart' | 'buy_now', productId, quantity }`. Login success → `goBack()` → consumer retries if `pendingAction` set, then clears it. Full retry wiring lands in Task 8.3; this task only ships the store shape + LoginGate CTA.
- `SortBar`: 综合 dropdown + 销量 + 上新.

**Acceptance criteria**

- Storybook not required; components render in a dev test screen or shallow Jest snapshot.
- `PriceText` shows strikethrough original price in `#999999`.
- `EmptyState` accepts illustration + CTA label props.
- Touch targets ≥ 44pt on interactive elements.
- `pendingAction` store (or typed helper) exists and can be set/cleared without crashing navigation.

**Suggested commit granularity**

1. **feat(mobile): add ui-kit price empty skeleton login gate** — first batch of components.
2. **feat(mobile): add ui-kit product card sort bar qty stepper** — remaining components.

**Dependencies**

- Task 6.1

**Risks / failure modes**

- Building custom virtualized list inside ProductCard parent — list lives on screen, card is item only.
- LoginGate that only navigates with no pending-action hook → guest add-to-cart requires a second tap after login (fails build-spec §8).

---

#### Task 6.3: Navigation shell (tabs + stacks)

**Purpose**

- Full navigator tree matching build-spec §4.

**Scope**

- **In:** React Navigation Native Stack + Bottom Tabs: `Home | Cart | Me`; stacks for Search, ProductDetail, Checkout, OrderList, OrderDetail, AddressList, AddressEdit, Login, Register, Settings; placeholder screens.
- **Out:** Real screen data, analytics `page_view`.

**Suggested implementation notes**

- Classic `App.tsx` navigator — **no Expo Router**.
- Cart/Me tabs: guest shows logged-out panel with login CTA.
- Login screen includes “没有账号？去注册”.

**Acceptance criteria**

- App navigates between all routes without crash.
- Guest opening Cart/Me sees CTA, not crash.
- Stack back works from Detail → Home.

**Suggested commit granularity**

1. **feat(mobile): add bottom tabs and root stack navigators** — navigation types, shell screens.
2. **feat(mobile): add guest logged-out panels on cart and me tabs** — placeholder content + CTAs.

**Dependencies**

- Tasks 6.1, 1.4

**Risks / failure modes**

- Deep linking not in MVP — do not over-engineer linking config.

---

### Milestone M7: Mobile auth & HTTP

**Goal**

- Secure token storage, auth screens, axios client with single-flight refresh, cold-start restore. **Blocked on M3** (real auth API required).

#### Task 7.1: SecureStore token storage and auth zustand store

**Purpose**

- Persist tokens outside zustand; hold session state in memory.

**Scope**

- **In:** `auth` store: `{ user, accessToken, isHydrating }`; read/write SecureStore for access + refresh; `logoutLocal()` clears store, SecureStore, search history placeholder.
- **Out:** API calls, analytics identify.

**Suggested implementation notes**

- Do not use zustand persist for tokens.
- `cartBadge` store stub (integer).

**Acceptance criteria**

- Tokens survive app reload in SecureStore.
- `logoutLocal()` removes tokens from SecureStore.
- Store exposes setters used by auth flows.

**Suggested commit granularity**

1. **feat(mobile): add secure token storage and auth store** — storage module, zustand slice.

**Dependencies**

- Task 6.3

**Risks / failure modes**

- Tokens in AsyncStorage. Use SecureStore only for tokens.

---

#### Task 7.2: Axios client base + auth/user API modules

**Purpose**

- Shared HTTP client and typed auth+user wrappers so login/register/me work before commerce APIs exist. (Absorbs former Task 7.6a — do not recreate a separate auth client task.)

**Scope**

- **In:** `apps/mobile/src/api/client.ts` base; `auth.ts` (register/login/refresh/logout); `user.ts` (`GET /users/me`); map `{ code !== 0 }` to typed errors using `@lightbuy/shared`.
- **Out:** Interceptor (Task 7.3); catalog/cart/address/order clients (Task 7.6).

**Suggested implementation notes**

- Base URL from `EXPO_PUBLIC_API_URL`.
- No Bearer on login/register/refresh.
- Interceptor wires in Task 7.3 onto this same instance — do not duplicate axios instances.

**Acceptance criteria**

- Login against local API (M3) returns tokens and user.
- API error surfaces `code` and `message`.
- Login/register/refresh/logout/me wrappers typecheck against `@lightbuy/shared`.
- Typecheck passes; no commerce DTOs required yet.

**Suggested commit granularity**

1. **feat(mobile): add axios client and auth user API modules** — client.ts + auth.ts + user.ts.

**Dependencies**

- Tasks 7.1, M3 API running (Tasks 3.5–3.6 minimum)

**Risks / failure modes**

- Wrong simulator base URL (Android `10.0.2.2`). Document in `.env.example`.
- Duplicating DTO types instead of importing from shared.

---

#### Task 7.3: Axios interceptor — single-flight refresh and one replay

**Purpose**

- Implement client refresh rules before any feature screens rely on auth.

**Scope**

- **In:** 401 + `code===40100` → single `refreshPromise`, replay once; never refresh on `/auth/refresh` failure; `40101`/`40110` → logout path; refresh failure on checkout → toast `登录已过期，请重新登录` + navigate Login.
- **Out:** Jest tests in same task or 7.5.

**Suggested implementation notes**

- Shared `refreshPromise` module.
- Second 40100 on same request → fail.
- Attach Bearer from memory access token.

**Acceptance criteria**

- Manual: expire access (short TTL), fire two parallel API calls → one refresh, both succeed.
- `/auth/refresh` returning `40102` does not loop refresh.
- `40101` does not trigger refresh.

**Suggested commit granularity**

1. **feat(mobile): add axios interceptor with single-flight refresh** — interceptor module wired to client.

**Dependencies**

- Tasks 7.1, 7.2

**Risks / failure modes**

- Treating all 401 as refreshable. Must check `code` and URL.

---

#### Task 7.4: Login, Register screens and cold-start silent refresh

**Purpose**

- User-facing auth and app launch restore path.

**Scope**

- **In:** Login/Register UI (Paper forms), validation UX, `手机号或密码错误` on `40201`; cold start: if refresh exists → always call `/auth/refresh` (no Home spinner); failure → guest mode.
- **Out:** `login_success` analytics event (M10).

**Suggested implementation notes**

- `App.tsx` or root effect runs hydrate before showing main UI.
- Login success `navigation.goBack()` to source; if `pendingAction` is set (Task 6.2), the source screen retries (full path verified in Task 8.3).
- Register confirms password.

**Acceptance criteria**

- Register → lands logged in.
- Wrong password shows exact copy `手机号或密码错误`.
- Kill app with valid refresh → reopen still logged in without login screen flash on Home.
- Logout from settings (stub OK until M9) clears session.

**Suggested commit granularity**

1. **feat(mobile): add login and register screens** — UI + form submit.
2. **feat(mobile): add cold-start silent refresh on launch** — hydrate effect in App root.

**Dependencies**

- Tasks 7.1–7.3, 6.3 (M3 auth API required)

**Risks / failure modes**

- Skipping refresh when access still valid — spec requires always refresh on cold start if refresh token exists.

---

#### Task 7.5: Mobile Jest tests for HTTP interceptor

**Purpose**

- Lock refresh behavior in CI before catalog work.

**Scope**

- **In:** Tests: N parallel 40100 → 1 refresh; refresh 40102 → no second refresh; guest cart helper blocked.
- **Out:** Detox.

**Suggested implementation notes**

- Mock axios adapter or msw.
- `pnpm --filter mobile test`.

**Acceptance criteria**

- Interceptor tests pass locally and will run in CI (Task 10.4 extends Task 3.9).

**Suggested commit granularity**

1. **test(mobile): add axios interceptor single-flight tests** — jest spec with mocks.

**Dependencies**

- Task 7.3

**Risks / failure modes**

- Tests hitting real API — must be fully mocked.

---

#### Task 7.6: Catalog / cart / address / order API client modules

**Purpose**

- Typed API layer for browse and commerce screens before UI implementation.

**Scope**

- **In:** `catalog.ts`, `cart.ts`, `address.ts`, `order.ts` using shared types and the shared axios instance from Task 7.2.
- **Out:** Screen UI.

**Suggested implementation notes**

- Place this at the start of M8 work if M5 was not ready during M7; milestone label stays 7.6 for traceability.
- Auth/user clients already landed in Task 7.2 — do not re-add them here.

**Acceptance criteria**

- Each module exports functions matching build-spec §7 routes (including order list pagination params).
- Typecheck passes against shared DTOs.

**Suggested commit granularity**

1. **feat(mobile): add catalog cart address order API modules** — one commit per domain or single commit if small.

**Dependencies**

- Task 7.2, 7.3, M4–M5 API

**Risks / failure modes**

- Duplicating DTO types instead of importing from shared.

---

### Milestone M8: Catalog screens

**Goal**

- Home waterfall, search with history rules, product detail with guest/member gates.

#### Task 8.1: Home screen — search bar, SortBar, waterfall list

**Purpose**

- Primary browse experience with pagination and sort.

**Scope**

- **In:** Home: search entry navigates to Search; `SortBar` drives `catalogFilters.sort`; two-column waterfall (`FlashList` or `FlatList` + column wrapper); pull-to-refresh; `ListSkeleton` on first load; `EmptyState` + retry snackbar on error.
- **Out:** Exposure analytics (Task 10.2), parabola animation.

**Suggested implementation notes**

- `catalogFilters` zustand store.
- `GET /home` with pagination `onEndReached`.
- `expo-image` for thumbnails.

**Acceptance criteria**

- Seed products render in two columns.
- Changing sort refetches list.
- Pull-to-refresh works.
- First load shows skeleton, not full-screen spinner.
- Empty API returns empty state.

**Suggested commit granularity**

1. **feat(mobile): add home screen with sort and waterfall list** — Home screen + catalog store hookup.

**Dependencies**

- Tasks 6.2, 6.3, 7.6, M4 API

**Risks / failure modes**

- Loading description on list cards — list must not fetch detail endpoint per row.

---

#### Task 8.2: Search screen and login-only history

**Purpose**

- Keyword search with AsyncStorage history rules.

**Scope**

- **In:** Search input, results from `GET /products`, show fallback UI when `isFallback`; history max 10 in AsyncStorage **only when logged in**; guests see search without history panel.
- **Out:** `search` analytics event (M10).

**Suggested implementation notes**

- Clear history on logout (wire in `logoutLocal`).
- Escape not needed client-side for SQL — server handles.

**Acceptance criteria**

- Logged-in search saves term to history; tap history refills query.
- Guest search works but does not persist history.
- No results shows fallback list with appropriate copy.
- Logout clears history.

**Suggested commit granularity**

1. **feat(mobile): add search screen with login-only history** — Search screen + AsyncStorage helper.

**Dependencies**

- Task 8.1, 7.4

**Risks / failure modes**

- Writing history for guests — explicitly guard with `user` present.

---

#### Task 8.3: Product detail screen

**Purpose**

- Gallery, price, sales, stock, description; guest browse; member actions gated.

**Scope**

- **In:** Detail from `GET /products/:id`; image gallery; add-to-cart and buy-now buttons; guest tap → set `pendingAction` → `LoginGate` / Login → after success `goBack()` + **automatic retry** of the pending action (build-spec §8).
- **Out:** Parabola animation, `view_product` event.

**Suggested implementation notes**

- Description as `Text`, not WebView.
- Disable add when stock 0 with clear copy.
- Prefer zustand `pendingAction` from Task 6.2 (not ad-hoc booleans). Clear after success or cancel. Same pattern for buy-now → Checkout after login.

**Acceptance criteria**

- Detail loads from API for valid product.
- Guest tapping add-to-cart: login → return to detail → cart add completes **without a second tap**.
- Guest tapping buy-now: login → return → continues to checkout path without requiring a second buy-now tap.
- Off-shelf product shows 404 handling.
- Stock 0 shows cannot buy state.

**Suggested commit granularity**

1. **feat(mobile): add product detail screen with login gate actions** — ProductDetail screen.

**Dependencies**

- Tasks 8.1, 7.4, 7.6, 6.2

**Risks / failure modes**

- Firing add-to-cart analytics before HTTP success — wait for M10 rules.
- Only `goBack()` without retry → fails guest-flow acceptance.

---

#### Task 8.4: Product list exposure helper (viewport)

**Purpose**

- Fire `exposure` once per product id per screen session (analytics wiring in M10).

**Scope**

- **In:** Throttled (~200ms) visibility helper on `ProductCard`; callback hook for analytics.
- **Out:** PostHog capture implementation.

**Suggested implementation notes**

- Use `onViewableItemsChanged` or similar; dedupe by product id set per screen focus.

**Acceptance criteria**

- Scrolling same card into view twice in one session fires once.
- Navigating away and back resets session dedupe.
- No measurable scroll jank on 20-item list.

**Suggested commit granularity**

1. **feat(mobile): add product card exposure tracking helper** — hook + integration on Home/Search lists.

**Dependencies**

- Task 8.1

**Risks / failure modes**

- Firing exposure for off-screen items — tune `viewabilityConfig`.

---

### Milestone M9: Commerce screens

**Goal**

- Cart, addresses, checkout, orders, mock pay; complete business loop on device.

#### Task 9.1: Cart screen

**Purpose**

- Full cart CRUD UI with invalid lines and checkout entry.

**Scope**

- **In:** Cart tab (logged-in): list lines, select/select-all, `QtyStepper`, live `selectedAmount`, delete swipe or button; invalid rows greyed, not checkoutable; empty state + CTA Home; refresh on tab focus updates `cartBadge`.
- **Out:** Checkout screen.

**Suggested implementation notes**

- Toast on add success from detail (detail task may trigger).
- Login required — tab already gated for guest.

**Acceptance criteria**

- Add from detail appears in cart.
- Cannot select invalid lines for checkout.
- Quantity patch respects stock; shows server error on `40901`.
- `cartBadge` matches server item count after focus.

**Suggested commit granularity**

1. **feat(mobile): add cart screen with selection and qty controls** — Cart screen + cart store/badge updates.

**Dependencies**

- Tasks 7.6, 6.2, M5 cart API

**Risks / failure modes**

- Local cart state as source of truth — always reconcile from `GET /cart` on focus.

---

#### Task 9.2: Address list and edit screens

**Purpose**

- Address CRUD with static CN region picker.

**Scope**

- **In:** `AddressList`, `AddressEdit` with province/city/district picker from static JSON; set default; delete with promote; navigate from checkout.
- **Out:** Order create.

**Suggested implementation notes**

- Bundle a **trimmed** CN `regions.json` (province → city → district) under `apps/mobile/assets/` (or `src/data/`).
- Preferred sources (pick one, document in a one-line comment): a maintained npm region package with tree-shakeable JSON, or a public MCA-derived dataset trimmed to name strings only (no codes required by API).
- **Size budget:** prefer ≤ ~500KB uncompressed JSON; if larger, lazy-`require` once on first AddressEdit open (do not parse on cold start).
- API stores plain strings only — picker values become `province` / `city` / `district` strings in the POST/PUT body.

**Acceptance criteria**

- Create/edit/delete address syncs with API.
- Only one default shown correctly after changes.
- Checkout with no addresses shows empty state + CTA to AddressEdit.
- Region picker loads without blocking app boot; documented source + approximate file size in comment or README stub.

**Suggested commit granularity**

1. **feat(mobile): add address list and edit with region picker** — screens + picker component + regions asset.

**Dependencies**

- Task 7.6, M5 addresses API, 6.3 navigation

**Risks / failure modes**

- Huge region JSON blocking Metro/bundle — enforce size budget; avoid shipping unused metadata fields.

---

#### Task 9.3: Checkout screen and order create

**Purpose**

- Submit order from cart selection or buy-now path.

**Scope**

- **In:** Checkout: address selection, summary, submit `POST /orders` with `fromCart` or `items`; button disabled + spinner during submit; `40901` dialog stay on page.
- **Out:** Pay action.

**Suggested implementation notes**

- Buy-now navigates to Checkout with param payload.
- Server totals only displayed from response.

**Acceptance criteria**

- Cart checkout creates order and navigates to pay/detail flow.
- Buy-now creates order without cart lines.
- Double tap submit does not create duplicate orders.
- Stock error shows dialog, user remains on checkout.

**Suggested commit granularity**

1. **feat(mobile): add checkout screen and order create flow** — Checkout screen.

**Dependencies**

- Tasks 9.1, 9.2, M5 orders API

**Risks / failure modes**

- Sending client price in body — body must only have ids/qty/address/fromCart per spec.

---

#### Task 9.4: Order list, detail, mock pay, cancel

**Purpose**

- Post-checkout order management UI.

**Scope**

- **In:** `OrderList` with status tabs + paginated `GET /orders` (`page` / `pageSize`, `onEndReached` or equivalent); `OrderDetail` with lines, receiver snapshot, pay button (pending), cancel (pending); mock pay success navigates/updates; completed/cancelled states read-only.
- **Out:** Job-driven complete UI refresh (poll or pull-to-refresh).

**Suggested implementation notes**

- Pull-to-refresh on list resets to page 1.
- Pay calls `POST /orders/:id/pay`; handle `40902`.
- Per-tab skeleton / empty copy per build-spec §8.

**Acceptance criteria**

- After pay, order shows paid status.
- Cancel unpaid restocks (verify via detail stock message optional).
- Cannot pay cancelled order.
- IDOR orders not shown (only current user's).
- List loads more pages when the user has enough orders; empty tab shows empty state, not a spinner forever.

**Suggested commit granularity**

1. **feat(mobile): add order list and detail with pay and cancel** — OrderList + OrderDetail screens.

**Dependencies**

- Task 9.3

**Risks / failure modes**

- Expecting instant completed status — document 10-minute job; pull-to-refresh after demo wait or use short env in dev.
- Fetching only the first page forever — must wire pagination params from Task 5.4 / 7.6.

---

#### Task 9.5: Settings, Me tab, and logout flow

**Purpose**

- Profile display, logout, settings placeholder for analytics opt-out (wired in M10).

**Scope**

- **In:** Me tab: user info from `GET /users/me`; Settings: logout (best-effort API + mandatory `logoutLocal`), stub for telemetry toggle.
- **Out:** PostHog opt-out UI logic in M10.

**Suggested implementation notes**

- Logout: refresh if access expired, then `POST /auth/logout`, always clear local.
- Entry to OrderList, AddressList from Me.

**Acceptance criteria**

- Logout clears tokens and returns guest state on Cart/Me.
- Server refresh tokens revoked after logout (verify via refresh fail).
- Me shows masked phone.

**Suggested commit granularity**

1. **feat(mobile): add me and settings screens with logout** — Me, Settings, navigation links.

**Dependencies**

- Tasks 7.4, 6.3 (auth + nav). Order list entry can deep-link later; do **not** block logout on Task 9.4.

**Risks / failure modes**

- Logout only local — must call API when possible.

---

#### Task 9.6: Add-to-cart animation and cart badge pulse

**Purpose**

- PRD interaction polish on successful add.

**Scope**

- **In:** `react-native-reanimated` parabola from detail add button to tab badge; pulse badge on success; trigger **only on HTTP success**.
- **Out:** None.

**Suggested implementation notes**

- Measure tab bar cart icon position for animation target.

**Acceptance criteria**

- Successful add plays animation; failed add does not.
- Animation does not block next interaction.

**Suggested commit granularity**

1. **feat(mobile): add add-to-cart parabola and badge pulse animation** — animation helper wired on detail.

**Dependencies**

- Tasks 8.3, 9.1

**Risks / failure modes**

- Animation on tap before response — gate on API success per spec.

---

### Milestone M10: Analytics, CI & docs

**Goal**

- Sentry + PostHog, CI pipeline, EAS profiles, README manual checklist.

#### Task 10.1: Analytics init module (Sentry + PostHog)

**Purpose**

- Single init for observability with dev gating.

**Scope**

- **In:** `apps/mobile/src/analytics/` init; Sentry RN `enabled: !__DEV__` unless configured; PostHog host US; shared `environment` + `release`; disable PostHog auto `$screen`; `EXPO_PUBLIC_TELEMETRY_IN_DEV=1` override.
- **Out:** Event map (next task).

**Suggested implementation notes**

- Replay: mask all inputs/images; password always masked.
- API keys from env only.

**Acceptance criteria**

- App boots with missing keys (no-op).
- With keys + telemetry dev flag, SDKs initialize without crash.
- `__DEV__` default: no events sent.

**Suggested commit granularity**

1. **feat(mobile): add sentry and posthog analytics init module** — analytics index, App.tsx init call.

**Dependencies**

- M6 App shell; native modules require Dev Client rebuild documented in README.

**Risks / failure modes**

- Expo Go missing native Sentry — Dev Client only.

---

#### Task 10.2: Analytics events, identify, and navigation page_view

**Purpose**

- Implement fixed event map and user identity sync.

**Scope**

- **In:** `capture(event, props)` respects opt-out; `identifyUser` / `clearUser` on login/logout; navigation `page_view`; events: `app_launch`, `page_view`, `click` (CTA whitelist only), `exposure`, `search`, `view_product`, `add_to_cart`, `create_order`, `pay_success`, `login_success` (`password`|`silent`), `logout`; wire exposure from Task 8.4; no PII in props.
- **Out:** Settings opt-out UI.

**Suggested implementation notes**

- `login_success` on password login and cold-start refresh.
- `click` only: search submit, add-to-cart, buy-now, checkout, pay, login, register, logout.
- `add_to_cart` / `pay_success` on HTTP success.

**Acceptance criteria**

- Login triggers identify in both SDKs.
- Logout calls `Sentry.setUser(null)` and `PostHog.reset()`.
- Navigation changes emit `page_view` once (no double with PostHog autocapture).
- Props never include phone, address, tokens.

**Suggested commit granularity**

1. **feat(mobile): wire analytics events and navigation page_view** — event helpers + screen hooks.
2. **feat(mobile): connect product exposure and commerce events** — wire detail/cart/checkout/order call sites.

**Dependencies**

- Tasks 10.1, 8.4, 9.x screens

**Risks / failure modes**

- Double counting page views — confirm PostHog autocapture disabled.

---

#### Task 10.3: Settings telemetry opt-out

**Purpose**

- User control over PostHog capture and replay per PRD.

**Scope**

- **In:** AsyncStorage `telemetry_opt_out` flag; Settings toggle; `capture` no-op when opted out; disable replay when off.
- **Out:** Server-side opt-out (client only per spec).

**Suggested implementation notes**

- Default opt-in for demo.

**Acceptance criteria**

- Toggle off → no PostHog events during session.
- Toggle persists across restart.
- Sentry crash reporting policy documented (may remain on for crashes — align with PRD: opt-out stops `capture`; clarify Sentry unchanged or document choice in README).

**Suggested commit granularity**

1. **feat(mobile): add analytics opt-out setting** — settings toggle + capture guard.

**Dependencies**

- Tasks 10.1, 9.5

**Risks / failure modes**

- Confusing opt-out scope — README must state what stops (PostHog business events/replay).

---

#### Task 10.4: Extend CI with mobile Jest (+ commerce e2e if missing)

**Purpose**

- Complete the PR gate: keep Task 3.9 jobs and add mobile Jest (and ensure commerce API e2e runs if not already).

**Scope**

- **In:** Update `.github/workflows/ci.yml` from Task 3.9: add `pnpm --filter mobile test`; confirm API unit+e2e still cover auth + commerce; shared-first typecheck unchanged.
- **Out:** EAS cloud build in CI (optional manual).

**Suggested implementation notes**

- Cache pnpm store (reuse 3.9 setup).
- Do not replace 3.9 — extend it.

**Acceptance criteria**

- CI passes on clean main with all implemented tests (API e2e + mobile interceptor Jest).
- Intentional lint failure fails CI.

**Suggested commit granularity**

1. **ci: add mobile jest to github actions** — workflow update + any test script fixes.

**Dependencies**

- Task 3.9; M5 commerce e2e (5.6); M7 interceptor Jest (7.5)

**Risks / failure modes**

- Flaky MySQL service startup — keep health wait from 3.9.

---

#### Task 10.5: EAS Build profiles and API Docker image polish

**Purpose**

- Reproducible Dev Client and preview binaries; production-ready API image.

**Scope**

- **In:** `eas.json` profiles `development`, `preview`, `production`; cleartext ATS/Android flags in dev profile; API Dockerfile multi-stage final; compose uses image build.
- **Out:** Public cloud deploy (optional).

**Suggested implementation notes**

- Document one-time `eas build --profile development` per machine.

**Acceptance criteria**

- `eas build --profile preview` config validates (build may be manual).
- `docker compose build api` succeeds.
- Compose full stack up + health 200 after M3.

**Suggested commit granularity**

1. **chore: add eas build profiles for dev and preview** — eas.json + app config cleartext.
2. **chore: finalize api docker image for compose** — Dockerfile + compose build context.

**Dependencies**

- M1 compose, M3 health

**Risks / failure modes**

- ATS blocking device → cleartext exceptions documented.

---

#### Task 10.6: README, Swagger polish, manual acceptance checklist

**Purpose**

- Onboard reviewers and align with PRD appendix B.

**Scope**

- **In:** Update README: one-command run, env table, Dev Client steps, dual-token demo notes, 1-min cancel / 3-min ship / 5-min complete, telemetry dev flag, link to build-spec and product-brief; ensure Swagger covers all routes; manual checklist from PRD appendix B in README.
- **Out:** New features.

**Suggested implementation notes**

- Replace “工程脚手架尚未落地” status when complete.
- Document `ORDER_PAY_TIMEOUT_SEC` override for live demos.

**Acceptance criteria**

- New engineer can follow README to run stack.
- Manual checklist items map 1:1 to PRD appendix B.
- Swagger documents all MVP endpoints.

**Suggested commit granularity**

1. **docs: update readme with runbook and acceptance checklist** — README.md.
2. **docs(api): complete swagger coverage for mvp routes** — swagger decorators if gaps remain.

**Dependencies**

- All prior milestones functionally complete

**Risks / failure modes**

- README drift from compose — verify commands after writing.

---

## 4. Cross-Cutting Checks

Apply on every task before marking done:

- **Type safety:** `pnpm typecheck` clean (shared builds first); shared types used for API contracts; no `any` on public DTO boundaries.
- **Lint:** `pnpm lint` clean on touched packages.
- **API envelope:** New endpoints return `{ code, message, data }`; HTTP status matches build-spec §7 table.
- **Auth:** Protected routes use guard; `@Public()` explicit; guest/member rules from §9 respected; guest gated actions use `pendingAction` retry after login (no second tap).
- **IDOR:** Mutations and reads scoped with `user_id`; tests use two users where applicable.
- **Validation:** class-validator DTOs with whitelist; phone/qty/keyword limits enforced server-side.
- **Loading / empty / error:** Match table in build-spec §8 — skeletons not full-screen spinners on lists; Chinese copy for auth errors.
- **Secrets:** No tokens/passwords in logs, Sentry, PostHog props, or git.
- **Env:** New vars added to `.env.example` with comments; defaults documented.
- **Migrations:** Schema changes only via new migration files — never hand-edit DB in CI/prod.
- **Tests:** Add or extend unit/e2e for non-trivial logic (auth refresh, stock conditional, interceptor, `tick`).
- **Accessibility:** Icon buttons have `accessibilityLabel`; touch targets ≥ 44pt on new controls.
- **Analytics:** No PII in event props; CTA-only `click`; success events after HTTP OK.
- **Single API replica:** Do not add second API service in compose without job locking.
- **Dependency discipline:** Prefer existing libraries per build-spec §2 selection principles; justify new deps in PR.
- **Reserved codes:** Do not invent MVP handlers for `40301` (enum only).

---

## 5. Definition of Done for MVP

### Feature completeness

- Full loop works on simulator: browse home → search → detail → login → add cart → checkout → mock pay → order list/detail.
- Dual-token: register/login, silent cold start, concurrent 401 single-flight refresh, logout revokes all refresh tokens.
- Guest cannot cart/checkout; guest add-to-cart / buy-now → login → **automatic retry** (no second tap); search history login-only; invalid cart lines visible but not checkoutable.
- Order list paginates (`page` / `pageSize`) on API and mobile.
- Jobs: unpaid order cancels after 60s (env-configurable); paid order moves to awaiting receipt after ~3 minutes and completes after another ~5 minutes via `tick` / cron.
- Settings analytics opt-out stops PostHog capture/replay.

### Quality baseline

- `pnpm lint` and `pnpm typecheck` pass (shared built first).
- API unit + e2e tests pass via Task 3.0 harness (auth, refresh grace, banned user, oversell, IDOR, order `tick`).
- Mobile Jest interceptor tests pass.
- No Detox/Maestro required; README manual checklist completed once.

### Validation baseline

- Swagger `/api/docs` exercises all MVP routes.
- PostHog funnel events `view_product → add_to_cart → create_order → pay_success` visible with telemetry dev flag.
- Sentry captures a test crash in non-dev build (manual).
- Health endpoint returns 200 with DB up in compose.

### Deployment readiness baseline

- `docker compose up` brings MySQL + API (migrate + seed) without manual SQL.
- `.env.example` complete; secrets not committed.
- GitHub Actions CI green on PR (Task 3.9 from M3; Task 10.4 adds mobile Jest).
- EAS `development` and `preview` profiles committed; Dev Client build documented.
- README links to `build-spec.md`, `product-brief.md`, and this backlog.

---

## 6. Recommended Working Pattern for AI Coding

1. **One backlog task per session.** Paste a single `#### Task X.Y` block (including acceptance criteria) into Cursor. Do not combine unrelated tasks; Task 7.2 already includes auth+user clients (former 7.6a was merged — do not recreate it).
2. **Read build-spec sections referenced in the task** before generating code. If the task and spec conflict, spec wins (§5 plain-text description beats §3 “rich text”).
3. **Implement → verify acceptance criteria → commit** before starting the next task. Run the narrowest command that proves the task (e.g. one test file, `curl` one endpoint, one screen in simulator).
4. **Use suggested commit granularity** as-is when possible: 1–3 small commits per task with focused messages (`feat(api): …`, `test(api): …`, `feat(mobile): …`).
5. **Do not skip P0 gate tests** (see §1 critical path): auth refresh e2e, order `tick`, interceptor Jest. Task 3.0 harness must exist before 3.8 / 5.6. Task 3.9 CI should stay green after M3.
6. **Review generated code for IDOR, envelope shape, and token handling** before moving on — these are the highest-cost regressions.
7. **If a task fails acceptance, fix forward on the same task** — do not advance to dependent tasks with a broken foundation.
8. **Rollback strategy:** Each task should be one or few commits; `git revert` a single commit should not break unrelated milestones.
9. **After M3 and M7, re-run full API e2e and mobile interceptor tests** even when working on UI-only tasks.
10. **Mark progress** by checking off tasks in this file or an issue tracker — one row per `Task X.Y` (including `3.0`, `3.9`, `5.7`, `7.6`), not per milestone only.
11. **Parallel track rule:** Track B may finish M6 while Track A does M2–M3; **never start M7 before M3**.

---

_Generated from [`build-spec.md`](./build-spec.md). Updated after architecture review (M1 health alignment, harness, parallel tracks, client split, early CI, LoginGate retry, order pagination, regions budget, 7.2/7.6a merge). Update this backlog if the spec changes._
