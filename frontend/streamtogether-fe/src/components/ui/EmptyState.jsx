export default function EmptyState({ icon = "✨", title, description, action, className = "" }) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-[20px] border border-dashed border-frame bg-canvas px-6 py-10 text-center ${className}`}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[12px] bg-surface text-2xl">
        {icon}
      </div>
      {title && <h3 className="kicker text-base text-ink">{title}</h3>}
      {description && <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
