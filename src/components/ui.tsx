import {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-balance text-foreground">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  children,
  className,
  title,
  description,
  actions,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <section className="desk-panel overflow-hidden">
      {title || actions ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line bg-paper/50 px-4 py-3">
          <div className="min-w-0">
            {title ? <h2 className="font-semibold text-foreground">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cx("p-4", className)}>{children}</div>
    </section>
  );
}

type ButtonVariant = "primary" | "ghost" | "danger" | "soft" | "gold" | "link";
type ButtonSize = "sm" | "md" | "lg";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-white shadow-sm hover:bg-ink-soft active:bg-ink-deep",
  ghost: "border border-line bg-card text-foreground hover:border-ink/30 hover:bg-paper active:bg-line/50",
  danger: "border border-danger/25 bg-danger/5 text-danger hover:bg-danger/10 active:bg-danger/15",
  soft: "bg-paper text-foreground hover:bg-line/70 active:bg-line",
  gold: "bg-gold text-foreground hover:bg-gold-soft active:bg-[#d49410]",
  link: "bg-transparent px-1.5 py-1 text-ink underline-offset-4 hover:underline",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "min-h-8 px-2.5 py-1 text-xs",
  md: "min-h-9 px-3.5 py-2 text-sm",
  lg: "min-h-11 px-4 py-2.5 text-sm",
};

export function buttonClass({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cx(
    "inline-flex items-center justify-center gap-1.5 rounded-btn font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/80 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:translate-y-px",
    variant !== "link" && buttonSizes[size],
    buttonVariants[variant],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button {...props} className={buttonClass({ variant, size, className })} />;
}

export function ButtonLink({
  href,
  variant = "ghost",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a href={href} className={buttonClass({ variant, size, className })}>
      {children}
    </a>
  );
}

export function Field({
  label,
  children,
  className,
  hint,
}: {
  label?: string;
  children: ReactNode;
  className?: string;
  hint?: string;
}) {
  return (
    <label className={cx("block text-sm text-foreground", className)}>
      {label ? <span className="mb-1.5 block text-[13px] font-medium text-muted">{label}</span> : null}
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

const controlClass =
  "w-full rounded-btn border border-line bg-card px-3 py-2 text-sm text-foreground shadow-inset-paper outline-none transition-[border-color,box-shadow] placeholder:text-muted/70 focus:border-ink/45 focus:ring-2 focus:ring-ink/20 disabled:cursor-not-allowed disabled:bg-paper disabled:opacity-60";

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(controlClass, className)} />;
}

export function TextSelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(controlClass, "pr-8", className)} />;
}

export function TextTextarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(controlClass, "min-h-24 resize-y", className)} />;
}

export function CheckLabel({
  children,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { children: ReactNode }) {
  return (
    <label
      className={cx(
        "inline-flex cursor-pointer items-center gap-2 rounded-btn border border-line bg-card px-3 py-2 text-sm text-foreground transition-colors hover:bg-paper has-[:checked]:border-ink/35 has-[:checked]:bg-paper",
        className,
      )}
    >
      <input {...props} type="checkbox" className="h-4 w-4 accent-ink" />
      <span>{children}</span>
    </label>
  );
}

export function Tabs({
  items,
  value,
  onChange,
}: {
  items: { id: string | number; label: string }[];
  value: string | number | null;
  onChange: (id: string | number) => void;
}) {
  return (
    <div className="desk-toolbar -mx-1 overflow-x-auto">
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={String(item.id)}
            type="button"
            onClick={() => onChange(item.id)}
            className={cx("desk-chip shrink-0", active ? "desk-chip-active" : "desk-chip-idle")}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "gold" | "ink" | "danger" | "success";
}) {
  const tones = {
    muted: "bg-paper text-muted",
    gold: "bg-gold/25 text-foreground",
    ink: "bg-ink/10 text-ink",
    danger: "bg-danger/10 text-danger",
    success: "bg-success/10 text-success",
  };
  return (
    <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
}

export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/35 p-0 backdrop-blur-[3px] md:items-center md:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[1.25rem] border border-line bg-card shadow-lift md:rounded-panel"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-card/95 px-4 py-3 backdrop-blur">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <Button type="button" variant="link" size="sm" onClick={onClose} className="text-muted">
            닫기
          </Button>
        </div>
        <div className="space-y-3 p-4">{children}</div>
        {footer ? (
          <div className="sticky bottom-0 flex gap-2 border-t border-line bg-card/95 p-4 backdrop-blur">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-panel border border-dashed border-line bg-card px-6 py-12 text-center text-sm text-muted shadow-desk">
      {children}
    </div>
  );
}

export function Message({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "danger" | "ok" }) {
  const tones = {
    muted: "border-line bg-card text-muted",
    danger: "border-danger/25 bg-danger/5 text-danger",
    ok: "border-ink/20 bg-ink/5 text-ink",
  };
  return <p className={cx("rounded-btn border px-3 py-2 text-sm", tones[tone])}>{children}</p>;
}

export function TableShell({ children }: { children: ReactNode }) {
  return <div className="desk-panel overflow-hidden">{children}</div>;
}

export function StatGrid({
  items,
  columns = 4,
}: {
  items: Array<{ label: string; value: ReactNode; hint?: string }>;
  columns?: 3 | 4 | 5;
}) {
  const grid =
    columns === 5
      ? "grid gap-2 sm:grid-cols-2 lg:grid-cols-5"
      : columns === 3
        ? "grid gap-2 sm:grid-cols-3"
        : "grid gap-2 sm:grid-cols-2 lg:grid-cols-4";
  return (
    <div className={grid}>
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-btn border border-line bg-gradient-to-br from-card to-paper px-3.5 py-3 shadow-desk"
        >
          <p className="text-[11px] font-medium text-muted">{item.label}</p>
          <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-foreground">{item.value}</p>
          {item.hint ? <p className="mt-0.5 text-[11px] text-muted">{item.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}
