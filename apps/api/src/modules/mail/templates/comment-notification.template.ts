import * as he from 'he';

export interface CommentNotificationTemplateData {
  postTitle: string;
  authorName: string;
  commentBody: string;
  moderationUrl: string;
}

export function commentNotificationTemplate(data: CommentNotificationTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const title = he.encode(data.postTitle);
  const author = he.encode(data.authorName || 'Anonymous');
  const truncated = data.commentBody.length > 200 ? `${data.commentBody.slice(0, 200)}…` : data.commentBody;
  const body = he.encode(truncated);

  const subject = `New comment on "${data.postTitle}"`;
  const html = `
    <div>
      <p><strong>${author}</strong> commented on "${title}":</p>
      <blockquote>${body}</blockquote>
      <p><a href="${data.moderationUrl}">Moderate comments</a></p>
    </div>
  `.trim();
  const text = `${data.authorName || 'Anonymous'} commented on "${data.postTitle}":\n\n${truncated}\n\nModerate: ${data.moderationUrl}`;

  return { subject, html, text };
}
