import { forwardRef } from 'react';
import { clsx } from 'clsx';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  size?: 'sm' | 'md';
  error?: string;
  label?: string;
};

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: string;
  label?: string;
};

const inputBase =
  'w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius)] font-[var(--font-ui)] text-sm text-[var(--color-ink)] placeholder:text-[var(--color-faint)] transition-colors duration-150 focus:outline-none focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_var(--color-accent-light)]';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ size = 'md', error, label, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-[var(--color-muted)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            inputBase,
            size === 'sm' ? 'h-8 px-3' : 'h-[38px] px-3',
            error && 'border-[var(--color-danger)]',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, label, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-[var(--color-muted)]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={clsx(
            inputBase,
            'min-h-[80px] px-3 py-[10px] resize-y',
            error && 'border-[var(--color-danger)]',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';
