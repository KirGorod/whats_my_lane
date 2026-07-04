import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/firebase";
import type { Competitor } from "@/types/competitor";
import type {
  CompetitionKind,
  ExerciseType,
} from "@/types/exercise";
import { LANE_TYPES, type LaneModel, type LaneType } from "@/types/lane";
import type { Team, TeamLaneModel } from "@/types/team";
import DisplayLayout from "./DisplayLayout";
import DisplayLanesGrid from "./DisplayLanesGrid";
import DisplayLaneCard from "./DisplayLaneCard";
import DisplayTeamLaneCard from "./DisplayTeamLaneCard";
import DisplayQueuePanel from "./DisplayQueuePanel";

const normalizeExerciseType = (raw: unknown): ExerciseType => {
  const v = String(raw ?? "").toLowerCase();
  if (v === "bench" || v === "kettle" || v === "airbike" || v === "rowing") {
    return v as ExerciseType;
  }
  if (v === "strength") return "bench";
  if (v === "cardio") return "airbike";
  if (v === "flexibility") return "rowing";
  return "bench";
};

type FirestoreTeamLane = {
  id: number;
  team?: TeamLaneModel["team"];
  readyUpTeam?: TeamLaneModel["readyUpTeam"];
  locked?: boolean;
};

export default function CompetitionDisplayPage() {
  const { exerciseId } = useParams<{ exerciseId: string }>();

  const [exerciseType, setExerciseType] = useState<ExerciseType>("bench");
  const [exerciseName, setExerciseName] = useState<string | undefined>();
  const [competitionKind, setCompetitionKind] =
    useState<CompetitionKind>("veteran");
  const [teamNamesOnly, setTeamNamesOnly] = useState(false);
  const [metaLoaded, setMetaLoaded] = useState(false);

  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [lanes, setLanes] = useState<LaneModel[]>([]);
  const [teamLanes, setTeamLanes] = useState<TeamLaneModel[]>([]);
  const competitionKindRef = useRef(competitionKind);
  competitionKindRef.current = competitionKind;

  useEffect(() => {
    if (!exerciseId) return;

    const unsub = onSnapshot(doc(db, "exercises", exerciseId), (snap) => {
      const data = snap.data() as Record<string, unknown> | undefined;
      if (!data) {
        setMetaLoaded(true);
        return;
      }

      setExerciseType(normalizeExerciseType(data.type));
      setExerciseName(typeof data.name === "string" ? data.name : undefined);
      setCompetitionKind(data.competitionKind === "team" ? "team" : "veteran");
      setTeamNamesOnly(!!data.teamNamesOnly);

      setMetaLoaded(true);
    });

    return () => unsub();
  }, [exerciseId]);

  useEffect(() => {
    if (!exerciseId) return;

    const lanesQuery = query(
      collection(db, "exercises", exerciseId, "lanes"),
      orderBy("id", "asc")
    );

    const unsubLanes = onSnapshot(lanesQuery, (snap) => {
      const isTeam = competitionKindRef.current === "team";

      if (isTeam) {
        setTeamLanes(
          snap.docs.map((d) => {
            const data = d.data() as FirestoreTeamLane;
            return {
              laneDocId: d.id,
              id: data.id,
              team: data.team ?? null,
              readyUpTeam: data.readyUpTeam ?? null,
              locked: !!data.locked,
            } satisfies TeamLaneModel;
          })
        );
        return;
      }

      setLanes(
        snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          const laneType: LaneType | null = (LANE_TYPES as readonly string[]).includes(
            data.laneType as string
          )
            ? (data.laneType as LaneType)
            : (LANE_TYPES as readonly string[]).includes(data.category as string)
              ? (data.category as LaneType)
              : null;

          return {
            laneDocId: d.id,
            id: data.id as number,
            laneType,
            nextLaneType: (LANE_TYPES as readonly string[]).includes(
              data.nextLaneType as string
            )
              ? (data.nextLaneType as LaneType)
              : null,
            category: laneType,
            competitor: (data.competitor as LaneModel["competitor"]) ?? null,
            readyUp: (data.readyUp as LaneModel["readyUp"]) ?? null,
            locked: !!data.locked,
            categoryChangedByAutofill: !!data.categoryChangedByAutofill,
            restrictCategoryChange: !!data.restrictCategoryChange,
          } satisfies LaneModel;
        })
      );
    });

    return () => unsubLanes();
  }, [exerciseId, competitionKind]);

  useEffect(() => {
    if (!exerciseId || !metaLoaded) return;

    if (competitionKind === "team") {
      const waitingQuery = query(
        collection(db, "exercises", exerciseId, "teams"),
        where("status", "==", "waiting"),
        orderBy("orderRank", "asc")
      );
      const unsub = onSnapshot(waitingQuery, (snap) => {
        setTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Team)));
      });
      return () => unsub();
    }

    const waitingQuery = query(
      collection(db, "exercises", exerciseId, "competitors"),
      where("status", "==", "waiting"),
      orderBy("orderRank", "asc")
    );
    const unsub = onSnapshot(waitingQuery, (snap) => {
      setCompetitors(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Competitor))
      );
    });
    return () => unsub();
  }, [exerciseId, metaLoaded, competitionKind]);

  if (!exerciseId) {
    return <p className="p-6 text-muted-foreground">Invalid competition</p>;
  }

  if (!metaLoaded) {
    return <p className="p-6 text-muted-foreground">Loading competition...</p>;
  }

  const isTeam = competitionKind === "team";
  const laneCount = isTeam ? teamLanes.length : lanes.length;

  return (
    <DisplayLayout
      exerciseId={exerciseId}
      name={exerciseName}
      queue={
        isTeam ? (
          <DisplayQueuePanel mode="team" items={teams} />
        ) : (
          <DisplayQueuePanel
            mode="veteran"
            items={competitors}
            lanes={lanes}
            exerciseType={exerciseType}
          />
        )
      }
      lanes={
        <DisplayLanesGrid laneCount={laneCount}>
          {isTeam
            ? teamLanes.map((lane) => (
                <DisplayTeamLaneCard
                  key={`lane-${lane.id}`}
                  lane={lane}
                  showAthletes={!teamNamesOnly}
                />
              ))
            : lanes.map((lane) => (
                <DisplayLaneCard key={`lane-${lane.id}`} lane={lane} />
              ))}
        </DisplayLanesGrid>
      }
    />
  );
}
