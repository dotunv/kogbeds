import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Keep CLI commands usable even when DATABASE_URL is not set.
    url: process.env.DATABASE_URL ?? '',
  },
});
