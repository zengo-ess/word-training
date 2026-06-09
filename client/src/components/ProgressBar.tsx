export interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  height?: number;
  bg?: string;
}

export function ProgressBar({
  value,
  max = 100,
  color = "var(--primary)",
  height = 8,
  bg = "var(--track)",
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ height, background: bg, borderRadius: 999, overflow: "hidden", width: "100%" }}>
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: color,
          borderRadius: 999,
          transition: "width .5s cubic-bezier(.4,0,.2,1)",
        }}
      />
    </div>
  );
}
