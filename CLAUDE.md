# Grizzly — Claude Code Build Brief

> Hand this file to Claude Code as CLAUDE.md or paste it at the start of every session.
> Every decision here is final. Do not ask clarifying questions — implement exactly as specified.
> If something is not mentioned, do not build it.

---

## 1. What We Are Building

Grizzly is a **privacy-first, multi-tenant publishing platform** with a headless API.

- One user → many Publications (first one auto-created on registration)
- Each Publication can be a blog, a newsletter, or both — controlled by `type`
- Username-based subdomains per publication: `pubslug.grizzly.app`
- Custom domain support per publication via DNS TXT challenge
- Users also own Ebooks at the account level (not tied to a publication)
- Clean reading experience as the primary competitive advantage
- Newsletter, comments, analytics — all privacy-respecting

**North star:** A writer publishes a post in under 60 seconds from registration. A reader can read it without ads, trackers, or friction.

---

## 2. Tech Stack (Locked — No Substitutions)

| Concern | Choice | Version |
|---|---|---|
| Runtime | Node.js | 20 LTS |
| Framework | NestJS | 11 |
| Language | TypeScript | 5.x strict mode |
| Database | PostgreSQL | 16 |
| ORM | Prisma | 7 |
| Queue | BullMQ | latest |
| Cache/Queue backend | Redis (or Valkey) | 7 |
| Auth | JWT + Passport | @nestjs/passport |
| Password hashing | bcrypt | cost factor 12 |
| Email | Nodemailer | SMTP, graceful no-op |
| Markdown | markdown-it | 14 |
| Env validation | Zod | latest |
| DTO validation | class-validator + class-transformer | latest |
| Security | Helmet | latest |
| File uploads | Multer | memory storage only |
| API docs | Swagger (@nestjs/swagger) | at /api-docs |
| Testing | Jest + Supertest | unit + e2e |

**TypeScript config:** `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.

---

## 3. Project Structure

```
src/
  app.module.ts
  main.ts
  prisma/
    prisma.module.ts
    prisma.service.ts
  common/
    decorators/
      publication.decorator.ts   # @CurrentPublication()
      user.decorator.ts          # @CurrentUser()
    filters/
      http-exception.filter.ts
    guards/
      jwt-auth.guard.ts
      publication-owner.guard.ts
    interceptors/
      response.interceptor.ts    # wraps all responses in { data, meta }
    middleware/
      tenant.middleware.ts
    pipes/
      zod-validation.pipe.ts
    types/
      tenant.types.ts
  modules/
    auth/
    publications/
    posts/
    comments/
    subscribers/
    uploads/
    analytics/
    discover/
    ebooks/
    queue/
    mail/
prisma/
  schema.prisma
  migrations/
test/
  app.e2e-spec.ts
