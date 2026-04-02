# Grizzly (NestJS Bear-style blogging platform)

Grizzly is a minimalist, multi-tenant blogging platform inspired by Bear Blog.
This repository currently implements:

- NestJS modular architecture
- Prisma + PostgreSQL schema and migration
- JWT authentication (register/login/me)
- Automatic blog creation for every new user
- Input validation + config validation
- Posts module with owner-scoped CRUD, publish/unpublish, and Markdown -> HTML rendering
- Public blog rendering with subdomain host routing and RSS feed
- Root-host discover page + RSS feed for recent public posts

## Current architecture

```text
src/
├── common/
│   ├── decorators/
│   └── guards/
├── config/
├── modules/
│   ├── auth/
│   ├── blogs/
│   ├── discover/
│   ├── posts/
│   ├── public/
│   └── users/
└── prisma/
```

## Data model

- `User` (email, username, passwordHash)
- `Blog` (one-to-one with User)
- `Post` (attached to Blog, includes Markdown + rendered HTML + publish state)

See: `prisma/schema.prisma`

## API implemented

### Health
- `GET /health`

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me` (JWT required)

### Users
- `GET /users/me` (JWT required)

### Posts (JWT required)
- `POST /posts`
- `GET /posts?status=all|draft|published`
- `GET /posts/:id`
- `PATCH /posts/:id`
- `DELETE /posts/:id`
- `PATCH /posts/:id/publish`
- `PATCH /posts/:id/unpublish`

### Public blog routes (subdomain host)
For a host matching `<username>.<APP_DOMAIN>`, middleware routes requests to:
- `GET /` -> blog homepage (published posts)
- `GET /:slug` -> public post page
- `GET /feed.xml` -> RSS feed

### Discover routes (root host)
For the root host (`APP_DOMAIN` or `www.APP_DOMAIN`):
- `GET /` -> discover page (recent public posts)
- `GET /feed.xml` -> discover RSS feed

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create env file:
   ```bash
   cp .env.example .env
   ```
3. Set `APP_DOMAIN` in `.env` for your local/production domain (e.g. `localhost` or `yourdomain.com`).
4. Ensure PostgreSQL is running and `DATABASE_URL` is valid.
5. Apply migrations:
   ```bash
   npm run prisma:migrate:deploy
   ```
6. Start app:
   ```bash
   npm run start:dev
   ```

## Useful scripts

```bash
npm run build
npm run lint
npm run test
npm run test:e2e
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:migrate:deploy
```

## Suggested next steps (MVP path)

1. Dashboard settings (title, description, custom CSS editor)
2. Public SEO polish (meta tags, sitemap, canonical URLs)
3. Custom domains support
4. Optional caching for public pages/feed
