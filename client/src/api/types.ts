export interface Deck {
  id: string;
  name: string;
  is_builtin: number;
  language: string;
  created_at: string;
  total: number;
  learned: number;
}

export interface Word {
  id: string;
  deck_id: string;
  foreign_word: string;
  native_word: string;
  transcription: string | null;
  example_sentence: string | null;
  image_url: string | null;
  audio_url: string | null;
  created_at: string;
}

export interface Progress {
  id: string;
  word_id: string;
  current_type: number | null;
  learned_at: string | null;
  ease_factor: number;
  interval_days: number;
  next_review_at: string | null;
  total_reviews: number;
  correct_reviews: number;
}

export interface WordWithProgress extends Word {
  progress: Progress | null;
}

export interface Stats {
  learned: number;
  inProgress: number;
  dueToday: number;
  learnedToday: number;
  dailyGoal: number;
  streak: number;
  week: boolean[];
  decks: Deck[];
}
