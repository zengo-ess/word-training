export interface Deck {
  id: string;
  name: string;
  is_builtin: number;
  created_at: string;
}

export interface Word {
  id: string;
  deck_id: string;
  english: string;
  russian: string;
  transcription: string | null;
  example_sentence: string | null;
  image_url: string | null;
  audio_url: string | null;
  created_at: string;
}
