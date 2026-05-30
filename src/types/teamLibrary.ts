export interface SavedTeam {
  id: string;
  name: string;
  athletes: string[];
}

export type SavedTeamInput = Omit<SavedTeam, "id">;
