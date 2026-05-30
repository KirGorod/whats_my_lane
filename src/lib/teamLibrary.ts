import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { normalizeTeamName } from "./teamNames";
import type { SavedTeam, SavedTeamInput } from "../types/teamLibrary";

const COLLECTION = "teamLibrary";

export function collectLibraryTeamNameKeys(teams: SavedTeam[]): Set<string> {
  const keys = new Set<string>();
  teams.forEach((team) => {
    const key = team.name?.trim();
    if (key) keys.add(normalizeTeamName(key));
  });
  return keys;
}

const sortByName = (teams: SavedTeam[]) =>
  [...teams].sort((a, b) =>
    a.name.localeCompare(b.name, "uk", { sensitivity: "base" })
  );

export function subscribeTeamLibrary(
  onChange: (teams: SavedTeam[]) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    collection(db, COLLECTION),
    (snap) => {
      const teams = snap.docs.map((d) => {
        const data = d.data();
        const city =
          typeof data.city === "string" && data.city.trim()
            ? data.city.trim()
            : undefined;
        return {
          id: d.id,
          name: String(data.name ?? ""),
          ...(city ? { city } : {}),
          athletes: Array.isArray(data.athletes)
            ? (data.athletes as string[])
            : [],
        };
      });
      onChange(sortByName(teams));
    },
    (err) => onError?.(err)
  );
}

export async function createSavedTeam(team: SavedTeamInput) {
  await addDoc(collection(db, COLLECTION), {
    name: team.name.trim(),
    city: team.city?.trim() || null,
    athletes: team.athletes ?? [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateSavedTeam(id: string, team: SavedTeamInput) {
  await updateDoc(doc(db, COLLECTION, id), {
    name: team.name.trim(),
    city: team.city?.trim() || null,
    athletes: team.athletes ?? [],
    updatedAt: serverTimestamp(),
  });
}

export async function deleteSavedTeam(id: string) {
  await deleteDoc(doc(db, COLLECTION, id));
}
