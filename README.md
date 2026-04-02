# Grizzly (NestJS Bear-style blogging platform)

Grizzly is a minimalist, multi-tenant blogging platform inspired by Bear Blog.
This repository currently implements the **foundation slice**:

- NestJS modular architecture
- Prisma + PostgreSQL schema and migration
- JWT authentication (register/login/me)
- Automatic blog creation for every new user
- Input validation + config validation

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
│   └── users/
└── prisma/
```

## Data model

- `User` (email, username, passwordHash)
- `Blog` (one-to-one with User)
- `Post` (attached to Blog; schema ready for upcoming posts module)

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

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create env file:
   ```bash
   cp .env.example .env
   ```
3. Ensure PostgreSQL is running and `DATABASE_URL` is valid.
4. Apply migrations:
   ```bash
   npm run prisma:migrate:deploy
   ```
5. Start app:
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

1. Posts module CRUD (Markdown content + slugs)
2. Public rendering module (`GET /`, `GET /:slug`, `GET /feed.xml`)
3. Subdomain middleware (`username.yourdomain.com` -> blog lookup)
4. Dashboard settings (title, description, custom CSS)
