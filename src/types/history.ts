import type { LaneModel } from "./lane";
import type { Competitor } from "./competitor";

export type ActionKind =
  | "autofill"
  | "nextRound"
  | "removeCompetitor"
  | "clearLane"
  | "fillLane"
  | "returnDone";

export interface LanePatchFields {
  competitor: LaneModel["competitor"] | null;
  readyUp: LaneModel["readyUp"] | null;
  laneType?: LaneModel["laneType"];
  category?: LaneModel["category"];
  nextLaneType?: LaneModel["nextLaneType"];
  categoryChangedByAutofill?: boolean;
}

export interface LanePatch {
  laneDocId: string;
  laneId: number;
  before: LanePatchFields;
  after: LanePatchFields;
}

export interface CompetitorPatch {
  competitorId: string;
  beforeStatus: Competitor["status"];
  afterStatus: Competitor["status"];
}

export interface ActionHistory {
  action: ActionKind;
  createdAt: any; // serverTimestamp()
  createdBy?: string | null;
  lanes: LanePatch[];
  competitors: CompetitorPatch[];
  undone?: boolean;
  undoneAt?: any; // serverTimestamp()
}
