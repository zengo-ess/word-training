/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAsync } from "../useAsync";

describe("useAsync", () => {
  it("загружает данные и снимает loading", async () => {
    const { result } = renderHook(() =>
      useAsync(() => Promise.resolve(42), []),
    );
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBe(42);
    expect(result.current.error).toBeUndefined();
  });

  it("ловит ошибку и кладёт сообщение", async () => {
    const { result } = renderHook(() =>
      useAsync(() => Promise.reject(new Error("Бум")), []),
    );
    await waitFor(() => expect(result.current.error).toBe("Бум"));
    expect(result.current.loading).toBe(false);
  });

  it("reload перезапускает загрузку", async () => {
    let count = 0;
    const { result } = renderHook(() =>
      useAsync(() => {
        count += 1;
        return Promise.resolve(count);
      }, []),
    );
    await waitFor(() => expect(result.current.data).toBe(1));
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.data).toBe(2));
  });
});
