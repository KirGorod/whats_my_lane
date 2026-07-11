import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  type Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import type {
  CompetitorList,
  CompetitorListAthlete,
  CompetitorListInput,
} from "../types/competitorList";

const COLLECTION = "competitorLists";

function timestampToMs(value: unknown): number {
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as Timestamp).toMillis === "function"
  ) {
    return (value as Timestamp).toMillis();
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return 0;
}

function normalizeAthletes(raw: unknown): CompetitorListAthlete[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const name = String((item as CompetitorListAthlete).name ?? "").trim();
      const category = String(
        (item as CompetitorListAthlete).category ?? ""
      ).trim();
      if (!name || !category) return null;
      return { name, category };
    })
    .filter((a): a is CompetitorListAthlete => a !== null);
}

const sortByCreatedAt = (lists: CompetitorList[]) =>
  [...lists].sort((a, b) => a.createdAtMs - b.createdAtMs);

export function subscribeCompetitorLists(
  onChange: (lists: CompetitorList[]) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    collection(db, COLLECTION),
    (snap) => {
      const lists = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: String(data.name ?? ""),
          athletes: normalizeAthletes(data.athletes),
          createdAtMs: timestampToMs(data.createdAt),
        };
      });
      onChange(sortByCreatedAt(lists));
    },
    (err) => onError?.(err)
  );
}

export async function createCompetitorList(list: CompetitorListInput) {
  await addDoc(collection(db, COLLECTION), {
    name: list.name.trim(),
    athletes: list.athletes ?? [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateCompetitorList(
  id: string,
  list: CompetitorListInput
) {
  await updateDoc(doc(db, COLLECTION, id), {
    name: list.name.trim(),
    athletes: list.athletes ?? [],
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCompetitorList(id: string) {
  await deleteDoc(doc(db, COLLECTION, id));
}
