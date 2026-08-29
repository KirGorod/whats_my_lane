import type { Competitor } from "../types/competitor";

export type IncomingAthlete = Omit<Competitor, "id">;

export interface ExistingCompetitorRef {
  id: string;
  name: string;
  category: string;
  status?: string;
}

export interface DuplicateMatch {
  existing: ExistingCompetitorRef;
  kind: "exact" | "fuzzy";
  similarity: number;
}

export interface DuplicateFinding {
  incomingIndex: number;
  incoming: IncomingAthlete;
  existingMatches: DuplicateMatch[];
  batchMatchIndexes: number[];
}

export const FUZZY_THRESHOLD = 0.8;

const APOSTROPHES = /['’`ʼ]/g;

export const normalizeName = (raw: string): string =>
  (raw ?? "")
    .normalize("NFC")
    .replace(APOSTROPHES, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("uk");

/** Word-order-independent key: "Петренко Іван" and "Іван Петренко" produce the same key. */
export const nameKey = (raw: string): string =>
  normalizeName(raw).split(" ").sort().join(" ");

const levenshteinDistance = (a: string, b: string): number => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
};

export const nameSimilarity = (a: string, b: string): number => {
  const ka = nameKey(a);
  const kb = nameKey(b);
  const maxLen = Math.max(ka.length, kb.length);
  if (!maxLen) return 0;
  return 1 - levenshteinDistance(ka, kb) / maxLen;
};

const matchNames = (
  a: string,
  b: string
): { kind: "exact" | "fuzzy"; similarity: number } | null => {
  const ka = nameKey(a);
  const kb = nameKey(b);
  if (!ka || !kb) return null;
  if (ka === kb) return { kind: "exact", similarity: 1 };
  const maxLen = Math.max(ka.length, kb.length);
  const similarity = 1 - levenshteinDistance(ka, kb) / maxLen;
  return similarity >= FUZZY_THRESHOLD ? { kind: "fuzzy", similarity } : null;
};

/**
 * Compares each incoming athlete against the existing roster and against
 * earlier athletes in the same batch. Category is intentionally excluded from
 * the match key so wrong-category duplicates are still caught.
 */
export const findDuplicates = (
  incoming: IncomingAthlete[],
  existing: ExistingCompetitorRef[]
): DuplicateFinding[] => {
  const findings: DuplicateFinding[] = [];

  incoming.forEach((athlete, index) => {
    if (!nameKey(athlete.name)) return;

    const existingMatches: DuplicateMatch[] = [];
    existing.forEach((candidate) => {
      const match = matchNames(athlete.name, candidate.name);
      if (match) existingMatches.push({ existing: candidate, ...match });
    });
    existingMatches.sort((a, b) =>
      a.kind !== b.kind
        ? a.kind === "exact"
          ? -1
          : 1
        : b.similarity - a.similarity
    );

    const batchMatchIndexes: number[] = [];
    for (let prev = 0; prev < index; prev++) {
      if (matchNames(athlete.name, incoming[prev].name)) {
        batchMatchIndexes.push(prev);
      }
    }

    if (existingMatches.length || batchMatchIndexes.length) {
      findings.push({
        incomingIndex: index,
        incoming: athlete,
        existingMatches,
        batchMatchIndexes,
      });
    }
  });

  return findings;
};
