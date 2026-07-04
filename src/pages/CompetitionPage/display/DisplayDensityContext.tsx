import { createContext, useContext, type ReactNode } from "react";

export type DisplayDensity = "normal" | "compact" | "dense";

export type DisplayDensityValue = {
  laneCount: number;
  cols: number;
  rows: number;
  density: DisplayDensity;
};

const DisplayDensityContext = createContext<DisplayDensityValue>({
  laneCount: 1,
  cols: 1,
  rows: 1,
  density: "normal",
});

export function DisplayDensityProvider({
  value,
  children,
}: {
  value: DisplayDensityValue;
  children: ReactNode;
}) {
  return (
    <DisplayDensityContext.Provider value={value}>
      {children}
    </DisplayDensityContext.Provider>
  );
}

export function useDisplayDensity() {
  return useContext(DisplayDensityContext);
}

export function getDisplayDensity(laneCount: number, rows: number): DisplayDensity {
  if (laneCount >= 15) return "dense";
  if (rows >= 4) return "dense";
  if (laneCount >= 9) return "compact";
  return "normal";
}

/** Size container for cqh-based typography inside lane cards */
export const sizeContainerStyle = { containerType: "size" } as const;

export function lastLaneGridColumnStart(
  index: number,
  laneCount: number,
  cols: number
): number | undefined {
  if (laneCount <= cols) return undefined;
  const remainder = laneCount % cols;
  if (remainder === 0) return undefined;
  if (index !== laneCount - 1) return undefined;
  return Math.floor((cols - remainder) / 2) + 1;
}
