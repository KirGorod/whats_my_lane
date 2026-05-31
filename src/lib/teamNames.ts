import type { Team } from "../types/team";
import type { TeamLaneModel } from "../types/team";

export const normalizeTeamName = (name: string) => name.trim().toLowerCase();

export function collectCompetitionTeamNameKeys(
  waiting: Team[],
  done: Team[],
  lanes: TeamLaneModel[]
): Set<string> {
  const keys = new Set<string>();
  const add = (name?: string) => {
    const key = name?.trim();
    if (key) keys.add(normalizeTeamName(key));
  };

  waiting.forEach((t) => add(t.name));
  done.forEach((t) => add(t.name));
  lanes.forEach((lane) => {
    add(lane.team?.name);
    add(lane.readyUpTeam?.name);
  });

  return keys;
}

export function isTeamNameTaken(
  name: string,
  existingKeys: Set<string>
): boolean {
  const key = name.trim();
  if (!key) return false;
  return existingKeys.has(normalizeTeamName(key));
}

export function makeUniqueTeamName(
  baseName: string,
  existingKeys: Set<string>
): string {
  const trimmed = baseName.trim();
  let candidate = `${trimmed} (копія)`;
  let counter = 2;

  while (isTeamNameTaken(candidate, existingKeys)) {
    candidate = `${trimmed} (копія ${counter})`;
    counter += 1;
  }

  return candidate;
}
