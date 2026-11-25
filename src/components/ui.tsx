import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

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
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-ink">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-panel border border-line bg-card p-4", className)}>{children}</div>;
}

type ButtonVariant = "primary" | "ghost" | "danger";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const styles: Record<ButtonVariant, string> = {
    primary: "bg-ink text-paper hover:bg-ink/90 disabled:opacity-60",
    ghost: "border border-line bg-card text-ink hover:bg-paper",
    danger: "text-danger hover:bg-danger/10",
  };
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center rounded-btn px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed",
        styles[variant],
        className,
      )}
    />
  );
}

export function Field({
  label,
  children,
  className,
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("block text-sm text-ink", className)}>
      {label ? <span className="mb-1 block text-muted">{label}</span> : null}
      {children}
    </label>
  );
}

const controlClass =
  "w-full rounded-btn border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-ink disabled:opacity-60";

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(controlClass, className)} />;
}

export function TextSelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(controlClass, className)} />;
}

export function TextTextarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(controlClass, className)} />;
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
    <div className="-mx-1 flex gap-1 overflow-x-auto pb-1">
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={String(item.id)}
            type="button"
            onClick={() => onChange(item.id)}
            className={cx(
              "shrink-0 rounded-btn px-3 py-1.5 text-sm transition-colors",
              active ? "bg-ink font-medium text-paper" : "bg-card text-ink hover:bg-paper",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-panel border border-line bg-card p-6 text-sm text-muted">{children}</p>;
}

export function Message({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "danger" }) {
  return <p className={cx("text-sm", tone === "danger" ? "text-danger" : "text-muted")}>{children}</p>;
}

export function TableShell({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-panel border border-line bg-card">{children}</div>;
}
