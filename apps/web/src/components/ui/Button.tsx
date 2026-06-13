import { forwardRef } from 'react';
import { clsx } from 'clsx';

type Variant = 'primary' | 'ghost' | 'danger';
type Size    = 'sm' | 'md' | 'lg';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?:    Size;
  loading?: boolean;
};

const base =
  'inline-flex items-center justify-center font-medium cursor-pointer ' +
  'select-none transition-all disabled:opacity-40 disabled:pointer-events-none ' +
  'whitespace-nowrap tracking-[-0.01em]';

const variants: Record<Variant, string> = {
  primary:
    'bg-[var(--color-accent)] text-white border border-[var(--color-accent)] ' +
    'hover:bg-[var(--color-accent-hover)] hover:border-[var(--color-accent-hover)] ' +
    'active:scale-[0.97] active:opacity-90',
  ghost:
    'bg-transparent text-[var(--color-ink)] border border-[var(--color-border)] ' +
    'hover:bg-[var(--color-canvas)] hover:border-[var(--color-border-strong)] ' +
    'active:scale-[0.97]',
  danger:
    'bg-transparent text-[var(--color-danger)] border border-[var(--color-border)] ' +
    'hover:bg-[var(--color-danger-light)] hover:border-[var(--color-danger)] ' +
    'active:scale-[0.97]',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-[var(--radius)]',
  md: 'h-[36px] px-4 text-[13.5px] gap-2 rounded-[var(--radius)]',
  lg: 'h-10 px-5 text-[14px] gap-2 rounded-[var(--radius)]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, className, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-1.5 opacity-60">
          <svg className="animate-spin h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"
              strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round" />
          </svg>
          {children}
        </span>
      ) : children}
    </button>
  ),
);
Button.displayName = 'Button';
