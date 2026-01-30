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
import { db } from "@/firebase";
import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { FileUp } from "lucide-react";
import { COMPETITOR_CATEGORIES } from "../../../types/competitor";

type Row = { name?: string; category?: string };

type UploadCompetitorsCSVProps = {
  exerciseId: string;
  triggerButtonClass?: string;
  triggerIcon?: ReactNode;
};

export default function UploadCompetitorsCSV({
  exerciseId,
  triggerButtonClass,
  triggerIcon,
}: UploadCompetitorsCSVProps) {
  const [open, setOpen] = useState(false);
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

    const validSet = new Set(COMPETITOR_CATEGORIES.map((c) => c.toLowerCase()));

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsedData = (results.data as Row[]) || [];

        const batch = writeBatch(db);
        const competitorsRef = collection(
          db,
          "exercises",
          exerciseId,
          "competitors"
        );

        const invalidRows: Array<{
          index: number;
          reason: string;
          value?: string;
        }> = [];

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

          const newDocRef = doc(competitorsRef);
          batch.set(newDocRef, {
            name: rawName,
            category: normalized,
            lane: null,
            status: "waiting",
            orderRank: index,
            createdAt: serverTimestamp(),
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
          await batch.commit();
          toast.success(`CSV Uploaded`, {
            description: `Successfully added ${parsedData.length} competitors.`,
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
