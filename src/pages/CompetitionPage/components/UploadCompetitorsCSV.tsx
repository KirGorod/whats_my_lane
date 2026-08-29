import { ReactNode, useMemo, useState } from "react";
import Papa from "papaparse";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FileUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { COMPETITOR_CATEGORIES } from "../../../types/competitor";
import type { Competitor } from "../../../types/competitor";

type Row = { name?: string; category?: string };

type UploadCompetitorsCSVProps = {
  exerciseId: string;
  addCompetitorsBulk?: (
    list: Array<Omit<Competitor, "id">>,
    options?: { silent?: boolean }
  ) => Promise<string[]> | string[];
  triggerButtonClass?: string;
  triggerIcon?: ReactNode;
};

export default function UploadCompetitorsCSV({
  exerciseId,
  addCompetitorsBulk,
  triggerButtonClass,
  triggerIcon,
}: UploadCompetitorsCSVProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [lowPriority, setLowPriority] = useState(true);
  const defaultTriggerIcon = useMemo(
    () => <FileUp className="w-5 h-5" />,
    []
  );

  const normalizeCategory = (raw?: string) => {
    if (!raw) return "";
    return raw.trim().replace(/\s+/g, "").toLowerCase();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!exerciseId) {
      toast.error("Invalid competition ID");
      return;
    }
    if (!addCompetitorsBulk) {
      toast.error("Uploading is not available here");
      return;
    }

    const validSet = new Set(COMPETITOR_CATEGORIES.map((c) => c.toLowerCase()));

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsedData = (results.data as Row[]) || [];

        const invalidRows: Array<{
          index: number;
          reason: string;
          value?: string;
        }> = [];
        const athletes: Array<Omit<Competitor, "id">> = [];

        parsedData.forEach((row, index) => {
          const rawName = row.name?.trim();
          const rawCategory = row.category?.trim();

          if (!rawName || !rawCategory) {
            invalidRows.push({
              index: index + 2,
              reason: "Missing name or category",
            });
            return;
          }

          const normalized = normalizeCategory(rawCategory);

          if (!validSet.has(normalized)) {
            invalidRows.push({
              index: index + 2,
              reason: "Invalid category",
              value: rawCategory,
            });
            return;
          }

          athletes.push({
            name: rawName,
            category: normalized,
            lane: null,
            ...(lowPriority ? { lowPriority: true } : {}),
          });
        });

        if (invalidRows.length > 0) {
          console.error("CSV validation failed. Invalid rows:", invalidRows);
          toast.error("CSV validation failed", {
            description: `Found ${invalidRows.length} invalid row(s). Check console for details.`,
          });
          return; // ❌ do not commit anything
        }

        try {
          const ids = await addCompetitorsBulk(athletes, { silent: true });
          toast.success(`CSV Uploaded`, {
            description: `Successfully added ${ids.length} competitors.`,
          });
          setOpen(false);
        } catch (err) {
          console.error("Error adding competitors:", err);
          toast.error("Error uploading CSV");
        }
      },
      error: (error) => {
        toast.error("Error parsing CSV", { description: error.message });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={triggerButtonClass ?? "text-green-600 hover:text-green-800"}
          title="Upload competitors CSV"
        >
          {triggerIcon ?? defaultTriggerIcon}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Competitors CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Upload a CSV with columns: <b>name</b>, <b>category</b>.
          </p>
          <p className="text-xs text-muted-foreground">
            Allowed categories (case-insensitive):{" "}
            {COMPETITOR_CATEGORIES.join(", ")}
          </p>
          <label className="flex items-center gap-2 text-sm select-none">
            <input
              type="checkbox"
              checked={lowPriority}
              onChange={(e) => setLowPriority(e.target.checked)}
              className="rounded border-gray-300"
            />
            {t("LowPriorityOnLoad", {
              defaultValue: "Найнижчий пріоритет на вихід",
            })}
          </label>
          <Input type="file" accept=".csv" onChange={handleFileUpload} />
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
