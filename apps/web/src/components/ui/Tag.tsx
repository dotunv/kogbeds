import { clsx } from 'clsx';

type TagProps = {
  label: string;
  active?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
};

export function Tag({ label, active, onClick, onRemove }: TagProps) {
  return (
    <span
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-[2px] text-xs rounded-[var(--radius-sm)] border font-[var(--font-ui)] transition-colors',
        active
          ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)] border-[var(--color-accent)]'
          : 'bg-[var(--color-canvas)] text-[var(--color-muted)] border-[var(--color-border)]',
        onClick && 'cursor-pointer',
      )}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 leading-none hover:text-[var(--color-ink)]"
          aria-label={`Remove ${label}`}
        >
          ×
        </button>
      )}
    </span>
  );
}
