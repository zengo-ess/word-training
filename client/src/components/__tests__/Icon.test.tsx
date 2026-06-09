/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Icon } from "../Icon";

describe("Icon", () => {
  it("рендерит svg по известному имени", () => {
    const { container } = render(<Icon name="home" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("рендерит запасную иконку для неизвестного имени", () => {
    const { container } = render(<Icon name="нет-такой" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
