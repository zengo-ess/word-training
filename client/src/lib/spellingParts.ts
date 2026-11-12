const ENGLISH_SPELLING_PARTS: ReadonlyMap<string, readonly string[]> = new Map([
  ["fish", ["f", "i", "sh"]],
  ["shop", ["sh", "o", "p"]],
  ["ship", ["sh", "i", "p"]],
  ["shoe", ["sh", "o", "e"]],
  ["shirt", ["sh", "i", "r", "t"]],
  ["short", ["sh", "o", "r", "t"]],
  ["T-shirt", ["T-", "sh", "i", "r", "t"]],
  ["chip", ["ch", "i", "p"]],
  ["chair", ["ch", "a", "i", "r"]],
  ["cheese", ["ch", "ee", "s", "e"]],
  ["chicken", ["ch", "i", "ck", "e", "n"]],
  ["lunch", ["l", "u", "n", "ch"]],
  ["teacher", ["t", "e", "a", "ch", "e", "r"]],
  ["duck", ["d", "u", "ck"]],
  ["bee", ["b", "ee"]],
  ["sheep", ["sh", "ee", "p"]],
  ["goose", ["g", "oo", "s", "e"]],
  ["moose", ["m", "oo", "s", "e"]],
  ["cow", ["c", "ow"]],
  ["goat", ["g", "oa", "t"]],
  ["snail", ["s", "n", "ai", "l"]],
]);

/** Returns the taught letter groups for an English word, when available. */
export function getSpellingParts(word: string, language: string): readonly string[] | undefined {
  return language === "en" ? ENGLISH_SPELLING_PARTS.get(word) : undefined;
}
