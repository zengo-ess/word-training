/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import { addDays, initialSchedule, nextReviewInterval, reviewSchedule } from "../sm2.js";

const NOW = new Date("2026-06-05T12:00:00.000Z");

describe("addDays", () => {
  it("прибавляет дни в UTC", () => {
    expect(addDays(NOW, 3).toISOString()).toBe("2026-06-08T12:00:00.000Z");
  });
});

describe("initialSchedule", () => {
  it("первый повтор через 1 день, ease 2.5", () => {
    const s = initialSchedule(NOW);
    expect(s.intervalDays).toBe(1);
    expect(s.easeFactor).toBe(2.5);
    expect(s.nextReviewAt).toBe("2026-06-06T12:00:00.000Z");
  });
});

describe("nextReviewInterval", () => {
  it("1 → 3, 3 → 7, далее × ease", () => {
    expect(nextReviewInterval(1, 2.5)).toBe(3);
    expect(nextReviewInterval(3, 2.5)).toBe(7);
    expect(nextReviewInterval(7, 2.5)).toBe(18);
  });
});

describe("reviewSchedule", () => {
  it("верный ответ двигает интервал вперёд и повышает ease", () => {
    const s = reviewSchedule({ intervalDays: 1, easeFactor: 2.4 }, true, NOW);
    expect(s.intervalDays).toBe(3);
    expect(s.easeFactor).toBeCloseTo(2.5);
    expect(s.nextReviewAt).toBe("2026-06-08T12:00:00.000Z");
  });

  it("ease не превышает 2.5", () => {
    expect(reviewSchedule({ intervalDays: 7, easeFactor: 2.5 }, true, NOW).easeFactor).toBeCloseTo(2.5);
  });

  it("неверный ответ сбрасывает интервал в 1 и снижает ease", () => {
    const s = reviewSchedule({ intervalDays: 7, easeFactor: 2.5 }, false, NOW);
    expect(s.intervalDays).toBe(1);
    expect(s.easeFactor).toBeCloseTo(2.3);
    expect(s.nextReviewAt).toBe("2026-06-06T12:00:00.000Z");
  });

  it("ease не опускается ниже 1.3", () => {
    expect(reviewSchedule({ intervalDays: 1, easeFactor: 1.3 }, false, NOW).easeFactor).toBeCloseTo(1.3);
  });
});
