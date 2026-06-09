import type { CSSProperties } from "react";
import { Icon } from "./Icon";

type Variant = "surface" | "plain" | "ghost";

export interface IconBtnProps {
  name: string;
  onClick?: () => void;
  size?: number;
  iconSize?: number;
  variant?: Variant;
  style?: CSSProperties;
  "aria-label"?: string;
}

const VARIANTS: Record<Variant, CSSProperties> = {
  surface: { background: "var(--surface)", boxShadow: "var(--shadow-sm)", color: "var(--ink)" },
  plain: { background: "var(--surface-2)", color: "var(--ink-soft)" },
  ghost: { background: "transparent", color: "var(--ink-soft)" },
};

export function IconBtn({
  name,
  onClick,
  size = 40,
  iconSize = 20,
  variant = "surface",
  style = {},
  "aria-label": ariaLabel,
}: IconBtnProps) {
  return (
    <button
      className="btn-press"
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? name}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...VARIANTS[variant],
        ...style,
      }}
    >
      <Icon name={name} size={iconSize} stroke={2.3} />
    </button>
  );
}
