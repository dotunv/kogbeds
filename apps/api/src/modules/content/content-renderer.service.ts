import { Injectable } from '@nestjs/common';
import MarkdownIt from 'markdown-it';
import { ZodError } from 'zod';
import { escapeHtml } from '../../common/utils/html.util';
import { sanitizeContentUrl } from '../../common/utils/url.util';
import {
  postBlocksV1Schema,
  type PostBlockV1,
} from './schemas/post-blocks-v1.schema';

const EXCERPT_MAX = 280;

export type ContentRenderResult = {
  contentHtml: string;
  excerpt: string;
  searchableText: string;
};

@Injectable()
export class ContentRendererService {
  private readonly markdownIt = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: false,
  });

  renderFromMarkdown(markdown: string): ContentRenderResult {
    const trimmed = markdown.trim();
    const contentHtml = this.markdownIt.render(trimmed);
    const searchableText = trimmed;
    const excerpt = this.truncatePlainText(
      this.collapseWhitespace(trimmed),
      EXCERPT_MAX,
    );

    return { contentHtml, excerpt, searchableText };
  }

  parseAndRenderBlocksV1(
    raw: unknown,
  ): { blocks: PostBlockV1[] } & ContentRenderResult {
    let parsed: PostBlockV1[];
    try {
      parsed = postBlocksV1Schema.parse(raw);
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        const detail = err.issues.map((i) => i.message).join('; ');
        throw new ContentBlocksValidationError(
          `Invalid blocks: ${detail || 'validation failed'}`,
        );
      }
      throw err;
    }

    const contentHtml = this.renderBlocksToHtml(parsed);
    const searchableText = this.blocksToPlainText(parsed);
    const excerpt = this.truncatePlainText(
      this.collapseWhitespace(searchableText),
      EXCERPT_MAX,
    );

    return { blocks: parsed, contentHtml, excerpt, searchableText };
  }

  private renderBlocksToHtml(blocks: PostBlockV1[]): string {
    const parts = blocks.map((block) => this.renderOneBlock(block));
    return parts.join('\n');
  }

  private renderOneBlock(block: PostBlockV1): string {
    switch (block.type) {
      case 'paragraph':
        return `<p>${escapeHtml(block.text)}</p>`;
      case 'heading': {
        const tag = block.level === 1 ? 'h2' : block.level === 2 ? 'h3' : 'h4';
        return `<${tag}>${escapeHtml(block.text)}</${tag}>`;
      }
      case 'code': {
        const lang = block.language
          ? ` class="language-${escapeHtml(block.language)}"`
          : '';
        return `<pre><code${lang}>${escapeHtml(block.code)}</code></pre>`;
      }
      case 'blockquote':
        return `<blockquote>${escapeHtml(block.text)}</blockquote>`;
      case 'list': {
        const tag = block.ordered ? 'ol' : 'ul';
        const items = block.items
          .map((item) => `<li>${escapeHtml(item)}</li>`)
          .join('');
        return `<${tag}>${items}</${tag}>`;
      }
      case 'divider':
        return '<hr />';
      case 'image': {
        const url = sanitizeContentUrl(block.url);
        if (!url) {
          return '';
        }
        const alt = escapeHtml(block.alt ?? '');
        return `<figure><img src="${escapeHtml(url)}" alt="${alt}" loading="lazy" /></figure>`;
      }
      case 'embed':
        if (block.provider === 'youtube') {
          const id = escapeHtml(block.videoId);
          return `<div class="embed"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="YouTube video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
        }
        return '';
      default: {
        const _exhaustive: never = block;
        return _exhaustive;
      }
    }
  }

  private blocksToPlainText(blocks: PostBlockV1[]): string {
    const chunks: string[] = [];
    for (const block of blocks) {
      switch (block.type) {
        case 'paragraph':
        case 'heading':
        case 'blockquote':
          chunks.push(block.text);
          break;
        case 'code':
          chunks.push(block.code);
          break;
        case 'list':
          chunks.push(block.items.join('\n'));
          break;
        case 'divider':
          chunks.push('---');
          break;
        case 'image':
          chunks.push(block.alt ?? block.url);
          break;
        case 'embed':
          chunks.push(`[${block.provider} ${block.videoId}]`);
          break;
        default: {
          const _exhaustive: never = block;
          return _exhaustive;
        }
      }
    }
    return chunks.join('\n\n');
  }

  private collapseWhitespace(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  private truncatePlainText(text: string, max: number): string {
    if (text.length <= max) {
      return text;
    }
    return `${text.slice(0, max - 1).trimEnd()}…`;
  }
}

export class ContentBlocksValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContentBlocksValidationError';
  }
}
