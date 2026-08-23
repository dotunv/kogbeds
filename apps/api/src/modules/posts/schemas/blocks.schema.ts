import { z } from 'zod';

export const BlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('PARAGRAPH'), content: z.string().max(10000) }),
  z.object({ type: z.literal('HEADING_1'), content: z.string().max(300) }),
  z.object({ type: z.literal('HEADING_2'), content: z.string().max(300) }),
  z.object({ type: z.literal('HEADING_3'), content: z.string().max(300) }),
  z.object({ type: z.literal('BLOCKQUOTE'), content: z.string().max(2000) }),
  z.object({ type: z.literal('CODE'), content: z.string().max(50000), language: z.string().max(30).optional() }),
  z.object({ type: z.literal('ORDERED_LIST'), items: z.array(z.string().max(500)).min(1).max(100) }),
  z.object({ type: z.literal('UNORDERED_LIST'), items: z.array(z.string().max(500)).min(1).max(100) }),
  z.object({
    type: z.literal('IMAGE'),
    url: z.string().min(1).refine((u) => u.startsWith('/files/'), {
      message: 'Image blocks must reference an uploaded file (/files/...)',
    }),
    alt: z.string().max(200).optional(),
    caption: z.string().max(300).optional(),
  }),
  z.object({ type: z.literal('YOUTUBE_EMBED'), videoId: z.string().regex(/^[a-zA-Z0-9_-]{11}$/) }),
  z.object({ type: z.literal('DIVIDER') }),
]);

export const BlocksSchema = z.array(BlockSchema).min(1).max(500);

export function validateBlocks(blocks: unknown): void {
  const result = BlocksSchema.safeParse(blocks);
  if (!result.success) {
    throw new Error('post_invalid_format');
  }
}
