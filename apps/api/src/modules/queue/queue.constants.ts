export const GRIZZLY_QUEUE = 'grizzly';

export enum JobName {
  NEWSLETTER_SEND = 'newsletter.send',
  SUBSCRIBER_CONFIRM = 'subscriber.confirm',
  SUBSCRIBER_WELCOME = 'subscriber.welcome',
  COMMENT_NOTIFY = 'comment.notify',
  POST_SCHEDULE = 'post.schedule',
}

export const DEFAULT_JOB_OPTS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
} as const;
