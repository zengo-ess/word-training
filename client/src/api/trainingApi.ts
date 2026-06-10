import { apiRequest } from "./http";
import { getToken } from "../auth/token";
import type { Word, Progress } from "./types";

export interface LearnableWord {
  word: Word;
  currentType: number;
}

export interface DueReview {
  word: Word;
  progress: Progress;
}

export interface TodayTraining {
  newWords: LearnableWord[];
  reviewWords: DueReview[];
}

export async function fetchTodayTraining(fetchFn: typeof fetch = fetch): Promise<TodayTraining> {
  return apiRequest<TodayTraining>("/api/training/today", { token: getToken() }, fetchFn);
}

export async function postTrainingResult(
  wordId: string,
  mode: "step" | "learned",
  currentType?: number,
  fetchFn: typeof fetch = fetch,
): Promise<{ progress: Progress }> {
  return apiRequest<{ progress: Progress }>(
    "/api/training/result",
    {
      method: "POST",
      body: currentType !== undefined ? { wordId, mode, currentType } : { wordId, mode },
      token: getToken(),
    },
    fetchFn,
  );
}

export async function postReviewResult(
  wordId: string,
  correct: boolean,
  fetchFn: typeof fetch = fetch,
): Promise<{ progress: Progress }> {
  return apiRequest<{ progress: Progress }>(
    "/api/training/result",
    { method: "POST", body: { wordId, mode: "review", correct }, token: getToken() },
    fetchFn,
  );
}
