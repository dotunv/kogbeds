# Grizzly (NestJS Bear-style blogging platform)

Grizzly is a minimalist, multi-tenant blogging platform inspired by Bear Blog.

## Features

- NestJS modular architecture, global validation (class-validator), Zod-backed env validation
- Prisma + PostgreSQL (users, blogs, posts with Markdown and/or block JSON, revisions, tags)
- JWT authentication (`/auth/register`, `/auth/login`, `/auth/me`)
- Automatic blog creation for each user; blog settings and optional custom domain verification
- Posts: owner CRUD, preview, publish/unpublish, content rendering pipeline
- Public HTML + RSS per blog (subdomain `username.APP_DOMAIN` or verified custom domain); discover feed on root host
- Comments with moderation; page-view analytics rollups; image uploads (local storage)
- Newsletter: subscribe, confirm, unsubscribe; BullMQ + Redis for async email; post-published notifications
- Helmet, rate limiting (Throttler), global exception filter
- OpenAPI UI at **`/api-docs`** (Swagger)
- Health: **`GET /health`** (liveness), **`GET /health/ready`** (PostgreSQL readiness)

## Architecture

```text
src/
├── common/
│   ├── decorators/
│   ├── filters/
│   └── guards/
├── config/
├── modules/
│   ├── analytics/
│   ├── auth/
│   ├── blogs/
│   ├── comments/
│   ├── content/
│   ├── discover/
│   ├── mail/
│   ├── newsletter/
│   ├── posts/
│   ├── public/
│   ├── uploads/
│   └── users/
└── prisma/
```

## Data model (summary)

See [`prisma/schema.prisma`](prisma/schema.prisma) for the full schema.

- **User** — email, username, password hash
- **Blog** — one per user; title, description, optional custom CSS; optional custom domain + verification
- **Post** — markdown and/or blocks, rendered HTML, excerpt, publish state, featured image URL
- **Tag** / **PostTag** — many-to-many tagging
- **PostRevision** — history snapshots
- **Asset** — uploaded files per blog
- **Comment** — public comments with moderation status
- **NewsletterSubscriber** — per-blog list with confirm/unsubscribe tokens
- **PageViewRollup** — daily view counts per blog/post

## Environment variables

Copy [`.env.example`](.env.example) to `.env`. Commonly set:

| Variable | Purpose |
|----------|---------|
| `APP_DOMAIN` | Host used for subdomain routing (e.g. `localhost` or `example.com`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Signing secret (min 16 characters in non-test env) |
| `JWT_EXPIRES_IN` | JWT lifetime (default `1d`) |
| `REDIS_URL` or `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | BullMQ email queue |
| `UPLOAD_DIR` | Local directory for public uploads (default `./uploads/public` under cwd) |
| `CORS_ORIGIN` | Comma-separated allowed origins for browser clients |
| `APP_PUBLIC_BASE_URL` | Optional canonical base for newsletter links |
| `SMTP_*` | Optional SMTP for outbound mail |

## API overview

Interactive documentation: **`GET /api-docs`** when the server is running.

### Health

- `GET /health` — liveness (no dependency checks)
- `GET /health/ready` — readiness (checks database connectivity)

### Auth

- `POST /auth/register`, `POST /auth/login`
- `GET /auth/me` (JWT)

### Users / blogs

- `GET /users/me` (JWT)
- `GET/PATCH /blogs/me`, `POST /blogs/me/verify-custom-domain` (JWT)

### Posts (JWT)

- CRUD, list with status filter, preview, revisions, publish/unpublish

### Authenticated utilities

- `GET /analytics/rollup?blogId=…` (JWT)
- `GET /comments/pending`, `PATCH /comments/:id/moderation` (JWT)
- `POST /uploads` — multipart field `file` (JWT)

### Public routes (host-based)

Middleware in [`src/main.ts`](src/main.ts) maps hostnames to `/discover` (root) or `/public` (per-blog). Typical public paths include blog home, post by slug, feeds, sitemap, newsletter subscribe/confirm, comments, and analytics beacons as implemented in [`PublicController`](src/modules/public/public.controller.ts).

## Local setup

1. Install [Bun](https://bun.sh) (used by the included [`Dockerfile`](Dockerfile) and CI).

2. Install dependencies:

   ```bash
   bun install
   ```

3. Create env file:

   ```bash
   cp .env.example .env
   ```

4. Set `APP_DOMAIN`, `DATABASE_URL`, and `JWT_SECRET` in `.env`.

5. Start **PostgreSQL** and **Redis** (Redis is required for the BullMQ email queue).

6. Apply migrations:

   ```bash
   bun run prisma:migrate:deploy
   ```

7. Start the app:

   ```bash
   bun run start:dev
   ```

Open `http://localhost:3000/api-docs` for the API explorer (default port `3000`).

## Docker

Build and run (image runs migrations then starts the app):

```bash
docker build -t grizzly .
docker run --env-file .env -p 3000:3000 grizzly
```

Ensure `DATABASE_URL` points at a reachable PostgreSQL instance and Redis is available if you use the newsletter queue.

## Scripts

```bash
bun run build
bun run lint          # ESLint with --fix
bun run lint:ci       # ESLint for CI (no --fix)
bun run test
bun run test:e2e      # requires PostgreSQL + Redis (see test env in app.e2e-spec.ts)
bun run prisma:generate
bun run prisma:migrate:dev
bun run prisma:migrate:deploy
```

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs lint, build, unit tests, and e2e tests against PostgreSQL and Redis service containers.

## Roadmap (ideas)

- Password reset and optional email verification for accounts
- Object storage (e.g. S3-compatible) for uploads in production
- Stricter rate limits on auth endpoints; optional Redis-backed readiness
- Full-text search over `searchableText` / public discover
- OpenTelemetry metrics and structured JSON logging
