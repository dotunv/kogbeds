import * as he from 'he';

export interface NewsletterTemplateData {
  publicationTitle: string;
  postTitle: string;
  postExcerpt: string;
  postUrl: string;
  unsubscribeUrl: string;
}

export function newsletterTemplate(data: NewsletterTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const title = he.encode(data.postTitle);
  const excerpt = he.encode(data.postExcerpt);
  const pubTitle = he.encode(data.publicationTitle);

  const subject = `[${data.publicationTitle}] ${data.postTitle}`;
  const html = `
    <div>
      <h1>${title}</h1>
      <p>${excerpt}</p>
      <p><a href="${data.postUrl}">Read the full post</a></p>
      <hr />
      <p style="font-size:12px;color:#888">
        Sent by ${pubTitle}. <a href="${data.unsubscribeUrl}">Unsubscribe</a>
      </p>
    </div>
  `.trim();
  const text = `${data.postTitle}\n\n${data.postExcerpt}\n\nRead: ${data.postUrl}\n\nUnsubscribe: ${data.unsubscribeUrl}`;

  return { subject, html, text };
}
