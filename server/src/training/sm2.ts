export interface Schedule {
  intervalDays: number;
  easeFactor: number;
  nextReviewAt: string;
}

const MIN_EASE = 1.3;
const MAX_EASE = 2.5;

export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function initialSchedule(now: Date): Schedule {
  return {
    intervalDays: 1,
    easeFactor: MAX_EASE,
    nextReviewAt: addDays(now, 1).toISOString(),
  };
}

export function nextReviewInterval(intervalDays: number, easeFactor: number): number {
  if (intervalDays <= 1) {
    return 3;
  }
  if (intervalDays <= 3) {
    return 7;
  }
  return Math.round(intervalDays * easeFactor);
}

export function reviewSchedule(
  current: { intervalDays: number; easeFactor: number },
  correct: boolean,
  now: Date,
): Schedule {
  if (!correct) {
    return {
      intervalDays: 1,
      easeFactor: Math.max(MIN_EASE, current.easeFactor - 0.2),
      nextReviewAt: addDays(now, 1).toISOString(),
    };
  }
  const intervalDays = nextReviewInterval(current.intervalDays, current.easeFactor);
  return {
    intervalDays,
    easeFactor: Math.min(MAX_EASE, current.easeFactor + 0.1),
    nextReviewAt: addDays(now, intervalDays).toISOString(),
  };
}
