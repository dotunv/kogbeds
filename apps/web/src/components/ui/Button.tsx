import { forwardRef } from 'react';
import { clsx } from 'clsx';

type Variant = 'primary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

const base =
  'inline-flex items-center justify-center font-medium cursor-pointer transition-all select-none disabled:opacity-45 disabled:pointer-events-none';

const variants: Record<Variant, string> = {
  primary:  'text-white active:scale-[0.98]',
  ghost:    'border border-[var(--color-border)] text-[var(--color-ink)] bg-transparent',
  danger:   'border text-[var(--color-danger)] bg-transparent',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 py-0 text-[13px] rounded-[var(--radius)]',
  md: 'h-[38px] px-4 py-0 text-sm rounded-[var(--radius)]',
  lg: 'h-11 px-5 py-0 text-sm rounded-[var(--radius)]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, className, disabled, style, ...props }, ref) => {
    const isPrimary = variant === 'primary';
    const isDanger  = variant === 'danger';

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        style={{
          ...(isPrimary ? { backgroundColor: 'var(--color-accent)' } : {}),
          ...(isDanger  ? { borderColor: 'var(--color-danger)' }      : {}),
          ...style,
        }}
        className={clsx(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading ? <span className="opacity-70">Loading…</span> : children}
      </button>
    );
  },
);

Button.displayName = 'Button';
