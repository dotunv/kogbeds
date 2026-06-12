import { clsx } from 'clsx';

type Status = 'DRAFT' | 'PUBLISHED' | 'SCHEDULED';

const labels: Record<Status, string> = {
  DRAFT:     'Draft',
  PUBLISHED: 'Published',
  SCHEDULED: 'Scheduled',
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-[2px] text-[11px] font-medium rounded-[var(--radius-sm)] font-[var(--font-ui)]',
        status === 'PUBLISHED' && 'bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)] text-[var(--color-success)]',
        status === 'DRAFT'     && 'bg-[var(--color-canvas)] text-[var(--color-muted)] border border-[var(--color-border)]',
        status === 'SCHEDULED' && 'bg-[var(--color-accent-light)] text-[var(--color-accent)]',
      )}
    >
      {labels[status]}
    </span>
  );
}
