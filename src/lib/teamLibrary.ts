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
import type { SavedTeam, SavedTeamInput } from "../types/teamLibrary";

const COLLECTION = "teamLibrary";

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
      const teams = snap.docs.map((d) => ({
        id: d.id,
        name: String(d.data().name ?? ""),
        athletes: Array.isArray(d.data().athletes)
          ? (d.data().athletes as string[])
          : [],
      }));
      onChange(sortByName(teams));
    },
    (err) => onError?.(err)
  );
}

export async function createSavedTeam(team: SavedTeamInput) {
  await addDoc(collection(db, COLLECTION), {
    name: team.name.trim(),
    athletes: team.athletes ?? [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateSavedTeam(id: string, team: SavedTeamInput) {
  await updateDoc(doc(db, COLLECTION, id), {
    name: team.name.trim(),
    athletes: team.athletes ?? [],
    updatedAt: serverTimestamp(),
  });
}

export async function deleteSavedTeam(id: string) {
  await deleteDoc(doc(db, COLLECTION, id));
}
