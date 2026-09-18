// Подписи, зависящие от изучаемого языка. Держим в одном месте: их используют
// и тренажёр, и повторение, и профиль — раньше они были продублированы строками.

export type Direction = "toNative" | "toForeign" | "both";

const LANG_CODE: Record<string, string> = { en: "EN", de: "DE" };
const LANG_NAME_ACCUSATIVE: Record<string, string> = { en: "английский", de: "немецкий" };

export function langCode(language: string): string {
  return LANG_CODE[language] ?? LANG_CODE.en;
}

export function langNameAccusative(language: string): string {
  return LANG_NAME_ACCUSATIVE[language] ?? LANG_NAME_ACCUSATIVE.en;
}

export function exerciseNames(language: string): Record<number, string> {
  const code = langCode(language);
  return {
    1: `Перевод ${code}→RU`,
    2: `Перевод RU→${code}`,
    3: "Вставь пропуск",
    4: "Собери из букв",
    5: "Аудио",
  };
}

export function typeShort(language: string): Record<number, string> {
  const code = langCode(language);
  return { 1: `${code} → RU`, 2: `RU → ${code}` };
}

export function directionLabels(
  language: string,
): { key: Direction; label: string; sub: string }[] {
  const short = typeShort(language);
  return [
    { key: "toNative", label: short[1], sub: "Только Тип 1" },
    { key: "toForeign", label: short[2], sub: "Только Тип 2" },
    { key: "both", label: "Оба", sub: "Чередуем Тип 1 и Тип 2" },
  ];
}

export function directionLabel(language: string, direction: Direction): string {
  return directionLabels(language).find((d) => d.key === direction)?.label ?? "Оба";
}
