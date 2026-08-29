import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { getBadgeColor } from "../../../utils/getBadgeColor";
import type {
  DuplicateFinding,
  IncomingAthlete,
} from "../../../utils/duplicateDetection";

export type DuplicateAction = "skip" | "add" | "replace";

export interface DuplicateResolution {
  incomingIndex: number;
  action: DuplicateAction;
  replaceTargetId?: string;
}

type RowState = {
  action: DuplicateAction;
  replaceTargetId: string | null;
};

type ResolveDuplicatesDialogProps = {
  open: boolean;
  findings: DuplicateFinding[];
  batch: IncomingAthlete[];
  onResolve: (resolutions: DuplicateResolution[]) => void;
  onCancel: () => void;
};

const defaultRowState = (finding: DuplicateFinding): RowState => ({
  action: finding.existingMatches.some((m) => m.kind === "exact")
    ? "skip"
    : "add",
  replaceTargetId: finding.existingMatches[0]?.existing.id ?? null,
});

const ResolveDuplicatesDialog = ({
  open,
  findings,
  batch,
  onResolve,
  onCancel,
}: ResolveDuplicatesDialogProps) => {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Record<number, RowState>>({});

  useEffect(() => {
    if (!open) return;
    const next: Record<number, RowState> = {};
    findings.forEach((f) => {
      next[f.incomingIndex] = defaultRowState(f);
    });
    setRows(next);
  }, [open, findings]);

  const statusLabel = (status?: string) => {
    switch (status) {
      case "done":
        return t("Done", { defaultValue: "Done" });
      case "lane":
        return t("Lane", { defaultValue: "Lane" });
      case "ready":
        return t("ReadyUp", { defaultValue: "Ready up" });
      default:
        return t("Waiting", { defaultValue: "Waiting" });
    }
  };

  const setAction = (incomingIndex: number, action: DuplicateAction) => {
    setRows((prev) => ({
      ...prev,
      [incomingIndex]: { ...prev[incomingIndex], action },
    }));
  };

  const setAllActions = (action: Extract<DuplicateAction, "skip" | "add">) => {
    setRows((prev) => {
      const next: Record<number, RowState> = {};
      Object.entries(prev).forEach(([key, value]) => {
        next[Number(key)] = { ...value, action };
      });
      return next;
    });
  };

  // Replace is only possible for rows with an existing-roster match;
  // batch-only duplicates keep their current action.
  const setReplaceAll = () => {
    setRows((prev) => {
      const next: Record<number, RowState> = { ...prev };
      findings.forEach((f) => {
        if (!f.existingMatches.length) return;
        const row = prev[f.incomingIndex] ?? defaultRowState(f);
        next[f.incomingIndex] = {
          action: "replace",
          replaceTargetId:
            row.replaceTargetId ?? f.existingMatches[0].existing.id,
        };
      });
      return next;
    });
  };

  const summary = useMemo(() => {
    const states = Object.values(rows);
    const skipped = states.filter((r) => r.action === "skip").length;
    const replaced = states.filter((r) => r.action === "replace").length;
    const added = batch.length - skipped - replaced;
    return { added, skipped, replaced };
  }, [rows, batch.length]);

  const handleConfirm = () => {
    onResolve(
      findings.map((f) => {
        const row = rows[f.incomingIndex] ?? defaultRowState(f);
        return {
          incomingIndex: f.incomingIndex,
          action: row.action,
          ...(row.action === "replace" && row.replaceTargetId
            ? { replaceTargetId: row.replaceTargetId }
            : {}),
        };
      })
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {t("DuplicatesTitle", {
              defaultValue: "Possible duplicates found",
            })}
          </DialogTitle>
          <DialogDescription>
            {t("DuplicatesDescription", {
              defaultValue:
                "Some athletes look like they are already in the list. Choose what to do with each one before adding.",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAllActions("skip")}
          >
            {t("DuplicatesSkipAll", { defaultValue: "Skip all" })}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAllActions("add")}
          >
            {t("DuplicatesAddAll", { defaultValue: "Add all" })}
          </Button>
          {findings.some((f) => f.existingMatches.length > 0) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={setReplaceAll}
            >
              {t("DuplicatesReplaceAll", { defaultValue: "Replace all" })}
            </Button>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
          {findings.map((finding) => {
            const row = rows[finding.incomingIndex] ?? defaultRowState(finding);
            const canReplace = finding.existingMatches.length > 0;
            return (
              <div
                key={finding.incomingIndex}
                className="rounded border p-3 space-y-2"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{finding.incoming.name}</span>
                  <Badge className={getBadgeColor(finding.incoming.category)}>
                    {finding.incoming.category}
                  </Badge>
                </div>

                <div className="space-y-1">
                  {finding.existingMatches.map((match) => (
                    <div
                      key={match.existing.id}
                      className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground"
                    >
                      <span>
                        {match.kind === "exact"
                          ? t("DuplicatesExistingEntry", {
                              defaultValue: "Already in the list:",
                            })
                          : t("DuplicatesSimilarEntry", {
                              defaultValue: "Similar to ({{percent}}%):",
                              percent: Math.round(match.similarity * 100),
                            })}
                      </span>
                      <span className="text-foreground">
                        {match.existing.name}
                      </span>
                      <Badge className={getBadgeColor(match.existing.category)}>
                        {match.existing.category}
                      </Badge>
                      <span className="text-xs">
                        ({statusLabel(match.existing.status)})
                      </span>
                    </div>
                  ))}
                  {finding.batchMatchIndexes.map((idx) => (
                    <div
                      key={`batch-${idx}`}
                      className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground"
                    >
                      <span>
                        {t("DuplicatesInThisBatch", {
                          defaultValue: "Duplicate in this load:",
                        })}
                      </span>
                      <span className="text-foreground">
                        {batch[idx]?.name}
                      </span>
                      {batch[idx] && (
                        <Badge className={getBadgeColor(batch[idx].category)}>
                          {batch[idx].category}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    type="button"
                    size="sm"
                    variant={row.action === "skip" ? "default" : "outline"}
                    onClick={() => setAction(finding.incomingIndex, "skip")}
                  >
                    {t("DuplicatesSkip", { defaultValue: "Skip" })}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={row.action === "add" ? "default" : "outline"}
                    onClick={() => setAction(finding.incomingIndex, "add")}
                  >
                    {t("DuplicatesAdd", { defaultValue: "Add anyway" })}
                  </Button>
                  {canReplace && (
                    <Button
                      type="button"
                      size="sm"
                      variant={row.action === "replace" ? "default" : "outline"}
                      onClick={() => setAction(finding.incomingIndex, "replace")}
                    >
                      {t("DuplicatesReplace", { defaultValue: "Replace" })}
                    </Button>
                  )}
                  {row.action === "replace" &&
                    finding.existingMatches.length > 1 && (
                      <Select
                        value={row.replaceTargetId ?? undefined}
                        onValueChange={(value) =>
                          setRows((prev) => ({
                            ...prev,
                            [finding.incomingIndex]: {
                              ...prev[finding.incomingIndex],
                              replaceTargetId: value,
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="h-8 w-auto min-w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {finding.existingMatches.map((match) => (
                            <SelectItem
                              key={match.existing.id}
                              value={match.existing.id}
                            >
                              {match.existing.name} ({match.existing.category})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="shrink-0 border-t pt-4 sm:items-center sm:justify-between gap-2">
          <span className="text-sm text-muted-foreground">
            {t("DuplicatesSummary", {
              defaultValue:
                "Add: {{added}} · Skip: {{skipped}} · Replace: {{replaced}}",
              added: summary.added,
              skipped: summary.skipped,
              replaced: summary.replaced,
            })}
          </span>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              {t("Cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button type="button" onClick={handleConfirm}>
              {t("DuplicatesConfirm", { defaultValue: "Confirm" })}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ResolveDuplicatesDialog;