```

---

## 4. Complete Prisma Schema

This is the **source of truth**. Generate migrations from this. Do not deviate.

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ────────────────────────────────────────────────────────────────────

enum PublicationType {
  BLOG        // public website only, no newsletter sends
  NEWSLETTER  // email-only, no public blog pages
  BOTH        // public website + newsletter sends
}

enum PostStatus {
  DRAFT
  SCHEDULED
  PUBLISHED
}

enum PostFormat {
  MARKDOWN
  BLOCKS
}

enum CommentStatus {
  PENDING
  APPROVED
  SPAM
  REJECTED
}

enum EbookStatus {
  DRAFT
  PUBLISHED
}

enum BlockType {
  PARAGRAPH
  HEADING_1
  HEADING_2
  HEADING_3
  BLOCKQUOTE
  CODE
  ORDERED_LIST
  UNORDERED_LIST
  IMAGE
  YOUTUBE_EMBED
  DIVIDER
}

// ─── User ─────────────────────────────────────────────────────────────────────

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  username     String   @unique  // immutable after registration
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  publications Publication[]   // 1:N — replaces old Blog? 1:1
  ebooks       Ebook[]         // owned at user level, not per-publication

  @@map("users")
}

// ─── Publication ──────────────────────────────────────────────────────────────

model Publication {
  id               String          @id @default(cuid())
  userId           String
  user             User            @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Identity
  slug             String          @unique   // used for subdomain — e.g. "alice-dev"
  title            String          @default("")
  description      String          @default("")

  // Type — controls which features are active
  type             PublicationType @default(BOTH)

  // Appearance
  accentColor      String          @default("#2D6BE4")
  coverImageUrl    String?
  faviconUrl       String?
  footerText       String          @default("")

  // Domain
  customDomain     String?         @unique
  domainVerified   Boolean         @default(false)
  domainTxtRecord  String?

  // Settings
  isPublic         Boolean         @default(true)

  // Monetization (schema ready, Stripe wired in v2)
  monthlyPriceUsd  Decimal?        @db.Decimal(10, 2)
  yearlyPriceUsd   Decimal?        @db.Decimal(10, 2)

  // Soft delete
  deletedAt        DateTime?

  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  posts            Post[]
  subscribers      Subscriber[]
  uploads          Upload[]
  analytics        AnalyticsDailyRollup[]

  @@map("publications")
}

// ─── Post ─────────────────────────────────────────────────────────────────────

model Post {
  id                   String         @id @default(cuid())
  publicationId        String
  publication          Publication    @relation(fields: [publicationId], references: [id], onDelete: Cascade)

  // Content
  title                String
  slug                 String
  excerpt              String         @default("")
  format               PostFormat
  markdownContent      String?
  blocks               Json?

  // SEO
  metaTitle            String         @default("")
  metaDescription      String         @default("")
  ogImageUrl           String?
  canonicalUrl         String?

  // State
  status               PostStatus     @default(DRAFT)
  publishedAt          DateTime?
  scheduledAt          DateTime?

  // Paywall (schema ready, enforcement in v2)
  isPaywalled          Boolean        @default(false)
  paywallPreviewBlocks Int            @default(3)

  // Soft delete
  deletedAt            DateTime?

  createdAt            DateTime       @default(now())
  updatedAt            DateTime       @updatedAt

  tags                 PostTag[]
  comments             Comment[]
  revisions            PostRevision[]

  @@unique([publicationId, slug])
  @@map("posts")
}

// ─── Post Revision ────────────────────────────────────────────────────────────

model PostRevision {
  id               String     @id @default(cuid())
  postId           String
  post             Post       @relation(fields: [postId], references: [id], onDelete: Cascade)

  title            String
  markdownContent  String?
  blocks           Json?
  format           PostFormat
  savedAt          DateTime   @default(now())
  revisionNumber   Int

  @@unique([postId, revisionNumber])
  @@map("post_revisions")
}

// ─── Tag ──────────────────────────────────────────────────────────────────────

model Tag {
  id            String    @id @default(cuid())
  publicationId String
  name          String

  posts         PostTag[]

  @@unique([publicationId, name])
  @@map("tags")
}

model PostTag {
  postId String
  tagId  String
  post   Post   @relation(fields: [postId], references: [id], onDelete: Cascade)
  tag    Tag    @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([postId, tagId])
  @@map("post_tags")
}

// ─── Comment ──────────────────────────────────────────────────────────────────

model Comment {
  id          String        @id @default(cuid())
  postId      String
  post        Post          @relation(fields: [postId], references: [id], onDelete: Cascade)

  authorName  String?
  authorEmail String?
  body        String
  status      CommentStatus @default(PENDING)

  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@map("comments")
}

// ─── Subscriber ───────────────────────────────────────────────────────────────

model Subscriber {
  id              String      @id @default(cuid())
  publicationId   String
  publication     Publication @relation(fields: [publicationId], references: [id], onDelete: Cascade)

  email           String
  confirmed       Boolean     @default(false)
  confirmToken    String      @unique @default(cuid())
  unsubToken      String      @unique @default(cuid())
  confirmedAt     DateTime?

  // Monetization ready
  tier            String      @default("FREE")
  stripeCustomerId String?

  createdAt       DateTime    @default(now())

  @@unique([publicationId, email])
  @@map("subscribers")
}

// ─── Analytics ────────────────────────────────────────────────────────────────

model AnalyticsDailyRollup {
  id            String      @id @default(cuid())
  publicationId String
  publication   Publication @relation(fields: [publicationId], references: [id], onDelete: Cascade)
  postId        String?
  date          DateTime    @db.Date
  views         Int         @default(0)

  @@unique([publicationId, postId, date])
  @@map("analytics_daily_rollup")
}

// ─── Upload ───────────────────────────────────────────────────────────────────

model Upload {
  id            String      @id @default(cuid())
  publicationId String
  publication   Publication @relation(fields: [publicationId], references: [id], onDelete: Cascade)
  filename      String
  originalName  String
  mimeType      String
  sizeBytes     Int
  url           String
  createdAt     DateTime    @default(now())

  @@map("uploads")
}

// ─── Ebook ────────────────────────────────────────────────────────────────────

model Ebook {
  id                   String      @id @default(cuid())
  userId               String
  user                 User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  title                String
  description          String      @default("")
  coverImageUrl        String?

  // Monetization (schema ready, Stripe wired in v2)
  priceUsd             Decimal?    @db.Decimal(10, 2)  // null = free
  isFreeForSubscribers Boolean     @default(false)     // free if confirmed subscriber on any of user's publications

  status               EbookStatus @default(DRAFT)

  // Soft delete
  deletedAt            DateTime?

  createdAt            DateTime    @default(now())
  updatedAt            DateTime    @updatedAt

  chapters             EbookChapter[]

  @@map("ebooks")
}

// ─── Ebook Chapter ────────────────────────────────────────────────────────────

model EbookChapter {
  id              String     @id @default(cuid())
  ebookId         String
  ebook           Ebook      @relation(fields: [ebookId], references: [id], onDelete: Cascade)

  title           String
  order           Int        // 1-based, unique per ebook, enforced in service
  format          PostFormat
  markdownContent String?
  blocks          Json?

  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  @@unique([ebookId, order])
  @@map("ebook_chapters")
}
```

