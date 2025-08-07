import { useState } from "react";
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
import { Upload } from "lucide-react";

export default function UploadCompetitorsCSV({ exerciseId }) {
  const [open, setOpen] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!exerciseId) {
      toast.error("Invalid competition ID");
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsedData = results.data as {
          name?: string;
          category?: string;
        }[];

        const batch = writeBatch(db);
        const competitorsRef = collection(
          db,
          "exercises",
          exerciseId,
          "competitors"
        );

        let addedCount = 0;

        for (let i = 0; i < parsedData.length; i++) {
          addedCount++;
          const row = parsedData[i];
          if (row.name && row.category) {
            const newDocRef = doc(competitorsRef);
            batch.set(newDocRef, {
              name: row.name.trim(),
              category: row.category.trim(),
              lane: null,
              status: "waiting",
              orderRank: i, // 👈 replaces csvOrderIndex
              createdAt: serverTimestamp(),
            });
          }
        }

        try {
          await batch.commit();
          toast.success(`CSV Uploaded`, {
            description: `Successfully added ${addedCount} competitors.`,
          });
          setOpen(false);
        } catch (err) {
          console.error("Error adding competitors:", err);
          toast.error("Error uploading CSV");
        }
      },
      error: (error) => {
        toast.error(`Error parsing CSV`, {
          description: error.message,
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-green-600 hover:text-green-800"
          title="Upload competitors CSV"
        >
          <Upload className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Competitors CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Please upload a CSV file with columns: <b>name</b>, <b>category</b>.
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
