import { z } from 'zod';
import { sanitizeContentUrl } from '../../../common/utils/url.util';

const paragraphBlock = z.object({
  type: z.literal('paragraph'),
  text: z.string().max(50_000),
});

const headingBlock = z.object({
  type: z.literal('heading'),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  text: z.string().max(500),
});

const codeBlock = z.object({
  type: z.literal('code'),
  code: z.string().max(100_000),
  language: z.string().max(64).optional(),
});

const blockquoteBlock = z.object({
  type: z.literal('blockquote'),
  text: z.string().max(50_000),
});

const listBlock = z.object({
  type: z.literal('list'),
  ordered: z.boolean(),
  items: z.array(z.string().max(10_000)).max(500),
});

const dividerBlock = z.object({
  type: z.literal('divider'),
});

const imageBlock = z.object({
  type: z.literal('image'),
  url: z
    .string()
    .max(2048)
    .refine((u) => sanitizeContentUrl(u) !== null, 'Invalid image URL'),
  alt: z.string().max(500).optional(),
});

const embedBlock = z.object({
  type: z.literal('embed'),
  provider: z.literal('youtube'),
  videoId: z
    .string()
    .max(32)
    .regex(/^[a-zA-Z0-9_-]{6,32}$/, 'Invalid YouTube video id'),
});

export const postBlockV1Schema = z.discriminatedUnion('type', [
  paragraphBlock,
  headingBlock,
  codeBlock,
  blockquoteBlock,
  listBlock,
  dividerBlock,
  imageBlock,
  embedBlock,
]);

export const postBlocksV1Schema = z.array(postBlockV1Schema).min(1).max(500);

export type PostBlockV1 = z.infer<typeof postBlockV1Schema>;
export type PostBlocksV1 = z.infer<typeof postBlocksV1Schema>;