**Critical service-layer constraints (enforced in code, not schema):**
- `Post.format = MARKDOWN` → `markdownContent` non-null, `blocks` null
- `Post.format = BLOCKS` → `blocks` non-null, `markdownContent` null; same rule applies to `EbookChapter`
- Max 500 blocks per post or chapter (count before insert/update)
- Max 30 tags per post
- Slug: `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`, max 100 chars, unique per publication
- Tags: `trim().toLowerCase()`, max 50 chars each
- Max 50 revisions per post: before inserting revision N, delete oldest if count ≥ 50
- `scheduledAt` only valid when `status = SCHEDULED`; must be a future datetime
- A user may own at most **10 Publications** (enforced in service before create)
- A user may own at most **20 Ebooks** (enforced in service before create)
- `EbookChapter.order` must be contiguous (1, 2, 3…); reorder by updating all affected chapters in a transaction
- `Publication.type = BLOG` → newsletter sends are skipped even if subscribers exist; `POST /subscribe` returns 404
- `Publication.type = NEWSLETTER` → blog public pages return 404; no RSS/sitemap served
- `Publication.type = BOTH` → all features active

---

## 5. NestJS Module Map

Build exactly these modules. No others.

```
AppModule
├── PrismaModule (global)
├── QueueModule (global, BullMQ setup)
├── MailModule (global, Nodemailer)
├── AuthModule          → /auth
├── PublicationsModule  → /publications
├── PostsModule         → /posts  (scoped to publication via tenant context)
├── CommentsModule      → /comments
├── SubscribersModule   → /subscribers
├── UploadsModule       → /uploads
├── AnalyticsModule     → /analytics
├── DiscoverModule      → /discover
└── EbooksModule        → /ebooks
```

**Global modules** (PrismaModule, QueueModule, MailModule) are registered once in AppModule with `@Global()`. All other modules import only what they need.

---

## 6. Routing & Tenant Middleware

### Tenant Middleware (`src/common/middleware/tenant.middleware.ts`)

Runs on every request before route handlers. Sets `req.tenant` (type `TenantContext`).

```typescript
interface TenantContext {
  type: 'root' | 'subdomain' | 'custom_domain';
  publication: Publication | null;  // null only on root domain
}
```

**Resolution logic (in order):**

1. If `req.hostname` matches `ROOT_DOMAIN` exactly → `type: 'root'`, `publication: null`
2. If `req.hostname` matches `*.ROOT_DOMAIN` → extract subdomain, query `Publication.slug = subdomain` where `deletedAt IS NULL`
3. Otherwise → query `Publication.customDomain = req.hostname` where `domainVerified = true` and `deletedAt IS NULL`
4. If path starts with `/auth`, `/api-docs`, `/health` → skip tenant resolution entirely

**Cache:** Look up tenant in Redis first (`tenant:{hostname}`, TTL 60s). On miss, query DB and cache. On publication update or domain change, bust `tenant:{hostname}`.

Apply middleware globally in `AppModule.configure()`.

### Decorator

```typescript
// @CurrentPublication() — injects req.tenant.publication into controller params
// @CurrentUser()        — injects req.user (set by JWT guard)
```

---

## 7. Authentication

### Endpoints

```
POST /auth/register
POST /auth/login
POST /auth/refresh
GET  /auth/me          [JWT required]
PATCH /auth/me         [JWT required]
POST /auth/me/password [JWT required]
```

### Register flow

1. Validate body (email, username, password)
2. Check email unique, username unique
3. Hash password (bcrypt, cost 12)
4. Create `User`
5. Create first `Publication` with `slug = username`, `title = username + "'s blog"`, `type = BOTH`
6. Return `{ accessToken, refreshToken, user: { id, email, username } }`

### Token strategy

- Access token: JWT, 15 minute expiry, payload `{ sub: userId, email }`
- Refresh token: JWT, 7 day expiry, stored as httpOnly cookie named `refresh_token`
- On `POST /auth/refresh`: validate cookie, issue new access token
- On `POST /auth/me/password`: require `currentPassword` + `newPassword`, re-hash

### DTO validation

```typescript
// RegisterDto
email:    IsEmail, MaxLength(255)
username: Matches(/^[a-z0-9_]{3,30}$/), must be lowercase (normalize in service)
password: MinLength(8), MaxLength(72)

// LoginDto
email:    IsEmail
password: IsString, NotEmpty
```

---

## 8. Publication Endpoints

```
GET    /publications                [JWT]  — list own publications
POST   /publications                [JWT]  — create new publication (max 10 per user)
GET    /publications/:slug          public — get publication by slug (if public OR owner)
PATCH  /publications/:slug          [JWT]  — update publication (owner only)
DELETE /publications/:slug          [JWT]  — soft delete publication (owner only)

POST   /publications/:slug/domain        [JWT]  — initiate custom domain verification
POST   /publications/:slug/domain/verify [JWT]  — check DNS TXT, set domainVerified
DELETE /publications/:slug/domain        [JWT]  — remove custom domain
```

### Create publication DTO

```typescript
// CreatePublicationDto
slug:        Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), MinLength(3), MaxLength(50)
title:       IsString, MaxLength(100), Optional  — defaults to slug if omitted
description: IsString, MaxLength(500), Optional
type:        IsEnum(PublicationType) — 'BLOG' | 'NEWSLETTER' | 'BOTH', Optional (default BOTH)
```

