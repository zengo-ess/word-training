import type { ReactNode } from "react";

export interface PageProps {
  children?: ReactNode;
  withNav?: boolean;
  pad?: boolean;
}

export function Page({ children, withNav = true, pad = true }: PageProps) {
  return (
    <div
      className="page-scroll"
      style={{
        height: "100%",
        overflowY: "auto",
        paddingTop: 20,
        paddingBottom: withNav ? 96 : 28,
        paddingLeft: pad ? 18 : 0,
        paddingRight: pad ? 18 : 0,
      }}
    >
      {children}
    </div>
  );
}
