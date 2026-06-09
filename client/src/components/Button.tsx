import type { CSSProperties, ReactNode } from "react";
import { Icon } from "./Icon";

type Variant = "primary" | "soft" | "ghost" | "surface" | "success" | "outline";
type Size = "lg" | "md" | "sm";

export interface ButtonProps {
  children?: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: string;
  iconRight?: string;
  full?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  style?: CSSProperties;
}

const VARIANTS: Record<Variant, CSSProperties> = {
  primary: {
    background: "var(--primary)",
    color: "var(--on-primary)",
    boxShadow: "0 6px 16px -6px var(--primary-glow), inset 0 -2px 0 rgba(0,0,0,0.12)",
  },
  soft: { background: "var(--primary-soft)", color: "var(--primary-ink)" },
  ghost: { background: "transparent", color: "var(--ink-soft)" },
  surface: { background: "var(--surface)", color: "var(--ink)", boxShadow: "var(--shadow-sm)" },
  success: { background: "var(--success)", color: "#fff", boxShadow: "0 6px 16px -6px var(--success)" },
  outline: { background: "transparent", color: "var(--ink)", boxShadow: "inset 0 0 0 2px var(--line)" },
};

export function Button({
  children,
  onClick,
  variant = "primary",
  size = "lg",
  icon,
  iconRight,
  full,
  disabled,
  type = "button",
  style = {},
}: ButtonProps) {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontFamily: "var(--font)",
    fontWeight: 800,
    cursor: disabled ? "not-allowed" : "pointer",
    border: "none",
    borderRadius: "var(--r-btn)",
    transition: "transform .12s, box-shadow .12s, background .15s, opacity .15s",
    width: full ? "100%" : "auto",
    opacity: disabled ? 0.45 : 1,
    whiteSpace: "nowrap",
    fontSize: size === "lg" ? 17 : size === "sm" ? 14 : 16,
    padding: size === "lg" ? "16px 22px" : size === "sm" ? "9px 14px" : "12px 18px",
  };
  const iconSize = size === "lg" ? 20 : 18;
  return (
    <button
      className="btn-press"
      type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{ ...base, ...VARIANTS[variant], ...style }}
    >
      {icon ? <Icon name={icon} size={iconSize} stroke={2.4} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={iconSize} stroke={2.4} /> : null}
    </button>
  );
}
