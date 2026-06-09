import type { CSSProperties, ReactNode } from "react";

export interface CardProps {
  children?: ReactNode;
  onClick?: () => void;
  pad?: number;
  style?: CSSProperties;
  className?: string;
}

export function Card({ children, onClick, pad = 16, style = {}, className = "" }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`${onClick ? "card-tap" : ""} ${className}`.trim()}
      style={{
        background: "var(--surface)",
        borderRadius: "var(--r-card)",
        padding: pad,
        boxShadow: "var(--shadow-sm)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
