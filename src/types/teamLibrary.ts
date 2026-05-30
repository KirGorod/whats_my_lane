export interface SavedTeam {
  id: string;
  name: string;
  city?: string;
  athletes: string[];
}

export type SavedTeamInput = Omit<SavedTeam, "id">;
