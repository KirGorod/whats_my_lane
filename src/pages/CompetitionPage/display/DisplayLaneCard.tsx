import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { LaneModel } from "@/types/lane";
import { getLaneTypeBadgeClass } from "@/utils/laneTypeStyles";
import { cn } from "@/lib/utils";
import { displayLaneFonts } from "./displayFonts";
import { sizeContainerStyle, useDisplayDensity } from "./DisplayDensityContext";

type DisplayLaneCardProps = {
  lane: LaneModel;
};

function ParticipantBlock({
  title,
  name,
  category,
  tone,
}: {
  title: string;
  name?: string | null;
  category?: string | null;
  tone: "now" | "ready";
}) {
  const { t } = useTranslation();
  const isNow = tone === "now";

  const containerClass = isNow
    ? "border-lane-now/40 bg-lane-now/18 text-lane-now"
    : "border-lane-ready/40 bg-lane-ready/18 text-lane-ready";
  const nameClass = isNow
    ? "text-lane-now-foreground"
    : "text-lane-ready-foreground";

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
      {name ? (
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
              {name}
            </div>
          </div>
          {category ? (
            <div
              className={cn("truncate pb-0.5 font-semibold leading-normal", nameClass)}
              style={{ fontSize: displayLaneFonts.meta }}
            >
              {t(category)}
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

export default function DisplayLaneCard({ lane }: DisplayLaneCardProps) {
  const { t } = useTranslation();
  const { density } = useDisplayDensity();

  return (
    <div
      className="relative box-border flex h-full max-h-full min-h-0 flex-col overflow-hidden rounded-sm border border-border bg-card"
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
        className="flex shrink-0 items-center justify-between gap-1 border-b border-border/50 px-1.5 py-1 leading-normal"
        style={{ fontSize: displayLaneFonts.header }}
      >
        <span className="truncate font-bold leading-none">
          {t("Lane")} {lane.id}
        </span>
        <Badge
          className={cn(
            "h-auto shrink-0 truncate px-2.5 py-1 font-semibold leading-snug",
            getLaneTypeBadgeClass(lane.laneType)
          )}
          style={{ fontSize: displayLaneFonts.badge }}
        >
          {lane.laneType
            ? t(`laneTypeSelect.${lane.laneType}`, {
                defaultValue: t(lane.laneType),
              })
            : "—"}
        </Badge>
      </div>

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          density === "dense" ? "gap-0.5 p-0.5" : "gap-1 p-1"
        )}
      >
        <ParticipantBlock
          title={t("Now")}
          name={lane.competitor?.name}
          category={lane.competitor?.category}
          tone="now"
        />
        <ParticipantBlock
          title={t("ReadyUp")}
          name={lane.readyUp?.name}
          category={lane.readyUp?.category}
          tone="ready"
        />
      </div>
    </div>
  );
}