Slug must be globally unique (across all users' publications) — checked against `Publication.slug`. Returns `publication_slug_taken` if already claimed.

### Custom domain verification flow

1. `POST /publications/:slug/domain` body: `{ domain: string }`
   - Validate domain format
   - Check no other publication owns this domain
   - Generate `domainTxtRecord` = `grizzly-verify-{cuid()}`
   - Return `{ txtRecord, instructions }`

2. `POST /publications/:slug/domain/verify`
   - DNS lookup `_grizzly-verify.{customDomain}` for TXT records
   - If matches → set `domainVerified = true`, bust tenant cache
   - Return `{ verified: boolean }`

### PATCH /publications/:slug — updatable fields only

```typescript
// UpdatePublicationDto
title:        IsString, MaxLength(100), Optional
description:  IsString, MaxLength(500), Optional
type:         IsEnum(PublicationType), Optional
accentColor:  Matches(/^#[0-9a-fA-F]{6}$/), Optional
footerText:   IsString, MaxLength(300), Optional
isPublic:     IsBoolean, Optional
```

**Type change rules (enforced in service):**
- `BLOG → NEWSLETTER`: confirm with the user that public pages will become inaccessible. No automatic data deletion.
- `NEWSLETTER → BLOG`: newsletter sends will stop. Subscriber list preserved.
- `BOTH → BLOG` or `BOTH → NEWSLETTER`: same as above for the removed capability.

`coverImageUrl` and `faviconUrl` are set via the upload endpoint, not directly here.

---

## 9. Post Endpoints

All post endpoints require JWT. Post reads are public if publication is public **and** `publication.type` is `BLOG` or `BOTH`.

```
GET    /posts                         — list posts for current publication (tenant context)
POST   /posts                 [JWT]   — create post
GET    /posts/:slug                   — get single post (public if publication public)
PATCH  /posts/:slug           [JWT]   — update post (saves revision)
DELETE /posts/:slug           [JWT]   — soft delete post
POST   /posts/:slug/publish   [JWT]   — publish draft (triggers newsletter job)
POST   /posts/:slug/unpublish [JWT]   — revert to draft
GET    /posts/:slug/revisions [JWT]   — list revisions (last 50)
GET    /posts/:slug/revisions/:n [JWT] — get specific revision content

POST   /posts/:slug/schedule  [JWT]   — schedule post
  body: { scheduledAt: ISO datetime string (future) }
```

### Create / Update Post DTOs

```typescript
// CreatePostDto
title:          IsString, MinLength(1), MaxLength(300)
slug:           Optional — auto-generated from title if omitted (slugify)
excerpt:        IsString, MaxLength(500), Optional
format:         IsEnum(PostFormat) — 'MARKDOWN' | 'BLOCKS'
markdownContent: IsString, Optional  — required when format='MARKDOWN'
blocks:         IsArray, Optional    — required when format='BLOCKS'

// SEO (all optional on create)
metaTitle:       IsString, MaxLength(60), Optional
metaDescription: IsString, MaxLength(160), Optional
ogImageUrl:      IsUrl, Optional
canonicalUrl:    IsUrl, Optional

// Tags
tags:           IsArray, each IsString, MaxLength(50), max 30 items, Optional
```

### Block schema (validated with Zod in service layer)

```typescript
const BlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('PARAGRAPH'), content: z.string().max(10000) }),
  z.object({ type: z.literal('HEADING_1'), content: z.string().max(300) }),
  z.object({ type: z.literal('HEADING_2'), content: z.string().max(300) }),
  z.object({ type: z.literal('HEADING_3'), content: z.string().max(300) }),
  z.object({ type: z.literal('BLOCKQUOTE'), content: z.string().max(2000) }),
  z.object({ type: z.literal('CODE'), content: z.string().max(50000), language: z.string().max(30).optional() }),
  z.object({ type: z.literal('ORDERED_LIST'), items: z.array(z.string().max(500)).min(1).max(100) }),
  z.object({ type: z.literal('UNORDERED_LIST'), items: z.array(z.string().max(500)).min(1).max(100) }),
  z.object({ type: z.literal('IMAGE'), url: z.string().url(), alt: z.string().max(200).optional(), caption: z.string().max(300).optional() }),
  z.object({ type: z.literal('YOUTUBE_EMBED'), videoId: z.string().regex(/^[a-zA-Z0-9_-]{11}$/) }),
  z.object({ type: z.literal('DIVIDER') }),
]);

const BlocksSchema = z.array(BlockSchema).min(1).max(500);
```

### Publish flow (in PostsService.publish)

1. Check post belongs to publication owned by current user
2. Set `status = PUBLISHED`, `publishedAt = now()`
3. Save a revision snapshot before publishing
4. Emit `post.published` event via NestJS EventEmitter
5. EventEmitter handler → enqueue `newsletter.send` BullMQ job **only if `publication.type` is `NEWSLETTER` or `BOTH`**
6. Return updated post

### Slug auto-generation

```typescript
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100);
}
// If slug already exists in publication: append -2, -3, etc.
```

### Revision save logic

Save a revision on every `PATCH` that changes `title`, `markdownContent`, or `blocks`.
- `revisionNumber` = current max + 1 for this post
- If count of revisions for this post would exceed 50: delete the oldest one first (by `revisionNumber ASC`)

### List posts query params

```
?status=draft|published|scheduled  (default: all)
?tag=tagname
?page=1&limit=20  (max limit 50)
```

Response includes `{ data: Post[], meta: { total, page, limit, totalPages } }`.

---

## 10. Comment Endpoints

```
GET  /posts/:slug/comments         — list approved comments (public)
POST /posts/:slug/comments         — submit comment (public, unauthenticated)
GET  /comments/pending     [JWT]   — list pending comments for own publication
PATCH /comments/:id        [JWT]   — moderate (approve/spam/reject)
DELETE /comments/:id       [JWT]   — hard delete comment
```

### Submit comment DTO

```typescript
// CreateCommentDto
authorName:  IsString, MinLength(1), MaxLength(100), Optional
authorEmail: IsEmail, Optional
body:        IsString, MinLength(1), MaxLength(2000)
```

### Comment flow

1. HTML-escape `body` before storing (use a sanitizer — `he` or manual escape, no raw HTML allowed)
2. Save with `status = PENDING`
3. Enqueue `comment.notify` job (notifies publication owner via email)
4. Return `{ message: "Comment submitted and awaiting moderation" }` — never return the pending comment to the submitter

**Never expose `authorEmail` in any public API response.**

---

## 11. Subscriber Endpoints

```
POST /subscribe                   — subscribe to publication (tenant context, public)
                                    Returns 404 if publication.type = BLOG
GET  /subscribe/confirm           — confirm via token (?token=...)
GET  /subscribe/unsubscribe       — unsubscribe via token (?token=...)
GET  /subscribers          [JWT]  — list confirmed subscribers for own publication
DELETE /subscribers/:id    [JWT]  — remove subscriber
```

### Subscribe flow

1. `POST /subscribe` body: `{ email: string }`
2. Validate email format
3. Check if email already subscribed to this publication (confirmed or not)
   - If already confirmed → return 200 silently (don't leak existence)
   - If pending → resend confirmation email
   - If new → create `Subscriber` record, enqueue `subscriber.confirm` job
4. Always return `{ message: "Check your email to confirm your subscription" }`

### Confirm flow

`GET /subscribe/confirm?token=...`
1. Find `Subscriber` by `confirmToken`
2. If not found → 400 "Invalid or expired token"
3. Set `confirmed = true`, `confirmedAt = now()`
4. Enqueue `subscriber.welcome` job
5. Redirect to publication URL or return `{ message: "Subscription confirmed" }`

### Unsubscribe flow

`GET /subscribe/unsubscribe?token=...`
1. Find `Subscriber` by `unsubToken`
2. Hard delete the subscriber record
3. Return `{ message: "You have been unsubscribed" }`

---

## 12. Upload Endpoint

```
POST /uploads          [JWT]   — upload image
GET  /uploads          [JWT]   — list own publication's uploads
DELETE /uploads/:id    [JWT]   — delete upload
```

### Upload rules

- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- Max file size: 5MB (enforced by Multer `limits.fileSize`)
- Storage: memory buffer → write to disk at `uploads/{publicationId}/{uuid}.{ext}`
- URL: `/files/{publicationId}/{uuid}.{ext}` (served by NestJS static file serving)
- Filename stored in DB, file served statically
- On `DELETE /uploads/:id`: verify upload belongs to publication, delete file from disk, delete DB record

**Note:** This is single-instance only. The brief explicitly does not include S3 migration. Do not add it.

Static file serving: register `ServeStaticModule` to serve `/uploads` directory at `/files` path.

---

## 13. Analytics Endpoint

```
GET /analytics              [JWT]  — own publication stats
GET /analytics/posts/:slug  [JWT]  — per-post stats
```

### View tracking

Add a `POST /analytics/view` endpoint (public, no auth):
```typescript
// body
{ postSlug?: string }  // omit for publication home page view
```

1. Identify publication from tenant context
2. Get today's date (UTC, truncated to day)
3. Upsert `AnalyticsDailyRollup` for `(publicationId, postId|null, date)` — increment `views += 1`
4. Use Prisma's `upsert` with `increment` to avoid race conditions
5. Return 204 No Content

**Do not store IP addresses, user agents, or any fingerprinting data. Ever.**

### Analytics query

```typescript
// GET /analytics?days=30  (default 30, max 90)
// Returns daily views for the publication across the window
// Response: { data: { date: string, views: number }[], meta: { totalViews, avgPerDay } }
```

---

## 14. Discover Endpoint

```
GET /discover              — public, root domain only
GET /discover/tags         — public, list all tags in use across platform
```

### /discover query params

```
?tag=tagname
?page=1&limit=20  (max 20)
```

Returns recently published posts across **all public publications** where `publication.isPublic = true` and `publication.type` is `BLOG` or `BOTH` and `post.deletedAt IS NULL` and `post.status = PUBLISHED`.

Response shape per post:
```typescript
{
  id, title, slug, excerpt, publishedAt,
  tags: string[],
  publication: { slug, title, accentColor }
}
```

Never return `markdownContent` or `blocks` in discover — excerpt only.

---

## 15. Queue Jobs (BullMQ)

Queue name: `grizzly`

### Job: `newsletter.send`

**Trigger:** `post.published` event via NestJS EventEmitter — **only fires when `publication.type` is `NEWSLETTER` or `BOTH`**
**Payload:** `{ postId: string, publicationId: string }`

**Handler:**
1. Load post with publication
2. Load all confirmed subscribers for publication
3. For each subscriber: send email via MailService
   - Subject: `[{publication.title}] {post.title}`
   - Body: post excerpt + link to post + unsubscribe link (uses `unsubToken`)
4. Log send count, do not throw on individual email failure (catch per-subscriber)

**Options:** `attempts: 3`, `backoff: { type: 'exponential', delay: 5000 }`

---

### Job: `subscriber.confirm`

**Trigger:** new subscriber created
**Payload:** `{ subscriberId: string }`

**Handler:**
1. Load subscriber with publication
2. Send confirmation email
   - Subject: `Confirm your subscription to {publication.title}`
   - Body: confirm link using `confirmToken` → `{ROOT_URL}/subscribe/confirm?token={confirmToken}`

---

### Job: `subscriber.welcome`

**Trigger:** subscriber confirms email
**Payload:** `{ subscriberId: string }`

**Handler:**
1. Load subscriber with publication + publication's 3 most recent published posts
2. Send welcome email
   - Subject: `Welcome to {publication.title}`
   - Body: publication description + 3 recent post links + unsubscribe link

---

### Job: `comment.notify`

**Trigger:** new comment submitted
**Payload:** `{ commentId: string }`

**Handler:**
1. Load comment + post + publication + publication owner user
2. Send email to publication owner
   - Subject: `New comment on "{post.title}"`
   - Body: commenter name (or "Anonymous"), comment body (truncated to 200 chars), link to moderation endpoint
3. Never include `authorEmail` in notification to owner

---

### Job: `post.schedule`

**Trigger:** BullMQ `delayed` job, enqueued when `status = SCHEDULED`
**Payload:** `{ postId: string }`

**Handler:**
1. Load post
2. If `post.status` is still `SCHEDULED` (not manually changed): call publish flow
3. If `post.status` changed: skip silently

When `POST /posts/:slug/schedule` is called:
- Validate `scheduledAt` is in the future (min 5 minutes from now)
- Calculate delay in ms: `scheduledAt.getTime() - Date.now()`
- Add BullMQ job with `{ delay }` option
- Store `jobId` if needed for cancellation (store in post or cache)

---

## 16. Mail Service

```typescript
// src/modules/mail/mail.service.ts

@Injectable()
export class MailService {
  async send(to: string, subject: string, html: string): Promise<void>
}
```

- If `SMTP_HOST` is not configured in env: log `[MailService] Email skipped (SMTP not configured)` and return silently. No throw.
- All emails must include a plain-text alternative.
- All outgoing email HTML is escaped — no raw user content in email templates except post.title (escaped) and post.excerpt (escaped).

**Email templates** — build as simple TypeScript template literal functions in `src/modules/mail/templates/`:

```
newsletter.template.ts        — newsletter send
confirm-subscription.template.ts
welcome-subscriber.template.ts
comment-notification.template.ts
```

Each template function signature: `(data: TemplateData) => { subject: string; html: string; text: string }`.

---

## 16.5 Ebook Endpoints

Ebooks are owned by the user, not scoped to a publication. No tenant context needed.

```
GET    /ebooks                       [JWT]  — list own ebooks
POST   /ebooks                       [JWT]  — create ebook (max 20 per user)
GET    /ebooks/:id                   [JWT]  — get ebook with chapters
PATCH  /ebooks/:id                   [JWT]  — update ebook metadata
DELETE /ebooks/:id                   [JWT]  — soft delete ebook
POST   /ebooks/:id/publish           [JWT]  — set status = PUBLISHED
POST   /ebooks/:id/unpublish         [JWT]  — set status = DRAFT

GET    /ebooks/:id/chapters          [JWT]  — list chapters in order
POST   /ebooks/:id/chapters          [JWT]  — add chapter (appends to end)
GET    /ebooks/:id/chapters/:order   [JWT]  — get single chapter
PATCH  /ebooks/:id/chapters/:order   [JWT]  — update chapter content
DELETE /ebooks/:id/chapters/:order   [JWT]  — delete chapter (reorders remaining)
POST   /ebooks/:id/chapters/reorder  [JWT]  — reorder chapters
```

### Create ebook DTO

```typescript
// CreateEbookDto
title:       IsString, MinLength(1), MaxLength(200)
description: IsString, MaxLength(1000), Optional
```

### Create chapter DTO

```typescript
// CreateChapterDto
title:          IsString, MinLength(1), MaxLength(300)
format:         IsEnum(PostFormat) — 'MARKDOWN' | 'BLOCKS'
markdownContent: IsString, Optional  — required when format='MARKDOWN'
blocks:         IsArray, Optional    — required when format='BLOCKS'
```

Same block schema as posts (BlocksSchema Zod validation). Max 500 blocks per chapter.

### Reorder chapters

```typescript
// ReorderChaptersDto
order: number[]  // array of current order values in new desired sequence
                 // e.g. [3, 1, 2] moves chapter 3 to position 1
```

Reorder in a Prisma transaction: update all affected `EbookChapter.order` values atomically. Validate the array contains exactly the current chapter orders, no duplicates, no gaps.

### Delete chapter

When a chapter is deleted, decrement `order` of all subsequent chapters in a transaction so the sequence remains contiguous.

---

## 17. RSS / Sitemap / robots.txt

These are served from the publication context (tenant middleware resolves publication first).
Only served when `publication.type` is `BLOG` or `BOTH`. Returns 404 for `NEWSLETTER`-only publications.

```
GET /rss.xml         — RSS 2.0 feed for current publication (public posts, last 20)
GET /sitemap.xml     — sitemap for current publication (all public published posts)
GET /robots.txt      — robots.txt for current publication
```

### robots.txt content

```
User-agent: *
Allow: /
Sitemap: https://{publication.customDomain || publication.slug + '.' + ROOT_DOMAIN}/sitemap.xml
```

If `publication.isPublic = false` or `publication.type = NEWSLETTER`:
```
User-agent: *
Disallow: /
```

### RSS feed structure (RSS 2.0)

```xml
<rss version="2.0">
  <channel>
    <title>{publication.title}</title>
    <link>{publication URL}</link>
    <description>{publication.description}</description>
    <language>en</language>
    <item> (for each post, last 20 published)
      <title>{post.title}</title>
      <link>{post URL}</link>
      <description>{post.excerpt}</description>
      <pubDate>{post.publishedAt}</pubDate>
      <guid>{post URL}</guid>
    </item>
  </channel>
</rss>
```

Set `Content-Type: application/rss+xml; charset=utf-8`.

---

## 18. Security Rules (Non-Negotiable)

1. **Helmet** — applied globally in `main.ts`. No CSP overrides.
2. **HTML escape all user content** before storing in DB. Use the `he` library: `he.encode(input)`. Applied to: post titles, comment bodies, publication titles/descriptions, tag names, ebook titles/descriptions, chapter titles.
3. **HTML escape on read** — do not double-escape. Escape on write, serve as-is.
4. **Markdown rendering** — use `markdown-it` with `html: false` (no raw HTML in Markdown). Safe mode only.
5. **YouTube embeds** — only `youtube-nocookie.com` domain allowed. Validate videoId matches `/^[a-zA-Z0-9_-]{11}$/` before storing.
6. **Image URLs in blocks** — must be URLs served from the platform's own upload path (`/files/...`). Reject external image URLs in blocks. (OG image and coverImageUrl are exempt — those accept external URLs.)
7. **JWT secret** — must be set via `JWT_SECRET` env var. Minimum 32 chars. App fails to start if not set.
8. **Password requirements** — min 8, max 72 chars (bcrypt limit). Enforced in DTO.
9. **No user enumeration** — login always returns the same error regardless of whether email exists.
10. **CORS** — configure via `CORS_ORIGIN` env var. Default: disallow all. Never `*` in production.
11. **SQL injection** — Prisma parameterised queries only. No raw SQL `$queryRaw` except for the analytics upsert (use `$executeRaw` with typed params only).

---

## 19. Rate Limiting Strategy

Use `@nestjs/throttler` with `ThrottlerModule.forRoot(...)`. Apply per-route overrides via `@Throttle()` decorator.

| Route group | Limit | Window |
|---|---|---|
| Default (all routes) | 100 req | 60s |
| `POST /auth/login` | 5 req | 60s |
| `POST /auth/register` | 3 req | 60s |
| `POST /subscribe` | 3 req | 60s |
| `GET /subscribe/confirm` | 10 req | 60s |
| `GET /subscribe/unsubscribe` | 10 req | 60s |
| `POST /posts/:slug/comments` | 5 req | 60s |
| `POST /analytics/view` | 30 req | 60s |
| `POST /uploads` | 10 req | 60s |

Rate limiting key: IP address (`req.ip`). For authenticated routes, also key by `userId` using a custom `ThrottlerGuard` that overrides `getTracker()`.

---

## 20. Response Shape

Every endpoint returns one of these shapes. No exceptions.

```typescript
// Success
{
  "data": <payload>,
  "meta": <pagination | null>
}

// Paginated
{
  "data": Item[],
  "meta": { "total": number, "page": number, "limit": number, "totalPages": number }
}

// Error
{
  "error": {
    "code": string,      // machine-readable, snake_case e.g. "post_not_found"
    "message": string,   // human-readable
    "statusCode": number
  }
}
```

Implement via a global `ResponseInterceptor` that wraps successful responses, and a global `HttpExceptionFilter` that formats errors.

### Error codes

```
auth_invalid_credentials
auth_email_taken
auth_username_taken
auth_token_expired
publication_not_found
publication_not_public
publication_slug_taken
publication_domain_already_claimed
publication_domain_not_verified
publication_limit_reached          // user already has 10 publications
publication_type_no_newsletter     // subscribe attempted on BLOG-type publication
post_not_found
post_slug_taken
post_invalid_format
post_too_many_blocks
post_too_many_tags
post_schedule_past
comment_not_found
subscriber_already_confirmed
subscriber_token_invalid
upload_invalid_type
upload_too_large
ebook_not_found
ebook_limit_reached                // user already has 20 ebooks
ebook_chapter_not_found
ebook_chapter_order_conflict
rate_limit_exceeded
validation_error
internal_error
```

---

## 21. Environment Variables

Validate all with Zod in `src/config/env.ts`. App must fail to start if required vars are missing or invalid.

```typescript
const EnvSchema = z.object({
  // App
  NODE_ENV:        z.enum(['development', 'test', 'production']),
  PORT:            z.coerce.number().default(3000),
  ROOT_DOMAIN:     z.string().min(1),    // e.g. "grizzly.app"
  ROOT_URL:        z.string().url(),     // e.g. "https://grizzly.app"
  CORS_ORIGIN:     z.string().default(''),

  // Database
  DATABASE_URL:    z.string().url(),

  // Redis
  REDIS_URL:       z.string().url(),

  // Auth
  JWT_SECRET:         z.string().min(32),
  JWT_EXPIRES_IN:     z.string().default('15m'),
  REFRESH_SECRET:     z.string().min(32),
  REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Email (all optional — graceful no-op if missing)
  SMTP_HOST:     z.string().optional(),
  SMTP_PORT:     z.coerce.number().optional(),
  SMTP_USER:     z.string().optional(),
  SMTP_PASS:     z.string().optional(),
  SMTP_FROM:     z.string().optional(),  // e.g. "Grizzly <hello@grizzly.app>"
});
```

Export a typed `env` object used everywhere instead of `process.env` directly.

---

## 22. Health Check

```
GET /health
```

Returns:
```json
{
  "data": {
    "status": "ok",
    "db": "ok" | "error",
    "redis": "ok" | "error",
    "uptime": 12345
  }
}
```

Check DB with `prisma.$queryRaw\`SELECT 1\``, Redis with `redis.ping()`. Never throw — return `"error"` if a check fails.

---

## 23. What NOT to Build

Do not implement any of the following, regardless of how natural it seems:

- Social features (followers, likes, following feed, mentions)
- Full-text search (no `/search` endpoint)
- Nested or threaded comments
- Image optimization, resizing, or CDN
- Multi-owner or collaborative publications
- Per-user dashboards beyond what's in the spec
- WebSocket or real-time features
- Stripe integration or payment processing
- Two-factor authentication
- OAuth / social login
- Email verification on registration (only newsletter uses email verification)
- Soft delete for comments (hard delete only)
- S3 or cloud storage (disk only for v1)
- Admin panel or superuser role
- Publication import/export
- Post reactions or claps
- Ebook export to PDF/EPUB (schema is ready, export pipeline ships in v2)
- Public ebook listing or discovery page (ebooks are private/direct-link only in v1)

If a feature is not in this brief, it does not exist. Ask before adding.

---

## 24. Testing Requirements

### Unit tests (Jest)

Write unit tests for all service-layer business logic:
- `AuthService` — register, login, token refresh
- `PublicationsService` — create, update, type change rules, domain verification, publication limit
- `PostsService` — create, publish, schedule, revision management, slug generation, block validation
- `SubscribersService` — subscribe (including BLOG-type 404), confirm, unsubscribe flows
- `EbooksService` — create, chapter add/delete/reorder, order contiguity enforcement
- `TenantMiddleware` — all three resolution paths

### E2E tests (Supertest)

Write e2e tests for the following flows end-to-end:
- Register → auto-creates first publication (type=BOTH)
- Create second publication → verify max 10 limit enforced
- Create post → publish → verify newsletter job enqueued only when type=NEWSLETTER or BOTH
- Post publish on BLOG-type publication → verify newsletter job NOT enqueued
- Subscribe to BLOG-type publication → verify 404
- Subscribe to NEWSLETTER-type publication → confirm → verify welcome job enqueued
- Submit comment → verify pending status
- Custom domain verification flow
- Create ebook → add chapters → reorder → delete chapter (verify order resequenced)
- Rate limiting on login endpoint

Use a test PostgreSQL DB (`DATABASE_URL_TEST` env var). Run migrations before test suite. Seed with factory functions, not static fixtures.

---

## 25. Checklist Before First Commit

- [ ] `prisma/schema.prisma` complete and matches Section 4 exactly
- [ ] `src/config/env.ts` with Zod validation — app crashes if vars missing
- [ ] `TenantMiddleware` resolves `Publication` (not `Blog`), with Redis cache
- [ ] Global `ResponseInterceptor` wrapping all responses
- [ ] Global `HttpExceptionFilter` with error codes from Section 20
- [ ] Global `ThrottlerGuard` with per-route overrides
- [ ] Helmet applied in `main.ts`
- [ ] `MailService` with graceful no-op
- [ ] All BullMQ jobs registered with retry config
- [ ] `GET /health` endpoint
- [ ] Swagger at `/api-docs` with all DTOs decorated
- [ ] `.env.example` with all vars from Section 21 (no real values)
- [ ] `docker-compose.yml` with postgres + redis/valkey services for local dev

---

*End of brief. Total scope: ~3,200 lines of application code. Build in order: Prisma schema → config/env → common (middleware, guards, interceptors, filters) → Auth → Publications → Posts → Comments → Subscribers → Uploads → Analytics → Discover → Ebooks → Queue jobs → Mail → RSS/Sitemap → Health → Tests.*
