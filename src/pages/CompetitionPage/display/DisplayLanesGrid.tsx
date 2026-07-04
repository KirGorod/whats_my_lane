import { Children, isValidElement, useMemo, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  DisplayDensityProvider,
  getDisplayDensity,
  lastLaneGridColumnStart,
} from "./DisplayDensityContext";

export type DisplayGridLayout = {
  cols: number;
  rows: number;
};

export function layoutForLaneCount(laneCount: number): DisplayGridLayout {
  if (laneCount <= 0) return { cols: 1, rows: 1 };
  if (laneCount === 10) return { cols: 3, rows: 4 };
  if (laneCount === 9) return { cols: 3, rows: 3 };
  if (laneCount === 8) return { cols: 4, rows: 2 };
  if (laneCount === 7) return { cols: 3, rows: 3 };
  if (laneCount === 6) return { cols: 3, rows: 2 };
  if (laneCount === 5) return { cols: 3, rows: 2 };
  if (laneCount === 4) return { cols: 4, rows: 1 };
  if (laneCount === 3) return { cols: 3, rows: 1 };
  if (laneCount === 2) return { cols: 2, rows: 1 };
  if (laneCount <= 12) return { cols: 6, rows: 2 };
  return {
    cols: Math.ceil(Math.sqrt(laneCount * 1.6)),
    rows: Math.ceil(
      laneCount / Math.ceil(Math.sqrt(laneCount * 1.6))
    ),
  };
}

type DisplayLanesGridProps = {
  laneCount: number;
  children: ReactNode;
};

export default function DisplayLanesGrid({
  laneCount,
  children,
}: DisplayLanesGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const childArray = useMemo(
    () =>
      Children.toArray(children).filter(
        (child): child is React.ReactElement => isValidElement(child)
      ),
    [children]
  );

  const effectiveCount = Math.max(laneCount, childArray.length);
  const layout = layoutForLaneCount(effectiveCount);
  const density = getDisplayDensity(effectiveCount, layout.rows);
  const gapClass =
    density === "dense" ? "gap-0.5" : density === "compact" ? "gap-1" : "gap-2";

  return (
    <DisplayDensityProvider
      value={{
        laneCount: effectiveCount,
        cols: layout.cols,
        rows: layout.rows,
        density,
      }}
    >
      <div ref={containerRef} className="absolute inset-0 overflow-hidden p-1">
        <div
          className={cn("grid h-full w-full min-h-0", gapClass)}
          style={{
            gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
          }}
        >
          {childArray.map((child, index) => {
            const columnStart = lastLaneGridColumnStart(
              index,
              effectiveCount,
              layout.cols
            );
            return (
              <div
                key={child.key ?? `lane-slot-${index}`}
                className="min-h-0 min-w-0 overflow-hidden"
                style={
                  columnStart ? { gridColumnStart: columnStart } : undefined
                }
              >
                {child}
              </div>
            );
          })}
        </div>
      </div>
    </DisplayDensityProvider>
  );
}
