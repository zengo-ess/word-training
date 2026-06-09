import { Icon } from "./Icon";

export interface WordTileProps {
  icon: string;
  hue?: number;
  size?: number;
  round?: number;
  photo?: boolean;
}

export function WordTile({ icon, hue = 55, size = 88, round, photo }: WordTileProps) {
  const px = size;
  const iconSize = px * 0.42;
  const radius = round != null ? round : "var(--r-tile)";
  return (
    <div
      style={{
        width: px,
        height: px,
        borderRadius: radius,
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(150deg, oklch(0.94 0.06 ${hue}), oklch(0.88 0.09 ${hue}))`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.5,
          background: `radial-gradient(120% 90% at 78% 18%, oklch(0.97 0.05 ${hue}) 0%, transparent 55%)`,
        }}
      />
      <Icon name={icon} size={iconSize} color={`oklch(0.45 0.13 ${hue})`} stroke={px > 120 ? 2 : 2.2} />
      {photo ? (
        <div
          style={{
            position: "absolute",
            bottom: 6,
            right: 6,
            fontFamily: "var(--mono)",
            fontSize: 9,
            letterSpacing: 0.3,
            color: `oklch(0.42 0.1 ${hue})`,
            background: "rgba(255,255,255,0.65)",
            padding: "2px 6px",
            borderRadius: 6,
            textTransform: "uppercase",
          }}
        >
          фото
        </div>
      ) : null}
    </div>
  );
}
