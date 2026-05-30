import { useCallback, useState } from "react";

const STORAGE_KEY = "whats_my_lane_team_list_show_athletes";

const readStored = () => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "true";
};

export function useAdminTeamAthletesView() {
  const [showAthleteNames, setShowAthleteNames] = useState(readStored);

  const toggleShowAthleteNames = useCallback(() => {
    setShowAthleteNames((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      }
      return next;
    });
  }, []);

  return { showAthleteNames, toggleShowAthleteNames };
}
