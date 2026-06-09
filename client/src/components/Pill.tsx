import type { CSSProperties, ReactNode } from "react";
import { Icon } from "./Icon";

type Tone = "neutral" | "primary" | "success" | "amber" | "danger";

export interface PillProps {
  children?: ReactNode;
  tone?: Tone;
  icon?: string;
  style?: CSSProperties;
}

const TONES: Record<Tone, CSSProperties> = {
  neutral: { background: "var(--surface-2)", color: "var(--ink-soft)" },
  primary: { background: "var(--primary-soft)", color: "var(--primary-ink)" },
  success: { background: "var(--success-soft)", color: "var(--success-ink)" },
  amber: { background: "var(--amber-soft)", color: "var(--amber-ink)" },
  danger: { background: "var(--danger-soft)", color: "var(--danger-ink)" },
};

export function Pill({ children, tone = "neutral", icon, style = {} }: PillProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontFamily: "var(--font)",
        whiteSpace: "nowrap",
        fontWeight: 700,
        fontSize: 12.5,
        padding: "5px 10px",
        borderRadius: 999,
        ...TONES[tone],
        ...style,
      }}
    >
      {icon ? <Icon name={icon} size={13} stroke={2.6} /> : null}
      {children}
    </span>
  );
}
