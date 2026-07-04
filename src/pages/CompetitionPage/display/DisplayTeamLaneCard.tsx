import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { LaneTeam, TeamLaneModel } from "@/types/team";
import { cn } from "@/lib/utils";
import { displayLaneFonts } from "./displayFonts";
import { sizeContainerStyle, useDisplayDensity } from "./DisplayDensityContext";

type DisplayTeamLaneCardProps = {
  lane: TeamLaneModel;
  showAthletes?: boolean;
};

function TeamBlock({
  title,
  team,
  tone,
  showAthletes,
}: {
  title: string;
  team: LaneTeam | null;
  tone: "now" | "ready";
  showAthletes?: boolean;
}) {
  const isNow = tone === "now";
  const containerClass = isNow
    ? "border-lane-now/40 bg-lane-now/18 text-lane-now"
    : "border-lane-ready/40 bg-lane-ready/18 text-lane-ready";
  const nameClass = isNow
    ? "text-lane-now-foreground"
    : "text-lane-ready-foreground";

  const subline =
    team?.city ??
    (showAthletes && team?.athletes?.length
      ? team.athletes.slice(0, 2).join(", ")
      : null);

  return (
    <div
      className={cn(
        "grid min-h-0 flex-1 grid-rows-[auto_1fr_auto] overflow-hidden rounded-sm border px-1 text-center",
        containerClass
      )}
      style={sizeContainerStyle}
    >
      <span
        className="shrink-0 pt-0.5 font-semibold leading-normal"
        style={{ fontSize: displayLaneFonts.label }}
      >
        {title}
      </span>
      {team ? (
        <>
          <div className="flex min-h-0 items-center justify-center px-0.5">
            <div
              className={cn("line-clamp-2 w-full break-words font-bold leading-tight", nameClass)}
              style={{
                fontSize: isNow
                  ? displayLaneFonts.nameNow
                  : displayLaneFonts.nameReady,
              }}
            >
              {team.name}
            </div>
          </div>
          {subline ? (
            <div
              className="truncate pb-0.5 font-semibold text-muted-foreground"
              style={{ fontSize: displayLaneFonts.meta }}
            >
              {subline}
            </div>
          ) : (
            <div aria-hidden className="pb-0.5" />
          )}
        </>
      ) : (
        <>
          <div className="flex min-h-0 items-center justify-center italic opacity-50">
            <span style={{ fontSize: displayLaneFonts.meta }}>—</span>
          </div>
          <div aria-hidden className="pb-0.5" />
        </>
      )}
    </div>
  );
}

export default function DisplayTeamLaneCard({
  lane,
  showAthletes = true,
}: DisplayTeamLaneCardProps) {
  const { t } = useTranslation();
  const { density } = useDisplayDensity();

  return (
    <div
      className="relative box-border flex h-full min-h-0 flex-col overflow-hidden rounded-sm border border-border bg-card"
      style={sizeContainerStyle}
    >
      {lane.locked && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center bg-red-500/40 text-black backdrop-brightness-95">
          <Lock className="h-5 w-5" />
          <span className="font-bold" style={{ fontSize: displayLaneFonts.header }}>
            {t("LaneLocked")}
          </span>
        </div>
      )}

      <div
        className="flex shrink-0 items-center border-b border-border/50 px-1.5 py-1 leading-normal"
        style={{ fontSize: displayLaneFonts.header }}
      >
        <span className="truncate font-bold leading-none">
          {t("Lane")} {lane.id}
        </span>
      </div>

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          density === "dense" ? "gap-0.5 p-0.5" : "gap-1 p-1"
        )}
      >
        <TeamBlock
          title={t("Now")}
          team={lane.team}
          tone="now"
          showAthletes={showAthletes}
        />
        <TeamBlock
          title={t("ReadyUp")}
          team={lane.readyUpTeam}
          tone="ready"
          showAthletes={showAthletes}
        />
      </div>
    </div>
  );
}
