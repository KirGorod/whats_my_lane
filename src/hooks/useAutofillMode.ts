import { useCallback, useState } from "react";

export type AutofillMode = "strict" | "fallbackGeneral";

const STORAGE_KEY = "whats_my_lane_autofill_mode";

const readStored = (): AutofillMode => {
  if (typeof window === "undefined") return "strict";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "fallbackGeneral" ? "fallbackGeneral" : "strict";
};

export function useAutofillMode() {
  const [autofillMode, setAutofillModeState] = useState<AutofillMode>(readStored);

  const setAutofillMode = useCallback((mode: AutofillMode) => {
    setAutofillModeState(mode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, mode);
    }
  }, []);

  return { autofillMode, setAutofillMode };
}
