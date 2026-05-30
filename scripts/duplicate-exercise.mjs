import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  writeBatch,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    })
);

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});

const db = getFirestore(app);

const SOURCE_NAME = "Веслування 100м";
const DUPLICATE_COUNT = 2;

function stripDocMeta(data) {
  const copy = { ...data };
  delete copy.id;
  return copy;
}

async function findExerciseByName(name) {
  const snap = await getDocs(
    query(collection(db, "exercises"), where("name", "==", name))
  );
  if (snap.empty) {
    throw new Error(`Exercise "${name}" not found`);
  }
  if (snap.size > 1) {
    console.warn(`Found ${snap.size} exercises with name "${name}", using first`);
  }
  const docSnap = snap.docs[0];
  return { id: docSnap.id, ...docSnap.data() };
}

async function getSubcollection(exerciseId, sub) {
  const snap = await getDocs(collection(db, "exercises", exerciseId, sub));
  return snap.docs.map((d) => ({ docId: d.id, ...d.data() }));
}

async function duplicateExercise(sourceId, sourceData, suffix) {
  const batch = writeBatch(db);
  const newExerciseRef = doc(collection(db, "exercises"));

  const exercisePayload = stripDocMeta(sourceData);
  delete exercisePayload.id;
  exercisePayload.name = `${SOURCE_NAME} (${suffix})`;
  exercisePayload.status = "planned";
  exercisePayload.createdAt = serverTimestamp();

  batch.set(newExerciseRef, exercisePayload);

  const teams = await getSubcollection(sourceId, "teams");
  const teamIdMap = new Map();

  for (const team of teams) {
    const newTeamRef = doc(collection(db, "exercises", newExerciseRef.id, "teams"));
    teamIdMap.set(team.docId, newTeamRef.id);

    const teamPayload = stripDocMeta(team);
    delete teamPayload.docId;
    teamPayload.status = "waiting";
    delete teamPayload.order;
    teamPayload.createdAt = serverTimestamp();

    batch.set(newTeamRef, teamPayload);
  }

  const lanes = await getSubcollection(sourceId, "lanes");
  for (const lane of lanes) {
    const newLaneRef = doc(collection(db, "exercises", newExerciseRef.id, "lanes"));
    const lanePayload = stripDocMeta(lane);
    delete lanePayload.docId;

    lanePayload.team = null;
    lanePayload.readyUpTeam = null;
    lanePayload.locked = false;
    lanePayload.createdAt = serverTimestamp();

    batch.set(newLaneRef, lanePayload);
  }

  await batch.commit();
  return {
    id: newExerciseRef.id,
    name: exercisePayload.name,
    teamsCount: teams.length,
    lanesCount: lanes.length,
  };
}

async function main() {
  console.log(`Looking for "${SOURCE_NAME}"...`);
  const source = await findExerciseByName(SOURCE_NAME);
  console.log(`Found: id=${source.id}, kind=${source.competitionKind ?? "veteran"}`);

  const teams = await getSubcollection(source.id, "teams");
  const lanes = await getSubcollection(source.id, "lanes");
  console.log(`Source has ${teams.length} teams, ${lanes.length} lanes`);
  if (teams.length) {
    const sample = teams[0];
    console.log(
      `Sample team: "${sample.name}", athletes: ${JSON.stringify(sample.athletes ?? [])}`
    );
  }

  const results = [];
  for (let i = 1; i <= DUPLICATE_COUNT; i++) {
    const result = await duplicateExercise(source.id, source, `копія ${i}`);
    results.push(result);
    console.log(`Created: ${result.name} (${result.id}) — ${result.teamsCount} teams, ${result.lanesCount} lanes`);
  }

  console.log("\nDone!");
  for (const r of results) {
    console.log(`  - ${r.name}: ${r.id}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
