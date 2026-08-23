import * as he from 'he';

export interface WelcomeSubscriberTemplateData {
  publicationTitle: string;
  publicationDescription: string;
  recentPosts: { title: string; url: string }[];
  unsubscribeUrl: string;
}

export function welcomeSubscriberTemplate(data: WelcomeSubscriberTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const pubTitle = he.encode(data.publicationTitle);
  const description = he.encode(data.publicationDescription);
  const subject = `Welcome to ${data.publicationTitle}`;

  const postsHtml = data.recentPosts
    .map((p) => `<li><a href="${p.url}">${he.encode(p.title)}</a></li>`)
    .join('');
  const postsText = data.recentPosts.map((p) => `- ${p.title}: ${p.url}`).join('\n');

  const html = `
    <div>
      <h1>Welcome to ${pubTitle}</h1>
      <p>${description}</p>
      ${postsHtml ? `<ul>${postsHtml}</ul>` : ''}
      <hr />
      <p style="font-size:12px;color:#888"><a href="${data.unsubscribeUrl}">Unsubscribe</a></p>
    </div>
  `.trim();
  const text = `Welcome to ${data.publicationTitle}\n\n${data.publicationDescription}\n\n${postsText}\n\nUnsubscribe: ${data.unsubscribeUrl}`;

  return { subject, html, text };
}
