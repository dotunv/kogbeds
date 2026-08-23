import * as he from 'he';

export interface ConfirmSubscriptionTemplateData {
  publicationTitle: string;
  confirmUrl: string;
}

export function confirmSubscriptionTemplate(data: ConfirmSubscriptionTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const pubTitle = he.encode(data.publicationTitle);
  const subject = `Confirm your subscription to ${data.publicationTitle}`;
  const html = `
    <div>
      <p>Please confirm your subscription to ${pubTitle}.</p>
      <p><a href="${data.confirmUrl}">Confirm subscription</a></p>
    </div>
  `.trim();
  const text = `Confirm your subscription to ${data.publicationTitle}: ${data.confirmUrl}`;

  return { subject, html, text };
}
