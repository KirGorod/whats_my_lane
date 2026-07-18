import { Fragment, useMemo } from "react";
import { Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Competitor } from "@/types/competitor";
import type { ExerciseType } from "@/types/exercise";
import type { LaneModel } from "@/types/lane";
import type { Team } from "@/types/team";
import { getBadgeColor } from "@/utils/getBadgeColor";
import {
  computeAutofillQueueOrder,
  QUEUE_ORDER_AUTOFILL_MODE,
  type QueuedCompetitor,
} from "@/utils/autofillOrder";
import { getRoundGroupClass } from "@/utils/laneTypeStyles";
import { cn } from "@/lib/utils";
import { displayQueueFonts } from "./displayFonts";

type DisplayQueuePanelProps =
  | {
      mode: "veteran";
      items: Competitor[];
      lanes: LaneModel[];
      exerciseType: ExerciseType;
    }
  | {
      mode: "team";
      items: Team[];
    };

function groupByRound(items: QueuedCompetitor[]) {
  const groups = new Map<number, QueuedCompetitor[]>();
  for (const item of items) {
    const arr = groups.get(item.roundNumber) ?? [];
    arr.push(item);
    groups.set(item.roundNumber, arr);
  }
  return [...groups.entries()].sort(([a], [b]) => a - b);
}

function CategoryTag({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 font-medium leading-snug whitespace-nowrap",
        className
      )}
      style={{ fontSize: displayQueueFonts.hint }}
    >
      {label}
    </span>
  );
}

function QueueItem({
  name,
  badge,
  laneHint,
}: {
  name: string;
  badge?: React.ReactNode;
  laneHint?: number | null;
}) {
  return (
    <div className="box-border w-full min-w-0 overflow-hidden rounded-md border border-border/70 bg-card px-3 py-2">
      <div className="flex min-w-0 items-start gap-2">
        {laneHint != null ? (
          <span
            className="mt-0.5 shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-primary"
            style={{ fontSize: displayQueueFonts.hint }}
          >
            #{laneHint}
          </span>
        ) : null}
        <div className="flex min-w-0 flex-1 items-center">
          <span
            className="min-w-0 flex-1 wrap-break-word font-medium leading-snug text-foreground"
            style={{ fontSize: displayQueueFonts.name }}
          >
            {name}
          </span>
          {badge ? <span className="ml-5 shrink-0">{badge}</span> : null}
        </div>
      </div>
    </div>
  );
}

export default function DisplayQueuePanel(props: DisplayQueuePanelProps) {
  const { t } = useTranslation();

  const veteranGroups = useMemo(() => {
    if (props.mode !== "veteran") return [];
    const queue = computeAutofillQueueOrder(
      props.items,
      props.lanes,
      props.exerciseType,
      QUEUE_ORDER_AUTOFILL_MODE
    );
    return groupByRound(queue);
  }, [props]);

  const count =
    props.mode === "veteran" ? props.items.length : props.items.length;
  const title =
    props.mode === "veteran"
      ? t("Competitors")
      : t("Teams", { defaultValue: "Teams" });

  return (
    <aside className="flex h-full w-full min-h-0 min-w-0 flex-col overflow-hidden border-r border-border bg-card">
      <div className="shrink-0 border-b border-border px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Users className="h-5 w-5 shrink-0 text-muted-foreground" />
          <h2
            className="min-w-0 wrap-break-word font-semibold text-foreground"
            style={{ fontSize: displayQueueFonts.title }}
          >
            {title} ({count})
          </h2>
        </div>
        {props.mode === "veteran" && count > 0 ? (
          <div className="mt-2 space-y-1.5">
            <p
              className="text-center font-semibold text-foreground"
              style={{ fontSize: displayQueueFonts.summaryValue }}
            >
              {t("QueueRemainingLabel", { defaultValue: "Remaining" })}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border border-primary/25 bg-primary/10 px-2.5 py-2 text-center">
                <div
                  className="font-bold tabular-nums leading-none text-primary"
                  style={{ fontSize: displayQueueFonts.summaryValue }}
                >
                  {veteranGroups.length}
                </div>
                <div
                  className="mt-1 font-semibold uppercase tracking-wide text-primary/80"
                  style={{ fontSize: displayQueueFonts.summaryLabel }}
                >
                  {t("QueueRemainingRounds", { defaultValue: "rounds left" })}
                </div>
              </div>
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-center">
                <div
                  className="font-bold tabular-nums leading-none text-amber-700 dark:text-amber-400"
                  style={{ fontSize: displayQueueFonts.summaryValue }}
                >
                  {count}
                </div>
                <div
                  className="mt-1 font-semibold uppercase tracking-wide text-amber-700/80 dark:text-amber-400/80"
                  style={{ fontSize: displayQueueFonts.summaryLabel }}
                >
                  {t("QueueRemainingAthletes", {
                    defaultValue: "athletes left",
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-3">
        {count === 0 ? (
          <div
            className="py-6 text-center text-muted-foreground"
            style={{ fontSize: displayQueueFonts.round }}
          >
            {props.mode === "veteran"
              ? t("NoCompetitorsAvailable")
              : "Команд у черзі немає"}
          </div>
        ) : props.mode === "team" ? (
          <div className="space-y-3">
            {props.items.map((team) => (
              <QueueItem
                key={team.id}
                name={team.name}
                badge={
                  team.city ? (
                    <span
                      className="text-muted-foreground wrap-break-word"
                      style={{ fontSize: displayQueueFonts.hint }}
                    >
                      {team.city}
                    </span>
                  ) : undefined
                }
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {veteranGroups.map(([roundNumber, items]) => {
              const isUnassigned = items.every(
                (item) => item.targetLaneId == null
              );
              return (
                <Fragment key={roundNumber}>
                  <div
                    className={cn(
                      "box-border min-w-0 max-w-full overflow-hidden rounded-lg border-l-4 p-3",
                      getRoundGroupClass(roundNumber, isUnassigned)
                    )}
                  >
                    <div className="mb-2 flex min-w-0 items-center gap-2">
                      <span
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500 font-bold text-white"
                        style={{ fontSize: displayQueueFonts.hint }}
                      >
                        {roundNumber}
                      </span>
                      <span
                        className="min-w-0 wrap-break-word font-medium uppercase tracking-wide text-muted-foreground"
                        style={{ fontSize: displayQueueFonts.round }}
                      >
                        {t("ExitRound", { defaultValue: "Round" })}
                      </span>
                      <span
                        className="ml-auto min-w-0 shrink-0 tabular-nums text-muted-foreground"
                        style={{ fontSize: displayQueueFonts.count }}
                      >
                        {t("ExitRoundAthleteCount", {
                          defaultValue: "{{count}} athletes",
                          count: items.length,
                        })}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <QueueItem
                          key={item.competitor.id}
                          name={item.competitor.name}
                          laneHint={item.targetLaneId}
                          badge={
                            <CategoryTag
                              label={t(item.competitor.category)}
                              className={getBadgeColor(item.competitor.category)}
                            />
                          }
                        />
                      ))}
                    </div>
                  </div>
                </Fragment>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
