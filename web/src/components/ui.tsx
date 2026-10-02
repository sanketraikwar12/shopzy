import clsx from 'clsx';
import { AlertCircle, CheckCircle2, Info, Loader2, Star, X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { useEscapeKey, useLockBodyScroll } from '@/lib/hooks';
import { useToasts } from '@/store';

// --- Rating ------------------------------------------------------------------

export function Stars({ value, size = 14, showValue = false }: { value: number; size?: number; showValue?: boolean }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = value >= i;
        const half = !filled && value >= i - 0.5;
        return (
          <Star
            key={i}
            size={size}
            aria-hidden
            className={clsx(
              filled || half ? 'text-amber-400' : 'text-ink-300',
              (filled || half) && 'fill-amber-400',
            )}
          />
        );
      })}
      {showValue && <span className="ml-1 text-sm font-semibold text-ink-700">{value.toFixed(1)}</span>}
    </span>
  );
}

// --- Badges ------------------------------------------------------------------

const BADGE_VARIANTS = {
  neutral: 'bg-ink-100 text-ink-700',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-rose-100 text-rose-800',
  brand: 'bg-brand-100 text-brand-800',
  purple: 'bg-violet-100 text-violet-800',
} as const;

export function Badge({
  children,
  variant = 'neutral',
  className,
}: {
  children: ReactNode;
  variant?: keyof typeof BADGE_VARIANTS;
  className?: string;
}) {
  return <span className={clsx('chip', BADGE_VARIANTS[variant], className)}>{children}</span>;
}

export function OpenBadge({ isOpen, label }: { isOpen: boolean; label: string }) {
  return (
    <Badge variant={isOpen ? 'success' : 'danger'}>
      <span className={clsx('size-1.5 rounded-full', isOpen ? 'bg-emerald-500' : 'bg-rose-500')} aria-hidden />
      {label}
    </Badge>
  );
}

// --- Loading / empty states --------------------------------------------------

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={clsx('animate-spin', className)} aria-hidden />;
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-500" role="status">
      <Spinner className="size-6" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ink-300 bg-white/60 px-6 py-14 text-center">
      {icon && <div className="text-ink-400">{icon}</div>}
      <h3 className="text-base font-semibold text-ink-800">{title}</h3>
      {description && <p className="max-w-md text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-10 text-center">
      <AlertCircle className="size-6 text-rose-500" aria-hidden />
      <p className="text-sm font-medium text-rose-800">{message}</p>
      {onRetry && (
        <button type="button" className="btn-secondary btn-sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function ShopCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton h-36 rounded-none" />
      <div className="space-y-3 p-4">
        <div className="skeleton h-4 w-2/3" />
        <div className="skeleton h-3 w-1/3" />
        <div className="skeleton h-3 w-1/2" />
        <div className="flex gap-2 pt-1">
          <div className="skeleton h-8 flex-1" />
          <div className="skeleton h-8 flex-1" />
        </div>
      </div>
    </div>
  );
}

// --- Modal -------------------------------------------------------------------

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  useEscapeKey(onClose, open);
  useLockBodyScroll(open);

  if (!open) return null;

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-3xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close dialog" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={clsx(
          'relative z-10 w-full rounded-t-2xl bg-white dark:bg-slate-900 text-ink-900 dark:text-slate-100 shadow-xl sm:rounded-2xl border border-ink-200/50 dark:border-slate-800',
          'max-h-[92vh] overflow-y-auto',
          widths[size],
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4">
          <h2 className="text-base font-semibold text-ink-900 dark:text-slate-100">{title}</h2>
          <button type="button" onClick={onClose} className="btn-ghost btn-sm -mr-2 text-ink-500 dark:text-slate-400" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

// --- Toasts ------------------------------------------------------------------

const TOAST_ICONS = {
  success: <CheckCircle2 size={18} className="text-emerald-600" />,
  error: <AlertCircle size={18} className="text-rose-600" />,
  info: <Info size={18} className="text-brand-600" />,
};

export function ToastViewport() {
  const { toasts, dismiss } = useToasts();

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className="pointer-events-auto flex items-start gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3 shadow-lg"
        >
          {TOAST_ICONS[toast.variant]}
          <p className="flex-1 text-sm text-ink-800">{toast.message}</p>
          <button type="button" onClick={() => dismiss(toast.id)} className="text-ink-400 hover:text-ink-600" aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

// --- Pagination --------------------------------------------------------------

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  // Show a sliding window of at most 5 page numbers.
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i).filter((p) => p <= totalPages);

  return (
    <nav className="flex items-center justify-center gap-1.5 pt-6" aria-label="Pagination">
      <button
        type="button"
        className="btn-secondary btn-sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </button>

      {start > 1 && <span className="px-1 text-ink-400">…</span>}

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          aria-current={p === page ? 'page' : undefined}
          className={clsx('btn btn-sm min-w-9', p === page ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-ink-100')}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}

      {start + pages.length - 1 < totalPages && <span className="px-1 text-ink-400">…</span>}

      <button
        type="button"
        className="btn-secondary btn-sm"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}

// --- Misc --------------------------------------------------------------------

/** Scrolls to the top whenever the route changes. */
export function ScrollToTop({ trigger }: { trigger: string }) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [trigger]);
  return null;
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-600">
      <AlertCircle size={12} aria-hidden />
      {message}
    </p>
  );
}
