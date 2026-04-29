export type TeamStatus = "waiting" | "lane" | "ready" | "done";

export interface Team {
  id: string;
  name: string;
  athletes: string[];
  status?: TeamStatus;
  orderRank?: number;
  order?: number;
}

export type LaneTeam = Pick<Team, "id" | "name" | "athletes">;

export interface TeamLaneModel {
  id: number;
  laneDocId: string;
  team: LaneTeam | null;
  readyUpTeam: LaneTeam | null;
  locked: boolean;
}

export interface TeamLanePatch {
  laneDocId: string;
  laneId: number;
  before: {
    team: LaneTeam | null;
    readyUpTeam: LaneTeam | null;
  };
  after: {
    team: LaneTeam | null;
    readyUpTeam: LaneTeam | null;
  };
}

export interface TeamPatch {
  teamId: string;
  beforeStatus?: TeamStatus;
  afterStatus: TeamStatus;
  beforeOrderRank?: number;
  afterOrderRank?: number;
}

export interface TeamActionHistory {
  action:
    | "teamAutofill"
    | "teamNextRound"
    | "teamClearLane"
    | "teamFillLane"
    | "teamReturnToWaiting"
    | "teamReturnDone";
  createdAt: unknown;
  createdBy: null | string;
  lanes: TeamLanePatch[];
  teams: TeamPatch[];
  undone: boolean;
}
