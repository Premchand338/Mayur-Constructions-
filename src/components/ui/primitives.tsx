import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as SelectPrimitive from '@radix-ui/react-select';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Info,
  X,
  XCircle,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

// 1. Button
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', type = 'button', ...props }, ref) => {
    const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
      primary:
        'bg-[#245BFF] text-white hover:bg-[#1B49D4] border border-transparent shadow-xs',
      secondary:
        'bg-[#F3F1EC] text-[#171717] hover:bg-[#E8E5DD] border border-[#E5E2DC]',
      outline:
        'bg-white text-[#171717] hover:bg-[#FAF9F6] border border-[#E5E2DC]',
      ghost: 'bg-transparent text-[#52524E] hover:bg-[#F3F1EC] hover:text-[#171717] border border-transparent',
      danger: 'bg-[#DC2626] text-white hover:bg-[#B91C1C] border border-transparent',
    };
    const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
      sm: 'min-h-[38px] px-3 py-1.5 text-xs',
      md: 'min-h-[44px] px-4 py-2 text-sm',
      lg: 'min-h-[48px] px-5 py-2.5 text-sm',
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#245BFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF9F6]',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

// 2. Card (single-elevation hairline surface)
export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'bg-white border border-[#E5E2DC] rounded-2xl',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// 3. Form Inputs
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'w-full min-h-[44px] rounded-xl border border-[#D8D4CB] bg-white px-3.5 py-2 text-sm text-[#171717] placeholder:text-[#8A8882] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#245BFF] focus-visible:border-[#245BFF] disabled:bg-[#F3F1EC] disabled:text-[#73726C]',
      className
    )}
    {...props}
  />
));
Input.displayName = 'Input';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'w-full min-h-[88px] rounded-xl border border-[#D8D4CB] bg-white px-3.5 py-2.5 text-sm text-[#171717] placeholder:text-[#8A8882] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#245BFF] focus-visible:border-[#245BFF]',
      className
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export function FieldLabel({
  children,
  htmlFor,
  required,
  hint,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <label htmlFor={htmlFor} className="text-xs font-medium text-[#171717]">
        {children}
        {required && <span className="text-[#DC2626] ml-0.5">*</span>}
      </label>
      {hint && <span className="text-[11px] text-[#73726C]">{hint}</span>}
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-[#DC2626]">{message}</p>;
}

// 4. Native-accessible / Radix Select
export function SelectField({
  value,
  onValueChange,
  options,
  placeholder = 'Select...',
  disabled,
  className,
}: {
  value: string;
  onValueChange: (val: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        className={cn(
          'flex w-full min-h-[44px] items-center justify-between gap-2 rounded-xl border border-[#D8D4CB] bg-white px-3.5 py-2 text-sm text-[#171717] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#245BFF] disabled:bg-[#F3F1EC] disabled:opacity-70 cursor-pointer',
          className
        )}
      >
        <span className="truncate text-left">
          <SelectPrimitive.Value placeholder={placeholder} />
        </span>
        <SelectPrimitive.Icon>
          <ChevronDown className="h-4 w-4 text-[#73726C] shrink-0" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="z-[100] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-[#E5E2DC] bg-white shadow-lg"
        >
          <SelectPrimitive.Viewport className="p-1.5">
            {options.map((opt) => (
              <SelectPrimitive.Item
                key={opt.value}
                value={opt.value}
                className="relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 pl-8 pr-3 text-sm text-[#171717] outline-none data-[highlighted]:bg-[#F3F1EC] data-[state=checked]:font-medium"
              >
                <span className="absolute left-2.5 flex h-4 w-4 items-center justify-center">
                  <SelectPrimitive.ItemIndicator>
                    <Check className="h-3.5 w-3.5 text-[#245BFF]" />
                  </SelectPrimitive.ItemIndicator>
                </span>
                <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

// 5. Dialog Modal
export function DialogModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  maxWidthClass = 'max-w-xl',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#E5E2DC] bg-white p-5 sm:p-6 shadow-xl max-h-[90vh] overflow-y-auto focus:outline-none',
            maxWidthClass
          )}
        >
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#E5E2DC]">
            <div>
              <Dialog.Title className="text-lg font-semibold text-[#171717]">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-xs text-[#52524E]">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[#52524E] hover:bg-[#F3F1EC] hover:text-[#171717] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          <div className="pt-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// 6. Slide-Over Detail Drawer (Responsive)
export function SlideDrawer({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 w-full max-w-3xl bg-[#FAF9F6] border-l border-[#E5E2DC] shadow-2xl flex flex-col focus:outline-none">
          <div className="flex items-start justify-between gap-4 bg-white px-5 py-4 border-b border-[#E5E2DC] shrink-0">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-semibold text-[#171717] truncate">
                {title}
              </Dialog.Title>
              {subtitle && (
                <Dialog.Description className="mt-0.5 text-xs text-[#52524E] truncate">
                  {subtitle}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close drawer"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-[#E5E2DC] bg-white text-[#171717] hover:bg-[#F3F1EC] cursor-pointer shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// 7. Confirmation Dialog for destructive actions
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = true,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  return (
    <DialogModal open={open} onOpenChange={onOpenChange} title={title} maxWidthClass="max-w-md">
      <p className="text-sm text-[#52524E] leading-relaxed">{description}</p>
      <div className="mt-6 flex items-center justify-end gap-3">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          variant={destructive ? 'danger' : 'primary'}
          onClick={() => {
            onConfirm();
            onOpenChange(false);
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </DialogModal>
  );
}

// 8. Tabs Bar (clean segmented controls)
export function TabsBar({
  value,
  onValueChange,
  tabs,
}: {
  value: string;
  onValueChange: (val: string) => void;
  tabs: Array<{ value: string; label: string; count?: number }>;
}) {
  return (
    <TabsPrimitive.Root value={value} onValueChange={onValueChange}>
      <TabsPrimitive.List className="inline-flex flex-wrap items-center gap-1 rounded-xl bg-[#F3F1EC] p-1 border border-[#E5E2DC]">
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.value}
            value={tab.value}
            className={cn(
              'min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#245BFF]',
              value === tab.value
                ? 'bg-white text-[#171717] shadow-xs'
                : 'text-[#52524E] hover:text-[#171717]'
            )}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="ml-1.5 font-mono text-[11px] text-[#73726C] tabular-nums">
                ({tab.count})
              </span>
            )}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
    </TabsPrimitive.Root>
  );
}

// 9. Zero-Pill Semantic Status Text (always icon + text, never pill enclosure)
export function StatusText({
  tone,
  label,
}: {
  tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  label: string;
}) {
  const styles = {
    success: { text: 'text-[#15803D]', Icon: CheckCircle2 },
    warning: { text: 'text-[#B45309]', Icon: Clock },
    danger: { text: 'text-[#B91C1C]', Icon: XCircle },
    info: { text: 'text-[#1D4ED8]', Icon: Info },
    neutral: { text: 'text-[#52524E]', Icon: Info },
  }[tone];

  const Icon = styles.Icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap', styles.text)}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
    </span>
  );
}

// 10. Empty State
export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#D8D4CB] bg-white px-6 py-12 text-center">
      <p className="text-base font-semibold text-[#171717]">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-[#52524E]">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button onClick={onAction}>{actionLabel}</Button>
        </div>
      )}
    </div>
  );
}

// 11. Toast Stack
export function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Array<{ id: string; title: string; description?: string; tone: 'success' | 'warning' | 'error' | 'info' }>;
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 md:bottom-6 right-4 z-[90] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm"
    >
      {toasts.map((toast) => {
        const Icon =
          toast.tone === 'success'
            ? CheckCircle2
            : toast.tone === 'warning'
            ? AlertTriangle
            : toast.tone === 'error'
            ? XCircle
            : Info;
        const iconColor =
          toast.tone === 'success'
            ? 'text-[#16A34A]'
            : toast.tone === 'warning'
            ? 'text-[#D97706]'
            : toast.tone === 'error'
            ? 'text-[#DC2626]'
            : 'text-[#245BFF]';

        return (
          <div
            key={toast.id}
            className="flex items-start gap-3 rounded-xl border border-[#E5E2DC] bg-white p-3.5 shadow-lg"
          >
            <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', iconColor)} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#171717]">{toast.title}</p>
              {toast.description && (
                <p className="mt-0.5 text-xs text-[#52524E]">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="text-[#73726C] hover:text-[#171717] p-1 cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
