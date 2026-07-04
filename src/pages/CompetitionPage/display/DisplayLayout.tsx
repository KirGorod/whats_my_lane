import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Maximize2, Minimize2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { displayPageTitleFont, DISPLAY_QUEUE_WIDTH } from "./displayFonts";

type DisplayLayoutProps = {
  exerciseId: string;
  name?: string;
  queue: ReactNode;
  lanes: ReactNode;
};

export default function DisplayLayout({
  exerciseId,
  name,
  queue,
  lanes,
}: DisplayLayoutProps) {
  const { t } = useTranslation();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Fullscreen may be blocked by browser policy
    }
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-muted/30">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className="h-full min-w-0 shrink-0 overflow-hidden"
          style={{ flex: `0 0 ${DISPLAY_QUEUE_WIDTH}`, width: DISPLAY_QUEUE_WIDTH }}
        >
          {queue}
        </div>
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-border bg-card px-3 py-2.5">
            <div aria-hidden />
            <h1
              className="min-w-0 truncate px-2 text-center font-heading font-semibold text-foreground"
              style={{ fontSize: displayPageTitleFont }}
            >
              {name ?? t("Competition")}
            </h1>
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
                <span className="ml-1.5 hidden sm:inline">
                  {isFullscreen
                    ? t("ExitFullscreen", { defaultValue: "Exit fullscreen" })
                    : t("Fullscreen", { defaultValue: "Fullscreen" })}
                </span>
              </Button>

              <Button asChild variant="outline" size="sm">
                <Link to={`/competitions/${exerciseId}`}>
                  <X className="h-4 w-4" />
                  <span className="ml-1.5 hidden sm:inline">
                    {t("Exit", { defaultValue: "Exit" })}
                  </span>
                </Link>
              </Button>
            </div>
          </header>

          <div className="relative min-h-0 flex-1 overflow-hidden">{lanes}</div>
        </main>
      </div>
    </div>
  );
}
